import jsPDF, { GState, ImageProperties } from 'jspdf';
import { PurchaseOrderData } from '@/types/purchase';
import { getBankInfo } from '@/utils/bankInfo';
import { embeddedResources } from '@/lib/embedded-resources';

// 扩展jsPDF类型
interface ExtendedJsPDF extends jsPDF {
  lastAutoTable: {
    finalY: number;
  };
  autoTable: (options: any) => void;
  getNumberOfPages: () => number;
  saveGraphicsState: () => jsPDF;
  restoreGraphicsState: () => jsPDF;
  setGState: (gState: any) => jsPDF;
  GState: (parameters: GState) => GState;
  getImageProperties: (image: string) => ImageProperties;
}

// 生成采购订单PDF
export const generatePurchaseOrderPDF = async (data: PurchaseOrderData, preview = false): Promise<Blob> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  }) as ExtendedJsPDF;

  // 添加字体
  doc.addFileToVFS('NotoSansSC-Regular.ttf', embeddedResources.notoSansSCRegular);
  doc.addFont('NotoSansSC-Regular.ttf', 'NotoSansSC', 'normal');
  doc.addFileToVFS('NotoSansSC-Bold.ttf', embeddedResources.notoSansSCBold);
  doc.addFont('NotoSansSC-Bold.ttf', 'NotoSansSC', 'bold');
  doc.setFont('NotoSansSC', 'normal');

  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;  // 页面边距
  let startY = margin;  // 初始化起始位置

  const pageHeight = doc.internal.pageSize.height;
  const checkAndAddPage = (y: number, needed = 20) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      return margin;
    }
    return y;
  };

  try {
    // 添加表头
    try {
      const headerImage = `data:image/png;base64,${embeddedResources.headerImage}`;
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
      doc.setFont('NotoSansSC', 'bold');
      const title = 'PURCHASE ORDER';
      const titleWidth = doc.getTextWidth(title);
      const titleY = margin + imgHeight + 5;  // 标题Y坐标
      doc.text(title, (pageWidth - titleWidth) / 2, titleY);  // 标题位置
      startY = titleY + 10;  // 主体内容从标题下方开始
    } catch (error) {
      console.error('Error processing header:', error);
      // 使用默认布局
      doc.setFontSize(14);
      doc.setFont('NotoSansSC', 'bold');
      const title = 'PURCHASE ORDER';
      const titleWidth = doc.getTextWidth(title);
      const titleY = margin + 5;  // 标题Y坐标
      doc.text(title, (pageWidth - titleWidth) / 2, titleY);  // 标题位置
      startY = titleY + 10;  // 主体内容从标题下方开始
    }

    // 设置字体和样式
    doc.setFontSize(9);
    doc.setFont('NotoSansSC', 'normal');
    
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

    // 绘制左侧基本信息
    leftInfoItems.forEach((item, index) => {
      const y = startY + (index * 5);
      doc.setFont('NotoSansSC', 'bold');
      doc.text(item.label, leftMargin, y);
      doc.setFont('NotoSansSC', 'normal');
      const labelWidth = doc.getTextWidth(item.label);
      const valueX = leftMargin + labelWidth + 2;
      const valueText = item.value || '';
      const maxValueWidth = (pageWidth / 2) - leftMargin - labelWidth - 5;
      const wrappedValue = doc.splitTextToSize(valueText, maxValueWidth);
      wrappedValue.forEach((line: string, lineIndex: number) => {
        doc.text(line, valueX, y + (lineIndex * 4));
      });
      currentY = Math.max(currentY, y + (wrappedValue.length * 4));
    });

    // 定义右侧值的起始X坐标，并右对齐标签
    const rightValuesX = pageWidth - margin - 30;

    // 绘制右侧基本信息
    rightInfoItems.forEach((item: any, index) => {
      const y = startY + (index * 5); // 统一行间距
      
      // 绘制标签 (黑色, 加粗)
      doc.setFont('NotoSansSC', 'bold');
      doc.setTextColor(0, 0, 0);
      const labelWidth = doc.getTextWidth(item.label);
      const labelX = rightValuesX - labelWidth - 2;
      doc.text(item.label, labelX, y);
      
      // 绘制值
      if (item.label === 'Order No.:') {
        doc.setFont('NotoSansSC', 'bold');
        doc.setTextColor(0, 0, 255); // Blue
      } else {
        doc.setFont('NotoSansSC', 'normal');
        doc.setTextColor(0, 0, 0); // Black
      }

      const valueX = rightValuesX;
      const valueText = item.value || '';
      const maxValueWidth = pageWidth - margin - valueX;
      const wrappedValue = doc.splitTextToSize(valueText, maxValueWidth);
      wrappedValue.forEach((line: string, lineIndex: number) => {
        doc.text(line, valueX, y + (lineIndex * 4));
      });
      currentY = Math.max(currentY, y + (wrappedValue.length * 4));
    });

    // 重置样式
    doc.setFont('NotoSansSC', 'normal');
    doc.setTextColor(0, 0, 0);

    currentY += 10;

    // 1. 供货范围和成交价格
    currentY = checkAndAddPage(currentY, 25);
    doc.setFont('NotoSansSC', 'bold');
    doc.text('1. 供货范围和成交价格：', leftMargin, currentY);
    currentY += 6;
    
    doc.setFont('NotoSansSC', 'normal');
    doc.setFontSize(9);
    
    let currentX = contentMargin;

    // Helper to draw text parts with different styles
    const drawPart = (text: string, style: 'normal' | 'bold', color: [number, number, number]) => {
      doc.setFont('NotoSansSC', style);
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(text, currentX, currentY);
      currentX += doc.getTextWidth(text);
    };

    // Draw parts of the line with specific styling
    drawPart('客户确认贵司于', 'normal', [0, 0, 0]);
    drawPart(data.supplierQuoteDate, 'bold', [0, 0, 255]);
    drawPart(' ', 'normal', [0, 0, 0]);
    drawPart(data.yourRef, 'bold', [0, 0, 255]);

    // Handle the rest of the text with wrapping
    doc.setFont('NotoSansSC', 'normal');
    doc.setTextColor(0, 0, 0);
    const suffix = ' 报价提供的项目价格、规格和交货条件；';
    const remainingWidth = pageWidth - margin - currentX;
    const wrappedSuffix = doc.splitTextToSize(suffix, remainingWidth);
    
    // jsPDF's text method handles rendering the array of wrapped lines
    doc.text(wrappedSuffix, currentX, currentY);
    
    // Update Y position based on the number of lines in the wrapped text
    currentY += (wrappedSuffix.length - 1) * 4;

    currentY += 5; // Move to the next logical line

   

    const line2Text = '该订单的合同价款是：';
    doc.text(line2Text, contentMargin, currentY);
    doc.setFont('NotoSansSC', 'bold');
    doc.setTextColor(0, 0, 255);
    const line2TextWidth = doc.getTextWidth(line2Text);
    const amount = parseFloat(data.contractAmount) || 0;
    const formattedAmount = amount.toFixed(2);
    const fullContractAmount = `${data.currency} ${formattedAmount}`;
    doc.text(fullContractAmount, contentMargin + line2TextWidth + 1, currentY);
    currentY += 5;

    doc.setFont('NotoSansSC', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text('客户确认订单时对于项目的', contentMargin, currentY);
    const specDescText = '规格描述';
    doc.setFont('NotoSansSC', 'bold');
    doc.setTextColor(0, 0, 255);
    doc.text(specDescText, contentMargin + doc.getTextWidth('客户确认订单时对于项目的'), currentY);
    doc.setFont('NotoSansSC', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text('供你们参考；', contentMargin + doc.getTextWidth('客户确认订单时对于项目的规格描述'), currentY);
    currentY += 5;

    // 项目规格描述（多行文本框）
    const specText = data.projectSpecification || '';
    const wrappedSpecText = doc.splitTextToSize(specText, contentMaxWidth);
    if (wrappedSpecText.length > 0) {
      currentY = checkAndAddPage(currentY, wrappedSpecText.length * 4); // Reduce line height
      wrappedSpecText.forEach((line: string) => {
        doc.text(line, contentMargin, currentY);
        currentY += 4; 
      });
      currentY += 5; // Reduce extra space after the text block
    } else {
      // No extra space when there's no content
    }

    // 2. 付款条件
    currentY = checkAndAddPage(currentY);
    doc.setFont('NotoSansSC', 'bold');
    doc.setTextColor(0, 0, 0);
    const paymentTitle = '2. 付款条件：';
    doc.text(paymentTitle, leftMargin, currentY);
    const paymentTitleWidth = doc.getTextWidth(paymentTitle);
    
    doc.setFont('NotoSansSC', 'normal');
    const paymentText = data.paymentTerms || '交货后30天；';
    const paymentContentX = leftMargin + paymentTitleWidth;
    const wrappedPaymentText = doc.splitTextToSize(paymentText, maxWidth - paymentTitleWidth);
    doc.text(wrappedPaymentText, paymentContentX, currentY);
    currentY += wrappedPaymentText.length * 4;

    currentY += 5;

    // 3. 发票要求
    currentY = checkAndAddPage(currentY);
    doc.setFont('NotoSansSC', 'bold');
    doc.setTextColor(0, 0, 0);
    const invoiceTitle = '3. 发票要求：';
    doc.text(invoiceTitle, leftMargin, currentY);
    const invoiceTitleWidth = doc.getTextWidth(invoiceTitle);
    
    doc.setFont('NotoSansSC', 'normal');
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
          doc.setFont('NotoSansSC', 'bold');
        } else {
          doc.setFont('NotoSansSC', 'normal');
        }
        doc.text(line, contentMargin, currentY + (index * 4));
      });

      currentY += bankInfo.length * 4;
    }

    currentY += 5;

    // 4. 关于交货
    currentY = checkAndAddPage(currentY);
    doc.setFont('NotoSansSC', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('4. 关于交货：', leftMargin, currentY);
    currentY += 5;
    
    doc.setFont('NotoSansSC', 'normal');
    doc.setTextColor(0, 0, 255);
    doc.text('收货人信息如下：', contentMargin, currentY);
    currentY += 5;

    // 交货信息（多行文本框）
    const deliveryText = data.deliveryInfo || 'TBD';
    const wrappedDeliveryText = doc.splitTextToSize(deliveryText, contentMaxWidth);
    currentY = checkAndAddPage(currentY, wrappedDeliveryText.length * 4);
    doc.setFont('NotoSansSC', 'normal');
    doc.setTextColor(0, 0, 0);
    wrappedDeliveryText.forEach((line: string) => {
      doc.text(line, contentMargin, currentY);
      currentY += 4;
    });

    currentY += 6;

    // 5. 客户的订单号码
    currentY = checkAndAddPage(currentY);
    doc.setFont('NotoSansSC', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('5. 客户的订单号码如下，请在交货时写在交货文件中和包装箱外部：', leftMargin, currentY);
    currentY += 5;
    
    doc.setFont('NotoSansSC', 'normal');
    doc.setTextColor(0, 0, 255);
    const orderNumbersText = data.orderNumbers || 'TBD';
    const wrappedOrderNumbersText = doc.splitTextToSize(orderNumbersText, contentMaxWidth);
    currentY = checkAndAddPage(currentY, wrappedOrderNumbersText.length * 4);
    wrappedOrderNumbersText.forEach((line: string) => {
      doc.text(line, contentMargin, currentY);
      currentY += 4;
    });

    currentY += 10;

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
        let stampImageBase64 = '';
        if (data.stampType === 'shanghai') {
          stampImageBase64 = embeddedResources.shanghaiStamp;
        } else if (data.stampType === 'hongkong') {
          stampImageBase64 = embeddedResources.hongkongStamp;
        }

        if (stampImageBase64) {
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
      }
    }
    
    // 2. 结尾确认语，后绘制（使其位于上层）
    doc.setFont('NotoSansSC', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(confirmationText, leftMargin, textY);

    // 更新currentY，以便后续内容可以正确衔接
    currentY = data.stampType !== 'none' ? textY + stampHeight - 15 : textY + 5;


    // 添加页码 - 调整到右下角
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('NotoSansSC', 'normal');
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