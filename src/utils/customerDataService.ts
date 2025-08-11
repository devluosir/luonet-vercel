import { getLocalStorageJSON } from './safeLocalStorage';

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  company: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavedCustomer {
  name: string;
  to: string;
  customerPO?: string;
}

// 从localStorage中提取客户数据
export function extractCustomersFromHistory(): Customer[] {
  try {
    if (typeof window === 'undefined') return [];

    const quotationHistory = getLocalStorageJSON('quotation_history', []);
    const packingHistory = getLocalStorageJSON('packing_history', []);
    const invoiceHistory = getLocalStorageJSON('invoice_history', []);
    
    const allHistory = [...quotationHistory, ...packingHistory, ...invoiceHistory];
    
    // 提取客户信息
    const customerMap = new Map<string, Customer>();
    
    allHistory.forEach((doc: any, index: number) => {
      if (!doc) return;
      
      let customerName = '';
      let customerAddress = '';
      
      // 根据文档类型提取客户信息
      if (doc.type === 'packing') {
        // 装箱单：优先使用 consigneeName，然后是 data.consignee.name
        customerName = doc.consigneeName || doc.data?.consignee?.name || doc.customerName || '';
        customerAddress = doc.consigneeName || doc.data?.consignee?.name || doc.data?.consignee || doc.to || '';
      } else if (doc.type === 'invoice') {
        // 发票：使用 customerName 或 to 字段
        customerName = doc.customerName || '';
        customerAddress = doc.to || doc.data?.to || '';
      } else {
        // 报价单/确认单：使用 customerName 或 data.to
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
          // 如果客户名称和地址不同，则组合它们
          if (customerAddress.trim() !== normalizedName) {
            finalCustomerName = `${normalizedName}\n${customerAddress.trim()}`;
          }
        }
        
        if (!customerMap.has(normalizedName)) {
          customerMap.set(normalizedName, {
            id: customerId,
            name: finalCustomerName, // 使用组合后的完整信息
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
    
    const savedCustomers = getLocalStorageJSON('customer_management', []);
    return savedCustomers;
  } catch (error) {
    console.error('读取保存的客户数据失败:', error);
    return [];
  }
}

// 获取所有客户数据（历史记录 + 保存的数据）
export function getAllCustomers(): Customer[] {
  try {
    // 从历史记录中提取客户数据
    const extractedCustomers = extractCustomersFromHistory();
    
    // 从localStorage读取保存的客户数据
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

// 将客户数据转换为SavedCustomer格式（用于弹窗显示）
export function getCustomersForDropdown(): SavedCustomer[] {
  const customers = getAllCustomers();
  
  return customers.map(customer => {
    // 获取完整的客户信息
    const fullInfo = customer.name;
    
    // 智能提取标题和内容
    let title = '';
    let content = fullInfo;
    
    // 查找公司名称的结束位置
    const companyEndPatterns = [
      /\s+(?:LTD|LIMITED|INC|CORP|LLC|GMBH|KG|PTE|PVT|CO\.|COMPANY)\b/i,
      /\s+(?:ROOM|UNIT|FLOOR|BLOCK|BUILDING|TOWER|CENTER|PLAZA|ROAD|STREET|AVENUE)\b/i,
      /\s+(?:PHONE|TEL|MOBILE|EMAIL|E-MAIL|WEB|WWW|VAT|TAX|ID|NO:)\b/i,
      /[,\.;]/,
      /\s{2,}/ // 多个空格
    ];
    
    let titleEndIndex = -1;
    
    for (const pattern of companyEndPatterns) {
      const match = fullInfo.match(pattern);
      if (match) {
        titleEndIndex = match.index;
        break;
      }
    }
    
    if (titleEndIndex > 0) {
      title = fullInfo.substring(0, titleEndIndex).trim();
      content = fullInfo;
    } else {
      // 如果没有找到明显的分隔点，尝试按长度分离
      if (fullInfo.length > 60) {
        // 找到第一个合适的断点
        const words = fullInfo.split(' ');
        let titleWords = [];
        let currentLength = 0;
        
        for (const word of words) {
          if (currentLength + word.length > 50) break;
          titleWords.push(word);
          currentLength += word.length + 1;
        }
        
        if (titleWords.length > 0) {
          title = titleWords.join(' ').trim();
          content = fullInfo;
        }
      }
    }
    
    // 如果还是没有分离成功，使用默认策略
    if (!title || title === fullInfo) {
      // 取前30个字符作为标题
      title = fullInfo.length > 30 ? fullInfo.substring(0, 30).trim() + '...' : fullInfo;
      content = fullInfo;
    }
    
    return {
      name: title, // 标题用于显示
      to: content, // 完整信息作为内容
      customerPO: ''
    };
  });
}
