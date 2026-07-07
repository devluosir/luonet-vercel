// 客户信息使用跟踪工具

interface UsageRecord {
  documentType: 'invoice' | 'packing' | 'quotation' | 'confirmation' | 'domestic';
  documentNo: string;
  usedAt: string;
}

interface CustomerRecord {
  id: string;
  name: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  usageRecords: UsageRecord[];
}

/**
 * 标准化客户名称，用于匹配
 * @param name 客户名称
 * @returns 标准化后的客户名称
 */
function normalizeCustomerName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ') // 将多个空格替换为单个空格
    .replace(/[^\w\s]/g, '') // 移除特殊字符，只保留字母、数字和空格
    .trim();
}

/**
 * 查找最匹配的客户记录
 * @param customerName 客户名称
 * @param records 客户记录数组
 * @returns 匹配的客户记录索引，如果未找到返回-1
 */
function findBestCustomerMatch(customerName: string, records: CustomerRecord[]): number {
  const normalizedSearchName = normalizeCustomerName(customerName);
  
  console.log('🔍 查找客户匹配:', {
    searchName: customerName,
    normalizedSearchName,
    totalRecords: records.length,
    allRecordNames: records.map(r => r.name)
  });
  
  // 只进行精确匹配，避免错误的匹配
  const exactMatch = records.findIndex(record => {
    const normalizedRecordName = normalizeCustomerName(record.name);
    const isMatch = normalizedRecordName === normalizedSearchName;
    if (isMatch) {
      console.log('✅ 精确匹配成功:', {
        recordName: record.name,
        normalizedRecordName,
        recordId: record.id
      });
    }
    return isMatch;
  });
  
  if (exactMatch !== -1) {
    return exactMatch;
  }
  
  console.log('❌ 未找到精确匹配的客户:', {
    searchName: customerName,
    normalizedSearchName
  });
  
  return -1;
}

/**
 * 记录客户信息的使用情况
 * @param customerName 客户名称
 * @param documentType 文档类型
 * @param documentNo 文档编号
 */
export function recordCustomerUsage(customerName: string, documentType: 'invoice' | 'packing' | 'quotation' | 'confirmation' | 'domestic', documentNo: string) {
  try {
    const customerRecords = localStorage.getItem('customerRecords');
    if (!customerRecords) return;

    const records: CustomerRecord[] = JSON.parse(customerRecords);
    const customerIndex = findBestCustomerMatch(customerName, records);
    
    if (customerIndex !== -1) {
      const usageRecord: UsageRecord = {
        documentType,
        documentNo,
        usedAt: new Date().toISOString()
      };

      // 检查是否已经存在相同的使用记录
      const existingRecord = records[customerIndex].usageRecords.find(
        record => record.documentType === documentType && record.documentNo === documentNo
      );

      if (!existingRecord) {
        records[customerIndex].usageRecords.push(usageRecord);
        localStorage.setItem('customerRecords', JSON.stringify(records));
      }
    }
  } catch (error) {
    console.error('Error recording customer usage:', error);
  }
}

/**
 * 获取客户的使用记录
 * @param customerName 客户名称
 * @returns 使用记录数组
 */
export function getCustomerUsageRecords(customerName: string): UsageRecord[] {
  try {
    const customerRecords = localStorage.getItem('customerRecords');
    if (!customerRecords) return [];

    const records: CustomerRecord[] = JSON.parse(customerRecords);
    const customerIndex = findBestCustomerMatch(customerName, records);
    
    if (customerIndex !== -1) {
      return records[customerIndex].usageRecords || [];
    }
    
    return [];
  } catch (error) {
    console.error('Error getting customer usage records:', error);
    return [];
  }
} 
