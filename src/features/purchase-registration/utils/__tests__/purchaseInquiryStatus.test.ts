// nanoid v5 是纯 ESM 包，Jest 默认 transformIgnorePatterns 不转译 node_modules，
// 直接 import 会报 "Cannot use import statement outside a module"。这里 mock 掉整个
// nanoid 模块（只用到 createId，不关心具体生成的 id 值），避免引入真实 nanoid 解析。
jest.mock('nanoid', () => ({ nanoid: () => 'mock-id' }));

import type { CustomerQuoteStatus, InquiryRecord, SupplierQuoteStatus } from '@/features/inquiry/types';
import {
  applySelfSupplierSync,
  computePurchaseMainStatus,
  computeSelfSupplierPatch,
  computeSelfSupplierTarget,
  countOtherQuotedSuppliers,
  findLatestOtherQuotedDate,
  findLatestPurchaseNeedInfo,
  findPurchaseSupplemented,
  findSalesSupplemented,
  findSalesUnavailable,
  findSelfSupplierNeedInfo,
  formatPurchaseMainStatus,
  getPurchaseRowColorClass,
  isSalesSupplemented,
  isSelfSupplierNeedInfo,
  restoreOriginalRecords,
  SELF_SUPPLIER_NAME,
} from '../purchaseInquiryStatus';

function supplier(overrides: Partial<SupplierQuoteStatus> = {}): SupplierQuoteStatus {
  return { id: 's1', supplierShortName: '某供应商', status: 'pending', ...overrides };
}

function quoted(overrides: Partial<CustomerQuoteStatus> = {}): CustomerQuoteStatus {
  return { id: 'q1', quoteDate: '[6.1]', supplierShortName: '某供应商', version: 'a', ...overrides };
}

function baseRecord(overrides: Partial<InquiryRecord> = {}): InquiryRecord {
  return {
    id: 'r1',
    inquiryDate: '2026-07-13',
    inquiryNo: 'C260713F',
    inquirer: '张三',
    customerNo: 'CUST-001',
    description: '',
    supplierStatuses: [],
    quotedStatuses: [],
    createdAt: '2026-07-13T00:00:00.000Z',
    updatedAt: '2026-07-13T00:00:00.000Z',
    ...overrides,
  };
}

describe('computeSelfSupplierTarget 优先级', () => {
  it('1. 普通采购报价 → quoted + 最新日期', () => {
    const target = computeSelfSupplierTarget(
      [],
      [quoted({ id: 'q1', quoteDate: '[6.10]' }), quoted({ id: 'q2', quoteDate: '[6.20]' })]
    );
    expect(target).toEqual({ status: 'quoted', quoteDate: '[6.20]' });
  });

  it('2. 采购供应商 need_info → need_info + 最新需补资料日期', () => {
    const target = computeSelfSupplierTarget(
      [
        supplier({ id: 's1', status: 'need_info', quoteDate: '[6.5]' }),
        supplier({ id: 's2', status: 'need_info', quoteDate: '[6.18]' }),
      ],
      []
    );
    expect(target).toEqual({ status: 'need_info', quoteDate: '[6.18]' });
  });

  it('3. "我司无法报价" → unavailable + 对应日期，优先级高于普通报价', () => {
    const target = computeSelfSupplierTarget(
      [],
      [quoted({ id: 'q1', quoteDate: '[6.20]' }), quoted({ id: 'unavail', type: 'unavailable', quoteDate: '[6.25]', supplierShortName: '', version: '' })]
    );
    expect(target).toEqual({ status: 'unavailable', quoteDate: '[6.25]' });
  });

  it('unavailable 优先级高于 need_info', () => {
    const target = computeSelfSupplierTarget(
      [supplier({ status: 'need_info', quoteDate: '[6.1]' })],
      [quoted({ type: 'unavailable', quoteDate: '[6.2]', supplierShortName: '', version: '' })]
    );
    expect(target?.status).toBe('unavailable');
  });

  it('need_info 优先级高于普通报价', () => {
    const target = computeSelfSupplierTarget(
      [supplier({ status: 'need_info', quoteDate: '[6.1]' })],
      [quoted({ quoteDate: '[6.30]' })]
    );
    expect(target?.status).toBe('need_info');
  });

  it('4. 均不存在 → 返回 null（不清空/回退）', () => {
    expect(computeSelfSupplierTarget([], [])).toBeNull();
    expect(computeSelfSupplierTarget([supplier({ status: 'pending' })], [])).toBeNull();
  });
});

