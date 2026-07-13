// 权限边界的字段级读写规则拆在 restrictedView.ts（不依赖 next/server），直接测这个纯函数模块——
// route.ts 顶层 import next/server 后，jsdom 测试环境里全局 Request/Response 未定义会导致
// 模块加载失败，从 route.ts re-export 出来的同名函数在这里 import 会绕不开这个问题。
import {
  PURCHASE_REGISTRATION_WRITE_FIELDS,
  pickRestrictedPatch,
  sanitizeRestrictedRecord,
} from '../restrictedView';

describe('12. 采购权限 PUT 无法写入 quotedStatuses', () => {
  it('PURCHASE_REGISTRATION_WRITE_FIELDS 不包含 quotedStatuses', () => {
    expect(PURCHASE_REGISTRATION_WRITE_FIELDS).not.toContain('quotedStatuses');
  });

  it('pickRestrictedPatch 会丢弃请求体里的 quotedStatuses，即使一并带了合法字段', () => {
    const allowedFields = new Set<string>(PURCHASE_REGISTRATION_WRITE_FIELDS);
    const body = {
      description: '新描述',
      purchaseSupplierStatuses: [{ id: 's1', supplierShortName: '供应商A' }],
      quotedStatuses: [{ id: 'q1', type: 'closed', quoteDate: '[6.1]', supplierShortName: '', version: '' }],
    };

    const patch = pickRestrictedPatch(body, allowedFields);

    expect(patch).not.toHaveProperty('quotedStatuses');
    expect(patch.description).toBe('新描述');
    expect(patch.purchaseSupplierStatuses).toEqual(body.purchaseSupplierStatuses);
  });

  it('pickRestrictedPatch 对不在白名单里的字段一律丢弃（不仅是 quotedStatuses）', () => {
    const allowedFields = new Set<string>(PURCHASE_REGISTRATION_WRITE_FIELDS);
    const patch = pickRestrictedPatch({ orderNo: 'PO-999', inquiryNo: 'C1' }, allowedFields);
    expect(patch).toEqual({});
  });
});

describe('sanitizeRestrictedRecord：采购部只读响应携带完整 quotedStatuses', () => {
  const fullRecord = {
    id: 'r1',
    inquiryDate: '2026-07-13',
    inquiryNo: 'C260713F',
    inquirer: '张三',
    customerNo: 'CUST-1',
    description: 'desc',
    orderNo: '',
    supplierStatuses: [{ id: 'fl', supplierShortName: '飞罗', status: 'quoted', quoteDate: '[6.1]' }],
    quotedStatuses: [
      { id: 'q1', type: 'closed', quoteDate: '[6.2]', supplierShortName: '', version: '' },
    ],
    purchaseSupplierStatuses: [],
    purchaseQuotedStatuses: [],
    createdAt: '2026-07-13T00:00:00.000Z',
    updatedAt: '2026-07-13T00:00:00.000Z',
    status: 'active',
  };

  it('allowPurchaseRegistration=true 时返回完整 quotedStatuses（未裁剪），供只读展示销售侧关闭状态', () => {
    const result = sanitizeRestrictedRecord(fullRecord, {
      allowPurchaseRegistration: true,
      allowPurchaseOrderTable: false,
    });
    expect(result.quotedStatuses).toEqual(fullRecord.quotedStatuses);
    expect(result.supplierStatuses).toEqual(fullRecord.supplierStatuses);
  });

  it('allowPurchaseRegistration=false 时不携带 quotedStatuses', () => {
    const result = sanitizeRestrictedRecord(fullRecord, {
      allowPurchaseRegistration: false,
      allowPurchaseOrderTable: true,
    });
    expect(result).not.toHaveProperty('quotedStatuses');
  });
});
