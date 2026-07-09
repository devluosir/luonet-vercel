import type { InquiryRecord } from '@/features/inquiry';
import {
  getDateInputValueFromInquiryNo,
  dateInputToDate,
  stripDateBrackets,
} from '@/features/inquiry/utils/inquiryUtils';

/**
 * 首页「询价 / 已报价 / 订单」统计口径（见 CODEX_TASKS.md TASK-110）：
 *
 * - 询价创建日期：从 inquiryNo（含年份）解析，权威来源。
 * - 已报价：复用询报价登记表 customer_quoted 的判定（没有 unavailable/closed 且至少有一条 quoted/未标类型）。
 * - 订单确认日期：orderConfirmDate 只存 [m.D]，没有年份——按询价单年份推算：
 *   若确认月份 < 询价月份，说明跨年，年份 = 询价年份 + 1；否则同询价年份。这是推算，不是精确值。
 * - 订单数量不按 orderSubStatus（辙销/悬挂/善后）过滤，统计"历史上曾确认过的订单数"。
 */

export type Granularity = 'day' | 'week' | 'month' | 'quarter' | 'year';

export interface TrendPoint {
  label: string;
  inquiryCount: number;
  orderCount: number;
}

/** 默认分桶数量，非用户强制要求的精确值，可按需调整 */
export const DEFAULT_BUCKET_COUNT: Record<Granularity, number> = {
  day: 14,
  week: 12,
  month: 12,
  quarter: 8,
  year: 5,
};

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/** 解析 [m.D] / m.D 格式为 {month, day}，均为 1-based；解析失败返回 null */
function parseShortDate(value?: string): { month: number; day: number } | null {
  if (!value) return null;
  const stripped = stripDateBrackets(value.trim());
  const match = /^(\d{1,2})\.(\d{1,2})$/.exec(stripped);
  if (!match) return null;
  const month = Number(match[1]);
  const day = Number(match[2]);
  if (!month || !day || month > 12 || day > 31) return null;
  return { month, day };
}

/** 询价记录创建日期（含年份），来源于 inquiryNo，是本模块所有"询价年份"推算的基准 */
export function getInquiryCreatedDate(record: InquiryRecord): Date {
  return dateInputToDate(getDateInputValueFromInquiryNo(record.inquiryNo));
}

/** 按"询价年份"推算一个 [m.D] 短日期对应的完整年份：确认月份 < 询价月份视为跨年 */
function resolveYearForShortDate(
  shortDate: { month: number; day: number },
  inquiryDate: Date
): Date {
  const inquiryYear = inquiryDate.getFullYear();
  const inquiryMonth = inquiryDate.getMonth() + 1;
  const year = shortDate.month < inquiryMonth ? inquiryYear + 1 : inquiryYear;
  return new Date(year, shortDate.month - 1, shortDate.day);
}

/** 是否处于"已报价"状态：与询报价登记表 customer_quoted 判定一致 */
export function isRecordQuoted(record: InquiryRecord): boolean {
  const quotedStatuses = record.quotedStatuses ?? [];
  return (
    !quotedStatuses.some((s) => s.type === 'unavailable' || s.type === 'closed') &&
    quotedStatuses.some((s) => !s.type || s.type === 'quoted')
  );
}

/** 该记录当前是"已报价"状态，且存在一条 quoted/未标类型的报价，其推算日期落在指定日期 */
export function getQuotedOnDate(record: InquiryRecord, date: Date): boolean {
  if (!isRecordQuoted(record)) return false;
  const inquiryDate = getInquiryCreatedDate(record);
  const quotedStatuses = record.quotedStatuses ?? [];
  return quotedStatuses.some((s) => {
    if (s.type && s.type !== 'quoted') return false;
    const parsed = parseShortDate(s.quoteDate);
    if (!parsed) return false;
    const resolved = resolveYearForShortDate(parsed, inquiryDate);
    return isSameDay(resolved, date);
  });
}

/**
 * 订单确认日期（含推算年份）；orderNo / orderConfirmDate 缺失或解析失败返回 null。
 * 不按 orderSubStatus 过滤——辙销/悬挂/善后的订单一样计入"曾确认过的订单数"。
 */
export function getOrderConfirmDate(record: InquiryRecord): Date | null {
  if (!record.orderNo?.trim() || !record.orderConfirmDate) return null;
  const parsed = parseShortDate(record.orderConfirmDate);
  if (!parsed) return null;
  const inquiryDate = getInquiryCreatedDate(record);
  return resolveYearForShortDate(parsed, inquiryDate);
}