describe('applySelfSupplierSync / computeSelfSupplierPatch', () => {
  it('4. 没有飞罗时自动创建', () => {
    const patch = applySelfSupplierSync([], { status: 'quoted', quoteDate: '[6.20]' });
    expect(patch).toHaveLength(1);
    expect(patch?.[0]).toMatchObject({
      supplierShortName: SELF_SUPPLIER_NAME,
      status: 'quoted',
      quoteDate: '[6.20]',
    });
  });

  it('5. 已有相同飞罗状态时不产生补丁', () => {
    const existing = [supplier({ id: 'fl', supplierShortName: '飞罗', status: 'quoted', quoteDate: '[6.20]' })];
    const patch = applySelfSupplierSync(existing, { status: 'quoted', quoteDate: '[6.20]' });
    expect(patch).toBeUndefined();
  });

  it('6. 更新飞罗时其它供应商保持不变', () => {
    const other = supplier({ id: 'other', supplierShortName: '其他供应商', status: 'quoted', quoteDate: '[6.1]' });
    const fl = supplier({ id: 'fl', supplierShortName: '飞罗', status: 'pending' });
    const patch = applySelfSupplierSync([other, fl], { status: 'quoted', quoteDate: '[6.20]' });
    expect(patch).toHaveLength(2);
    expect(patch?.find((s) => s.id === 'other')).toEqual(other);
    expect(patch?.find((s) => s.id === 'fl')).toMatchObject({ status: 'quoted', quoteDate: '[6.20]' });
  });

  it('飞罗短名带前后空格也能识别（trim 匹配）', () => {
    const fl = supplier({ id: 'fl', supplierShortName: ' 飞罗 ', status: 'quoted', quoteDate: '[6.20]' });
    const patch = applySelfSupplierSync([fl], { status: 'quoted', quoteDate: '[6.20]' });
    expect(patch).toBeUndefined();
  });

  it('computeSelfSupplierPatch 组合：无变化目标时不发补丁', () => {
    const patch = computeSelfSupplierPatch([], [], []);
    expect(patch).toBeUndefined();
  });
});

describe('countOtherQuotedSuppliers', () => {
  it('7. 按供应商名称去重，并排除飞罗', () => {
    const list: SupplierQuoteStatus[] = [
      supplier({ id: '1', supplierShortName: 'A供应商', status: 'quoted' }),
      supplier({ id: '2', supplierShortName: 'A供应商', status: 'quoted' }), // 重复名称，不重复计数
      supplier({ id: '3', supplierShortName: 'B供应商', status: 'quoted' }),
      supplier({ id: '4', supplierShortName: '飞罗', status: 'quoted' }), // 排除
      supplier({ id: '5', supplierShortName: 'C供应商', status: 'pending' }), // 未报价，不计
      supplier({ id: '6', supplierShortName: '  ', status: 'quoted' }), // 空白名称，不计
    ];
    expect(countOtherQuotedSuppliers(list)).toBe(2);
  });

  it('空数组/undefined 返回 0', () => {
    expect(countOtherQuotedSuppliers([])).toBe(0);
    expect(countOtherQuotedSuppliers(undefined)).toBe(0);
  });
});

