import { createId } from '@/features/inquiry/utils/inquiryUtils';
import type { CustomerQuoteStatus, InquiryRecord, SupplierQuoteStatus, SupplierStatus } from '@/features/inquiry/types';

/** 飞罗（上海飞罗贸易有限公司）在供应商列表中的短名，代表"我方自己"这一自供应商身份 */
export const SELF_SUPPLIER_NAME = '飞罗';

/**
 * 在供应商状态数组里找到"飞罗"这一条（按 trim 后的短名精确匹配，不认部分匹配）。
 */
export function findSelfSupplier(
  supplierStatuses: SupplierQuoteStatus[] | undefined
): SupplierQuoteStatus | undefined {
  return (supplierStatuses ?? []).find((s) => s.supplierShortName?.trim() === SELF_SUPPLIER_NAME);
}

/** 销售侧"飞罗"当前是否处于需补资料状态（用于采购部只读展示） */
export function isSelfSupplierNeedInfo(supplierStatuses: SupplierQuoteStatus[] | undefined): boolean {
  return findSelfSupplier(supplierStatuses)?.status === 'need_info';
}

/**
 * 销售侧 quotedStatuses 里的"已补充信息"记录：销售从客户那边拿到补充信息后，在询报价登记
 * 页面登记的 type === 'supplemented' 状态。与采购部自己的 purchaseQuotedStatuses.supplemented
 * 是两个独立存储、独立勾选的标记，互不覆盖——但采购部需要能只读看到销售侧这一条，用于状态列
 * 和编辑弹窗里的只读展示，避免"客户已经把资料给销售了，采购部却完全不知道"。
 */
export function findSalesSupplemented(
  quotedStatuses: CustomerQuoteStatus[] | undefined
): CustomerQuoteStatus | undefined {
  return (quotedStatuses ?? []).find((s) => s.type === 'supplemented');
}

/** 销售侧是否已登记"已补充信息"（用于采购部状态列/只读展示） */
export function isSalesSupplemented(quotedStatuses: CustomerQuoteStatus[] | undefined): boolean {
  return !!findSalesSupplemented(quotedStatuses);
}

/**
 * 解析 [m.D] / m.D 形式的短日期为可比较的数字，越大越新。
 * 缺失或无法解析时返回 -1，保证有值的日期总是排在前面。
 */
function parseShortDate(raw: string | undefined): number {
  if (!raw) return -1;
  const clean = raw.replace(/[[\]]/g, '');
  const [mStr, dStr] = clean.split('.');
  const m = parseInt(mStr ?? '0', 10);
  const d = parseInt(dStr ?? '0', 10);
  return m ? m * 100 + (d || 0) : -1;
}

/** 在一组带 quoteDate 的记录里取日期最新的一条；全部缺失日期时返回 undefined。 */
function pickLatestByDate<T extends { quoteDate?: string }>(items: T[]): T | undefined {
  const withDate = items.filter((item) => !!item.quoteDate);
  if (withDate.length === 0) return undefined;
  return withDate.reduce((best, current) =>
    parseShortDate(current.quoteDate) >= parseShortDate(best.quoteDate) ? current : best
  );
}

export interface SelfSupplierTarget {
  status: SupplierStatus;
  quoteDate: string;
}

/**
 * 按业务优先级，从采购部本次待保存的状态里推导出销售侧"飞罗"应该同步成什么状态。
 * 优先级（从高到低）：
 * 1. 采购部勾选"我司无法报价" → unavailable，日期取该状态的日期
 * 2. 任一采购供应商为 need_info → need_info，日期取最新一条需补资料日期
 * 3. purchaseQuotedStatuses 中存在普通报价（无 type 或 type === 'quoted'）→ quoted，日期取最新报价日期
 * 4. 均不满足 → 返回 null，调用方不应主动清空或回退销售侧飞罗状态
 */
export function computeSelfSupplierTarget(
  purchaseSupplierStatuses: SupplierQuoteStatus[] | undefined,
  purchaseQuotedStatuses: CustomerQuoteStatus[] | undefined
): SelfSupplierTarget | null {
  const quoted = purchaseQuotedStatuses ?? [];
  const suppliers = purchaseSupplierStatuses ?? [];

  const unavailable = quoted.find((s) => s.type === 'unavailable');
  if (unavailable) {
    return { status: 'unavailable', quoteDate: unavailable.quoteDate };
  }

  const needInfoSuppliers = suppliers.filter((s) => s.status === 'need_info');
  if (needInfoSuppliers.length > 0) {
    const latest = pickLatestByDate(needInfoSuppliers);
    return { status: 'need_info', quoteDate: latest?.quoteDate ?? '' };
  }

  const regularQuoted = quoted.filter((s) => !s.type || s.type === 'quoted');
  if (regularQuoted.length > 0) {
    const latest = pickLatestByDate(regularQuoted);
    if (latest) return { status: 'quoted', quoteDate: latest.quoteDate };
  }

  return null;
}

/**
 * 把目标状态应用到销售侧 supplierStatuses 上，只修改/新增"飞罗"这一条，其余供应商保持不变。
 * - target 为 null：不产生补丁（保持现有兼容策略，不清空/回退）
 * - 已存在"飞罗"且状态、日期都已一致：不产生补丁（避免无意义写入）
 * - 已存在"飞罗"但状态或日期不同：只替换这一条
 * - 不存在"飞罗"：追加新建一条
 * 返回 undefined 表示"不需要写 supplierStatuses 补丁"。
 */
