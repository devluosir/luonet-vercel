/**
 * 发票Excel导出服务
 */

import type { InvoiceData } from '../types';

// 格式化Excel文件名
const formatExcelFileName = (invoiceNo: string): string => {
  const prefix = 'INV';
  const documentNo = invoiceNo?.trim() || 'draft';
  return `${prefix}_${documentNo}.csv`;
};

// 格式化数字
const formatNumber = (value: number): string => {
  return value.toFixed(2);
};

/**
 * 导出发票为Excel
 */
export const exportInvoiceToExcel = (data: InvoiceData): void => {
  try {
    // 准备Excel数据
    const excelData = [];
    
    // 添加标题 - 与PDF保持一致，居中显示
    excelData.push(['', '', '', 'INVOICE', '', '', '', '']);
    excelData.push([]); // 空行
    
    // 添加基础信息区域 - 左右对齐布局
    
    // 第一行：To 和 Invoice No.
    excelData.push(['To:', data.to || '', '', '', '', '', 'Invoice No.', data.invoiceNo]);
    
    // 第二行：Customer PO 和 Date
    if (data.customerPO) {
      excelData.push(['Customer PO:', data.customerPO || '', '', '', '', '', 'Date', data.date]);
    } else {
      excelData.push(['', '', '', '', '', '', 'Date', data.date]);
    }
    
    excelData.push([]); // 空行
    
    // 添加商品表格标题 - 与PDF列标题保持一致
    const headers = ['No.', 'Part Name', 'Description', 'Q\'TY', 'Unit', 'U/Price', 'Amount', 'Remarks'];
    excelData.push(headers);
    
    // 添加商品数据
    data.items.forEach((item, index) => {
      const row = [
        index + 1,
        item.partname,
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
    
    // 添加银行信息（如果显示）
    if (data.showBank) {
      excelData.push([]); // 空行
      excelData.push(['Bank Information', '', '', '', '', '', '', '']); // 标题
      excelData.push(['Bank Name: The Hongkong and Shanghai Banking Corporation Limited', '', '', '', '', '', '', '']);
      excelData.push(['Swift Code: HSBCHKHHHKH', '', '', '', '', '', '', '']);
      excelData.push(['Bank Address: Head Office 1 Queen\'s Road Central Hong Kong', '', '', '', '', '', '', '']);
      excelData.push(['A/C No.: 801470337838', '', '', '', '', '', '', '']);
      excelData.push(['Beneficiary: Luo & Company Co., Limited', '', '', '', '', '', '', '']);
    }
    
    // 添加付款条款（如果显示）
    if (data.showPaymentTerms || data.additionalPaymentTerms || data.showInvoiceReminder) {
      excelData.push([]); // 空行
      excelData.push(['Payment Terms', '', '', '', '', '', '', '']); // 标题
      
      // 主要付款条款
      if (data.showPaymentTerms && data.paymentDate) {
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
      if (data.showInvoiceReminder && data.invoiceNo) {
        const invoiceReminder = `Please state our invoice no. "${data.invoiceNo.trim()}" on your payment documents.`;
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
    link.setAttribute('download', formatExcelFileName(data.invoiceNo));
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
  } catch (error) {
    console.error('Error exporting Invoice Excel:', error);
    throw new Error('Failed to export Excel file. Please try again.');
  }
};
