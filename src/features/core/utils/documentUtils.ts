import { v4 as uuidv4 } from 'uuid';

// 生成文档ID
export function createDocumentId(): string {
  return uuidv4();
}

// 生成文档编号
export function generateDocumentNo(prefix: string, sequence: number): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const sequenceStr = String(sequence).padStart(4, '0');
  
  return `${prefix}-${year}${month}${day}-${sequenceStr}`;
}

// 验证文档ID格式
export function isValidDocumentId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

// 获取文档类型
export function getDocumentType(documentNo: string): string {
  const match = documentNo.match(/^([A-Z]+)-/);
  return match ? match[1] : 'UNKNOWN';
}

// 计算文档总金额
export function calculateTotalAmount(items: Array<{ quantity: number; unitPrice: number }>): number {
  return items.reduce((total, item) => {
    return total + (item.quantity * item.unitPrice);
  }, 0);
}

// 格式化文档状态
export function formatDocumentStatus(status: string): string {
  const statusMap: Record<string, string> = {
    draft: '草稿',
    confirmed: '已确认',
    completed: '已完成',
    cancelled: '已取消',
  };
  
  return statusMap[status] || status;
}

// 获取文档状态颜色
export function getDocumentStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    draft: 'text-gray-500 bg-gray-100',
    confirmed: 'text-blue-600 bg-blue-100',
    completed: 'text-green-600 bg-green-100',
    cancelled: 'text-red-600 bg-red-100',
  };
  
  return colorMap[status] || 'text-gray-500 bg-gray-100';
}
