import type { QuotationData } from '@/types/quotation';

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

export function validateQuotation(_data: QuotationData): ValidationResult {
  // 移除客户信息和商品条目的验证
  // 允许用户创建空的报价单和订单确认
  
  return { valid: true };
}

export function validateQuotationForPreview(_data: QuotationData, _type?: 'quotation' | 'confirmation'): ValidationResult {
  // 移除所有验证，允许预览空的报价单和订单确认
  
  return { valid: true };
} 