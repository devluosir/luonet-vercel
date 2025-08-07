import type { QuotationData } from '@/types/quotation';

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

export function validateQuotation(data: QuotationData): ValidationResult {
  if (!data.to.trim()) {
    return { valid: false, message: '客户信息不能为空' };
  }
  
  if (data.items.length === 0 || (data.items.length === 1 && !data.items[0].partName)) {
    return { valid: false, message: '至少需要一个商品条目' };
  }
  
  // 检查是否有有效的商品条目
  const hasValidItems = data.items.some(item => 
    item.partName.trim() && item.quantity > 0 && item.unitPrice > 0
  );
  
  if (!hasValidItems) {
    return { valid: false, message: '请填写完整的商品信息（名称、数量、单价）' };
  }
  
  return { valid: true };
}

export function validateQuotationForPreview(data: QuotationData): ValidationResult {
  const basicValidation = validateQuotation(data);
  if (!basicValidation.valid) {
    return basicValidation;
  }
  
  // 预览时的额外校验
  if (!data.quotationNo.trim()) {
    return { valid: false, message: '请填写报价单号' };
  }
  
  return { valid: true };
} 