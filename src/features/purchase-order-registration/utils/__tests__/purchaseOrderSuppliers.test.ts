import type { InquiryRecord } from '@/features/inquiry/types';
import { formatPurchaseOrderSuppliers, getPurchaseOrderSuppliers } from '../purchaseOrderSuppliers';

const record = {
  purchaseOrderSupplier: '旧供应商',
  purchaseOrderSupplierId: 'legacy-id',
} as InquiryRecord;

describe('purchaseOrderSuppliers helpers', () => {
  it('优先读取多供应商数组并格式化全部名称', () => {
    const suppliers = getPurchaseOrderSuppliers({
      ...record,
      purchaseOrderSuppliers: [
        { id: 'supplier-1', name: '供应商一' },
        { name: '自由供应商' },
      ],
    });

    expect(suppliers).toEqual([
      { id: 'supplier-1', name: '供应商一' },
      { name: '自由供应商' },
    ]);
    expect(formatPurchaseOrderSuppliers(suppliers)).toBe('供应商一、自由供应商');
  });

  it('数组缺失时回退到旧单值字段', () => {
    expect(getPurchaseOrderSuppliers(record)).toEqual([{ id: 'legacy-id', name: '旧供应商' }]);
  });

  it('新旧字段都为空时返回空数组和空字符串', () => {
    const suppliers = getPurchaseOrderSuppliers({} as InquiryRecord);
    expect(suppliers).toEqual([]);
    expect(formatPurchaseOrderSuppliers(suppliers)).toBe('');
  });
});
