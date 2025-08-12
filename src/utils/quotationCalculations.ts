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
