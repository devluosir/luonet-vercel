import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { QuotationData } from '@/types/quotation';
import { loadImage } from '@/utils/pdfHelpers';
import { UserOptions, RowInput } from 'jspdf-autotable';

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
  getNumberOfPages: () => number;
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
          {
            content: (index + 1).toString(),
            styles: { halign: 'center' as const }
          },
          {
            content: item.partName,
            styles: item.highlight?.partName ? { textColor: [255, 0, 0] } : {}
          },
          ...(data.showDescription ? [{
            content: item.description || '',
            styles: item.highlight?.description ? { textColor: [255, 0, 0] } : {}
          }] : []),
          {
            content: item.quantity === 0 ? '' : item.quantity,
            styles: item.highlight?.quantity ? { textColor: [255, 0, 0] } : {}
          },
          {
            content: getUnitDisplay(item.unit || '', item.quantity || 0),
            styles: item.highlight?.unit ? { textColor: [255, 0, 0] } : {}
          },
          {
            content: item.unitPrice === 0 ? '' : item.unitPrice.toFixed(2),
            styles: item.highlight?.unitPrice ? { textColor: [255, 0, 0] } : {}
          },
          {
            content: item.amount === 0 ? '' : item.amount.toFixed(2),
            styles: item.highlight?.amount ? { textColor: [255, 0, 0] } : {}
          },
          ...(data.showRemarks ? [{
            content: item.remarks || '',
            styles: item.highlight?.remarks ? { textColor: [255, 0, 0] } : {}
          }] : [])
        ]),
        // Other Fees 行
        ...(data.otherFees || []).map(fee => [
          {
            content: fee.description,
            colSpan: data.showDescription ? 6 : 5,
            styles: { 
              halign: 'center' as const,
              ...(fee.highlight?.description ? { textColor: [255, 0, 0] } : {})
            }
          },
          {
            content: fee.amount === 0 ? '' : fee.amount.toFixed(2),
            styles: {
              halign: 'center' as const,
              ...(fee.highlight?.amount ? { textColor: [255, 0, 0] } : {})
            }
          },
          ...(data.showRemarks ? [{
            content: fee.remarks || '',
            styles: {
              halign: 'center' as const,
              ...(fee.highlight?.remarks ? { textColor: [255, 0, 0] } : {})
            }
          }] : [])
        ])
      ] as unknown as RowInput[],
      theme: 'plain',
      showHead: 'everyPage',
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
      margin: { left: 15, right: 15, bottom: 20 },  // 增加底部边距
      tableWidth: pageWidth - 30,  // 设置表格宽度为页面宽度减去左右边距
      didParseCell: (data) => {
        const pageHeight = data.doc.internal.pageSize.height;
        const bottomMargin = 25;
        
        if (data.row.index > 0 && 
            data.cursor && 
            (data.cell.y + data.cell.height) > (pageHeight - bottomMargin)) {
          data.cursor.y = 0;
        }
      },
      didDrawPage: (data) => {
        // 清除页面底部区域并添加页码的通用函数
        const addPageNumber = () => {
          const pageHeight = doc.internal.pageSize.height;
          // 清除页面底部区域
          doc.setFillColor(255, 255, 255);
          doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
          
          // 添加页码
          const totalPages = doc.getNumberOfPages();
          const str = `Page ${data.pageNumber} of ${totalPages}`;
          doc.setFontSize(8);
          doc.setFont('NotoSansSC', 'normal');
          doc.text(str, pageWidth - margin, pageHeight - 12, { align: 'right' });
        };

        // 在每页绘制时添加页码
        addPageNumber();
      },
      didDrawCell: (data) => {
        // 确保绘制所有单元格的边框
        const cell = data.cell;
        const doc = data.doc;
        
        // 绘制单元格的所有边框
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.1);
        doc.line(cell.x, cell.y, cell.x + cell.width, cell.y); // 上边框
        doc.line(cell.x, cell.y + cell.height, cell.x + cell.width, cell.y + cell.height); // 下边框
        doc.line(cell.x, cell.y, cell.x, cell.y + cell.height); // 左边框
        doc.line(cell.x + cell.width, cell.y, cell.x + cell.width, cell.y + cell.height); // 右边框
      }
    });

    // 获取表格结束的Y坐标
    const finalY = doc.lastAutoTable.finalY || currentY;
    currentY = finalY + 10;

    // 检查剩余空间是否足够显示总金额
    const pageHeight = doc.internal.pageSize.height;
    const requiredSpace = 20; // 显示总金额所需的最小空间(mm)
    
    // 如果当前页剩余空间不足，添加新页面
    if (pageHeight - currentY < requiredSpace) {
      doc.addPage();
      currentY = margin + 10;
    }

    // 添加总金额
    const itemsTotal = data.items.reduce((sum, item) => sum + item.amount, 0);
    const feesTotal = (data.otherFees || []).reduce((sum, fee) => sum + fee.amount, 0);
    const total = itemsTotal + feesTotal;
    
    doc.setFontSize(10);
    doc.setFont('NotoSansSC', 'bold');
    const totalAmountLabel = 'Total Amount:';
    const totalAmountValue = `${currencySymbols[data.currency]}${total.toFixed(2)}`;
    const valueX = pageWidth - margin - 5;
    const labelX = valueX - doc.getTextWidth(totalAmountValue) - 28;

    doc.text(totalAmountLabel, labelX, currentY);
    doc.text(totalAmountValue, valueX, currentY, { align: 'right' });

    // 更新currentY，为后续内容预留空间
    currentY += 10;

    // 计算印章尺寸
    const stampWidth = 73;  // 香港印章宽度：73mm
    const stampHeight = 34; // 香港印章高度：34mm
    const stampX = pageWidth - stampWidth - margin - 10;  // 靠右对齐，留出10mm右边距

    // 检查Notes和其他内容是否会导致印章单独出现在下一页
    const validNotes = data.notes?.filter(note => note.trim() !== '') || [];
    const estimatedLineHeight = 5; // 每行文本的估计高度
    
    // 更准确地估算Notes所需高度
    let notesHeight = 0;
    if (validNotes.length > 0) {
      notesHeight = 13; // Notes标题的高度
      validNotes.forEach(note => {
        const wrappedText = doc.splitTextToSize(note, pageWidth - (margin * 2) - doc.getTextWidth('1. '));
        notesHeight += wrappedText.length * estimatedLineHeight;
      });
    }

    // 更准确地估算银行信息高度
    const bankInfoHeight = data.showBank ? 45 : 0; // 考虑到标题和5行信息

    // 更准确地估算付款条款高度
    let paymentTermsHeight = 0;
    if (data.showPaymentTerms || data.additionalPaymentTerms || data.showInvoiceReminder) {
      paymentTermsHeight = 10; // 标题高度
      if (data.showPaymentTerms) {
        paymentTermsHeight += estimatedLineHeight;
      }
      if (data.additionalPaymentTerms) {
        const terms = data.additionalPaymentTerms.split('\n').filter(term => term.trim());
        terms.forEach(term => {
          const wrappedText = doc.splitTextToSize(term, pageWidth - (margin * 2) - doc.getTextWidth('1. '));
          paymentTermsHeight += wrappedText.length * estimatedLineHeight;
        });
      }
      if (data.showInvoiceReminder) {
        paymentTermsHeight += estimatedLineHeight;
      }
    }

    const totalContentHeight = notesHeight + bankInfoHeight + paymentTermsHeight + 15; // 添加15mm作为内容间距
    
    // 检查当前页剩余空间
    const remainingSpace = pageHeight - currentY;
    const stampWithContentHeight = stampHeight + 10; // 印章高度加上10mm边距
    
    // 如果剩余空间不足以容纳所有内容和印章，但足够容纳内容，则先添加内容
    const contentFitsCurrentPage = remainingSpace >= totalContentHeight;
    const stampNeedsNewPage = remainingSpace < (totalContentHeight + stampWithContentHeight);
    
    // 如果内容可以放在当前页，但加上印章后空间不够，则印章需要放到下一页
    const stampWillBeAlone = contentFitsCurrentPage && stampNeedsNewPage;

    // 如果印章会单独出现在下一页，则先放置印章
    if (data.showStamp && stampWillBeAlone) {
      try {
        const stampImage = await loadImage('/images/stamp-hongkong.png');
        if (!stampImage) {
          throw new Error('Failed to load stamp image');
        }

        // 设置印章透明度为0.9
        doc.saveGraphicsState();
        doc.setGState(new doc.GState({ opacity: 0.9 }));
        
        // 在总金额下方添加印章
        doc.addImage(
          stampImage,
          'PNG',
          stampX,
          currentY - 10, // 稍微上移一点，与总金额更紧凑
          stampWidth,
          stampHeight
        );

        // 恢复透明度
        doc.restoreGraphicsState();

      } catch (error) {
        console.error('Error loading stamp:', error);
      }
    }

    // 检查 Notes 部分是否需要新页面
    if (remainingSpace < 40) {
      doc.addPage();
      currentY = 20; // 在新页面上重置Y坐标
    }

    // 添加备注
    if (validNotes.length > 0) {
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
      // 检查剩余空间是否足够显示银行信息
      const remainingSpace = pageHeight - currentY;
      if (remainingSpace < 40) {
        doc.addPage();
        currentY = 20;
      }

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

    // 添加签名区域 - 仅在印章没有被提前放置时添加
    if (data.showStamp && !stampWillBeAlone) {
      try {
        const stampImage = await loadImage('/images/stamp-hongkong.png');
        if (!stampImage) {
          throw new Error('Failed to load stamp image: Image is null');
        }

        // 计算页面底部边界
        const pageBottom = doc.internal.pageSize.height - margin;
        
        // 印章位置跟随在付款条款下方
        let stampY = currentY + 5;  // 在付款条款下方留出5mm间距

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

    // 如果是预览模式，返回 blob
    if (preview) {
      // 确保所有页面都有页码
      const totalPages = doc.getNumberOfPages();
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
      return doc.output('blob');
    }
    
    // 获取当前日期并格式化
    const currentDate = new Date();
    const formattedDate = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}`;

    // 保存文件，不再需要单独添加页码，因为已经在 didDrawPage 中处理了
    doc.save(`Sales Confirmation ${data.quotationNo}-${formattedDate}.pdf`);
    return new Blob();
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}; 