describe('computePurchaseMainStatus 优先级（状态列五种状态）', () => {
  it('8-1. 销售侧询价已关闭 → closed，优先级最高（即使已成单），日期取关闭记录的日期', () => {
    const record = baseRecord({
      orderNo: 'PO-001',
      quotedStatuses: [quoted({ type: 'closed', quoteDate: '[6.1]', supplierShortName: '', version: '' })],
    });
    expect(computePurchaseMainStatus(record)).toEqual({ kind: 'closed', date: '[6.1]' });
  });

  it('8-1b. 销售侧已回复客户无法报价 → unavailable，日期取该记录日期', () => {
    const record = baseRecord({
      quotedStatuses: [quoted({ type: 'unavailable', quoteDate: '[6.2]', supplierShortName: '', version: '' })],
    });
    expect(computePurchaseMainStatus(record)).toEqual({ kind: 'unavailable', date: '[6.2]' });
  });

  it('优先级：closed 高于 unavailable（同时存在时显示已关闭）', () => {
    const record = baseRecord({
      quotedStatuses: [
        quoted({ id: 'c', type: 'closed', quoteDate: '[6.1]', supplierShortName: '', version: '' }),
        quoted({ id: 'u', type: 'unavailable', quoteDate: '[6.2]', supplierShortName: '', version: '' }),
      ],
    });
    expect(computePurchaseMainStatus(record).kind).toBe('closed');
  });

  it('优先级：unavailable 高于 ordered（即使已成单，历史遗留数据未清理时仍显示无法报价）', () => {
    const record = baseRecord({
      orderNo: 'PO-009',
      quotedStatuses: [quoted({ type: 'unavailable', quoteDate: '[6.2]', supplierShortName: '', version: '' })],
    });
    expect(computePurchaseMainStatus(record).kind).toBe('unavailable');
  });

  it('8-2. orderNo 非空 → ordered，日期取确认日（orderConfirmDate）', () => {
    const record = baseRecord({ orderNo: 'PO-002', orderConfirmDate: '[6.15]' });
    expect(computePurchaseMainStatus(record)).toEqual({ kind: 'ordered', date: '[6.15]' });
  });

  it('8-2b. orderNo 非空但没有确认日 → ordered，date 为 undefined', () => {
    const record = baseRecord({ orderNo: 'PO-002' });
    expect(computePurchaseMainStatus(record)).toEqual({ kind: 'ordered' });
  });

  it('8-3. purchaseQuotedStatuses 存在 supplemented → supplemented，日期取该记录日期', () => {
    const record = baseRecord({
      purchaseQuotedStatuses: [quoted({ type: 'supplemented', quoteDate: '[6.1]', supplierShortName: '', version: '' })],
    });
    expect(computePurchaseMainStatus(record)).toEqual({ kind: 'supplemented', date: '[6.1]' });
  });

  it('8-3b. 销售侧 quotedStatuses 存在 supplemented（采购部自己没标记）→ 同样是 supplemented，日期取该记录日期', () => {
    const record = baseRecord({
      quotedStatuses: [quoted({ type: 'supplemented', quoteDate: '[6.1]', supplierShortName: '', version: '' })],
    });
    expect(computePurchaseMainStatus(record)).toEqual({ kind: 'supplemented', date: '[6.1]' });
  });

  it('8-3c. 采购部与销售侧都标记了 supplemented → 取两者中较新的日期', () => {
    const record = baseRecord({
      purchaseQuotedStatuses: [quoted({ id: 'p', type: 'supplemented', quoteDate: '[6.1]', supplierShortName: '', version: '' })],
      quotedStatuses: [quoted({ id: 's', type: 'supplemented', quoteDate: '[6.20]', supplierShortName: '', version: '' })],
    });
    expect(computePurchaseMainStatus(record)).toEqual({ kind: 'supplemented', date: '[6.20]' });
  });

  it('8-4a. 任一采购供应商 need_info → need_info', () => {
    const record = baseRecord({
      purchaseSupplierStatuses: [supplier({ status: 'need_info' })],
    });
    expect(computePurchaseMainStatus(record)).toEqual({ kind: 'need_info' });
  });

  it('8-4b. 销售侧飞罗 need_info（即使采购供应商都不是 need_info）→ need_info', () => {
    const record = baseRecord({
      supplierStatuses: [supplier({ supplierShortName: '飞罗', status: 'need_info' })],
    });
    expect(computePurchaseMainStatus(record)).toEqual({ kind: 'need_info' });
  });

  it('回归：need_info 供应商没填日期时，仍要判定为 need_info（不能因为取不到日期就判定成更低优先级）', () => {
    const record = baseRecord({
      purchaseSupplierStatuses: [supplier({ status: 'need_info' })], // 故意不给 quoteDate
      supplierStatuses: [supplier({ id: '1', supplierShortName: 'A', status: 'quoted' })], // 若误判会掉到 others_quoted
    });
    expect(computePurchaseMainStatus(record)).toEqual({ kind: 'need_info' });
  });

  it('8-4c. 采购供应商与销售侧飞罗都是 need_info → 取两者中较新的日期', () => {
    const record = baseRecord({
      purchaseSupplierStatuses: [supplier({ id: 'p', status: 'need_info', quoteDate: '[6.5]' })],
      supplierStatuses: [supplier({ supplierShortName: '飞罗', status: 'need_info', quoteDate: '[6.25]' })],
    });
    expect(computePurchaseMainStatus(record)).toEqual({ kind: 'need_info', date: '[6.25]' });
  });

  it('8-5. 其他供应商已报价数量 > 0 → others_quoted', () => {
    const record = baseRecord({
      supplierStatuses: [
        supplier({ id: '1', supplierShortName: 'A', status: 'quoted' }),
        supplier({ id: '2', supplierShortName: 'B', status: 'quoted' }),
      ],
    });
    expect(computePurchaseMainStatus(record)).toEqual({ kind: 'others_quoted', count: 2 });
  });

  it('8-5b. others_quoted 日期取其他供应商里最新的报价日期', () => {
    const record = baseRecord({
      supplierStatuses: [
        supplier({ id: '1', supplierShortName: 'A', status: 'quoted', quoteDate: '[6.5]' }),
        supplier({ id: '2', supplierShortName: 'B', status: 'quoted', quoteDate: '[6.28]' }),
      ],
    });
    expect(computePurchaseMainStatus(record)).toEqual({ kind: 'others_quoted', count: 2, date: '[6.28]' });
  });

  it('8-6. 均不满足 → none', () => {
    expect(computePurchaseMainStatus(baseRecord())).toEqual({ kind: 'none' });
  });

  it('优先级：need_info 高于 others_quoted', () => {
    const record = baseRecord({
      purchaseSupplierStatuses: [supplier({ status: 'need_info' })],
      supplierStatuses: [supplier({ id: '1', supplierShortName: 'A', status: 'quoted' })],
    });
    expect(computePurchaseMainStatus(record).kind).toBe('need_info');
  });

  it('优先级：supplemented 高于 need_info（即使 need_info 日期更新，仍显示已补充信息而不是需补充信息）', () => {
    const record = baseRecord({
      purchaseQuotedStatuses: [quoted({ type: 'supplemented', quoteDate: '[6.1]', supplierShortName: '', version: '' })],
      purchaseSupplierStatuses: [supplier({ status: 'need_info', quoteDate: '[6.30]' })],
    });
    const status = computePurchaseMainStatus(record);
    expect(status.kind).toBe('supplemented');
    expect(formatPurchaseMainStatus(status)?.label).toBe('已补充信息（6.1）');
  });

  it('优先级：ordered 高于 supplemented', () => {
    const record = baseRecord({
      orderNo: 'PO-003',
      purchaseQuotedStatuses: [quoted({ type: 'supplemented', supplierShortName: '', version: '' })],
    });
    expect(computePurchaseMainStatus(record).kind).toBe('ordered');
  });
});

