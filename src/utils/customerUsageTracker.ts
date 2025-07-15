// 客户信息使用跟踪工具

interface UsageRecord {
  documentType: 'invoice' | 'packing' | 'quotation';
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
 * 记录客户信息的使用情况
 * @param customerName 客户名称
 * @param documentType 文档类型
 * @param documentNo 文档编号
 */
export function recordCustomerUsage(customerName: string, documentType: 'invoice' | 'packing' | 'quotation', documentNo: string) {
  try {
    const customerRecords = localStorage.getItem('customerRecords');
    if (!customerRecords) return;

    const records: CustomerRecord[] = JSON.parse(customerRecords);
    const customerIndex = records.findIndex(record => record.name === customerName);
    
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
    const customer = records.find(record => record.name === customerName);
    
    return customer?.usageRecords || [];
  } catch (error) {
    console.error('Error getting customer usage records:', error);
    return [];
  }
} 