export function countInquiriesOn(records: InquiryRecord[], date: Date): number {
  return records.filter((r) => isSameDay(getInquiryCreatedDate(r), date)).length;
}

export function countInquiriesInMonth(records: InquiryRecord[], monthAnchor: Date): number {
  return records.filter((r) => isSameMonth(getInquiryCreatedDate(r), monthAnchor)).length;
}

export function countQuotedOn(records: InquiryRecord[], date: Date): number {
  return records.filter((r) => getQuotedOnDate(r, date)).length;
}

export function countOrdersOn(records: InquiryRecord[], date: Date): number {
  return records.filter((r) => {
    const confirmed = getOrderConfirmDate(r);
    return confirmed !== null && isSameDay(confirmed, date);
  }).length;
}

export function countOrdersInMonth(records: InquiryRecord[], monthAnchor: Date): number {
  return records.filter((r) => {
    const confirmed = getOrderConfirmDate(r);
    return confirmed !== null && isSameMonth(confirmed, monthAnchor);
  }).length;
}

interface Bucket {
  label: string;
  matches: (date: Date) => boolean;
}

function buildBuckets(granularity: Granularity, bucketCount: number, now: Date): Bucket[] {
  const buckets: Bucket[] = [];

  if (granularity === 'day') {
    for (let i = bucketCount - 1; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      buckets.push({ label: `${d.getMonth() + 1}/${d.getDate()}`, matches: (x) => isSameDay(x, d) });
    }
    return buckets;
  }

  if (granularity === 'week') {
    for (let i = bucketCount - 1; i >= 0; i -= 1) {
      const end = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 7));
      const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 6);
      const endExclusive = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1);
      buckets.push({
        label: `${start.getMonth() + 1}/${start.getDate()}`,
        matches: (x) => x >= start && x < endExclusive,
      });
    }
    return buckets;
  }

  if (granularity === 'month') {
    for (let i = bucketCount - 1; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({
        label: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        matches: (x) => x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth(),
      });
    }
    return buckets;
  }

  if (granularity === 'quarter') {
    const quarterIndexNow = Math.floor((now.getFullYear() * 12 + now.getMonth()) / 3);
    for (let i = bucketCount - 1; i >= 0; i -= 1) {
      const qIdx = quarterIndexNow - i;
      const startMonthIndex = qIdx * 3;
      const year = Math.floor(startMonthIndex / 12);
      const monthInYear = startMonthIndex - year * 12;
      const quarterNum = monthInYear / 3 + 1;
      buckets.push({
        label: `${year}-Q${quarterNum}`,
        matches: (x) => Math.floor((x.getFullYear() * 12 + x.getMonth()) / 3) === qIdx,
      });
    }
    return buckets;
  }

  // year
  for (let i = bucketCount - 1; i >= 0; i -= 1) {
    const year = now.getFullYear() - i;
    buckets.push({ label: `${year}`, matches: (x) => x.getFullYear() === year });
  }
  return buckets;
}

/**
 * 按粒度分桶统计数量。dateGetter 返回 null 的记录会被跳过（例如未成单的询价传入 getOrderConfirmDate）。
 */
export function bucketByGranularity<T>(
  records: T[],
  granularity: Granularity,
  dateGetter: (record: T) => Date | null,
  bucketCount: number = DEFAULT_BUCKET_COUNT[granularity]
): { label: string; value: number }[] {
  const now = new Date();
  const buckets = buildBuckets(granularity, bucketCount, now);
  const result = buckets.map((b) => ({ label: b.label, value: 0 }));

  records.forEach((record) => {
    const date = dateGetter(record);
    if (!date) return;
    for (let i = 0; i < buckets.length; i += 1) {
      if (buckets[i].matches(date)) {
        result[i].value += 1;
        break;
      }
    }
  });

  return result;
}

/** 组装趋势图需要的「询价 + 订单」双系列数据 */
export function buildTrendData(
  records: InquiryRecord[],
  granularity: Granularity,
  bucketCount: number = DEFAULT_BUCKET_COUNT[granularity]
): TrendPoint[] {
  const inquiryBuckets = bucketByGranularity(records, granularity, getInquiryCreatedDate, bucketCount);
  const orderBuckets = bucketByGranularity(records, granularity, getOrderConfirmDate, bucketCount);

  return inquiryBuckets.map((bucket, index) => ({
    label: bucket.label,
    inquiryCount: bucket.value,
    orderCount: orderBuckets[index]?.value ?? 0,
  }));
}
