import { FollowUpService } from './timelineService';
import type { Customer } from '../types';

const NEW_CUSTOMER_STORAGE_KEY = 'new_customer_tracking';

interface NewCustomerRecord {
  customerId: string;
  customerName: string;
  firstContactDate: string;
  source?: string;
  potentialValue?: number;
  industry?: string;
  followUpStage: 'initial_contact' | 'needs_analysis' | 'proposal' | 'negotiation' | 'closed';
  nextFollowUpDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// 获取本地存储数据的安全方法
function getLocalStorageJSON<T>(key: string, defaultValue: T): T {
  try {
    if (typeof window === 'undefined') return defaultValue;
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading from localStorage key ${key}:`, error);
    return defaultValue;
  }
}

// 保存到本地存储的安全方法
function setLocalStorageJSON<T>(key: string, value: T): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing to localStorage key ${key}:`, error);
  }
}

// 生成唯一ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export class NewCustomerService {
  // 获取所有新客户记录
  static getAllNewCustomers(): NewCustomerRecord[] {
    return getLocalStorageJSON<NewCustomerRecord[]>(NEW_CUSTOMER_STORAGE_KEY, []);
  }

  // 检查是否为新客户
  static isNewCustomer(customerName: string): boolean {
    const allCustomers = this.getAllNewCustomers();
    return allCustomers.some(customer => customer.customerName === customerName);
  }

  // 添加新客户记录
  static addNewCustomer(customerName: string, source?: string): NewCustomerRecord {
    const allCustomers = this.getAllNewCustomers();
    
    // 检查是否已存在
    const existingCustomer = allCustomers.find(c => c.customerName === customerName);
    if (existingCustomer) {
      return existingCustomer;
    }

    const newCustomer: NewCustomerRecord = {
      customerId: generateId(),
      customerName,
      firstContactDate: new Date().toISOString(),
      source,
      followUpStage: 'initial_contact',
      nextFollowUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7天后
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    allCustomers.push(newCustomer);
    setLocalStorageJSON(NEW_CUSTOMER_STORAGE_KEY, allCustomers);

    // 自动创建跟进任务
    this.createInitialFollowUp(newCustomer);

    return newCustomer;
  }

  // 更新新客户信息
  static updateNewCustomer(customerName: string, updates: Partial<NewCustomerRecord>): NewCustomerRecord | null {
    const allCustomers = this.getAllNewCustomers();
    const index = allCustomers.findIndex(c => c.customerName === customerName);
    
    if (index === -1) return null;
    
    allCustomers[index] = {
      ...allCustomers[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    setLocalStorageJSON(NEW_CUSTOMER_STORAGE_KEY, allCustomers);
    return allCustomers[index];
  }

  // 获取需要跟进的新客户
  static getCustomersNeedingFollowUp(): NewCustomerRecord[] {
    const allCustomers = this.getAllNewCustomers();
    const now = new Date();
    
    return allCustomers
      .filter(customer => 
        customer.followUpStage !== 'closed' &&
        (!customer.nextFollowUpDate || new Date(customer.nextFollowUpDate) <= now)
      )
      .sort((a, b) => new Date(a.firstContactDate).getTime() - new Date(b.firstContactDate).getTime());
  }

  // 创建初始跟进任务
  private static createInitialFollowUp(newCustomer: NewCustomerRecord) {
    const followUpData = {
      customerId: newCustomer.customerName,
      type: 'new_customer' as const,
      title: `新客户跟进 - ${newCustomer.customerName}`,
      description: `新客户 ${newCustomer.customerName} 的初始跟进。请了解客户需求并建立联系。`,
      dueDate: newCustomer.nextFollowUpDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      priority: 'high' as const,
      status: 'pending' as const
    };

    try {
      FollowUpService.addFollowUp(followUpData);
      console.log(`为新客户 ${newCustomer.customerName} 创建了初始跟进任务`);
    } catch (error) {
      console.error('创建新客户跟进任务失败:', error);
    }
  }

  // 自动识别新客户（从历史记录中）
  static autoDetectNewCustomers(): NewCustomerRecord[] {
    try {
      // 从报价单历史记录中识别新客户
      const { getQuotationHistory } = require('@/utils/quotationHistory');
      const quotationHistory = getQuotationHistory();
      
      const newCustomers: NewCustomerRecord[] = [];
      
      quotationHistory.forEach((item: any) => {
        if (item.customerName && !this.isNewCustomer(item.customerName)) {
          const newCustomer = this.addNewCustomer(item.customerName, 'quotation_history');
          newCustomers.push(newCustomer);
        }
      });

      // 从装箱单历史记录中识别新客户
      const { getPackingHistory } = require('@/utils/packingHistory');
      const packingHistory = getPackingHistory();
      
      packingHistory.forEach((item: any) => {
        if (item.consigneeName && !this.isNewCustomer(item.consigneeName)) {
          const newCustomer = this.addNewCustomer(item.consigneeName, 'packing_history');
          newCustomers.push(newCustomer);
        }
      });

      // 从发票历史记录中识别新客户
      const { getInvoiceHistory } = require('@/utils/invoiceHistory');
      const invoiceHistory = getInvoiceHistory();
      
      invoiceHistory.forEach((item: any) => {
        if (item.customerName && !this.isNewCustomer(item.customerName)) {
          const newCustomer = this.addNewCustomer(item.customerName, 'invoice_history');
          newCustomers.push(newCustomer);
        }
      });

      return newCustomers;
    } catch (error) {
      console.error('自动识别新客户失败:', error);
      return [];
    }
  }

  // 获取新客户统计信息
  static getNewCustomerStats() {
    const allCustomers = this.getAllNewCustomers();
    const now = new Date();
    
    const stats = {
      total: allCustomers.length,
      active: allCustomers.filter(c => c.followUpStage !== 'closed').length,
      closed: allCustomers.filter(c => c.followUpStage === 'closed').length,
      overdue: allCustomers.filter(c => 
        c.followUpStage !== 'closed' && 
        c.nextFollowUpDate && 
        new Date(c.nextFollowUpDate) < now
      ).length,
      thisWeek: allCustomers.filter(c => {
        const contactDate = new Date(c.firstContactDate);
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return contactDate >= weekAgo;
      }).length
    };

    return stats;
  }
}
