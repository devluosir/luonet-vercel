import jsPDF, { GState, ImageProperties } from 'jspdf';
import { UserOptions } from 'jspdf-autotable';
import { PurchaseOrderData } from '@/types/purchase';
import { getBankInfo } from '@/utils/bankInfo';
import { ensurePdfFont } from '@/utils/pdfFontRegistry';
import { safeSetCnFont } from './pdf/ensureFont';

/** ------------ 基础类型定义 ------------ */
type RGB = [number, number, number];

/**
 * 统一字体设置工具 - 使用安全的字体设置函数
 */
function setCnFont(doc: jsPDF, style: 'normal'|'bold'|'italic'|'bolditalic' = 'normal') {
  try {
    safeSetCnFont(doc, style, 'export');
  } catch (e) {
    console.warn('[PDF] 中文字体设置失败，回退:', e);
    doc.setFont('helvetica', style === 'bold' ? 'bold' : 'normal');
  }
}

// 扩展jsPDF类型
interface ExtendedJsPDF extends jsPDF {
  lastAutoTable: {
    finalY: number;
  };
  autoTable: (options: UserOptions) => void;
  getNumberOfPages: () => number;
  saveGraphicsState: () => jsPDF;
  restoreGraphicsState: () => jsPDF;
  setGState: (gState: GState) => jsPDF;
  GState: (parameters: GState) => GState;
  getImageProperties: (image: string) => ImageProperties;
}

// 获取印章图片的简化版本
async function getStampImage(stampType: string): Promise<string> {
  const { embeddedResources } = await import('@/lib/embedded-resources');
  if (stampType === 'shanghai') {
    return embeddedResources.shanghaiStamp;
  } else if (stampType === 'hongkong') {
    return embeddedResources.hongkongStamp;
  }
  return '';
}

// 获取表头图片
async function getHeaderImage(): Promise<string> {
  const { embeddedResources } = await import('@/lib/embedded-resources');
  return embeddedResources.headerImage;
}

/**
 * 生成采购订单PDF
 */
