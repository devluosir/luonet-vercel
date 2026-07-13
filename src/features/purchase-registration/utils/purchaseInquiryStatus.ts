import { createId, stripDateBrackets } from '@/features/inquiry/utils/inquiryUtils';
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

/**
 * 销售侧"飞罗"处于需补资料状态时的完整记录（用于采购部只读展示，含日期）；不是则返回 undefined。
 */
export function findSelfSupplierNeedInfo(
  supplierStatuses: SupplierQuoteStatus[] | undefined
): SupplierQuoteStatus | undefined {
  const self = findSelfSupplier(supplierStatuses);
  return self?.status === 'need_info' ? self : undefined;
}

/** 销售侧"飞罗"当前是否处于需补资料状态（用于采购部只读展示） */
export function isSelfSupplierNeedInfo(supplierStatuses: SupplierQuoteStatus[] | undefined): boolean {
  return !!findSelfSupplierNeedInfo(supplierStatuses);
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
 * 销售侧 quotedStatuses 里的"已回复客户无法报价"记录（type === 'unavailable'）。这是销售在
 * 询报价登记页面勾选的、面向客户的终态标记，与采购部自己勾选的"我司无法报价"
 * （purchaseQuotedStatuses.type === 'unavailable'，用于同步销售侧"飞罗"供应商状态，见
 * computeSelfSupplierTarget）是两个独立概念、独立存储——这里读取的是销售侧那一份，
 * 用于采购部状态列/编辑弹窗只读展示，让采购部知道客户那边已经被回复"无法报价"。
 */
export function findSalesUnavailable(
  quotedStatuses: CustomerQuoteStatus[] | undefined
): CustomerQuoteStatus | undefined {
  return (quotedStatuses ?? []).find((s) => s.type === 'unavailable');
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

/**
 * 采购部 purchaseSupplierStatuses 里最新一条 need_info 记录（用于询报价登记页面只读展示，
 * 让销售侧知道采购部还在等哪家供应商补资料，含日期）；没有则返回 undefined。
 */
export function findLatestPurchaseNeedInfo(
  purchaseSupplierStatuses: SupplierQuoteStatus[] | undefined
): SupplierQuoteStatus | undefined {
  const needInfo = (purchaseSupplierStatuses ?? []).filter((s) => s.status === 'need_info');
  return pickLatestByDate(needInfo);
}

/**
 * 采购部自己在 purchaseQuotedStatuses 里标记的"已补充信息"记录（采购部已经把资料转给了具体的
 * 采购供应商），用于询报价登记页面只读展示，让销售侧知道采购部这边已经处理完了。
 */
export function findPurchaseSupplemented(
  purchaseQuotedStatuses: CustomerQuoteStatus[] | undefined
): CustomerQuoteStatus | undefined {
  return (purchaseQuotedStatuses ?? []).find((s) => s.type === 'supplemented');
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

/** "其他供应商已报价"里最新的一条报价日期（排除飞罗，只看 status === 'quoted'），不涉及去重计数。 */
export function findLatestOtherQuotedDate(supplierStatuses: SupplierQuoteStatus[] | undefined): string | undefined {
  const others = (supplierStatuses ?? []).filter((s) => {
    const name = s.supplierShortName?.trim();
    return !!name && name !== SELF_SUPPLIER_NAME && s.status === 'quoted';
  });
  return pickLatestByDate(others)?.quoteDate;
}

export type PurchaseInquiryMainStatus =
  | { kind: 'closed'; date?: string }
  | { kind: 'unavailable'; date?: string }
  | { kind: 'ordered'; date?: string }
  | { kind: 'supplemented'; date?: string }
  | { kind: 'need_info'; date?: string }
  | { kind: 'others_quoted'; count: number; date?: string }
  | { kind: 'none' };

/**
 * 采购部登记表状态列的主状态，按优先级（从高到低）：
 * 1. 销售侧询价已关闭（record.quotedStatuses 中 type === 'closed'）→ closed，日期取该关闭记录的日期
 * 2. 销售侧已回复客户无法报价（record.quotedStatuses 中 type === 'unavailable'）→ unavailable，
 *    日期取该记录的日期——与"已关闭"同属销售侧终态标记，优先级仅次于"已关闭"、高于"已成单"
 *    （两者理论上不应与真实成单同时出现，出现即视为历史遗留数据未清理，仍按此优先级展示）
 * 3. orderNo 非空 → ordered，日期取确认日（orderConfirmDate，可能为空）
 * 4. purchaseQuotedStatuses 存在 type === 'supplemented'，或销售侧 quotedStatuses 存在
 *    type === 'supplemented' → supplemented（两边任一登记了"已补充信息"都算，互不覆盖，
 *    优先级严格高于 need_info——即使同时存在需补资料的供应商，也只显示"已补充信息"），
 *    日期取两个来源里较新的一个
 * 5. 任一采购供应商为 need_info，或销售侧飞罗为 need_info → need_info，日期取两个来源里较新的一个
 * 6. 其他供应商已报价数量（countOtherQuotedSuppliers）大于 0 → others_quoted，日期取最新报价日期
 * 7. 均不满足 → none
 */
export function computePurchaseMainStatus(record: InquiryRecord): PurchaseInquiryMainStatus {
  const closedEntry = (record.quotedStatuses ?? []).find((s) => s.type === 'closed');
  if (closedEntry) return { kind: 'closed', date: closedEntry.quoteDate };

  const unavailableEntry = findSalesUnavailable(record.quotedStatuses);
  if (unavailableEntry) return { kind: 'unavailable', date: unavailableEntry.quoteDate };

  if (record.orderNo?.trim()) return { kind: 'ordered', date: record.orderConfirmDate };

  const purchaseSupplementedEntry = findPurchaseSupplemented(record.purchaseQuotedStatuses);
  const salesSupplementedEntry = findSalesSupplemented(record.quotedStatuses);
  if (purchaseSupplementedEntry || salesSupplementedEntry) {
    const latest = pickLatestByDate(
      [purchaseSupplementedEntry, salesSupplementedEntry].filter((s): s is CustomerQuoteStatus => !!s)
    );
    return { kind: 'supplemented', date: latest?.quoteDate };
  }

  // 存在性判断不能用 findLatestPurchaseNeedInfo 的返回值（它内部按"是否有日期"筛选，
  // 没填日期的 need_info 供应商会被判定成"不存在"，误判成更低优先级的状态）——
  // 存在性必须直接看 status 字段，日期只是"存在"之后锦上添花的展示信息，可以缺失。
  const anyPurchaseSupplierNeedInfo = (record.purchaseSupplierStatuses ?? []).some((s) => s.status === 'need_info');
  const selfNeedInfo = findSelfSupplierNeedInfo(record.supplierStatuses);
  if (anyPurchaseSupplierNeedInfo || selfNeedInfo) {
    const latestPurchaseNeedInfo = findLatestPurchaseNeedInfo(record.purchaseSupplierStatuses);
    const latest = pickLatestByDate(
      [latestPurchaseNeedInfo, selfNeedInfo].filter((s): s is SupplierQuoteStatus => !!s)
    );
    return { kind: 'need_info', date: latest?.quoteDate };
  }

  const othersCount = countOtherQuotedSuppliers(record.supplierStatuses);
  if (othersCount > 0) {
    return { kind: 'others_quoted', count: othersCount, date: findLatestOtherQuotedDate(record.supplierStatuses) };
  }

  return { kind: 'none' };
}

/**
 * 采购部登记页面的筛选栏"报价状态"维度是按 record.quotedStatuses 设计的，但采购部要按自己的
 * purchaseQuotedStatuses 筛选，调用方（PurchaseRegistrationPage）为此构造了一份把 quotedStatuses
 * 字段替换成 purchaseQuotedStatuses 的"影子记录"数组喂给筛选/排序 hook。这个函数在筛选/排序完成
 * 之后，把最终要渲染到表格/编辑弹窗的记录换回原始对象（按 id 从原始记录表里找回），避免这些只为
 * 筛选而生的影子记录被直接渲染，导致 quotedStatuses 被误认成 purchaseQuotedStatuses。
 *
 * 真实回归：曾经没做这一步换回，销售侧 quotedStatuses 里真实存在的 supplemented（已补充信息）记录
 * 被筛选用的影子 purchaseQuotedStatuses 覆盖后完全看不到，导致 computePurchaseMainStatus 判断不到
 * 第 3 档"已补充信息"、错误跳到第 4 档"需补充信息"——即使编辑弹窗（按 id 直接从 store 读取原始记录，
 * 不经过这层影子记录）已经正确显示"已补充信息"，表格状态列仍然显示"需补充信息"。
 */
export function restoreOriginalRecords(
  shadowRecords: InquiryRecord[],
  originalById: Map<string, InquiryRecord>
): InquiryRecord[] {
  return shadowRecords.map((record) => originalById.get(record.id) ?? record);
}

export interface PurchaseMainStatusBadge {
  label: string;
  className: string;
}

/** 有日期时格式化成"label（日期）"，日期为空/未定义时只显示 label，不报错、不带空括号。 */
function withDate(label: string, date: string | undefined): string {
  const clean = date ? stripDateBrackets(date).trim() : '';
  return clean ? `${label}（${clean}）` : label;
}

/** 把主状态转成表格/弹窗展示用的 badge 文案与配色（均不满足时返回 null，由调用方展示低强调空态）。 */
export function formatPurchaseMainStatus(status: PurchaseInquiryMainStatus): PurchaseMainStatusBadge | null {
  switch (status.kind) {
    case 'closed':
      return {
        label: withDate('已关闭', status.date),
        className: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
      };
    case 'unavailable':
      return {
        label: withDate('无法报价', status.date),
        className: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
      };
    case 'ordered':
      return {
        label: withDate('已成单', status.date),
        className: 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300',
      };
    case 'supplemented':
      return {
        label: withDate('已补充信息', status.date),
        className: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
      };
    case 'need_info':
      return {
        label: withDate('需补充信息', status.date),
        className: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300',
      };
    case 'others_quoted':
      return {
        label: withDate(`其他 ${status.count} 家已报价`, status.date),
        className: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
      };
    case 'none':
    default:
      return null;
  }
}