describe('getPurchaseRowColorClass（采购部登记表整行文案颜色）', () => {
  it('销售侧已关闭 → 整行灰色，即使采购部自己标记了已报价', () => {
    const record = baseRecord({
      quotedStatuses: [quoted({ type: 'closed', quoteDate: '[6.1]', supplierShortName: '', version: '' })],
      purchaseQuotedStatuses: [quoted({ type: 'quoted', supplierShortName: '', version: '' })],
    });
    expect(getPurchaseRowColorClass(record)).toBe('text-gray-400');
  });

  it('销售侧已回复客户无法报价 → 整行灰色，即使采购部自己标记了已报价', () => {
    const record = baseRecord({
      quotedStatuses: [quoted({ type: 'unavailable', quoteDate: '[7.13]', supplierShortName: '', version: '' })],
      purchaseQuotedStatuses: [quoted({ type: 'quoted', supplierShortName: '', version: '' })],
    });
    expect(getPurchaseRowColorClass(record)).toBe('text-gray-400');
  });

  it('销售侧无关闭/无法报价、采购部已报价 → 蓝色', () => {
    const record = baseRecord({
      purchaseQuotedStatuses: [quoted({ type: 'quoted', supplierShortName: '', version: '' })],
    });
    expect(getPurchaseRowColorClass(record)).toBe('text-blue-600');
  });

  it('均不满足（未报价）→ 粉色', () => {
    expect(getPurchaseRowColorClass(baseRecord())).toBe('text-pink-500');
  });

  it('采购部自己标记"我司无法报价"（purchaseQuotedStatuses），但销售侧没有关闭/无法报价 → 仍按采购部数据判灰色（既有规则，未受本次改动影响）', () => {
    const record = baseRecord({
      purchaseQuotedStatuses: [quoted({ type: 'unavailable', supplierShortName: '', version: '' })],
    });
    expect(getPurchaseRowColorClass(record)).toBe('text-gray-400');
  });
});

