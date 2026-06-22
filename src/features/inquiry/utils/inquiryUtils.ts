import { nanoid } from 'nanoid';
import type { CustomerQuoteStatus, InquiryRecord, SupplierQuoteStatus } from '../types';

export type InquiryColorClass =
  | 'text-pink-500'
  | 'text-blue-600'
  | 'text-gray-400'
  | 'text-yellow-500';

const INQUIRY_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'.split('');

/**
 * 将日期格式化为 [m.D]，如 [6.20]
 */
export function formatShortDate(date: Date): string {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `[${m}.${d}]`;
}

/**
 * 生成询价编号，格式 C[YYmmDD]F
 * 例：2026年6月20日 -> C260620F
 */
export function generateInquiryNo(date: Date, suffix: string = 'F'): string {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `C${yy}${mm}${dd}${suffix}`;
}

function createSuffixSequence(): string[] {
  const single = INQUIRY_LETTERS.filter((letter) => letter >= 'F');
  const result = [...single];

  for (let prefixLength = 1; prefixLength <= 8; prefixLength += 1) {
    const prefix = 'Z'.repeat(prefixLength);
    for (const letter of INQUIRY_LETTERS) {
      result.push(`${prefix}${letter}`);
    }
  }

  return result;
}

/**
 * 询价编号后缀序列：F-Z 后接 ZA-ZZ、ZZA-ZZZ，以此类推；全程跳过 I、O。
 */
export const INQUIRY_SUFFIX_SEQUENCE: string[] = createSuffixSequence();

/**
 * 获取指定后缀在序列中的下一个
 */
export function nextInquirySuffix(current: string): string {
  const idx = INQUIRY_SUFFIX_SEQUENCE.indexOf(current);
  if (idx === -1 || idx >= INQUIRY_SUFFIX_SEQUENCE.length - 1) return current;
  return INQUIRY_SUFFIX_SEQUENCE[idx + 1];
}

/**
 * 根据当天已有记录，生成当天下一个可用的询价编号
 */
export function generateNextInquiryNo(date: Date, existingNos: string[]): string {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const prefix = `C${yy}${mm}${dd}`;
  // 去掉 -U 后缀再入集合，使 C260621M-U 也能占住 C260621M 这个槽位
  const todayNos = new Set(
    existingNos
      .filter((no) => no.startsWith(prefix))
      .map((no) => (no.endsWith('-U') ? no.slice(0, -2) : no))
  );

  for (const suffix of INQUIRY_SUFFIX_SEQUENCE) {
    const candidate = `${prefix}${suffix}`;
    if (!todayNos.has(candidate)) return candidate;
  }

  return `${prefix}F`;
}

export function createId(): string {
  return nanoid();
}

export function dateInputToDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day);
}

export function getTodayDateInputValue(date: Date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function getDateInputValueFromInquiryNo(inquiryNo: string): string {
  const match = /^C(\d{2})(\d{2})(\d{2})/.exec(inquiryNo);
  if (!match) return getTodayDateInputValue();

  const year = Number(`20${match[1]}`);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return getTodayDateInputValue(new Date(year, month - 1, day));
}

export function normalizeShortDateInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^\[\d{1,2}\.\d{1,2}\]$/.test(trimmed)) return trimmed;
  if (/^\d{1,2}\.\d{1,2}$/.test(trimmed)) return `[${trimmed}]`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return formatShortDate(dateInputToDate(trimmed));
  }
  return trimmed;
}

/** 去掉方括号：[6.20] → 6.20（用于日期列、已报价区域） */
export function stripDateBrackets(date: string): string {
  return date.replace(/^\[|\]$/g, '');
}

/** 方括号改圆括号：[6.20] → (6.20)（用于供应商区域日期） */
export function roundDateBrackets(date: string): string {
  return date.replace(/^\[/, '(').replace(/\]$/, ')');
}

export function getRecordColorState(record: InquiryRecord): InquiryColorClass {
  if (record.quotedStatuses.some((s) => s.type === 'unavailable' || s.type === 'closed')) return 'text-gray-400';
  if (record.quotedStatuses.some((s) => !s.type || s.type === 'quoted' || s.type === 'supplemented')) return 'text-blue-600';
  return 'text-pink-500';
}

export function getSupplierStatusClass(supplier: SupplierQuoteStatus): InquiryColorClass {
  switch (supplier.status) {
    case 'quoted':      return 'text-blue-600';   // 已报价：名称+日期 蓝色
    case 'unavailable': return 'text-gray-400';   // 无法报价：名称+日期 灰色
    case 'need_info':   return 'text-yellow-500'; // 需补资料：名称+日期 黄色
    default:            return 'text-pink-500';   // 未报价（pending）：名称 粉红，无日期
  }
}

export function getNextQuoteVersion(statuses: CustomerQuoteStatus[]): string {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const idx = statuses.length;
  if (idx < 26) return letters[idx];
  // 超过 26 个时：aa, ab, ...
  return `a${letters[idx - 26] ?? idx}`;
}
