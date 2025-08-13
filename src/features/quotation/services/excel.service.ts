import type { QuotationData, LineItem, OtherFee } from '@/types/quotation';

/**
 * 格式化数值函数
 */
const formatNumber = (value: number): string => {
  if (value === 0) return '0';
  if (!value || isNaN(value)) return '';
  return Number(value.toFixed(2)).toString();
};

/**
 * 格式化Excel文件名
 */
const formatExcelFileName = (documentNo: string, type: 'quotation' | 'confirmation'): string => {
  const prefix = type === 'confirmation' ? 'SC' : 'QTN';
  return `${prefix}_${documentNo}.csv`;
};

/**
 * 导出报价单为Excel
 */
export const exportQuotationToExcel = (data: QuotationData, type: 'quotation' | 'confirmation'): void => {
  try {
    // 准备Excel数据
    const excelData = [];
    
    // 添加文档基本信息
    const documentNo = type === 'confirmation' ? (data.contractNo || data.quotationNo) : data.quotationNo;
    const documentType = type === 'confirmation' ? 'SALES CONFIRMATION' : 'QUOTATION';
    
    // 添加标题 - 与PDF保持一致，居中显示
    excelData.push(['', '', '', documentType, '', '', '', '']);
    excelData.push([]); // 空行
    
    // 添加基础信息区域 - 左右对齐布局
    const rightInfoLabel = type === 'confirmation' ? 'Contract No.' : 'Quotation No.';
    
    // 第一行：To 和 Contract No./Quotation No.
    excelData.push(['To:', data.to || '', '', '', '', '', rightInfoLabel, documentNo]);
    
    // 第二行：Inquiry No. 和 Date
    if (data.inquiryNo) {
      excelData.push(['Inquiry No.:', data.inquiryNo || '', '', '', '', '', 'Date', data.date]);
    } else {
      excelData.push(['', '', '', '', '', '', 'Date', data.date]);
    }
    
    // 第三行：空行和From
    excelData.push(['', '', '', '', '', '', 'From', data.from]);
    
    // 第四行：空行和Currency
    excelData.push(['', '', '', '', '', '', 'Currency', data.currency]);
    
    // 第五行：空行和Payment Date（如果有）
    if (data.paymentDate) {
      excelData.push(['', '', '', '', '', '', 'Payment Date', data.paymentDate]);
    }
    
    excelData.push([]); // 空行
    
    // 添加感谢语 - 与PDF保持一致
    const thankYouText = type === 'confirmation' 
      ? 'Thank you for your order. We confirm the following details:'
      : 'Thanks for your inquiry, and our best offer is as follows:';
    excelData.push([thankYouText, '', '', '', '', '', '', '']);
    excelData.push([]); // 空行
    
    // 添加商品表格标题 - 与PDF列标题保持一致
    const headers = ['No.', 'Part Name', 'Description', 'Q\'TY', 'Unit', 'U/Price', 'Amount', 'Remarks'];
    excelData.push(headers);
    
    // 添加商品数据
    data.items.forEach((item, index) => {
      const row = [
        index + 1,
        item.partName,
        item.description || '',
        item.quantity,
        item.unit,
        formatNumber(item.unitPrice),
        formatNumber(item.amount),
        item.remarks || ''
      ];
      excelData.push(row);
    });
    
    // 添加其他费用（合并到主表格中）
    if (data.otherFees && data.otherFees.length > 0) {
      data.otherFees.forEach((fee, index) => {
        const row = [
          data.items.length + index + 1, // 继续主表格的序号
          fee.description,
          '', // Description为空
          '', // Quantity为空
          '', // Unit为空
          '', // Unit Price为空
          formatNumber(fee.amount),
          fee.remarks || ''
        ];
        excelData.push(row);
      });
    }
    
    // 添加总计
    const totalAmount = (data.items || []).reduce((sum, item) => sum + (item.amount || 0), 0) +
      (data.otherFees?.reduce((sum, fee) => sum + fee.amount, 0) || 0);
    
    excelData.push([]); // 空行
    excelData.push(['', '', '', '', '', 'Total Amount', formatNumber(totalAmount), '']);
    
    // 添加备注
    if (data.notes && data.notes.length > 0) {
      excelData.push([]); // 空行
      excelData.push(['Notes', '', '', '', '', '', '', '']); // 标题
      data.notes.forEach(note => {
        excelData.push([note, '', '', '', '', '', '', '']);
      });
    }
    

    
    // 转换为CSV格式
    const csvContent = excelData.map(row => 
      row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    // 创建并下载文件
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', formatExcelFileName(documentNo, type));
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
  } catch (error) {
    console.error('Error exporting Excel:', error);
    throw new Error('Failed to export Excel file. Please try again.');
  }
};

/**
 * 导出销售确认为Excel（专门针对销售确认页面的优化版本）
 */
export const exportSalesConfirmationToExcel = (data: QuotationData): void => {
  try {
    // 准备Excel数据
    const excelData = [];
    
    // 添加文档基本信息
    const contractNo = data.contractNo || data.quotationNo;
    
    // 添加标题 - 与PDF保持一致，居中显示
    excelData.push(['', '', '', 'SALES CONFIRMATION', '', '', '', '']);
    excelData.push([]); // 空行
    
    // 添加基础信息区域 - 左右对齐布局
    
    // 第一行：To 和 Contract No.
    excelData.push(['To:', data.to || '', '', '', '', '', 'Contract No.', contractNo]);
    
    // 第二行：Inquiry No. 和 Date
    if (data.inquiryNo) {
      excelData.push(['Inquiry No.:', data.inquiryNo || '', '', '', '', '', 'Date', data.date]);
    } else {
      excelData.push(['', '', '', '', '', '', 'Date', data.date]);
    }
    
    // 第三行：空行和From
    excelData.push(['', '', '', '', '', '', 'From', data.from]);
    
    // 第四行：空行和Currency
    excelData.push(['', '', '', '', '', '', 'Currency', data.currency]);
    
    excelData.push([]); // 空行
    
    // 添加感谢语 - 与PDF保持一致
    excelData.push(['Thank you for your order. We confirm the following details:', '', '', '', '', '', '', '']);
    excelData.push([]); // 空行
    
    // 添加商品表格标题 - 与PDF列标题保持一致
    const headers = ['No.', 'Part Name', 'Description', 'Q\'TY', 'Unit', 'U/Price', 'Amount', 'Remarks'];
    excelData.push(headers);
    
    // 添加商品数据
    data.items.forEach((item, index) => {
      const row = [
        index + 1,
        item.partName,
        item.description || '',
        item.quantity,
        item.unit,
        formatNumber(item.unitPrice),
        formatNumber(item.amount),
        item.remarks || ''
      ];
      excelData.push(row);
    });
    
    // 添加其他费用（合并到主表格中）
    if (data.otherFees && data.otherFees.length > 0) {
      data.otherFees.forEach((fee, index) => {
        const row = [
          data.items.length + index + 1, // 继续主表格的序号
          fee.description,
          '', // Description为空
          '', // Quantity为空
          '', // Unit为空
          '', // Unit Price为空
          formatNumber(fee.amount),
          fee.remarks || ''
        ];
        excelData.push(row);
      });
    }
    
    // 添加总计
    const totalAmount = (data.items || []).reduce((sum, item) => sum + (item.amount || 0), 0) +
      (data.otherFees?.reduce((sum, fee) => sum + fee.amount, 0) || 0);
    
    excelData.push([]); // 空行
    excelData.push(['', '', '', '', '', 'Total Amount', formatNumber(totalAmount), '']);
    
    // 添加备注
    if (data.notes && data.notes.length > 0) {
      excelData.push([]); // 空行
      excelData.push(['Notes', '', '', '', '', '', '', '']); // 标题
      data.notes.forEach(note => {
        excelData.push([note, '', '', '', '', '', '', '']);
      });
    }
    
    // 添加银行信息（销售确认）
    if (data.showBank) {
      excelData.push([]); // 空行
      excelData.push(['Bank Information', '', '', '', '', '', '', '']); // 标题
      
      // 银行信息内容
      excelData.push(['Bank Name:', 'The Hongkong and Shanghai Banking Corporation Limited', '', '', '', '', '', '']);
      excelData.push(['Swift code:', 'HSBCHKHHHKH', '', '', '', '', '', '']);
      excelData.push(['Bank address:', 'Head Office 1 Queen\'s Road Central Hong Kong', '', '', '', '', '', '']);
      excelData.push(['A/C No.:', '801470337838', '', '', '', '', '', '']);
      excelData.push(['Beneficiary:', 'Luo & Company Co., Limited', '', '', '', '', '', '']);
    }
    
    // 添加付款条款（销售确认）
    if (data.showMainPaymentTerm || data.additionalPaymentTerms || data.showInvoiceReminder) {
      excelData.push([]); // 空行
      excelData.push(['Payment Terms', '', '', '', '', '', '', '']); // 标题
      
      // 主要付款条款
      if (data.showMainPaymentTerm && data.paymentDate) {
        const mainPaymentTerm = `Full payment not later than ${data.paymentDate} by telegraphic transfer (T/T).`;
        excelData.push([mainPaymentTerm, '', '', '', '', '', '', '']);
      }
      
      // 附加付款条款
      if (data.additionalPaymentTerms) {
        const additionalTerms = data.additionalPaymentTerms.split('\n').filter(term => term.trim());
        additionalTerms.forEach(term => {
          excelData.push([term.trim(), '', '', '', '', '', '', '']);
        });
      }
      
      // 发票提醒
      if (data.showInvoiceReminder && contractNo) {
        const invoiceReminder = `Please state our contract no. "${contractNo.trim()}" on your payment documents.`;
        excelData.push([invoiceReminder, '', '', '', '', '', '', '']);
      }
    }
    
    // 转换为CSV格式
    const csvContent = excelData.map(row => 
      row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    // 创建并下载文件
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', formatExcelFileName(contractNo, 'confirmation'));
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
  } catch (error) {
    console.error('Error exporting Sales Confirmation Excel:', error);
    throw new Error('Failed to export Excel file. Please try again.');
  }
};