describe('formatPurchaseMainStatus', () => {
  it('none 返回 null，交由调用方展示低强调空态', () => {
    expect(formatPurchaseMainStatus({ kind: 'none' })).toBeNull();
  });

  it('others_quoted 文案带上具体数量', () => {
    expect(formatPurchaseMainStatus({ kind: 'others_quoted', count: 3 })?.label).toBe('其他 3 家已报价');
  });

  it('有日期时文案带上日期（方括号会被去掉）', () => {
    expect(formatPurchaseMainStatus({ kind: 'closed', date: '[6.1]' })?.label).toBe('已关闭（6.1）');
    expect(formatPurchaseMainStatus({ kind: 'unavailable', date: '[6.2]' })?.label).toBe('无法报价（6.2）');
    expect(formatPurchaseMainStatus({ kind: 'ordered', date: '[6.15]' })?.label).toBe('已成单（6.15）');
    expect(formatPurchaseMainStatus({ kind: 'supplemented', date: '[6.20]' })?.label).toBe('已补充信息（6.20）');
    expect(formatPurchaseMainStatus({ kind: 'need_info', date: '[6.25]' })?.label).toBe('需补充信息（6.25）');
    expect(formatPurchaseMainStatus({ kind: 'others_quoted', count: 2, date: '[6.28]' })?.label).toBe('其他 2 家已报价（6.28）');
  });

  it('日期为 undefined 或空字符串时只显示 label，不带空括号', () => {
    expect(formatPurchaseMainStatus({ kind: 'need_info', date: undefined })?.label).toBe('需补充信息');
    expect(formatPurchaseMainStatus({ kind: 'need_info', date: '' })?.label).toBe('需补充信息');
  });
});

describe('findLatestOtherQuotedDate（"其他供应商已报价"状态的日期来源，排除飞罗）', () => {
  it('多个其他供应商已报价时取日期最新的一条', () => {
    const list: SupplierQuoteStatus[] = [
      supplier({ id: '1', supplierShortName: 'A', status: 'quoted', quoteDate: '[6.5]' }),
      supplier({ id: '2', supplierShortName: 'B', status: 'quoted', quoteDate: '[6.28]' }),
      supplier({ id: '3', supplierShortName: '飞罗', status: 'quoted', quoteDate: '[7.1]' }), // 排除飞罗
    ];
    expect(findLatestOtherQuotedDate(list)).toBe('[6.28]');
  });

  it('没有其他已报价供应商 / 全部缺日期时返回 undefined', () => {
    expect(findLatestOtherQuotedDate([supplier({ supplierShortName: 'A', status: 'pending' })])).toBeUndefined();
    expect(findLatestOtherQuotedDate([supplier({ supplierShortName: 'A', status: 'quoted' })])).toBeUndefined();
    expect(findLatestOtherQuotedDate([])).toBeUndefined();
    expect(findLatestOtherQuotedDate(undefined)).toBeUndefined();
  });
});

