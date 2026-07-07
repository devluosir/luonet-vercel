const CN_ORDINAL_DIGITS = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

/**
 * 内销单据合同条款的中文序号生成器。
 * index 从 0 开始对应"二"（因为"一"是产品明细表标题，条款从二开始编号），
 * 支持超过十四条时继续生成 十五、十六……二十、二十一……，
 * 不再像旧版那样只有 13 个固定文字编号、超出就掉回阿拉伯数字。
 * 页面上的条款列表（NotesSection.tsx）和 PDF 导出（domesticQuotationPdfGenerator.ts）
 * 共用这一份逻辑，确保两边编号规则一致。
 */
export function getDomesticClauseNumber(index: number): string {
  const n = index + 2;
  if (n < 10) return CN_ORDINAL_DIGITS[n];
  if (n === 10) return '十';
  if (n < 20) return `十${CN_ORDINAL_DIGITS[n - 10]}`;
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  const tensPart = tens === 1 ? '十' : `${CN_ORDINAL_DIGITS[tens]}十`;
  return `${tensPart}${ones ? CN_ORDINAL_DIGITS[ones] : ''}`;
}
