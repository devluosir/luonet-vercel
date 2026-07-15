import { buildPurchaseOrderDirtyPatch } from '../purchaseOrderPatch';

const baseline = {
  purchaseOrderNo: 'PO-1',
  purchaseOrderSuppliers: [{ id: 'supplier-old', name: '旧供应商' }],
  purchaseOrderSupplier: '旧供应商',
  purchaseOrderSupplierId: 'supplier-old',
  orderDeliveryStatus: '备货',
};

describe('buildPurchaseOrderDirtyPatch', () => {
  it('只修改供应商数组时原子提交数组与首项镜像，不带未操作字段', () => {
    expect(buildPurchaseOrderDirtyPatch(baseline, {
      ...baseline,
      purchaseOrderSuppliers: [
        { id: 'supplier-new', name: '新供应商' },
        { name: '自由供应商' },
      ],
      purchaseOrderSupplier: '新供应商',
      purchaseOrderSupplierId: 'supplier-new',
    })).toEqual({
      purchaseOrderSuppliers: [
        { id: 'supplier-new', name: '新供应商' },
        { name: '自由供应商' },
      ],
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

  it('首项为自由供应商时会把旧主档 ID 一起清空', () => {
    expect(buildPurchaseOrderDirtyPatch(baseline, {
      ...baseline,
      purchaseOrderSuppliers: [{ name: '自由文本' }],
      purchaseOrderSupplier: '自由文本',
      purchaseOrderSupplierId: undefined,
    })).toEqual({
      purchaseOrderSuppliers: [{ name: '自由文本' }],
      purchaseOrderSupplier: '自由文本',
      purchaseOrderSupplierId: undefined,
    });
  });

  it('清空供应商时原子清空数组与旧字段镜像', () => {
    expect(buildPurchaseOrderDirtyPatch(baseline, {
      ...baseline,
      purchaseOrderSuppliers: [],
      purchaseOrderSupplier: undefined,
      purchaseOrderSupplierId: undefined,
    })).toEqual({
      purchaseOrderSuppliers: [],
      purchaseOrderSupplier: undefined,
      purchaseOrderSupplierId: undefined,
    });
  });
});
