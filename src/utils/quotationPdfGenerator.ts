import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { QuotationData } from '@/types/quotation';
import { loadImage } from '@/utils/pdfHelpers';
import { UserOptions, RowInput } from 'jspdf-autotable';

// 扩展jsPDF类型
interface ExtendedJsPDF extends jsPDF {
  lastAutoTable: {
    finalY: number;
  };
  autoTable: (options: UserOptions) => void;
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

// 生成报价单PDF
export const generateQuotationPDF = async (data: QuotationData, preview = false): Promise<Blob> => {
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
        const title = 'QUOTATION';
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
      const title = 'QUOTATION';
      const titleWidth = doc.getTextWidth(title);
      const titleY = margin + 5;  // 标题Y坐标
      doc.text(title, (pageWidth - titleWidth) / 2, titleY);  // 标题位置
      startY = titleY + 10;  // 主体内容从标题下方开始
    }

    // 设置字体和样式
    doc.setFontSize(8);
    doc.setFont('NotoSansSC', 'normal');
    
    // 从 startY 开始绘制主体内容
    let currentY = startY;

    // 右侧信息区域
    const rightColumnWidth = 60;  // 右侧列宽度
    const rightColumnStart = pageWidth - rightColumnWidth - margin;
    const rightMargin = pageWidth - margin;
    const colonX = rightMargin - 20;  // 设置冒号的固定X坐标位置

    // 定义右侧信息项
    const infoItems = [
      { label: 'Quotation No.', value: data.quotationNo, valueColor: [255, 0, 0] },
      { label: 'Date', value: data.date },
      { label: 'From', value: data.from },
      { label: 'Currency', value: data.currency }
    ];

    // 绘制右侧信息
    infoItems.forEach((item, index) => {
      const y = startY + (index * 5);
      doc.setFont('NotoSansSC', 'bold');
      doc.text(item.label, colonX, y, { align: 'right' });
      doc.setFont('NotoSansSC', 'normal');
      doc.text(':', colonX + 1, y);
      
      // 设置文本颜色
      if (item.valueColor) {
        doc.setTextColor(item.valueColor[0], item.valueColor[1], item.valueColor[2]);
      }
      doc.text(item.value, colonX + 3, y);
      // 重置回黑色
      if (item.valueColor) {
        doc.setTextColor(0, 0, 0);
      }
    });

    // 客户信息区域
    const leftMargin = 20;
    doc.setFont('NotoSansSC', 'bold');
    doc.text('To:', leftMargin, currentY);
    doc.setFont('NotoSansSC', 'normal');
    const toTextWidth = doc.getTextWidth('To: ') + 1.5;

    // 计算左侧文本的最大宽度（考虑右侧信息区域）
    const maxWidth = rightColumnStart - leftMargin - toTextWidth - 5; // 5mm作为安全间距
    
    // 记录客户信息的初始Y位置
    const customerInfoStartY = currentY;
    
    // 处理客户信息自动换行
    const toText = data.to.trim();
    if (toText) {
      const wrappedLines = doc.splitTextToSize(toText, maxWidth);
      wrappedLines.forEach((line: string) => {
        doc.text(line, leftMargin + toTextWidth, currentY);
        currentY += 3.5;
      });
    }

    // 计算询价编号的起始位置
    const inquiryNoStartY = Math.max(customerInfoStartY + 10, currentY + 2); // 至少在客户信息起始位置下方15mm
    currentY = inquiryNoStartY;

    // 显示询价编号
    doc.setFont('NotoSansSC', 'bold');
    doc.text('Inquiry No.:', leftMargin, currentY);
    doc.setFont('NotoSansSC', 'normal');
    const inquiryNoX = leftMargin + doc.getTextWidth('Inquiry No.: ') + 2;

    const inquiryNoText = data.inquiryNo ? data.inquiryNo.trim() : '';
    const wrappedInquiryNo = doc.splitTextToSize(inquiryNoText, maxWidth);
    wrappedInquiryNo.forEach((line: string, index: number) => {
      doc.text(line, inquiryNoX, currentY + (index * 3.5));
    });
    currentY += (wrappedInquiryNo.length * 3.5);

