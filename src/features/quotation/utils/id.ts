// 生成唯一ID
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 生成合同号
export function generateContractNo(quotationNo?: string): string {
  if (quotationNo) {
    return quotationNo;
  }
  return `SC${Date.now()}`;
}

// 生成报价单号
export function generateQuotationNo(): string {
  return `QTN${Date.now()}`;
}
