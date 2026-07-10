import type { CustomerQuoteStatus, InquiryRecord } from '@/features/inquiry';
import {
  getDateInputValueFromInquiryNo,
  dateInputToDate,
  stripDateBrackets,
} from '@/features/inquiry/utils/inquiryUtils';

/**
 * 首页「询价 / 已报价 / 订单」统计口径（见 CODEX_TASKS.md TASK-110、TASK-113）：
 *
 * - 询价创建日期：从 inquiryNo（含年份）解析，权威来源。
 * - 已报价：复用询报价登记表 customer_quoted 的判定（没有 unavailable/closed 且至少有一条 quoted/未标类型）。
 *   询价订单趋势图读 quotedStatuses（客户视角）；采购询价订单趋势图读 purchaseQuotedStatuses（供应商视角，
 *   TASK-113），两者结构相同，字段来源通过 QuotedStatusField 参数区分。
 * - 订单确认日期：orderConfirmDate 只存 [m.D]，没有年份——按询价单年份推算：
 *   若确认月份 < 询价月份，说明跨年，年份 = 询价年份 + 1；否则同询价年份。这是推算，不是精确值。
 * - 订单数量不按 orderSubStatus（辙销/悬挂/善后）过滤，统计"历史上曾确认过的订单数"。
 */

export type Granularity = 'day' | 'week' | 'month' | 'quarter' | 'year';

/** 已报价状态取自哪个字段：quotedStatuses=客户视角（询报价登记表），purchaseQuotedStatuses=供应商视角（采购部登记） */
export type QuotedStatusField = 'quotedStatuses' | 'purchaseQuotedStatuses';

export interface TrendPoint {
  label: string;
  inquiryCount: number;
  quotedCount: number;
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

/** 该日期所在自然周的周一（本地时区，周一为一周起点，与下面 ISO 周号定义一致） */
function startOfWeek(date: Date): Date {
  const day = date.getDay(); // 0=周日..6=周六
  const diffToMonday = day === 0 ? -6 : 1 - day;
  return startOfDay(new Date(date.getFullYear(), date.getMonth(), date.getDate() + diffToMonday));
}

/** date 是否落在以 weekStart（必须是某周的周一）开始的那一周内 */
function isInWeekStartingAt(date: Date, weekStart: Date): boolean {
  const endExclusive = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 7);
  return date >= weekStart && date < endExclusive;
}

/** ISO 8601 周号（周一为一周第一天，跨年边界按 ISO 规则处理，即"第 1 周"是含当年首个周四的那一周） */
function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7; // 周一=0
  d.setUTCDate(d.getUTCDate() - dayNum + 3); // 移到本周的周四
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  return 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000));
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

function getQuotedStatusList(record: InquiryRecord, field: QuotedStatusField): CustomerQuoteStatus[] {
  return record[field] ?? [];
}

/** 是否处于"已报价"状态：与询报价登记表 customer_quoted 判定一致；field 指定读客户视角还是供应商视角 */
export function isRecordQuoted(record: InquiryRecord, field: QuotedStatusField = 'quotedStatuses'): boolean {
  const quotedStatuses = getQuotedStatusList(record, field);
  return (
    !quotedStatuses.some((s) => s.type === 'unavailable' || s.type === 'closed') &&
    quotedStatuses.some((s) => !s.type || s.type === 'quoted')
  );
}

/** 该记录当前是"已报价"状态，且存在一条 quoted/未标类型的报价，其推算日期落在指定日期 */
export function getQuotedOnDate(record: InquiryRecord, date: Date, field: QuotedStatusField = 'quotedStatuses'): boolean {
  if (!isRecordQuoted(record, field)) return false;
  const inquiryDate = getInquiryCreatedDate(record);
  const quotedStatuses = getQuotedStatusList(record, field);
  return quotedStatuses.some((s) => {
    if (s.type && s.type !== 'quoted') return false;
    const parsed = parseShortDate(s.quoteDate);
    if (!parsed) return false;
    const resolved = resolveYearForShortDate(parsed, inquiryDate);
    return isSameDay(resolved, date);
  });
}

