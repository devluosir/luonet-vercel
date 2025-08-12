import { InvoiceData, InvoiceHistoryItem } from '../types';
import { getTotalAmount, calculatePaymentDate, numberToWords } from '../utils/calculations';
import { recordCustomerUsage } from '@/utils/customerUsageTracker';
import { addInvoiceHistory, getInvoiceHistory, saveInvoiceHistory } from '@/utils/invoiceHistory';
import { v4 as uuidv4 } from 'uuid';

/**
 * 发票服务类
 */
export class InvoiceService {
  /**
   * 保存发票到历史记录
   */
  static async saveInvoice(
    data: InvoiceData,
    isEditMode: boolean,
    editId: string | null
  ): Promise<{ success: boolean; message: string; newEditId?: string }> {
    try {
      const history = getInvoiceHistory();
      const totalAmount = getTotalAmount(data.items, data.otherFees);
      
      if (isEditMode && editId) {
        // 更新现有发票
        const updatedHistory = history.map(item => {
          if (item.id === editId) {
            return {
              ...item,
              customerName: data.to,
              invoiceNo: data.invoiceNo,
              totalAmount: totalAmount,
              currency: data.currency,
              data: data,
              updatedAt: new Date().toISOString()
            };
          }
          return item;
        });
        
        const saved = saveInvoiceHistory(updatedHistory);
        if (saved) {
          return { success: true, message: '保存成功' };
        } else {
          return { success: false, message: '保存失败' };
        }
      } else {
        // 检查是否已存在相同发票号的记录
        const existingInvoice = history.find(item => item.invoiceNo === data.invoiceNo);
        
        if (existingInvoice) {
          // 如果存在相同发票号，更新现有记录
          const updatedHistory = history.map(item => {
            if (item.id === existingInvoice.id) {
              return {
                ...item,
                customerName: data.to,
                invoiceNo: data.invoiceNo,
                totalAmount: totalAmount,
                currency: data.currency,
                data: data,
                updatedAt: new Date().toISOString()
              };
            }
            return item;
          });
          
          const saved = saveInvoiceHistory(updatedHistory);
          if (saved) {
            return { 
              success: true, 
              message: '保存成功',
              newEditId: existingInvoice.id
            };
          } else {
            return { success: false, message: '保存失败' };
          }
        } else {
          // 创建新发票记录
          const newInvoice: InvoiceHistoryItem = {
            id: uuidv4(),
            customerName: data.to,
            invoiceNo: data.invoiceNo,
            totalAmount: totalAmount,
            currency: data.currency,
            data: data,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          const saved = addInvoiceHistory(newInvoice);
          if (saved) {
            return { 
              success: true, 
              message: '保存成功',
              newEditId: newInvoice.id
            };
          } else {
            return { success: false, message: '保存失败' };
          }
        }
      }
    } catch (error) {
      console.error('Error saving invoice:', error);
      return { success: false, message: '保存失败' };
    }
  }

  /**
   * 生成发票PDF
   */
  static async generatePDF(data: InvoiceData): Promise<Blob> {
    try {
      const { generateInvoicePDF } = await import('@/utils/pdfGenerator');
      return await generateInvoicePDF(data);
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('PDF生成失败');
    }
  }

  /**
   * 下载发票PDF
   */
  static async downloadPDF(data: InvoiceData, filename?: string): Promise<void> {
    try {
      const pdfBlob = await this.generatePDF(data);
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `INV_${data.invoiceNo || 'draft'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      throw error;
    }
  }

  /**
   * 记录客户使用情况
   */
  static recordCustomerUsage(data: InvoiceData): void {
    if (data.to && data.invoiceNo) {
      const customerName = data.to.split('\n')[0].trim();
      recordCustomerUsage(customerName, 'invoice', data.invoiceNo);
    }
  }

  /**
   * 验证发票数据
   */
  static validateInvoiceData(data: InvoiceData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.to.trim()) {
      errors.push('请填写客户名称');
    }

    if (data.items.length === 0 || (data.items.length === 1 && !data.items[0].partname)) {
      errors.push('请添加至少一个商品');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 处理发票数据更新
   */
  static processInvoiceDataUpdate(
    data: InvoiceData,
    updates: Partial<InvoiceData>
  ): InvoiceData {
    const updatedData = { ...data, ...updates };
    
    // 自动计算付款日期
    if (updates.date) {
      updatedData.paymentDate = calculatePaymentDate(updates.date);
    }
    
    // 自动计算英文大写金额
    const totalAmount = getTotalAmount(updatedData.items, updatedData.otherFees);
    updatedData.amountInWords = numberToWords(totalAmount);
    
    return updatedData;
  }

  /**
   * 获取发票历史记录
   */
  static getInvoiceHistory(): InvoiceHistoryItem[] {
    return getInvoiceHistory();
  }

  /**
   * 根据ID获取发票
   */
  static getInvoiceById(id: string): InvoiceHistoryItem | null {
    const history = getInvoiceHistory();
    return history.find(item => item.id === id) || null;
  }
}