describe('isSelfSupplierNeedInfo（9. 销售侧飞罗 need_info 能被采购部读取）', () => {
  it('飞罗为 need_info 时返回 true', () => {
    expect(isSelfSupplierNeedInfo([supplier({ supplierShortName: '飞罗', status: 'need_info' })])).toBe(true);
  });

  it('飞罗不是 need_info 时返回 false', () => {
    expect(isSelfSupplierNeedInfo([supplier({ supplierShortName: '飞罗', status: 'quoted' })])).toBe(false);
  });

  it('没有飞罗时返回 false', () => {
    expect(isSelfSupplierNeedInfo([supplier({ supplierShortName: '其他供应商', status: 'need_info' })])).toBe(false);
  });

  it('undefined 输入返回 false', () => {
    expect(isSelfSupplierNeedInfo(undefined)).toBe(false);
  });
});

describe('findSalesSupplemented / isSalesSupplemented（销售侧登记的"已补充信息"能被采购部读取）', () => {
  it('销售侧 quotedStatuses 有 supplemented 记录时能找到并返回该条', () => {
    const supplemented = quoted({ id: 'sp1', type: 'supplemented', quoteDate: '[7.1]', supplierShortName: '', version: '' });
    expect(findSalesSupplemented([supplemented])).toEqual(supplemented);
    expect(isSalesSupplemented([supplemented])).toBe(true);
  });

  it('没有 supplemented 记录时返回 undefined / false', () => {
    expect(findSalesSupplemented([quoted({ type: 'quoted' })])).toBeUndefined();
    expect(isSalesSupplemented([quoted({ type: 'quoted' })])).toBe(false);
  });

  it('空数组/undefined 输入安全返回', () => {
    expect(findSalesSupplemented([])).toBeUndefined();
    expect(findSalesSupplemented(undefined)).toBeUndefined();
    expect(isSalesSupplemented(undefined)).toBe(false);
  });
});

describe('findSalesUnavailable（销售侧登记的"已回复客户无法报价"能被采购部读取）', () => {
  it('销售侧 quotedStatuses 有 unavailable 记录时能找到并返回该条', () => {
    const unavailable = quoted({ id: 'u1', type: 'unavailable', quoteDate: '[7.2]', supplierShortName: '', version: '' });
    expect(findSalesUnavailable([unavailable])).toEqual(unavailable);
  });

  it('没有 unavailable 记录时返回 undefined', () => {
    expect(findSalesUnavailable([quoted({ type: 'quoted' })])).toBeUndefined();
  });

  it('空数组/undefined 输入安全返回 undefined', () => {
    expect(findSalesUnavailable([])).toBeUndefined();
    expect(findSalesUnavailable(undefined)).toBeUndefined();
  });

  it('与采购部自己的"我司无法报价"（purchaseQuotedStatuses）是独立字段，不会混读', () => {
    const record = baseRecord({
      purchaseQuotedStatuses: [quoted({ type: 'unavailable', quoteDate: '[7.1]', supplierShortName: '', version: '' })],
      quotedStatuses: [],
    });
    expect(findSalesUnavailable(record.quotedStatuses)).toBeUndefined();
  });
});

describe('findSelfSupplierNeedInfo（返回完整记录，含日期，供采购部弹窗提示带日期展示）', () => {
  it('飞罗为 need_info 时返回该条完整记录', () => {
    const fl = supplier({ supplierShortName: '飞罗', status: 'need_info', quoteDate: '[6.1]' });
    expect(findSelfSupplierNeedInfo([fl])).toEqual(fl);
  });

  it('飞罗不是 need_info 时返回 undefined', () => {
    const fl = supplier({ supplierShortName: '飞罗', status: 'quoted', quoteDate: '[6.1]' });
    expect(findSelfSupplierNeedInfo([fl])).toBeUndefined();
  });

  it('没有飞罗/undefined 输入时返回 undefined', () => {
    expect(findSelfSupplierNeedInfo([supplier({ supplierShortName: '其他供应商', status: 'need_info' })])).toBeUndefined();
    expect(findSelfSupplierNeedInfo(undefined)).toBeUndefined();
  });
});

