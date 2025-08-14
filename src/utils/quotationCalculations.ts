/**
 * 计算付款日期（以报价日期为基准+3天）
 */
export const calculatePaymentDate = (date: string): string => {
  const baseDate = new Date(date);
  const paymentDate = new Date(baseDate);
  paymentDate.setDate(paymentDate.getDate() + 3);
  const year = paymentDate.getFullYear();
  const month = String(paymentDate.getMonth() + 1).padStart(2, '0');
  const day = String(paymentDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * 数字转英文大写
 */
export const numberToWords = (num: number): { dollars: string; cents: string; hasDecimals: boolean } => {
  const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
  const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
  const teens = ['TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
  
  const convertLessThanThousand = (n: number): string => {
    if (n === 0) return '';
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) {
      return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? '-' + ones[n % 10] : '');
    }
    const hundred = ones[Math.floor(n / 100)] + ' HUNDRED';
    const remainder = n % 100;
    if (remainder === 0) return hundred;
    return hundred + ' AND ' + convertLessThanThousand(remainder);
  };

  const convert = (n: number): string => {
    if (n === 0) return 'ZERO';
    
    const billion = Math.floor(n / 1000000000);
    const million = Math.floor((n % 1000000000) / 1000000);
    const thousand = Math.floor((n % 1000000) / 1000);
    const remainder = n % 1000;
    
    let result = '';
    
    if (billion) result += convertLessThanThousand(billion) + ' BILLION ';
    if (million) result += convertLessThanThousand(million) + ' MILLION ';
    if (thousand) result += convertLessThanThousand(thousand) + ' THOUSAND ';
    if (remainder) result += convertLessThanThousand(remainder);
    
    return result.trim();
  };

  const dollars = Math.floor(num);
  const cents = Math.round((num - dollars) * 100);
  
  if (cents > 0) {
    return {
      dollars: convert(dollars),
      cents: `${convert(cents)} CENT${cents === 1 ? '' : 'S'}`,
      hasDecimals: true
    };
  } else {
    return {
      dollars: convert(dollars),
      cents: '',
      hasDecimals: false
    };
  }
};