export const generatePurchaseOrderPDF = async (data: PurchaseOrderData, preview = false): Promise<Blob> => {
  // 检查是否在客户端环境
  if (typeof window === 'undefined') {
    throw new Error('PDF generation is only available in client-side environment');
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  }) as ExtendedJsPDF;

  // 添加中文字体
  await ensurePdfFont(doc);

  // 开发期自检断言
  if (process.env.NODE_ENV === 'development') {
    const fonts = doc.getFontList();
    if (!fonts['NotoSansSC'] || !fonts['NotoSansSC']?.includes('normal')) {
      console.error('[PDF] NotoSansSC 未在当前 doc 注册完整', fonts);
    } else {
      console.log('[PDF] 采购单字体注册验证通过:', fonts['NotoSansSC']);
    }
  }

  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;  // 页面边距
  let startY = margin;  // 初始化起始位置

  const pageHeight = doc.internal.pageSize.height;
  const pageBottom = pageHeight - margin; // 定义页面底部边界
  const checkAndAddPage = (y: number, needed = 20) => {
    if (y + needed > pageBottom) {
      doc.addPage();
      return margin;
    }
    return y;
  };

  try {
    // 添加表头
    try {
      const headerImage = `data:image/png;base64,${await getHeaderImage()}`;
      const imgProperties = doc.getImageProperties(headerImage);
      const imgWidth = pageWidth - 30;  // 左右各留15mm
      const imgHeight = (imgProperties.height * imgWidth) / imgProperties.width;
      doc.addImage(
        headerImage,
        'PNG',
        15,  // 左边距15mm
        15,  // 上边距15mm
        imgWidth,
        imgHeight
      );
      doc.setFontSize(14);
      setCnFont(doc, 'bold');
      const title = 'PURCHASE ORDER';
      const titleWidth = doc.getTextWidth(title);
      const titleY = margin + imgHeight + 5;  // 标题Y坐标
      doc.text(title, (pageWidth - titleWidth) / 2, titleY);  // 标题位置
      startY = titleY + 10;  // 主体内容从标题下方开始
    } catch (error) {
      console.error('Error processing header:', error);
      // 使用默认布局
      doc.setFontSize(14);
      setCnFont(doc, 'bold');
      const title = 'PURCHASE ORDER';
      const titleWidth = doc.getTextWidth(title);
      const titleY = margin + 5;  // 标题Y坐标
      doc.text(title, (pageWidth - titleWidth) / 2, titleY);  // 标题位置
      startY = titleY + 10;  // 主体内容从标题下方开始
    }

    // 设置字体和样式
    doc.setFontSize(9);
    setCnFont(doc, 'normal');
    
    let currentY = startY;
    const leftMargin = 20;
    const maxWidth = pageWidth - 2 * margin;
    const indent = 5;
    const contentMargin = leftMargin + indent;
    const contentMaxWidth = maxWidth - indent;

    // 基本信息区域 - 调整为左右两列布局
    const leftInfoItems = [
      { label: 'Attn:', value: data.attn },
      { label: 'Our ref:', value: data.ourRef },
      { label: 'Your ref:', value: data.yourRef }
    ];

    const rightInfoItems = [
      { label: 'Order No.:', value: data.orderNo },
      { label: 'Date:', value: data.date },
      { label: 'From:', value: data.from.charAt(0).toUpperCase() + data.from.slice(1) }
    ];

    // 左侧信息
    let leftY = currentY;
    leftInfoItems.forEach((item) => {
      setCnFont(doc, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(item.label, leftMargin, leftY);
      const labelWidth = doc.getTextWidth(item.label);
      
      setCnFont(doc, 'normal');
      doc.setTextColor(0, 0, 255);
      doc.text(item.value || 'TBD', leftMargin + labelWidth + 2, leftY);
      leftY += 5;
    });

    // 右侧信息
    let rightY = currentY;
    const rightStartX = pageWidth * 0.65; // 右侧信息起始位置
    const colonX = rightStartX + 30; // 冒号位置
    
    rightInfoItems.forEach((item) => {
      setCnFont(doc, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(item.label, colonX - 2, rightY, { align: 'right' });
      doc.text(':', colonX, rightY);
      
      setCnFont(doc, 'normal');
      doc.setTextColor(0, 0, 255);
      const valueText = item.value || 'TBD';
      doc.text(valueText, colonX + 3, rightY);
      rightY += 5;
    });

    currentY = Math.max(leftY, rightY) + 8; // 调整为8px间距

    // 1. 供货范围和成交价格
    currentY = checkAndAddPage(currentY);
    setCnFont(doc, 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('1. 供货范围和成交价格：', leftMargin, currentY);
    currentY += 5; // 标题与内容之间的间距

    // 供应商报价信息
    setCnFont(doc, 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text('客户确认贵司于', contentMargin, currentY);
    setCnFont(doc, 'bold');
    doc.setTextColor(0, 0, 255);
    doc.text(data.supplierQuoteDate || 'TBD', contentMargin + doc.getTextWidth('客户确认贵司于'), currentY);
    doc.setTextColor(0, 0, 0);
    doc.text(' ', contentMargin + doc.getTextWidth('客户确认贵司于') + doc.getTextWidth(data.supplierQuoteDate || 'TBD'), currentY);
    doc.setTextColor(255, 0, 0);
    doc.text(data.yourRef || 'TBD', contentMargin + doc.getTextWidth('客户确认贵司于') + doc.getTextWidth(data.supplierQuoteDate || 'TBD') + doc.getTextWidth(' '), currentY);
    doc.setTextColor(0, 0, 0);
    doc.text('报价提供的项目价格、规格和交货条件；', contentMargin + doc.getTextWidth('客户确认贵司于') + doc.getTextWidth(data.supplierQuoteDate || 'TBD') + doc.getTextWidth(' ') + doc.getTextWidth(data.yourRef || 'TBD'), currentY);
    currentY += 5;

    // 合同金额
    setCnFont(doc, 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text('该订单的合同价款是：', contentMargin, currentY);
    const amount = parseFloat(data.contractAmount) || 0;
    const formattedAmount = amount.toFixed(2);
    const fullContractAmount = `${data.currency} ${formattedAmount}`;
    setCnFont(doc, 'bold');
    doc.setTextColor(0, 0, 255);
    doc.text(fullContractAmount, contentMargin + doc.getTextWidth('该订单的合同价款是：') + 1, currentY);
    currentY += 5;

    // 规格描述
    setCnFont(doc, 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text('客户确认订单时对于项目的', contentMargin, currentY);
    const specDescText = '规格描述';
    setCnFont(doc, 'bold');
    doc.setTextColor(0, 0, 255);
    doc.text(specDescText, contentMargin + doc.getTextWidth('客户确认订单时对于项目的'), currentY);
    setCnFont(doc, 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text('供你们参考；', contentMargin + doc.getTextWidth('客户确认订单时对于项目的规格描述'), currentY);
    currentY += 5; // 规格描述标签与内容之间的间距

    // 项目规格描述（普通文本，使用蓝色显示）
    const specText = data.projectSpecification || '';
    if (specText.trim()) {
      console.log('规格描述文本:', specText); // 调试信息
      
      // 普通文本渲染，使用蓝色
      const wrappedSpecText = doc.splitTextToSize(specText, contentMaxWidth);
      if (wrappedSpecText.length > 0) {
        currentY = checkAndAddPage(currentY, wrappedSpecText.length * 4);
        doc.setTextColor(0, 0, 255); // 设置蓝色
        wrappedSpecText.forEach((line: string) => {
          doc.text(line, contentMargin, currentY);
          currentY += 4; 
        });
        doc.setTextColor(0, 0, 0); // 恢复黑色
        currentY += 5; // 调整为8px间距
      }
    } else {
      // 当没有规格描述内容时，也要添加适当的间距
      currentY += 5;
    }

    // 2. 付款条件
    currentY = checkAndAddPage(currentY);
    setCnFont(doc, 'bold');
    doc.setTextColor(0, 0, 0);
    const paymentTitle = '2. 付款条件：';
    doc.text(paymentTitle, leftMargin, currentY);
    const paymentTitleWidth = doc.getTextWidth(paymentTitle);
    
    setCnFont(doc, 'normal');
    const paymentText = data.paymentTerms || '交货后30天；';
    const paymentContentX = leftMargin + paymentTitleWidth;
    const wrappedPaymentText = doc.splitTextToSize(paymentText, maxWidth - paymentTitleWidth);
    doc.text(wrappedPaymentText, paymentContentX, currentY);
    currentY += wrappedPaymentText.length * 4;

    currentY += 5; // 调整为5px间距

    // 3. 发票要求
    currentY = checkAndAddPage(currentY);
    setCnFont(doc, 'bold');
    doc.setTextColor(0, 0, 0);
    const invoiceTitle = '3. 发票要求：';
    doc.text(invoiceTitle, leftMargin, currentY);
    const invoiceTitleWidth = doc.getTextWidth(invoiceTitle);
    
    setCnFont(doc, 'normal');
    const invoiceText = data.invoiceRequirements || '请在发票开具前与我司财务确认；';
    const invoiceContentX = leftMargin + invoiceTitleWidth;
    const wrappedInvoiceText = doc.splitTextToSize(invoiceText, maxWidth - invoiceTitleWidth);
    doc.text(wrappedInvoiceText, invoiceContentX, currentY);
    currentY += wrappedInvoiceText.length * 4;

    // 添加银行信息（如果启用）
    if (data.showBank) {
      const bankInfo = getBankInfo();
      currentY = checkAndAddPage(currentY, bankInfo.length * 4);
      
      doc.setFontSize(9);
      
      bankInfo.forEach((line, index) => {
        if (index === 0) {
          setCnFont(doc, 'bold');
        } else {
          setCnFont(doc, 'normal');
        }
        doc.text(line, contentMargin, currentY + (index * 4));
      });

      currentY += bankInfo.length * 4;
    }

    currentY += 5;

    // 4. 关于交货
    currentY = checkAndAddPage(currentY);
    setCnFont(doc, 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('4. 关于交货：', leftMargin, currentY);
    currentY += 5; // 标题与内容之间的间距
    
    setCnFont(doc, 'normal');
    doc.setTextColor(0, 0, 255);
    doc.text('收货人信息如下：', contentMargin, currentY);
    currentY += 5; // 标签与内容之间的间距

    // 交货信息（多行文本框）
    const deliveryText = data.deliveryInfo || 'TBD';
    const wrappedDeliveryText = doc.splitTextToSize(deliveryText, contentMaxWidth);
    currentY = checkAndAddPage(currentY, wrappedDeliveryText.length * 4);
    doc.setTextColor(0, 0, 255);
    wrappedDeliveryText.forEach((line: string) => {
      doc.text(line, contentMargin, currentY);
      currentY += 4;
    });

    currentY += 5;

    // 5. 客户的订单号码
    currentY = checkAndAddPage(currentY);
    setCnFont(doc, 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('5. 客户的订单号码如下，请在交货时写在交货文件中和包装箱外部：', leftMargin, currentY);
    currentY += 5; // 标题与内容之间的间距
    
    setCnFont(doc, 'normal');
    doc.setTextColor(0, 0, 255);
    const orderNumbersText = data.orderNumbers || 'TBD';
    const wrappedOrderNumbersText = doc.splitTextToSize(orderNumbersText, contentMaxWidth);
    currentY = checkAndAddPage(currentY, wrappedOrderNumbersText.length * 4);
    wrappedOrderNumbersText.forEach((line: string) => {
      doc.text(line, contentMargin, currentY);
      currentY += 4;
    });

    currentY += 8;

    // 结尾确认语和印章
    const confirmationText = '上述订单，烦请确认！';
    const textHeight = 4; // 9pt字体大约4mm高
    
    // 检查分页，为印章和文字预留空间
    const stampHeight = data.stampType === 'shanghai' ? 40 : 34;
    const requiredHeight = data.stampType !== 'none' ? stampHeight + 5 : textHeight + 5;
    let confirmationY = checkAndAddPage(currentY, requiredHeight);
    
    const textY = confirmationY + 0; // 定义文字的Y坐标

    // 1. 添加印章（如果启用），先绘制
    if (data.stampType !== 'none') {
      try {
        // 使用优化的印章图片
        const stampImageBase64 = await getStampImage(data.stampType);
        
        if (stampImageBase64 && stampImageBase64.trim()) {
          const stampImage = `data:image/png;base64,${stampImageBase64}`;
          const stampWidth = data.stampType === 'shanghai' ? 40 : 73;

          let stampX = leftMargin;
          let stampY = textY - 5; // 默认Y位置

          if (data.stampType === 'shanghai') {
            stampX += 10; // 上海印章右移10mm
          } else if (data.stampType === 'hongkong') {
            stampY += 5; // 香港印章下移5mm
          }

          doc.saveGraphicsState();
          doc.setGState(new GState({ opacity: 0.9 }));
          doc.addImage(stampImage, 'PNG', stampX, stampY, stampWidth, stampHeight);
          doc.restoreGraphicsState();
        }
      } catch (error) {
        console.error('Error loading stamp image:', error);
        // 如果印章加载失败，继续执行，不中断PDF生成
      }
    }
    
    // 2. 结尾确认语，后绘制（使其位于上层）
    setCnFont(doc, 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(confirmationText, leftMargin, textY);

    // 更新currentY，以便后续内容可以正确衔接
    currentY = data.stampType !== 'none' ? textY + stampHeight - 15 : textY + 5;

    // 添加页码 - 调整到右下角
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      setCnFont(doc, 'normal');
      const pageText = `Page ${i} of ${pageCount}`;
      const pageTextWidth = doc.getTextWidth(pageText);
      const pageHeight = doc.internal.pageSize.height;
      // 将页码放在右下角，距离右边距10mm，距离下边距10mm
      doc.text(pageText, pageWidth - pageTextWidth - 10, pageHeight - 10);
    }

  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }

  if (preview) {
    return doc.output('blob');
  }

  return doc.output('blob');
}; 