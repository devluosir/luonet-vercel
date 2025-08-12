import type { BaseDocument, BaseCustomer, BaseLineItem } from '../types';

// 验证邮箱格式
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// 验证手机号格式
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
}

// 验证必填字段
export function validateRequired(value: any, fieldName: string): string | null {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return `${fieldName}不能为空`;
  }
  return null;
}

// 验证数字字段
export function validateNumber(value: any, fieldName: string, min?: number, max?: number): string | null {
  const num = Number(value);
  if (isNaN(num)) {
    return `${fieldName}必须是数字`;
  }
  
  if (min !== undefined && num < min) {
    return `${fieldName}不能小于${min}`;
  }
  
  if (max !== undefined && num > max) {
    return `${fieldName}不能大于${max}`;
  }
  
  return null;
}

// 验证客户信息
export function validateCustomer(customer: BaseCustomer): Record<string, string> {
  const errors: Record<string, string> = {};
  
  // 验证客户名称
  const nameError = validateRequired(customer.name, '客户名称');
  if (nameError) errors.name = nameError;
  
  // 验证地址
  const addressError = validateRequired(customer.address, '客户地址');
  if (addressError) errors.address = addressError;
  
  // 验证联系人
  const contactError = validateRequired(customer.contact, '联系人');
  if (contactError) errors.contact = contactError;
  
  // 验证邮箱
  if (customer.email && !isValidEmail(customer.email)) {
    errors.email = '邮箱格式不正确';
  }
  
  // 验证手机号
  if (customer.phone && !isValidPhone(customer.phone)) {
    errors.phone = '手机号格式不正确';
  }
  
  return errors;
}

// 验证商品项
export function validateLineItem(item: BaseLineItem): Record<string, string> {
  const errors: Record<string, string> = {};
  
  // 验证商品名称
  const nameError = validateRequired(item.name, '商品名称');
  if (nameError) errors.name = nameError;
  
  // 验证数量
  const quantityError = validateNumber(item.quantity, '数量', 0);
  if (quantityError) errors.quantity = quantityError;
  
  // 验证单位
  const unitError = validateRequired(item.unit, '单位');
  if (unitError) errors.unit = unitError;
  
  // 验证单价
  const unitPriceError = validateNumber(item.unitPrice, '单价', 0);
  if (unitPriceError) errors.unitPrice = unitPriceError;
  
  return errors;
}

// 验证文档基础信息
export function validateDocument(document: BaseDocument): Record<string, string> {
  const errors: Record<string, string> = {};
  
  // 验证文档编号
  const documentNoError = validateRequired(document.documentNo, '文档编号');
  if (documentNoError) errors.documentNo = documentNoError;
  
  // 验证日期
  const dateError = validateRequired(document.date, '日期');
  if (dateError) errors.date = dateError;
  
  // 验证货币
  const currencyError = validateRequired(document.currency, '货币');
  if (currencyError) errors.currency = currencyError;
  
  // 验证总金额
  const totalAmountError = validateNumber(document.totalAmount, '总金额', 0);
  if (totalAmountError) errors.totalAmount = totalAmountError;
  
  return errors;
}

// 验证整个文档
export function validateDocumentComplete<T extends BaseDocument>(
  document: T,
  customers?: BaseCustomer[],
  items?: BaseLineItem[]
): Record<string, string> {
  const errors: Record<string, string> = {};
  
  // 验证文档基础信息
  const documentErrors = validateDocument(document);
  Object.assign(errors, documentErrors);
  
  // 验证客户信息
  if (customers) {
    customers.forEach((customer, index) => {
      const customerErrors = validateCustomer(customer);
      Object.keys(customerErrors).forEach(key => {
        errors[`customers.${index}.${key}`] = customerErrors[key];
      });
    });
  }
  
  // 验证商品项
  if (items) {
    items.forEach((item, index) => {
      const itemErrors = validateLineItem(item);
      Object.keys(itemErrors).forEach(key => {
        errors[`items.${index}.${key}`] = itemErrors[key];
      });
    });
  }
  
  return errors;
}

// 检查文档是否可以保存
export function canSaveDocument(errors: Record<string, string>): boolean {
  return Object.keys(errors).length === 0;
}

// 获取第一个错误信息
export function getFirstError(errors: Record<string, string>): string | null {
  const firstKey = Object.keys(errors)[0];
  return firstKey ? errors[firstKey] : null;
}
