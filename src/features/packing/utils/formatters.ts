import { format } from 'date-fns';

/**
 * 格式化数值，保留2位小数
 */
export const formatNumber = (value: number): string => {
  if (value === 0) return '0';
  if (!value || isNaN(value)) return '';
  return Number(value.toFixed(2)).toString();
};

/**
 * 格式化日期为 YYYY-MM-DD
 */
export const formatDate = (date: Date | string): string => {
  if (typeof date === 'string') {
    return date;
  }
  return format(date, 'yyyy-MM-dd');
};

/**
 * 格式化文件名
 */
export const formatFileName = (prefix: string, identifier: string, extension: string): string => {
  const date = new Date().toISOString().split('T')[0];
  return `${prefix}_${identifier || 'export'}_${date}.${extension}`;
};

/**
 * 格式化PDF文件名
 */
export const formatPdfFileName = (invoiceNo: string): string => {
  return formatFileName('PL', invoiceNo, 'pdf');
};

/**
 * 格式化Excel文件名
 */
export const formatExcelFileName = (invoiceNo: string): string => {
  return formatFileName('packing_list', invoiceNo, 'csv');
};

/**
 * 格式化货币显示
 */
export const formatCurrency = (amount: number, currency: string): string => {
  return `${currency} ${formatNumber(amount)}`;
};

/**
 * 格式化尺寸显示
 */
export const formatDimensions = (dimensions: string, unit: string): string => {
  if (!dimensions) return '';
  return `${dimensions} ${unit}`;
};
