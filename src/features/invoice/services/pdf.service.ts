import { InvoiceData } from '../types';

/**
 * PDF服务类
 */
export class PDFService {
  /**
   * 生成发票PDF
   */
  static async generateInvoicePDF(data: InvoiceData): Promise<Blob> {
    try {
      const { generateInvoicePDF } = await import('@/utils/pdfGenerator');
      return await generateInvoicePDF(data);
    } catch (error) {
      console.error('Error generating invoice PDF:', error);
      throw new Error('发票PDF生成失败');
    }
  }

  /**
   * 预览发票PDF
   */
  static async previewInvoicePDF(data: InvoiceData): Promise<string> {
    try {
      const pdfBlob = await this.generateInvoicePDF(data);
      return URL.createObjectURL(pdfBlob);
    } catch (error) {
      console.error('Error previewing invoice PDF:', error);
      throw new Error('发票PDF预览失败');
    }
  }

  /**
   * 下载发票PDF
   */
  static async downloadInvoicePDF(data: InvoiceData, filename?: string): Promise<void> {
    try {
      const pdfBlob = await this.generateInvoicePDF(data);
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `INV_${data.invoiceNo || 'draft'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading invoice PDF:', error);
      throw error;
    }
  }

  /**
   * 清理PDF URL
   */
  static cleanupPDFURL(url: string): void {
    try {
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error cleaning up PDF URL:', error);
    }
  }
}
