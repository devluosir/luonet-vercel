import { PackingData } from '../types';
import { generatePackingListPDF } from '@/utils/packingPdfGenerator';
import { recordCustomerUsage } from '@/utils/customerUsageTracker';
import { formatPdfFileName } from '../utils/formatters';

/**
 * 生成PDF文件
 */
export const generatePdf = async (data: PackingData): Promise<Blob | null> => {
  try {
    // 记录客户信息使用情况
    if (data.consignee.name && data.invoiceNo) {
      const customerName = data.consignee.name.split('\n')[0].trim();
      console.log('装箱单记录客户使用情况:', {
        customerName,
        documentType: 'packing',
        documentNo: data.invoiceNo,
        fullConsigneeName: data.consignee.name
      });
      recordCustomerUsage(customerName, 'packing', data.invoiceNo);
    }

    const blob = await generatePackingListPDF(data);
    return blob;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate packing list. Please try again.');
  }
};

/**
 * 下载PDF文件
 */
export const downloadPdf = async (data: PackingData): Promise<void> => {
  try {
    const blob = await generatePdf(data);
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = formatPdfFileName(data.invoiceNo);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  } catch (error) {
    console.error('Error downloading PDF:', error);
    throw error;
  }
};

/**
 * 预览PDF文件
 */
export const previewPdf = async (data: PackingData): Promise<Blob | null> => {
  try {
    const blob = await generatePdf(data);
    return blob;
  } catch (error) {
    console.error('Error previewing PDF:', error);
    throw error;
  }
};
