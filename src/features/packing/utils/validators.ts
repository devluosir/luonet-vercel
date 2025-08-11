import { PackingData, PackingItem } from '../types';

/**
 * 验证箱单数据完整性
 */
export const validatePackingData = (data: PackingData): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // 验证基本信息
  if (!data.invoiceNo?.trim()) {
    errors.push('发票号不能为空');
  }

  if (!data.consignee?.name?.trim()) {
    errors.push('收货人信息不能为空');
  }

  if (!data.date) {
    errors.push('日期不能为空');
  }

  // 验证商品项目
  if (!data.items || data.items.length === 0) {
    errors.push('至少需要添加一个商品项目');
  } else {
    data.items.forEach((item, index) => {
      if (!item.description?.trim()) {
        errors.push(`第${index + 1}行商品描述不能为空`);
      }
      if (item.quantity <= 0) {
        errors.push(`第${index + 1}行商品数量必须大于0`);
      }
    });
  }

  // 验证其他费用
  if (data.otherFees) {
    data.otherFees.forEach((fee, index) => {
      if (!fee.description?.trim()) {
        errors.push(`其他费用第${index + 1}行描述不能为空`);
      }
      if (fee.amount < 0) {
        errors.push(`其他费用第${index + 1}行金额不能为负数`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * 验证商品项目数据
 */
export const validatePackingItem = (item: PackingItem): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!item.description?.trim()) {
    errors.push('商品描述不能为空');
  }

  if (item.quantity <= 0) {
    errors.push('商品数量必须大于0');
  }

  if (item.unitPrice < 0) {
    errors.push('商品单价不能为负数');
  }

  if (item.netWeight < 0) {
    errors.push('净重不能为负数');
  }

  if (item.grossWeight < 0) {
    errors.push('毛重不能为负数');
  }

  if (item.packageQty < 0) {
    errors.push('包装数量不能为负数');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * 验证数值输入
 */
export const validateNumberInput = (value: string | number, min: number = 0): boolean => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return !isNaN(num) && num >= min;
};

/**
 * 验证必填字段
 */
export const validateRequired = (value: string | number | undefined | null): boolean => {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return value !== undefined && value !== null;
};

/**
 * 验证日期格式
 */
export const validateDate = (date: string): boolean => {
  const dateObj = new Date(date);
  return !isNaN(dateObj.getTime());
};