describe('findLatestPurchaseNeedInfo（销售侧只读读取采购部 need_info 供应商，取最新日期）', () => {
  it('多个 need_info 供应商时取日期最新的一条', () => {
    const older = supplier({ id: 's1', status: 'need_info', quoteDate: '[6.5]' });
    const newer = supplier({ id: 's2', status: 'need_info', quoteDate: '[6.20]' });
    expect(findLatestPurchaseNeedInfo([older, newer])).toEqual(newer);
  });

  it('没有 need_info 供应商时返回 undefined', () => {
    expect(findLatestPurchaseNeedInfo([supplier({ status: 'quoted' })])).toBeUndefined();
  });

  it('空数组/undefined 输入安全返回 undefined', () => {
    expect(findLatestPurchaseNeedInfo([])).toBeUndefined();
    expect(findLatestPurchaseNeedInfo(undefined)).toBeUndefined();
  });
});

describe('findPurchaseSupplemented（销售侧只读读取采购部自己标记的"已补充信息"）', () => {
  it('purchaseQuotedStatuses 有 supplemented 记录时能找到', () => {
    const supplemented = quoted({ id: 'p1', type: 'supplemented', quoteDate: '[6.1]', supplierShortName: '', version: '' });
    expect(findPurchaseSupplemented([supplemented])).toEqual(supplemented);
  });

  it('没有 supplemented 记录时返回 undefined', () => {
    expect(findPurchaseSupplemented([quoted({ type: 'quoted' })])).toBeUndefined();
  });

  it('空数组/undefined 输入安全返回 undefined', () => {
    expect(findPurchaseSupplemented([])).toBeUndefined();
    expect(findPurchaseSupplemented(undefined)).toBeUndefined();
  });
});

describe('restoreOriginalRecords（把筛选用的影子记录换回真实记录）', () => {
  it('回归：影子记录的 quotedStatuses 被替换成 purchaseQuotedStatuses 后，换回真实记录应能恢复销售侧 supplemented，使 computePurchaseMainStatus 判断为已补充信息而不是需补充信息', () => {
    const original = baseRecord({
      id: 'r1',
      quotedStatuses: [quoted({ id: 'q1', type: 'supplemented', quoteDate: '[7.10]' })],
      purchaseSupplierStatuses: [supplier({ id: 'ps1', status: 'need_info' })],
      supplierStatuses: [supplier({ id: 's-self', supplierShortName: SELF_SUPPLIER_NAME, status: 'need_info', quoteDate: '[7.9]' })],
    });
    // 模拟筛选栏用的影子记录：quotedStatuses 被替换成（空的）purchaseQuotedStatuses
    const shadow = { ...original, quotedStatuses: original.purchaseQuotedStatuses ?? [] };

    // 换回之前：用影子记录算，看不到销售侧 supplemented，被 need_info 顶替
    expect(formatPurchaseMainStatus(computePurchaseMainStatus(shadow))?.label).toBe('需补充信息（7.9）');

    const restored = restoreOriginalRecords([shadow], new Map([[original.id, original]]));
    // 换回之后：用真实记录算，能看到销售侧 supplemented，优先级高于 need_info
    expect(formatPurchaseMainStatus(computePurchaseMainStatus(restored[0]))?.label).toBe('已补充信息（7.10）');
  });

  it('按 id 在映射表里找不到对应原始记录时，原样返回该条影子记录（不阻塞渲染）', () => {
    const shadow = baseRecord({ id: 'missing' });
    const restored = restoreOriginalRecords([shadow], new Map());
    expect(restored[0]).toBe(shadow);
  });

  it('保持输入数组的顺序和长度不变，只替换每一项的内容', () => {
    const r1 = baseRecord({ id: 'r1', inquiryNo: 'A' });
    const r2 = baseRecord({ id: 'r2', inquiryNo: 'B' });
    const shadowR1 = { ...r1, description: 'shadow' };
    const shadowR2 = { ...r2, description: 'shadow' };
    const restored = restoreOriginalRecords([shadowR1, shadowR2], new Map([['r1', r1], ['r2', r2]]));
    expect(restored).toEqual([r1, r2]);
  });
});
