import jsPDF from 'jspdf';
import { PurchaseOrderData } from '@/types/purchase';
import { loadImage } from '@/utils/pdfHelpers';

// 扩展jsPDF类型
interface ExtendedJsPDF extends jsPDF {
  lastAutoTable: {
    finalY: number;
  };
  autoTable: (options: any) => void;
  getNumberOfPages: () => number;
}

// 生成采购订单PDF
export const generatePurchaseOrderPDF = async (data: PurchaseOrderData, preview = false): Promise<Blob> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  }) as ExtendedJsPDF;

  // 添加字体
  doc.addFont('/fonts/NotoSansSC-Regular.ttf', 'NotoSansSC', 'normal');
  doc.addFont('/fonts/NotoSansSC-Bold.ttf', 'NotoSansSC', 'bold');
  doc.setFont('NotoSansSC', 'normal');

  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;  // 页面边距
  let startY = margin;  // 初始化起始位置

  try {
    // 添加表头
    try {
      const headerImage = await loadImage('/images/header-bilingual.png');
      if (headerImage) {
        const imgWidth = pageWidth - 30;  // 左右各留15mm
        const imgHeight = (headerImage.height * imgWidth) / headerImage.width;
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
      }
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

    // 基本信息区域 - 调整为左右两列布局
    const leftInfoItems = [
      { label: 'Attn:', value: data.attn },
      { label: 'Our ref:', value: data.ourRef },
      { label: 'Your ref:', value: data.yourRef }
    ];

    const rightInfoItems = [
      { label: 'Order No.:', value: data.orderNo },
      { label: 'Date:', value: data.date }
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
    doc.setFont('NotoSansSC', 'bold');
    doc.text('1. 供货范围和成交价格：', leftMargin, currentY);
    currentY += 6;
    
    doc.setFont('NotoSansSC', 'normal');
    doc.setFontSize(9);
    
    let currentX = leftMargin;

    // Helper to draw text parts with different styles
    const drawPart = (text: string, style: 'normal' | 'bold', color: [number, number, number]) => {
      doc.setFont('NotoSansSC', style);
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(text, currentX, currentY);
      currentX += doc.getTextWidth(text);
    };

    // Draw parts of the line with specific styling
    drawPart('客户确认贵司于', 'normal', [0, 0, 0]);
    drawPart(data.date, 'bold', [0, 0, 255]);
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
    doc.text(line2Text, leftMargin, currentY);
    doc.setFont('NotoSansSC', 'bold');
    doc.setTextColor(0, 0, 255);
    const line2TextWidth = doc.getTextWidth(line2Text);
    doc.text(data.contractAmount, leftMargin + line2TextWidth + 2, currentY);
    currentY += 5;

    doc.setFont('NotoSansSC', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text('客户确认订单时对于项目的', leftMargin, currentY);
    const specDescText = '规格描述';
    doc.setFont('NotoSansSC', 'bold');
    doc.setTextColor(0, 0, 255);
    doc.text(specDescText, leftMargin + doc.getTextWidth('客户确认订单时对于项目的'), currentY);
    doc.setFont('NotoSansSC', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text('供你们参考：', leftMargin + doc.getTextWidth('客户确认订单时对于项目的规格描述'), currentY);
    currentY += 5;

    // 项目规格描述（多行文本框）
    const specText = data.projectSpecification || '';
    const wrappedSpecText = doc.splitTextToSize(specText, maxWidth);
    wrappedSpecText.forEach((line: string) => {
      doc.text(line, leftMargin, currentY);
      currentY += 4;
    });

    currentY += 6;

    // 2. 付款条件
    doc.setFont('NotoSansSC', 'bold');
    doc.setTextColor(0, 0, 0);
    const paymentTitle = '2. 付款条件：';
    doc.text(paymentTitle, leftMargin, currentY);
    const paymentTitleWidth = doc.getTextWidth(paymentTitle);
    
    doc.setFont('NotoSansSC', 'normal');
    const paymentText = data.paymentTerms || '交货后30天';
    const paymentContentX = leftMargin + paymentTitleWidth;
    const wrappedPaymentText = doc.splitTextToSize(paymentText, maxWidth - paymentTitleWidth);
    doc.text(wrappedPaymentText, paymentContentX, currentY);
    currentY += wrappedPaymentText.length * 4;

    currentY += 6;

    // 3. 发票要求
    doc.setFont('NotoSansSC', 'bold');
    doc.setTextColor(0, 0, 0);
    const invoiceTitle = '3. 发票要求：';
    doc.text(invoiceTitle, leftMargin, currentY);
    const invoiceTitleWidth = doc.getTextWidth(invoiceTitle);
    
    doc.setFont('NotoSansSC', 'normal');
    const invoiceText = data.invoiceRequirements || '如前';
    const invoiceContentX = leftMargin + invoiceTitleWidth;
    const wrappedInvoiceText = doc.splitTextToSize(invoiceText, maxWidth - invoiceTitleWidth);
    doc.text(wrappedInvoiceText, invoiceContentX, currentY);
    currentY += wrappedInvoiceText.length * 4;

    currentY += 6;

    // 4. 关于交货
    doc.setFont('NotoSansSC', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('4. 关于交货：', leftMargin, currentY);
    currentY += 5;
    
    doc.setFont('NotoSansSC', 'normal');
    doc.setTextColor(0, 0, 255);
    doc.text('收货人信息如下：', leftMargin, currentY);
    currentY += 5;

    // 交货信息（多行文本框）
    doc.setFont('NotoSansSC', 'normal');
    doc.setTextColor(0, 0, 0);
    const deliveryText = data.deliveryInfo || 'TBD';
    const wrappedDeliveryText = doc.splitTextToSize(deliveryText, maxWidth);
    wrappedDeliveryText.forEach((line: string) => {
      doc.text(line, leftMargin, currentY);
      currentY += 4;
    });

    currentY += 6;

    // 5. 客户的订单号码
    doc.setFont('NotoSansSC', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('5. 客户的订单号码如下，请在交货时写在交货文件中和包装箱外部：', leftMargin, currentY);
    currentY += 5;
    
    doc.setFont('NotoSansSC', 'normal');
    doc.setTextColor(0, 0, 255);
    const orderNumbersText = data.orderNumbers || '';
    const wrappedOrderNumbersText = doc.splitTextToSize(orderNumbersText, maxWidth);
    wrappedOrderNumbersText.forEach((line: string) => {
      doc.text(line, leftMargin, currentY);
      currentY += 4;
    });

    currentY += 10;

    // 结尾确认语
    doc.setFont('NotoSansSC', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('上述订单，烦请确认！', leftMargin, currentY);

    // 添加印章（如果启用）
    if (data.showStamp) {
      try {
        const stampImage = await loadImage('/images/stamp-shanghai.png');
        if (stampImage) {
          const stampSize = 40;
          const stampX = pageWidth - stampSize - margin;
          const stampY = currentY - 20;
          doc.addImage(stampImage, 'PNG', stampX, stampY, stampSize, stampSize);
        }
      } catch (error) {
        console.error('Error loading stamp image:', error);
      }
    }

    // 添加银行信息（如果启用）
    if (data.showBank) {
      currentY += 10;
      doc.setFont('NotoSansSC', 'normal');
      doc.setFontSize(8);
      const bankInfo = [
        'Bank: Bank of China Shanghai Branch',
        'Account Name: Shanghai MLUO Network Technology Co., Ltd.',
        'Account No.: 1234567890123456789',
        'SWIFT: BKCHCNBJ300'
      ];
      
      bankInfo.forEach((line, index) => {
        doc.text(line, leftMargin, currentY + (index * 4));
      });
    }

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