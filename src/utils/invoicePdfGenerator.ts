import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { PDFGeneratorData } from '@/types/pdf';
import { getHeaderImage, getInvoiceTitle, getStampImage, loadImage } from '@/utils/pdfHelpers';

interface AutoTableOptions {
  startY: number;
  head: string[][];
  body: (string | number | { 
    content: string | number | undefined; 
    colSpan?: number;
    styles?: { 
      halign?: string;
      textColor?: number[];
    }
  } | undefined)[][];
  theme: string;
  styles: {
    fontSize: number;
    cellPadding: number;
    lineColor: number[];
    lineWidth: number;
    textColor: number[];
    font: string;
    valign: string;
  };
  headStyles: {
    fontSize: number;
    fontStyle: string;
    halign: string;
    font: string;
    valign: string;
  };
  columnStyles: Record<string, { halign: string; cellWidth: number | string }>;
  margin: { left: number; right: number };
  tableWidth: string;
}

interface AutoTableDoc extends jsPDF {
  lastAutoTable: {
    finalY: number;
  };
  autoTable: (options: AutoTableOptions) => void;
}

// 生成发票PDF
export async function generateInvoicePDF(data: PDFGeneratorData, preview: boolean = false) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // 添加字体
  doc.addFont('/fonts/NotoSansSC-Regular.ttf', 'NotoSansSC', 'normal');
  doc.addFont('/fonts/NotoSansSC-Bold.ttf', 'NotoSansSC', 'bold');
  doc.setFont('NotoSansSC', 'normal');

  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;  // 页面边距
  let startY = margin;  // 初始化起始位置

  try {
    // 添加表头
    if (data.templateConfig.headerType !== 'none') {
      try {
        const headerImage = await getHeaderImage(data.templateConfig.headerType);
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
          const title = getInvoiceTitle(data);
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
        const title = getInvoiceTitle(data);
        const titleWidth = doc.getTextWidth(title);
        const titleY = margin + 5;  // 标题Y坐标
        doc.text(title, (pageWidth - titleWidth) / 2, titleY);  // 标题位置
        startY = titleY + 10;  // 主体内容从标题下方开始
      }
    } else {
      // 即使没有表头图片，也显示标题
      doc.setFontSize(14);
      doc.setFont('NotoSansSC', 'bold');
      const title = getInvoiceTitle(data);
      const titleWidth = doc.getTextWidth(title);
      const titleY = margin + 5;  // 标题Y坐标
      doc.text(title, (pageWidth - titleWidth) / 2, titleY);  // 标题位置
      startY = titleY + 10;  // 主体内容从标题下方开始
    }

    // 设置字体和样式
    doc.setFontSize(8);
    doc.setFont('NotoSansSC', 'normal');
    
    // 客户信息区域
    const leftMargin = 20;
    const rightMargin = pageWidth - 20;
    let currentY = startY;

    // 计算最大文本宽度（考虑右侧信息区域的空间）
    const maxTextWidth = pageWidth - leftMargin - 80; // 减去100mm给右侧信息预留空间

    doc.setFont('NotoSansSC', 'bold');
    doc.text('To:', leftMargin, currentY);
    doc.setFont('NotoSansSC', 'normal');
    const toTextWidth = doc.getTextWidth('To: ') + 3;  // 增加3mm的间距
    
    // 处理客户信息自动换行
    const toText = data.to.trim();
    if (toText) {
      const wrappedLines = doc.splitTextToSize(toText, maxTextWidth);
      wrappedLines.forEach((line: string, index: number) => {
        doc.text(line, leftMargin + toTextWidth, currentY);
        if (index < wrappedLines.length - 1) {
          currentY += 5;
        }
      });
    }
    
    // Order No. 位置（在客户信息下方）
    currentY += 8;
    doc.setFont('NotoSansSC', 'bold');
    doc.text('Order No.:', leftMargin, currentY);
    doc.setFont('NotoSansSC', 'normal');
    const orderNoTextWidth = doc.getTextWidth('Order No.: ') + 3;  // 增加3mm的间距

    // 处理订单号自动换行
    if (data.customerPO) {
      const wrappedOrderNo = doc.splitTextToSize(data.customerPO.trim(), maxTextWidth);
      wrappedOrderNo.forEach((line: string, index: number) => {
        doc.text(line, leftMargin + orderNoTextWidth, currentY);
        if (index < wrappedOrderNo.length - 1) {
          currentY += 5;
        }
      });
    }

    // 右侧信息区域
    const initialY = startY;  // 重置Y坐标到初始位置
    const colonX = rightMargin - 20;  // 设置冒号的固定X坐标位置
    
    // 定义标签和值的数组
    const infoItems = [
      { label: 'Invoice No.', value: data.invoiceNo },
      { label: 'Date', value: data.date },
      { label: 'Currency', value: data.currency }
    ];

    // 绘制每一行
    infoItems.forEach((item, index) => {
      const y = initialY + (index * 5);
      // 标签右对齐到冒号位置
      doc.setFont('NotoSansSC', 'bold');
      doc.text(`${item.label}`, colonX, y, { align: 'right' });
      doc.setFont('NotoSansSC', 'normal');
      // 冒号固定位置
      doc.text(':', colonX + 1, y);
      // 值左对齐（从冒号后开始）
      doc.text(item.value, colonX + 3, y);
    });
    
    // 更新当前Y坐标，为表格预留间距
    currentY += 5;

    // 使用 autoTable
    (doc as AutoTableDoc).autoTable({
      startY: currentY,
      head: [['No.', data.showHsCode ? 'HS Code' : '', 'Part Name', data.showDescription ? 'Description' : '', 'Q\'TY', 'Unit', 'Unit Price', 'Amount']].map(row => 
        row.filter(cell => cell !== '')),
      body: [
        // 常规商品行
        ...data.items.map((item, index) => [
          index + 1,
          data.showHsCode ? {
            content: item.hsCode,
            styles: item.highlight?.hsCode ? { textColor: [255, 0, 0] } : {}
          } : '',
          {
            content: item.partname,
            styles: item.highlight?.partname ? { textColor: [255, 0, 0] } : {}
          },
          data.showDescription ? {
            content: item.description,
            styles: item.highlight?.description ? { textColor: [255, 0, 0] } : {}
          } : '',
          {
            content: item.quantity || '',
            styles: item.highlight?.quantity ? { textColor: [255, 0, 0] } : {}
          },
          {
            content: item.quantity ? item.unit : '',
            styles: item.highlight?.unit ? { textColor: [255, 0, 0] } : {}
          },
          {
            content: item.unitPrice ? Number(item.unitPrice).toFixed(2) : '',
            styles: item.highlight?.unitPrice ? { textColor: [255, 0, 0] } : {}
          },
          {
            content: item.amount ? Number(item.amount).toFixed(2) : '',
            styles: item.highlight?.amount ? { textColor: [255, 0, 0] } : {}
          }
        ].filter((_, i) => {
          if (i === 0) return true; // No.
          if (i === 2) return true; // Part Name
          if (i === 4) return true; // Q'TY
          if (i === 5) return true; // Unit
          if (i === 6) return true; // U/Price
          if (i === 7) return true; // Amount
          if (data.showHsCode && i === 1) return true; // HS Code
          if (data.showDescription && i === 3) return true; // Description
          return false;
        })),
        // Other Fees 行
        ...(data.otherFees || []).map(fee => [
          {
            content: fee.description,
            colSpan: (data.showHsCode ? 1 : 0) + (data.showDescription ? 1 : 0) + 5,
            styles: { 
              halign: 'center',
              ...(fee.highlight?.description ? { textColor: [255, 0, 0] } : {})
            }
          },
          {
            content: fee.amount.toFixed(2),
            styles: {
              ...(fee.highlight?.amount ? { textColor: [255, 0, 0] } : {})
            }
          }
        ])
      ],
      theme: 'plain',
      styles: {
        fontSize: 8,
        cellPadding: 2,
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
        textColor: [0, 0, 0],
        font: 'NotoSansSC',
        valign: 'middle'
      },
      headStyles: {
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center',
        font: 'NotoSansSC',
        valign: 'middle'
      },
      columnStyles: (() => {
        const styles: Record<string, { halign: 'center'; cellWidth: string }> = {
          '0': { halign: 'center', cellWidth: '7%' },   // No.
          ...(data.showHsCode ? { '1': { halign: 'center', cellWidth: '10%' } } : {}),   // HS Code
          [data.showHsCode ? '2' : '1']: { halign: 'center', cellWidth: '20%' },   // Part Name
          ...(data.showDescription ? { [data.showHsCode ? '3' : '2']: { halign: 'center', cellWidth: '25%' } } : {}), // Description
          [data.showHsCode && data.showDescription ? '4' : (data.showHsCode || data.showDescription ? '3' : '2')]: { halign: 'center', cellWidth: '8%' },   // Q'TY
          [data.showHsCode && data.showDescription ? '5' : (data.showHsCode || data.showDescription ? '4' : '3')]: { halign: 'center', cellWidth: '8%' },   // Unit
          [data.showHsCode && data.showDescription ? '6' : (data.showHsCode || data.showDescription ? '5' : '4')]: { halign: 'center', cellWidth: '12%' },   // U/Price
          [data.showHsCode && data.showDescription ? '7' : (data.showHsCode || data.showDescription ? '6' : '5')]: { halign: 'center', cellWidth: '10%' }    // Amount
        };
        return styles;
      })(),
      margin: { left: 20, right: 20 },
      tableWidth: 'auto'
    });

    // 获取表格结束位置
    const finalY = (doc as AutoTableDoc).lastAutoTable.finalY;
    
    // 设置字体和样式
    doc.setFontSize(10);
    doc.setFont('NotoSansSC', 'normal');
    
    // 显示总金额
    const totalAmountLabel = 'Total Amount:';
    const itemsTotal = data.items.reduce((sum, item) => sum + item.amount, 0);
    const feesTotal = (data.otherFees || []).reduce((sum, fee) => sum + fee.amount, 0);
    const totalAmount = itemsTotal + feesTotal;
    const totalAmountValue = `${data.currency === 'USD' ? '$' : '¥'}${totalAmount.toFixed(2)}`;
    
    const valueX = pageWidth - margin - 5;  // 右边距增加到15mm
    const labelX = valueX - doc.getTextWidth(totalAmountValue) - 28;  // 根据金额文本宽度动态计算标签位置
    
  
        
    // 绘制总金额行（使用粗体）
    doc.setFont('NotoSansSC', 'bold');
    doc.text(totalAmountLabel, labelX, finalY + 8);
    doc.text(totalAmountValue, valueX, finalY + 8, { align: 'right' });
    doc.setFont('NotoSansSC', 'normal');

    // 显示大写金额
    doc.setFontSize(8);
    doc.setFont('NotoSansSC', 'bold');
    const lines = doc.splitTextToSize(`SAY TOTAL ${data.currency === 'USD' ? 'US DOLLARS' : 'CHINESE YUAN'} ${data.amountInWords.dollars}${data.amountInWords.hasDecimals ? ` AND ${data.amountInWords.cents}` : ' ONLY'}`, pageWidth - (margin * 2));
    lines.forEach((line: string, index: number) => {
      doc.text(line, margin, finalY + 15 + (index * 5));
    });
    doc.setFont('NotoSansSC', 'normal');

    // 计算银行信息的起始位置
    let bankY = finalY + 15 + (lines.length * 5) + 8;

    // 显示银行信息
    if (data.showBank) {
      doc.setFont('NotoSansSC', 'bold');
      doc.text('Bank Information:', margin, bankY);
      doc.setFont('NotoSansSC', 'normal');
      bankY += 5;
      
      const bankInfoLines = data.bankInfo.split('\n').filter(line => line.trim());
      bankInfoLines.forEach((line, index) => {
        doc.text(line, margin, bankY + (index * 5));
      });
      
      bankY += bankInfoLines.length * 5 + 8;
    }

    // 计算 Payment Terms 的起始位置
    currentY = bankY;  // 与上方内容保持间距

    // 计算是否有付款条款内容
    const hasPaymentTerms = data.showPaymentTerms || 
                          (data.additionalPaymentTerms && data.additionalPaymentTerms.trim()) ||
                          data.showInvoiceReminder;

    if (hasPaymentTerms) {
      // 计算条款总数
      let totalTerms = 0;
      if (data.showPaymentTerms) totalTerms++;
      if (data.additionalPaymentTerms && data.additionalPaymentTerms.trim()) {
        totalTerms += data.additionalPaymentTerms.trim().split('\n').filter(line => line.trim()).length;
      }
      if (data.showInvoiceReminder) totalTerms++;

      // 根据条款数量决定使用单数还是复数形式
      const titleText = totalTerms === 1 ? 'Payment Term:' : 'Payment Terms:';
      // 显示付款条款标题
      doc.setFontSize(8);
      doc.setFont('NotoSansSC', 'bold');
      doc.text(titleText, margin, currentY);
      doc.setFont('NotoSansSC', 'normal');
      
      if (totalTerms === 1) {
        // 单条付款条款的情况，使用单行格式
        if (data.showPaymentTerms) {
          const term1Text = `Full paid not later than ${data.paymentDate} by telegraphic transfer.`;
          const term1Parts = term1Text.split(data.paymentDate);
          const firstPartWidth = doc.getTextWidth(term1Parts[0]);
          doc.text(term1Parts[0], margin + doc.getTextWidth('Payment Term: ') + 3, currentY);
          
          // 日期显示为红色
          doc.setTextColor(255, 0, 0);
          doc.text(data.paymentDate, margin + doc.getTextWidth('Payment Term: ') + firstPartWidth + 3, currentY);
          
          // 恢复黑色并绘制剩余部分
          doc.setTextColor(0, 0, 0);
          doc.text(term1Parts[1], margin + doc.getTextWidth('Payment Term: ') + firstPartWidth + doc.getTextWidth(data.paymentDate) + 3, currentY);
        } else if (data.additionalPaymentTerms && data.additionalPaymentTerms.trim()) {
          // 显示额外的付款条款
          const additionalTerm = data.additionalPaymentTerms.trim();
          doc.text(additionalTerm, margin + doc.getTextWidth('Payment Term: ') + 3, currentY);
        } else if (data.showInvoiceReminder) {
          // 只有发票号提醒时的布局
          const fullText = `Please state our invoice no. "${data.invoiceNo}" on your payment documents.`;
          const paymentTermsWidth = doc.getTextWidth('Payment Term: ') + 3; // 使用单数形式 'Term'
          
          // 绘制完整的黑色文本
          doc.text(fullText, margin + paymentTermsWidth, currentY);
          
          // 计算发票号的位置并用红色重绘
          const invoiceStartX = margin + paymentTermsWidth + doc.getTextWidth('Please state our invoice no. "');
          doc.setTextColor(255, 0, 0);
          doc.text(data.invoiceNo, invoiceStartX, currentY);
          doc.setTextColor(0, 0, 0);
        }
        currentY += 15;  // 单条付款条款时，与印章之间的间距设为15mm
      } else {
        // 多条付款条款的情况，使用编号列表格式
        currentY += 5;  // 标题和第一条之间的间距改为5mm
        
        const termLeftMargin = 25;
        const termRightMargin = 15;
        const maxWidth = pageWidth - termLeftMargin - termRightMargin;
        const termSpacing = 5;  // 条款之间的固定间距
        let termCount = 1;
        
        // 只有当showPaymentTerms为true时才显示第一条付款条款
        if (data.showPaymentTerms) {
          // 绘制条款编号
          doc.text(`${termCount}.`, 20, currentY);
          
          // 绘制第一部分文本
          const term1Text = `Full paid not later than ${data.paymentDate} by telegraphic transfer.`;
          const term1Parts = term1Text.split(data.paymentDate);
          const firstPartWidth = doc.getTextWidth(term1Parts[0]);
          doc.text(term1Parts[0], termLeftMargin, currentY);
          
          // 日期显示为红色
          doc.setTextColor(255, 0, 0);
          doc.text(data.paymentDate, termLeftMargin + firstPartWidth, currentY);
          
          // 恢复黑色并绘制剩余部分
          doc.setTextColor(0, 0, 0);
          doc.text(term1Parts[1], termLeftMargin + firstPartWidth + doc.getTextWidth(data.paymentDate), currentY);
          
          currentY += termSpacing;
          termCount++;
        }

        // 如果有额外的付款条款，显示为中间条款
        if (data.additionalPaymentTerms && data.additionalPaymentTerms.trim()) {
          const additionalTerms = data.additionalPaymentTerms.trim().split('\n').filter(line => line.trim());
          for (const term of additionalTerms) {
            // 绘制条款编号
            doc.text(`${termCount}.`, 20, currentY);
            
            // 处理长文本自动换行
            const textLines = doc.splitTextToSize(term.trim(), maxWidth);
            textLines.forEach((line: string, index: number) => {
              const lineY = currentY + (index * 4); // 同一条款内的行间距为4mm
              doc.text(line, termLeftMargin, lineY);
            });
            
            // 移动到下一个条款的位置
            currentY += Math.max(4 * (textLines.length - 1) + termSpacing, termSpacing);
            termCount++;
          }
        }
        
        // 发票号提示作为最后一条
        if (data.showInvoiceReminder) {
          doc.text(`${termCount}.`, 20, currentY);
          const lastTerm = `Please state our invoice no. "${data.invoiceNo}" on your payment documents.`;
          const term2Parts = lastTerm.split(`"${data.invoiceNo}"`);
          const secondPartWidth = doc.getTextWidth(term2Parts[0]);
          
          // 绘制第一部分
          doc.text(term2Parts[0], termLeftMargin, currentY);
          
          // 发票号显示为红色
          doc.setTextColor(255, 0, 0);
          doc.text(data.invoiceNo, termLeftMargin + secondPartWidth, currentY);
          
          // 恢复黑色并绘制最后部分
          doc.setTextColor(0, 0, 0);
          doc.text(term2Parts[1], termLeftMargin + secondPartWidth + doc.getTextWidth(data.invoiceNo), currentY);
          
          currentY += 15;  // 为印章预留空间
        }
      }
    }

    // 添加印章
    const stampImage = getStampImage(data.templateConfig.stampType);
    if (stampImage) {
      try {
        const stampImg = await loadImage(stampImage);
        // 根据印章类型设置不同的尺寸
        if (data.templateConfig.stampType === 'shanghai') {
          doc.addImage(stampImg, 'PNG', margin, currentY, 40, 40);  // 上海印章：40mm x 40mm
        } else {
          doc.addImage(stampImg, 'PNG', margin, currentY, 73, 34);  // 其他印章保持原有尺寸
        }
      } catch (error) {
        console.error('Error loading stamp image:', error);
      }
    }

    if (preview) {
      // 确保所有页面都有页码
      const totalPages = doc.getNumberOfPages();
      const pageHeight = doc.internal.pageSize.height;
      
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        // 清除页面底部区域
        doc.setFillColor(255, 255, 255);
        doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
        
        // 添加页码
        const str = `Page ${i} of ${totalPages}`;
        doc.setFontSize(8);
        doc.setFont('NotoSansSC', 'normal');
        doc.text(str, pageWidth - margin, pageHeight - 12, { align: 'right' });
      }
      
      return doc.output('bloburl');
    } else {
      // 确保所有页面都有页码
      const totalPages = doc.getNumberOfPages();
      const pageHeight = doc.internal.pageSize.height;
      
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        // 清除页面底部区域
        doc.setFillColor(255, 255, 255);
        doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
        
        // 添加页码
        const str = `Page ${i} of ${totalPages}`;
        doc.setFontSize(8);
        doc.setFont('NotoSansSC', 'normal');
        doc.text(str, pageWidth - margin, pageHeight - 12, { align: 'right' });
      }
      
      // 获取当前日期并格式化
      const currentDate = new Date();
      const formattedDate = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}`;

      // 保存文件，文件名中包含日期
      doc.save(`${getInvoiceTitle(data)}-${data.invoiceNo}-${formattedDate}.pdf`);
    }
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
} 