/**
 * 记录的"最新已报价日期"（TASK-113）：不管这条记录有几条 quoted 类型的报价状态（比如 A/B 版本报价），
 * 只取其中最晚的一个日期，用于趋势图分桶时一条记录只贡献 1 次。与 getQuotedOnDate（按天精确匹配，
 * 一条记录可能在多个不同日期的 bucket 里各命中一次，服务于"今日新增"这类单日统计）语义不同，不要混用。
 * 记录未处于"已报价"状态，或没有可解析的报价日期，返回 null。
 */
export function getLatestQuotedDate(record: InquiryRecord, field: QuotedStatusField = 'quotedStatuses'): Date | null {
  if (!isRecordQuoted(record, field)) return null;
  const inquiryDate = getInquiryCreatedDate(record);
  const quotedStatuses = getQuotedStatusList(record, field);
  let latest: Date | null = null;
  quotedStatuses.forEach((s) => {
    if (s.type && s.type !== 'quoted') return;
    const parsed = parseShortDate(s.quoteDate);
    if (!parsed) return;
    const resolved = resolveYearForShortDate(parsed, inquiryDate);
    if (!latest || resolved.getTime() > latest.getTime()) {
      latest = resolved;
    }
  });
  return latest;
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

/** 已报价数量（本月），field 区分客户视角/供应商视角；用 getLatestQuotedDate 保证同一条记录只计 1 次 */
export function countQuotedInMonth(
  records: InquiryRecord[],
  monthAnchor: Date,
  field: QuotedStatusField = 'quotedStatuses'
): number {
  return records.filter((r) => {
    const quotedDate = getLatestQuotedDate(r, field);
    return quotedDate !== null && isSameMonth(quotedDate, monthAnchor);
  }).length;
}

export function countInquiriesInWeek(records: InquiryRecord[], weekAnchor: Date): number {
  const weekStart = startOfWeek(weekAnchor);
  return records.filter((r) => isInWeekStartingAt(getInquiryCreatedDate(r), weekStart)).length;
}

/** 已报价数量（本周），field 区分客户视角/供应商视角；用 getLatestQuotedDate 保证同一条记录只计 1 次 */
export function countQuotedInWeek(
  records: InquiryRecord[],
  weekAnchor: Date,
  field: QuotedStatusField = 'quotedStatuses'
): number {
  const weekStart = startOfWeek(weekAnchor);
  return records.filter((r) => {
    const quotedDate = getLatestQuotedDate(r, field);
    return quotedDate !== null && isInWeekStartingAt(quotedDate, weekStart);
  }).length;
}

export function countOrdersInWeek(records: InquiryRecord[], weekAnchor: Date): number {
  const weekStart = startOfWeek(weekAnchor);
  return records.filter((r) => {
    const confirmed = getOrderConfirmDate(r);
    return confirmed !== null && isInWeekStartingAt(confirmed, weekStart);
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
    // 自然周（周一～周日），对齐"本周"统计口径；横轴显示 ISO 周号（第 N 周），不再是"M/D"日期
    const currentWeekStart = startOfWeek(now);
    for (let i = bucketCount - 1; i >= 0; i -= 1) {
      const start = new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), currentWeekStart.getDate() - i * 7);
      const endExclusive = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
      buckets.push({
        label: `第${getISOWeekNumber(start)}周`,
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

/**
 * 组装趋势图需要的「询价 + 已报价 + 订单」三系列数据。
 * 询价、订单两条线口径固定（同一批记录，两张表数值理应相同，见 TASK-113 背景）；
 * 已报价这条线按 quotedStatusField 区分客户视角（询价订单趋势图）还是供应商视角（采购询价订单趋势图）。
 */
export function buildTrendData(
  records: InquiryRecord[],
  granularity: Granularity,
  quotedStatusField: QuotedStatusField = 'quotedStatuses',
  bucketCount: number = DEFAULT_BUCKET_COUNT[granularity]
): TrendPoint[] {
  const inquiryBuckets = bucketByGranularity(records, granularity, getInquiryCreatedDate, bucketCount);
  const orderBuckets = bucketByGranularity(records, granularity, getOrderConfirmDate, bucketCount);
  const quotedBuckets = bucketByGranularity(
    records,
    granularity,
    (record) => getLatestQuotedDate(record, quotedStatusField),
    bucketCount
  );

  return inquiryBuckets.map((bucket, index) => ({
    label: bucket.label,
    inquiryCount: bucket.value,
    quotedCount: quotedBuckets[index]?.value ?? 0,
    orderCount: orderBuckets[index]?.value ?? 0,
  }));
}
