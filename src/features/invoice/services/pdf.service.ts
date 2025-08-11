import { InvoiceData } from '../types';
import { PDFGeneratorData } from '@/types/pdf';

/**
 * PDF服务类
 */
export class PDFService {
  /**
   * 将InvoiceData转换为PDFGeneratorData
   */
  private static convertToPDFData(data: InvoiceData): PDFGeneratorData {
    return {
      templateConfig: {
        headerType: data.templateConfig.headerType,
        stampType: data.templateConfig.stampType,
        invoiceType: data.templateConfig.invoiceType
      },
      items: data.items.map(item => ({
        hsCode: item.hsCode,
        partname: item.partname,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        amount: item.amount,
        remarks: item.remarks,
        highlight: item.highlight
      })),
      otherFees: data.otherFees?.map(fee => ({
        description: fee.description,
        amount: fee.amount,
        remarks: fee.remarks,
        highlight: fee.highlight
      })),
      to: data.to,
      customerPO: data.customerPO,
      invoiceNo: data.invoiceNo,
      date: data.date,
      currency: data.currency,
      showHsCode: data.showHsCode,
      showPartName: data.showPartName,
      showDescription: data.showDescription,
      showRemarks: data.showRemarks,
      amountInWords: data.amountInWords,
      showBank: data.showBank,
      bankInfo: data.bankInfo,
      showPaymentTerms: data.showPaymentTerms,
      paymentDate: data.paymentDate,
      additionalPaymentTerms: data.additionalPaymentTerms,
      showInvoiceReminder: data.showInvoiceReminder
    };
  }

  /**
   * 生成发票PDF
   */
  static async generateInvoicePDF(data: InvoiceData): Promise<Blob> {
    try {
      const { generateInvoicePDF } = await import('@/utils/pdfGenerator');
      const pdfData = this.convertToPDFData(data);
      return await generateInvoicePDF(pdfData);
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
