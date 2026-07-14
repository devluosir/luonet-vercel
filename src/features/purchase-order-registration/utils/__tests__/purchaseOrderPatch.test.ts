import { buildPurchaseOrderDirtyPatch } from '../purchaseOrderPatch';

const baseline = {
  purchaseOrderNo: 'PO-1',
  purchaseOrderSupplier: '旧供应商',
  purchaseOrderSupplierId: 'supplier-old',
  orderDeliveryStatus: '备货',
};

describe('buildPurchaseOrderDirtyPatch', () => {
  it('只修改供应商时原子提交 ID 与名称，不带未操作字段', () => {
    expect(buildPurchaseOrderDirtyPatch(baseline, {
      ...baseline,
      purchaseOrderSupplier: '新供应商',
      purchaseOrderSupplierId: 'supplier-new',
    })).toEqual({
      purchaseOrderSupplier: '新供应商',
      purchaseOrderSupplierId: 'supplier-new',
    });
  });

  it('只修改其它字段时不提交旧供应商快照，后台更新可保留', () => {
    expect(buildPurchaseOrderDirtyPatch(baseline, {
      ...baseline,
      purchaseOrderNo: 'PO-2',
    })).toEqual({ purchaseOrderNo: 'PO-2' });
  });

  it('自由修改名称会把旧主档 ID 一起清空', () => {
    expect(buildPurchaseOrderDirtyPatch(baseline, {
      ...baseline,
      purchaseOrderSupplier: '自由文本',
      purchaseOrderSupplierId: undefined,
    })).toEqual({ purchaseOrderSupplier: '自由文本', purchaseOrderSupplierId: undefined });
  });
});
