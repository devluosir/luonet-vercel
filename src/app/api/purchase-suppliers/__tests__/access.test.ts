import { getPurchaseSupplierAccess } from '../access';

describe('getPurchaseSupplierAccess', () => {
  it.each(['purchaseSupplier', 'purchaseRegistration', 'purchase'])(
    '%s 单独开启时允许读取',
    (moduleId) => {
      expect(getPurchaseSupplierAccess([{ moduleId, canAccess: true }]).canRead).toBe(true);
    }
  );

  it('只有 purchaseSupplier 允许写入', () => {
    expect(getPurchaseSupplierAccess([{ moduleId: 'purchaseSupplier', canAccess: true }])).toEqual({
      canRead: true,
      canWrite: true,
    });
    expect(getPurchaseSupplierAccess([{ moduleId: 'purchaseRegistration', canAccess: true }]).canWrite).toBe(false);
    expect(getPurchaseSupplierAccess([{ moduleId: 'purchase', canAccess: true }]).canWrite).toBe(false);
  });

  it('无权限时读写均拒绝', () => {
    expect(getPurchaseSupplierAccess([])).toEqual({ canRead: false, canWrite: false });
  });
});
