import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { QuotationData } from '@/types/quotation';
import { loadImage } from '@/utils/pdfHelpers';
import { UserOptions } from 'jspdf-autotable';

// 扩展jsPDF类型
type ExtendedJsPDF = jsPDF & {
  lastAutoTable: {
    finalY: number;
  };
  autoTable: (options: UserOptions) => void;
  saveGraphicsState: () => jsPDF;
  restoreGraphicsState: () => jsPDF;
  GState: new (options: { opacity: number }) => unknown;
  setGState: (gState: unknown) => void;
}

// 货币符号映射
const currencySymbols: { [key: string]: string } = {
  USD: '$',
  EUR: '€',
  CNY: '¥'
};

// 默认单位列表（需要单复数变化的单位）
const defaultUnits = ['pc', 'set', 'length'];

// 处理单位的单复数
const getUnitDisplay = (baseUnit: string, quantity: number) => {
  const singularUnit = baseUnit.replace(/s$/, '');
  if (defaultUnits.includes(singularUnit)) {
    return quantity > 1 ? `${singularUnit}s` : singularUnit;
  }
  return baseUnit; // 自定义单位不变化单复数
};

export const generateOrderConfirmationPDF = async (data: QuotationData, preview = false): Promise<Blob> => {
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
  const margin = 20;
  let startY = margin;

  try {
    // 添加表头
    try {
      const headerImage = await loadImage('/images/header-bilingual.png');
      if (headerImage) {
        const imgWidth = pageWidth - 30;
        const imgHeight = (headerImage.height * imgWidth) / headerImage.width;
        doc.addImage(headerImage, 'PNG', 15, 15, imgWidth, imgHeight);
        
        doc.setFontSize(14);
        doc.setFont('NotoSansSC', 'bold');
        const title = 'SALES CONFIRMATION';
        const titleWidth = doc.getTextWidth(title);
        const titleY = margin + imgHeight + 5;
        doc.text(title, (pageWidth - titleWidth) / 2, titleY);
        startY = titleY + 10;
      }
    } catch (error) {
      console.error('Error processing header:', error);
      doc.setFontSize(14);
      doc.setFont('NotoSansSC', 'bold');
      const title = 'SALES CONFIRMATION';
      const titleWidth = doc.getTextWidth(title);
      const titleY = margin + 5;
      doc.text(title, (pageWidth - titleWidth) / 2, titleY);
      startY = titleY + 10;
    }

    // 设置字体和样式
    doc.setFontSize(8);
    doc.setFont('NotoSansSC', 'normal');
    
    let currentY = startY;

    // 右上角信息区域
    const rightMargin = pageWidth - 20;
    const rightInfoY = startY;
    const colonX = rightMargin - 15;  // 冒号的固定位置
    
    doc.setFont('NotoSansSC', 'bold');
    
    // Contract No.
    doc.text('Contract No.', colonX - 2, rightInfoY, { align: 'right' });
    doc.text(':', colonX, rightInfoY);
    doc.setTextColor(255, 0, 0); // 设置文字颜色为红色
    doc.text(data.contractNo || '', colonX + 3, rightInfoY);
    doc.setTextColor(0, 0, 0); // 恢复文字颜色为黑色
    
    // Date
    doc.text('Date', colonX - 2, rightInfoY + 5, { align: 'right' });
    doc.text(':', colonX, rightInfoY + 5);
    doc.text(data.date || '', colonX + 3, rightInfoY + 5);

    // From
    doc.text('From', colonX - 2, rightInfoY + 10, { align: 'right' });
    doc.text(':', colonX, rightInfoY + 10);
    doc.text(data.from || '', colonX + 3, rightInfoY + 10);
    
    // Currency
    doc.text('Currency', colonX - 2, rightInfoY + 15, { align: 'right' });
    doc.text(':', colonX, rightInfoY + 15);
    doc.text(data.currency || '', colonX + 3, rightInfoY + 15);

    // 客户信息区域
    const leftMargin = 20;
    
    // To: 区域
    doc.text('To:', leftMargin, currentY);
    const toTextWidth = doc.getTextWidth('To: ');
    
    // 计算右侧信息区域的起始位置（从右边缘减去合适的宽度）
    const rightColumnWidth = 50; // 右侧信息列的宽度（mm）
    const rightColumnStart = pageWidth - rightColumnWidth - margin;

    // 计算左侧文本的最大宽度（考虑右侧信息区域）
    const maxWidth = rightColumnStart - leftMargin - toTextWidth - 5; // 5mm作为安全间距
    
    // 处理客户信息自动换行
    const toText = data.to.trim();
    if (toText) {
      const wrappedLines = doc.splitTextToSize(toText, maxWidth);
      wrappedLines.forEach((line: string) => {
        doc.text(line, leftMargin + toTextWidth, currentY);
        currentY += 3.5;
      });
    }

    // Order No. 区域 - 设置固定的起始位置
    currentY = Math.max(currentY + 2, startY + 10);  // 确保最小起始位置
    doc.text('Order No.:', leftMargin, currentY);
    const orderNoX = leftMargin + doc.getTextWidth('Order No.: ');
    
    // 处理订单号自动换行，使用相同的最大宽度
    if (data.inquiryNo) {
      const wrappedOrderNo = doc.splitTextToSize(data.inquiryNo.trim(), maxWidth);
      wrappedOrderNo.forEach((line: string, index: number) => {
        doc.text(line, orderNoX, currentY + (index * 3.5));
      });
      currentY += (wrappedOrderNo.length - 1) * 3.5;
    }
   // 恢复普通字体
   doc.setFont('NotoSansSC', 'normal');
    // 添加确认文本，增加与上方Order No.的间距
    currentY = Math.max(currentY + 8, startY + 20);  // 设置最小起始位置为startY + 25
    doc.setFontSize(8);
    doc.text('We hereby confirm having sold to you the following goods on terms and condition as specified below:', leftMargin, currentY);

    // 确保表格与确认文本有8mm的固定间距
    currentY += 3;  // 固定8mm的间距

    // 使用 autoTable
    doc.autoTable({
      startY: currentY,
      head: [['No.', 'Part Name', ...(data.showDescription ? ['Description'] : []), 'Q\'TY', 'Unit', 'U/Price', 'Amount', ...(data.showRemarks ? ['Remarks'] : [])]],
      body: [
        // 常规商品行
        ...data.items.map((item, index) => [
          index + 1,
          {
            content: item.partName,
            styles: item.highlight?.partName ? { textColor: [255, 0, 0] as [number, number, number] } : {}
          },
          ...(data.showDescription ? [{
            content: item.description || '',
            styles: item.highlight?.description ? { textColor: [255, 0, 0] as [number, number, number] } : {}
          }] : []),
          {
            content: item.quantity === 0 ? '' : item.quantity,
            styles: item.highlight?.quantity ? { textColor: [255, 0, 0] as [number, number, number] } : {}
          },
          {
            content: getUnitDisplay(item.unit || '', item.quantity || 0),
            styles: item.highlight?.unit ? { textColor: [255, 0, 0] as [number, number, number] } : {}
          },
          {
            content: item.unitPrice === 0 ? '' : item.unitPrice.toFixed(2),
            styles: item.highlight?.unitPrice ? { textColor: [255, 0, 0] as [number, number, number] } : {}
          },
          {
            content: item.amount === 0 ? '' : item.amount.toFixed(2),
            styles: item.highlight?.amount ? { textColor: [255, 0, 0] as [number, number, number] } : {}
          },
          ...(data.showRemarks ? [{
            content: item.remarks || '',
            styles: item.highlight?.remarks ? { textColor: [255, 0, 0] as [number, number, number] } : {}
          }] : [])
        ]),
        // Other Fees 行
        ...(data.otherFees || []).map(fee => [
          {
            content: fee.description,
            colSpan: data.showDescription ? 6 : 5,
            styles: { 
              halign: 'center' as const,
              ...(fee.highlight?.description ? { textColor: [255, 0, 0] as [number, number, number] } : {})
            }
          } as unknown as string,
          {
            content: fee.amount === 0 ? '' : fee.amount.toFixed(2),
            styles: {
              halign: 'center' as const,
              ...(fee.highlight?.amount ? { textColor: [255, 0, 0] as [number, number, number] } : {})
            }
          },
          ...(data.showRemarks ? [{
            content: fee.remarks || '',
            styles: {
              halign: 'center' as const,
              ...(fee.highlight?.remarks ? { textColor: [255, 0, 0] as [number, number, number] } : {})
            }
          }] : [])
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
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },  // No.
        1: { halign: 'center', cellWidth: 'auto' },  // Part Name
        ...(data.showDescription ? { 2: { halign: 'center', cellWidth: 'auto' } } : {}),  // Description
        [data.showDescription ? 3 : 2]: { halign: 'center', cellWidth: 15 },  // Q'TY
        [data.showDescription ? 4 : 3]: { halign: 'center', cellWidth: 15 },  // Unit
        [data.showDescription ? 5 : 4]: { halign: 'center', cellWidth: 20 },  // U/Price
        [data.showDescription ? 6 : 5]: { halign: 'center', cellWidth: 20 },  // Amount
        ...(data.showRemarks ? { [data.showDescription ? 7 : 6]: { halign: 'center', cellWidth: 'auto' } } : {})  // Remarks
      } as { [key: number]: { cellWidth: number | 'auto', halign: 'center' } },
      margin: { left: 15, right: 15 },
      tableWidth: pageWidth - 30,  // 设置表格宽度为页面宽度减去左右边距
      didDrawPage: () => {
        // 在每页绘制页眉（如果需要）
      },
      willDrawCell: (hookData) => {
        // 在绘制每个单元格之前检查是否需要分页
        const pageHeight = doc.internal.pageSize.height;
        const table = hookData.table;
        const row = hookData.row;
        const cursor = hookData.cursor;
        const isNewPage = row.index === 0 && table.pageCount > 1;

        // 检查当前位置是否接近页面底部
        if (!isNewPage && cursor && (cursor.y + row.height > pageHeight - 40)) {
          doc.addPage();
          cursor.y = 20; // 在新页面上设置初始 y 坐标
        }
      }
    });

    // 获取表格结束的Y坐标
    const finalY = doc.lastAutoTable.finalY || currentY;
    currentY = finalY + 10;

    // 检查剩余空间是否足够显示总金额和其他内容
    const pageHeight = doc.internal.pageSize.height;
    const remainingSpace = pageHeight - currentY;
    const estimatedContentHeight = 150; // 估计总金额、银行信息、付款条款等内容的高度

    if (remainingSpace < estimatedContentHeight) {
      doc.addPage();
      currentY = 20; // 在新页面上重置Y坐标
    }

    // 添加总金额
    const itemsTotal = data.items.reduce((sum, item) => sum + item.amount, 0);
    const feesTotal = (data.otherFees || []).reduce((sum, fee) => sum + fee.amount, 0);
    const total = itemsTotal + feesTotal;
    doc.setFontSize(10);
    doc.setFont('NotoSansSC', 'bold');
    const totalText = `Total Amount: ${currencySymbols[data.currency]}${total.toFixed(2)}`;
    doc.text(totalText, pageWidth - 20 - doc.getTextWidth(totalText), currentY);

    // 添加备注
    if (data.notes && data.notes.length > 0 && data.notes.some(note => note.trim() !== '')) {
      currentY += 8;
      doc.setFontSize(9);
      doc.setFont('NotoSansSC', 'bold');
      doc.text('Notes:', leftMargin, currentY);
      currentY += 5;
      
      doc.setFont('NotoSansSC', 'normal');
      // 使用页面宽度减去左右边距作为 Notes 的最大宽度
      const notesMaxWidth = pageWidth - (margin * 2);
      
      // 过滤掉空行，并重新计算序号
      const validNotes = data.notes.filter(line => line.trim() !== '');
      
      validNotes.forEach((line: string, index: number) => {
        // 添加编号
        const numberText = `${index + 1}. `;
        const numberWidth = doc.getTextWidth(numberText);
        doc.text(numberText, leftMargin, currentY);
        
        // 处理长文本自动换行，考虑编号的宽度
        const wrappedText = doc.splitTextToSize(line, notesMaxWidth - numberWidth);
        wrappedText.forEach((textLine: string, lineIndex: number) => {
          doc.text(textLine, leftMargin + numberWidth, currentY + (lineIndex * 5));
        });
        
        // 更新Y坐标到最后一行之后
        currentY += wrappedText.length * 5;
      });
    }

    // 添加银行信息
    if (data.showBank) {
      currentY += 5;
      doc.setFontSize(9);
      doc.setFont('NotoSansSC', 'bold');
      doc.text('Bank Information:', leftMargin, currentY);
      currentY += 5;
      
      const bankInfo = [
        { label: 'Bank Name:', value: 'The Hongkong and Shanghai Banking Corporation Limited' },
        { label: 'Swift code:', value: 'HSBCHKHHHKH' },
        { label: 'Bank address:', value: 'Head Office 1 Queen\'s Road Central Hong Kong' },
        { label: 'A/C No.:', value: '801470337838' },
        { label: 'Beneficiary:', value: 'Luo & Company Co., Limited' }
      ];

      bankInfo.forEach(info => {
        doc.setFont('NotoSansSC', 'bold');
        doc.text(info.label, leftMargin, currentY);
        doc.setFont('NotoSansSC', 'normal');
        doc.text(info.value, leftMargin + doc.getTextWidth(info.label) + 2, currentY);
        currentY += 5;
      });
    }

    // 添加付款条款
    if (data.showPaymentTerms || data.additionalPaymentTerms || data.showInvoiceReminder) {
      currentY += 5;
      doc.setFontSize(8);
      doc.setFont('NotoSansSC', 'bold');
      doc.text('Payment Terms:', margin, currentY);
      doc.setFont('NotoSansSC', 'normal');
      currentY += 5;

      let termIndex = 1;

      if (data.showPaymentTerms) {
        const term1Text = `${termIndex}. Full paid not later than ${data.paymentDate} by telegraphic transfer.`;
        const term1Parts = term1Text.split(data.paymentDate);
        const firstPartWidth = doc.getTextWidth(term1Parts[0]);
        doc.text(term1Parts[0], margin, currentY);
        
        // 日期显示为红色
        doc.setTextColor(255, 0, 0);
        doc.text(data.paymentDate, margin + firstPartWidth, currentY);
        
        // 恢复黑色并绘制剩余部分
        doc.setTextColor(0, 0, 0);
        doc.text(term1Parts[1], margin + firstPartWidth + doc.getTextWidth(data.paymentDate), currentY);
        currentY += 5;
        termIndex++;
      }

      // 显示额外的付款条款
      if (data.additionalPaymentTerms) {
        const terms = data.additionalPaymentTerms.split('\n').filter(term => term.trim());
        terms.forEach(term => {
          // 计算可用宽度（页面宽度减去左右边距和序号宽度）
          const numberText = `${termIndex}. `;
          const numberWidth = doc.getTextWidth(numberText);
          const maxWidth = pageWidth - (margin * 2) - numberWidth;

          // 添加序号
          doc.text(numberText, margin, currentY);

          // 处理长文本自动换行
          const wrappedText = doc.splitTextToSize(term, maxWidth);
          wrappedText.forEach((line: string, lineIndex: number) => {
            doc.text(line, margin + numberWidth, currentY + (lineIndex * 5));
          });

          // 更新Y坐标到最后一行之后
          currentY += wrappedText.length * 5;
          termIndex++;
        });
      }

      // 显示发票号提醒
      if (data.showInvoiceReminder) {
        const reminderText = `${termIndex}. Please state our contract no. "${data.contractNo}" on your payment documents.`;
        const parts = reminderText.split(`"${data.contractNo}"`);
        
        doc.text(parts[0], margin, currentY);
        doc.setTextColor(255, 0, 0);
        doc.text(data.contractNo, margin + doc.getTextWidth(parts[0]), currentY);
        doc.setTextColor(0, 0, 0);
        doc.text(parts[1], margin + doc.getTextWidth(parts[0]) + doc.getTextWidth(data.contractNo), currentY);
        currentY += 5;
      }
    }

    // 添加签名区域
    if (data.showStamp) {
      try {
        const stampImage = await loadImage('/images/stamp-hongkong.png');
        if (!stampImage) {
          throw new Error('Failed to load stamp image: Image is null');
        }

        // 计算印章位置
        const stampWidth = 73;  // 香港印章宽度：73mm
        const stampHeight = 34; // 香港印章高度：34mm
        
        // 计算页面底部边界
        const pageBottom = doc.internal.pageSize.height - margin;
        
        // 印章位置跟随在付款条款下方
        let stampY = currentY + 5;  // 在付款条款下方留出10mm间距
        const stampX = pageWidth - stampWidth - margin - 10;  // 靠右对齐，留出10mm右边距

        // 确保印章不会超出页面底部
        if (stampY + stampHeight > pageBottom) {
          doc.addPage();
          stampY = margin;
          currentY = margin;
        }

        // 设置印章透明度为0.9
        doc.saveGraphicsState();
        doc.setGState(new doc.GState({ opacity: 0.9 }));
        
        doc.addImage(
          stampImage,
          'PNG',
          stampX,
          stampY,
          stampWidth,
          stampHeight
        );

        // 恢复透明度
        doc.restoreGraphicsState();

        // 更新当前Y坐标
        currentY = stampY + stampHeight + 5;
      } catch (error) {
        console.error('Error loading stamp:', error instanceof Error ? error.message : 'Unknown error');
      }
    }

    

    // 根据模式选择保存或返回预览URL
    if (preview) {
      return doc.output('blob');
    }
    
    // 获取当前日期并格式化
    const currentDate = new Date();
    const formattedDate = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}`;

    // 保存文件，文件名中包含日期
    doc.save(`Sales Confirmation ${data.quotationNo}-${formattedDate}.pdf`);
    return new Blob();
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}; 