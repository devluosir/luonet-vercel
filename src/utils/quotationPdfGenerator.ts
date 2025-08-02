import jsPDF, { ImageProperties } from 'jspdf';
import 'jspdf-autotable';
import { QuotationData } from '@/types/quotation';
import { UserOptions } from 'jspdf-autotable';
import { embeddedResources } from '@/lib/embedded-resources';
import { generateTableConfig } from './pdfTableGenerator';
import { addChineseFontsToPDF } from '@/utils/fontLoader';

// 扩展jsPDF类型
interface ExtendedJsPDF extends jsPDF {
  lastAutoTable: {
    finalY: number;
  };
  autoTable: (options: UserOptions) => void;
  getNumberOfPages: () => number;
  getImageProperties: (image: string) => ImageProperties;
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
const _getUnitDisplay = (baseUnit: string, quantity: number) => {
  const singularUnit = baseUnit.replace(/s$/, '');
  if (defaultUnits.includes(singularUnit)) {
    return quantity > 1 ? `${singularUnit}s` : singularUnit;
  }
  return baseUnit; // 自定义单位不变化单复数
};

// 生成报价单PDF
export const generateQuotationPDF = async (data: QuotationData, preview = false): Promise<Blob> => {
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
  addChineseFontsToPDF(doc);

  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;  // 页面边距
  let startY = margin;  // 初始化起始位置

  try {
    // 添加表头
    try {
      const headerType = data.templateConfig?.headerType || 'none';
      if (headerType !== 'none') {
        const headerImage = `data:image/png;base64,${
          headerType === 'bilingual' 
            ? embeddedResources.headerImage 
            : embeddedResources.headerEnglish
        }`;
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
      const title = 'QUOTATION';
      const titleWidth = doc.getTextWidth(title);
      const titleY = margin + imgHeight + 5;  // 标题Y坐标
      doc.text(title, (pageWidth - titleWidth) / 2, titleY);  // 标题位置
      startY = titleY + 10;  // 主体内容从标题下方开始
      } else {
        // 无表头时使用默认布局
        doc.setFontSize(14);
        doc.setFont('NotoSansSC', 'bold');
        const title = 'QUOTATION';
        const titleWidth = doc.getTextWidth(title);
        const titleY = margin + 5;  // 标题Y坐标
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
      // 设置询价编号为蓝色
      doc.setTextColor(0, 0, 255);
      doc.text(line, inquiryNoX, currentY + (index * 3.5));
      // 恢复黑色
      doc.setTextColor(0, 0, 0);
    });
    currentY += (wrappedInquiryNo.length * 3.5);

    // 添加感谢语
    currentY += 5;  // 增加一些间距
    doc.setFont('NotoSansSC', 'normal');
    doc.text('Thanks for your inquiry, and our best offer is as follows:', leftMargin, currentY);
    
    // 使用共享的表格配置
    doc.autoTable(generateTableConfig(data, doc, currentY + 3, margin, pageWidth));

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

    // 更新currentY，为后续内容预留空间
    currentY += 10;

    // 过滤有效的备注
    const validNotes = data.notes?.filter(note => note.trim() !== '') || [];

    // 添加备注
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

    // 确保所有页面都有页码（非预览模式下也需要）
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

    // 保存文件
    doc.save(`Quotation-${data.quotationNo}-${formattedDate}.pdf`);
    return new Blob(); // 返回空 Blob 以满足类型要求
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}; 