export function applySelfSupplierSync(
  supplierStatuses: SupplierQuoteStatus[] | undefined,
  target: SelfSupplierTarget | null
): SupplierQuoteStatus[] | undefined {
  if (!target) return undefined;
  const list = supplierStatuses ?? [];
  const existing = findSelfSupplier(list);

  if (existing) {
    if (existing.status === target.status && existing.quoteDate === target.quoteDate) {
      return undefined;
    }
    return list.map((s) =>
      s.id === existing.id ? { ...s, status: target.status, quoteDate: target.quoteDate } : s
    );
  }

  return [
    ...list,
    { id: createId(), supplierShortName: SELF_SUPPLIER_NAME, status: target.status, quoteDate: target.quoteDate },
  ];
}

/**
 * 组合以上两步：采购部保存时，直接调用这一个函数即可得到"是否需要写 supplierStatuses"的结论。
 */
export function computeSelfSupplierPatch(
  supplierStatuses: SupplierQuoteStatus[] | undefined,
  purchaseSupplierStatuses: SupplierQuoteStatus[] | undefined,
  purchaseQuotedStatuses: CustomerQuoteStatus[] | undefined
): SupplierQuoteStatus[] | undefined {
  const target = computeSelfSupplierTarget(purchaseSupplierStatuses, purchaseQuotedStatuses);
  return applySelfSupplierSync(supplierStatuses, target);
}

/**
 * "其他 n 家已报价"计数：数据来源是销售侧 supplierStatuses，排除飞罗，只统计 status === 'quoted'，
 * 按 supplierShortName.trim() 去重（不按报价版本数/数组条目数重复计数）。
 * 表格状态列与编辑弹窗共用同一份计数逻辑，不允许复制两套。
 */
export function countOtherQuotedSuppliers(supplierStatuses: SupplierQuoteStatus[] | undefined): number {
  const names = new Set<string>();
  (supplierStatuses ?? []).forEach((s) => {
    const name = s.supplierShortName?.trim();
    if (!name || name === SELF_SUPPLIER_NAME) return;
    if (s.status !== 'quoted') return;
    names.add(name);
  });
  return names.size;
}

export type PurchaseInquiryMainStatus =
  | { kind: 'closed' }
  | { kind: 'ordered' }
  | { kind: 'supplemented' }
  | { kind: 'need_info' }
  | { kind: 'others_quoted'; count: number }
  | { kind: 'none' };

/**
 * 采购部登记表状态列的主状态，按优先级（从高到低）：
 * 1. 销售侧询价已关闭（record.quotedStatuses 中 type === 'closed'）→ closed
 * 2. orderNo 非空 → ordered
 * 3. purchaseQuotedStatuses 存在 type === 'supplemented'，或销售侧 quotedStatuses 存在
 *    type === 'supplemented' → supplemented（两边任一登记了"已补充信息"都算，互不覆盖）
 * 4. 任一采购供应商为 need_info，或销售侧飞罗为 need_info → need_info
 * 5. 其他供应商已报价数量（countOtherQuotedSuppliers）大于 0 → others_quoted
 * 6. 均不满足 → none
 */
export function computePurchaseMainStatus(record: InquiryRecord): PurchaseInquiryMainStatus {
  const salesClosed = (record.quotedStatuses ?? []).some((s) => s.type === 'closed');
  if (salesClosed) return { kind: 'closed' };

  if (record.orderNo?.trim()) return { kind: 'ordered' };

  const purchaseQuoted = record.purchaseQuotedStatuses ?? [];
  if (purchaseQuoted.some((s) => s.type === 'supplemented') || isSalesSupplemented(record.quotedStatuses)) {
    return { kind: 'supplemented' };
  }

  const anyPurchaseSupplierNeedInfo = (record.purchaseSupplierStatuses ?? []).some(
    (s) => s.status === 'need_info'
  );
  if (anyPurchaseSupplierNeedInfo || isSelfSupplierNeedInfo(record.supplierStatuses)) {
    return { kind: 'need_info' };
  }

  const othersCount = countOtherQuotedSuppliers(record.supplierStatuses);
  if (othersCount > 0) return { kind: 'others_quoted', count: othersCount };

  return { kind: 'none' };
}

export interface PurchaseMainStatusBadge {
  label: string;
  className: string;
}

/** 把主状态转成表格/弹窗展示用的 badge 文案与配色（均不满足时返回 null，由调用方展示低强调空态）。 */
export function formatPurchaseMainStatus(status: PurchaseInquiryMainStatus): PurchaseMainStatusBadge | null {
  switch (status.kind) {
    case 'closed':
      return { label: '已关闭', className: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' };
    case 'ordered':
      return { label: '已成单', className: 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300' };
    case 'supplemented':
      return { label: '已补充信息', className: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' };
    case 'need_info':
      return { label: '需补充信息', className: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300' };
    case 'others_quoted':
      return {
        label: `其他 ${status.count} 家已报价`,
        className: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
      };
    case 'none':
    default:
      return null;
  }
}
