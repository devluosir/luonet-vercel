import { getLocalStorageJSON } from '@/utils/safeLocalStorage';
import { Customer, HistoryDocument } from '../types';

// 从localStorage中提取客户数据
export function extractCustomersFromHistory(): Customer[] {
  try {
    if (typeof window === 'undefined') return [];

    const quotationHistory = getLocalStorageJSON<HistoryDocument[]>('quotation_history', []);
    const packingHistory = getLocalStorageJSON<HistoryDocument[]>('packing_history', []);
    const invoiceHistory = getLocalStorageJSON<HistoryDocument[]>('invoice_history', []);
    
    const allHistory = [...quotationHistory, ...packingHistory, ...invoiceHistory];
    
    // 提取客户信息
    const customerMap = new Map<string, Customer>();
    
    allHistory.forEach((doc: any, index: number) => {
      if (!doc) return;
      
      let customerName = '';
      let customerAddress = '';
      
      // 根据文档类型提取客户信息
      if (doc.type === 'packing') {
        customerName = doc.consigneeName || doc.data?.consignee?.name || doc.customerName || '';
        customerAddress = doc.consigneeName || doc.data?.consignee?.name || doc.data?.consignee || doc.to || '';
      } else if (doc.type === 'invoice') {
        customerName = doc.customerName || '';
        customerAddress = doc.to || doc.data?.to || '';
      } else {
        customerName = doc.customerName || '';
        customerAddress = doc.data?.to || doc.to || '';
      }
      
      // 如果客户名称存在，则创建客户记录
      if (customerName) {
        const normalizedName = customerName.trim();
        const customerId = `customer_${Date.now()}_${index}`;
        
        // 处理客户信息的标题和内容分离
        let finalCustomerName = normalizedName;
        
        // 如果有地址信息，尝试组合成完整的客户信息
        if (customerAddress && customerAddress.trim()) {
          if (customerAddress.trim() !== normalizedName) {
            finalCustomerName = `${normalizedName}\n${customerAddress.trim()}`;
          }
        }
        
        if (!customerMap.has(normalizedName)) {
          customerMap.set(normalizedName, {
            id: customerId,
            name: finalCustomerName,
            email: doc.customerEmail || doc.data?.customerEmail || '',
            phone: doc.customerPhone || doc.data?.customerPhone || '',
            address: customerAddress || '',
            company: doc.customerCompany || doc.data?.customerCompany || '',
            createdAt: doc.createdAt || doc.date || new Date().toISOString(),
            updatedAt: doc.updatedAt || doc.date || new Date().toISOString()
          });
        }
      }
    });
    
    return Array.from(customerMap.values());
  } catch (error) {
    console.error('提取客户数据失败:', error);
    return [];
  }
}

// 从localStorage读取保存的客户数据
export function loadSavedCustomers(): Customer[] {
  try {
    if (typeof window === 'undefined') return [];
    
    const savedCustomers = getLocalStorageJSON<Customer[]>('customer_management', []);
    return savedCustomers;
  } catch (error) {
    console.error('读取保存的客户数据失败:', error);
    return [];
  }
}

// 获取所有客户数据
export function getAllCustomers(): Customer[] {
  try {
    const extractedCustomers = extractCustomersFromHistory();
    const savedCustomers = loadSavedCustomers();
    
    // 合并数据，避免重复
    const allCustomers = [...extractedCustomers];
    
    savedCustomers.forEach(savedCustomer => {
      const exists = allCustomers.some(c => c.name === savedCustomer.name);
      if (!exists) {
        allCustomers.push(savedCustomer);
      }
    });
    
    return allCustomers;
  } catch (error) {
    console.error('获取所有客户数据失败:', error);
    return [];
  }
}

// 保存客户数据
export function saveCustomer(customer: Customer): void {
  try {
    if (typeof window === 'undefined') return;

    const existingCustomers = getLocalStorageJSON<Customer[]>('customer_management', []);
    
    // 检查是否已存在同名客户，如果存在则更新
    const existingIndex = existingCustomers.findIndex((c: Customer) => c.name === customer.name);
    
    let updatedCustomers;
    if (existingIndex >= 0) {
      updatedCustomers = [...existingCustomers];
      updatedCustomers[existingIndex] = customer;
    } else {
      updatedCustomers = [...existingCustomers, customer];
    }
    
    localStorage.setItem('customer_management', JSON.stringify(updatedCustomers));
    console.log('客户数据保存成功:', customer);
  } catch (error) {
    console.error('保存客户数据失败:', error);
    throw error;
  }
}

// 删除客户数据
export function deleteCustomer(customerId: string): void {
  try {
    if (typeof window === 'undefined') return;

    const existingCustomers = getLocalStorageJSON<Customer[]>('customer_management', []);
    const updatedCustomers = existingCustomers.filter((c: Customer) => c.id !== customerId);
    localStorage.setItem('customer_management', JSON.stringify(updatedCustomers));
    
    console.log('客户删除成功:', customerId);
  } catch (error) {
    console.error('删除客户失败:', error);
    throw error;
  }
}

// 检查客户是否被历史记录引用
export function checkCustomerUsage(customerName: string): number {
  try {
    const quotationHistory = getLocalStorageJSON<HistoryDocument[]>('quotation_history', []);
    const packingHistory = getLocalStorageJSON<HistoryDocument[]>('packing_history', []);
    const invoiceHistory = getLocalStorageJSON<HistoryDocument[]>('invoice_history', []);
    
    const allHistory = [...quotationHistory, ...packingHistory, ...invoiceHistory];
    
    return allHistory.filter((doc: any) => {
      if (!doc) return false;
      
      let customerNameInDoc = '';
      if (doc.type === 'packing') {
        customerNameInDoc = doc.consigneeName || doc.customerName || '';
      } else {
        customerNameInDoc = doc.customerName || '';
      }
      
      return customerNameInDoc.trim() === customerName;
    }).length;
  } catch (error) {
    console.error('检查客户使用情况失败:', error);
    return 0;
  }
}

export const customerService = {
  extractCustomersFromHistory,
  loadSavedCustomers,
  getAllCustomers,
  saveCustomer,
  deleteCustomer,
  checkCustomerUsage
};