    // 添加感谢语
    currentY += 5;  // 增加一些间距
    doc.setFont('NotoSansSC', 'normal');
    doc.text('Thanks for your inquiry, and our best offer is as follows:', leftMargin, currentY);
    
    // 使用 autoTable
    doc.autoTable({
      startY: currentY + 3,  // 在感谢语下方留出空间
      head: [['No.', 'Part Name', ...(data.showDescription ? ['Description'] : []), 'Q\'TY', 'Unit', 'U/Price', 'Amount', ...(data.showRemarks ? ['Remarks'] : [])]],
      body: [
        // 常规商品行 - 当数量为 0 时，数量和单位都显示空字符串
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
            content: item.quantity || '',
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
      margin: { left: 15, right: 15 },
      tableWidth: pageWidth - 30,  // 设置表格宽度为页面宽度减去左右边距
      didDrawPage: (data) => {
        // 清除页面底部区域并添加页码的通用函数
        const addPageNumber = () => {
          const pageHeight = doc.internal.pageSize.height;
          // 清除页面底部区域
          doc.setFillColor(255, 255, 255);
          doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
          
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

    // 添加总金额（总是和表格在同一页）
    const itemsTotal = data.items.reduce((sum, item) => sum + item.amount, 0);
    const feesTotal = (data.otherFees || []).reduce((sum, fee) => sum + fee.amount, 0);
    const totalAmount = itemsTotal + feesTotal;

    // 显示总金额
    doc.setFontSize(10);
    doc.setFont('NotoSansSC', 'bold');
    const totalAmountLabel = 'Total Amount:';
    const totalAmountValue = `${currencySymbols[data.currency]}${totalAmount.toFixed(2)}`;
    const valueX = pageWidth - margin - 5;
    const labelX = valueX - doc.getTextWidth(totalAmountValue) - 28;

    doc.text(totalAmountLabel, labelX, currentY);
    doc.text(totalAmountValue, valueX, currentY, { align: 'right' });

    // 检查 Notes 部分是否需要新页面
    currentY += 15; // 在总金额下方留出更多空间
    const pageHeight = doc.internal.pageSize.height;
    const remainingSpace = pageHeight - currentY;

    // 如果剩余空间小于40mm（预估Notes等内容的最小需求），整体移到新页面
    if (remainingSpace < 40) {
      doc.addPage();
      currentY = 20; // 在新页面上重置Y坐标
    }

    // 过滤掉空行，并检查是否有有效的 notes
    const validNotes = data.notes?.filter(note => note.trim() !== '') || [];

    if (validNotes.length > 0) {
      // 检查剩余空间是否足够显示 Notes
      const remainingSpace = pageHeight - currentY;
      if (remainingSpace < 40) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(8);
      doc.setFont('NotoSansSC', 'bold');
      doc.text('Notes:', leftMargin, currentY);
      
      // 设置普通字体用于条款内容
      doc.setFont('NotoSansSC', 'normal');
      
      const numberWidth = doc.getTextWidth('10.'); // 预留序号宽度
      const contentMaxWidth = pageWidth - leftMargin - margin - numberWidth - 5; // 内容最大宽度
      
      // 显示所有有效条款
      validNotes.forEach((note, index) => {
        currentY += 5;
        // 显示序号
        doc.text(`${index + 1}.`, leftMargin, currentY);
        
        // 处理长文本自动换行
        const wrappedText = doc.splitTextToSize(note.trim(), contentMaxWidth);
        wrappedText.forEach((line: string, lineIndex: number) => {
          const lineY = currentY + (lineIndex * 4);
          doc.text(line, leftMargin + numberWidth, lineY);
        });
        
        // 更新Y坐标，确保下一条款在当前条款所有行之后
        currentY += (wrappedText.length - 1) * 4;
      });
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
    doc.save(`Quotation-${data.quotationNo}-${formattedDate}.pdf`);
    return new Blob(); // 返回空 Blob 以满足类型要求
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}; 