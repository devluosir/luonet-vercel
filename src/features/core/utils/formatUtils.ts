// 格式化货币
export function formatCurrency(amount: number, currency: string = 'CNY'): string {
  const formatter = new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  return formatter.format(amount);
}

// 格式化数字
export function formatNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

// 格式化日期
export function formatDate(date: string | Date, format: 'short' | 'long' | 'iso' = 'short'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  switch (format) {
    case 'short':
      return dateObj.toLocaleDateString('zh-CN');
    case 'long':
      return dateObj.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
      });
    case 'iso':
      return dateObj.toISOString().split('T')[0];
    default:
      return dateObj.toLocaleDateString('zh-CN');
  }
}

// 格式化日期时间
export function formatDateTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// 格式化文件大小
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 格式化电话号码
export function formatPhone(phone: string): string {
  if (!phone) return '';
  
  // 移除所有非数字字符
  const cleaned = phone.replace(/\D/g, '');
  
  // 格式化中国手机号
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{3})(\d{4})(\d{4})/, '$1 $2 $3');
  }
  
  return phone;
}

// 格式化身份证号
export function formatIdCard(idCard: string): string {
  if (!idCard) return '';
  
  // 移除所有非数字和X字符
  const cleaned = idCard.replace(/[^\dXx]/g, '');
  
  // 格式化身份证号
  if (cleaned.length === 18) {
    return cleaned.replace(/(\d{6})(\d{4})(\d{4})(\w{4})/, '$1 $2 $3 $4');
  }
  
  return idCard;
}

// 格式化银行卡号
export function formatBankCard(cardNumber: string): string {
  if (!cardNumber) return '';
  
  // 移除所有非数字字符
  const cleaned = cardNumber.replace(/\D/g, '');
  
  // 每4位添加一个空格
  return cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
}

// 截断文本
export function truncateText(text: string, maxLength: number, suffix: string = '...'): string {
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength - suffix.length) + suffix;
}

// 格式化百分比
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

// 格式化时间间隔
export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}天${hours % 24}小时`;
  } else if (hours > 0) {
    return `${hours}小时${minutes % 60}分钟`;
  } else if (minutes > 0) {
    return `${minutes}分钟${seconds % 60}秒`;
  } else {
    return `${seconds}秒`;
  }
}
