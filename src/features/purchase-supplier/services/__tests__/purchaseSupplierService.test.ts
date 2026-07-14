import {
  clearPurchaseSupplierLocalState,
  deletePurchaseSupplierPermanently,
  fetchPurchaseSuppliers,
  getPurchaseSupplierCacheKey,
} from '../purchaseSupplierService';

const supplier = {
  id: 's1', name: '供应商一', address: '', contacts: [], data: {}, status: 'active',
  created_at: '2026-07-14T00:00:00.000Z', updated_at: '2026-07-14T00:00:00.000Z',
};

describe('purchase supplier user-scoped cache', () => {
  const fetchMock = jest.fn();
  const response = (body: unknown, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as Response);

  beforeEach(() => {
    localStorage.clear();
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  it('按标准化账号隔离缓存，并只回退当前账号', async () => {
    fetchMock.mockResolvedValueOnce(response({ suppliers: [supplier] }));
    await fetchPurchaseSuppliers({ userId: ' User-A ', canRead: true });
    expect(localStorage.getItem(getPurchaseSupplierCacheKey('user-a'))).toContain('供应商一');
    expect(localStorage.getItem(getPurchaseSupplierCacheKey('user-b'))).toBeNull();

    fetchMock.mockRejectedValueOnce(new Error('offline'));
    const fallback = await fetchPurchaseSuppliers({ userId: 'USER-A', canRead: true });
    expect(fallback.isStale).toBe(true);
    expect(fallback.items[0]?.id).toBe('s1');
  });

  it('无权限时禁止读取缓存并立即清除', async () => {
    localStorage.setItem(getPurchaseSupplierCacheKey('user-a'), JSON.stringify([supplier]));
    await expect(fetchPurchaseSuppliers({ userId: 'user-a', canRead: false })).rejects.toThrow('没有采购供应商读取权限');
    expect(localStorage.getItem(getPurchaseSupplierCacheKey('user-a'))).toBeNull();
  });

  it('401/403 响应清除当前账号缓存', async () => {
    localStorage.setItem(getPurchaseSupplierCacheKey('user-a'), JSON.stringify([supplier]));
    fetchMock.mockResolvedValueOnce(response({ error: 'forbidden' }, 403));
    await expect(fetchPurchaseSuppliers({ userId: 'user-a', canRead: true })).rejects.toThrow('forbidden');
    expect(localStorage.getItem(getPurchaseSupplierCacheKey('user-a'))).toBeNull();
  });

  it('可按账号或全部清理', () => {
    localStorage.setItem(getPurchaseSupplierCacheKey('a'), '[]');
    localStorage.setItem(getPurchaseSupplierCacheKey('b'), '[]');
    clearPurchaseSupplierLocalState('a');
    expect(localStorage.getItem(getPurchaseSupplierCacheKey('a'))).toBeNull();
    expect(localStorage.getItem(getPurchaseSupplierCacheKey('b'))).not.toBeNull();
    clearPurchaseSupplierLocalState();
    expect(localStorage.getItem(getPurchaseSupplierCacheKey('b'))).toBeNull();
  });

  it('永久删除使用独立 hard-delete 路由，不复用归档接口', async () => {
    fetchMock.mockResolvedValueOnce(response({ success: true }));

    await deletePurchaseSupplierPermanently('supplier-1');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/purchase-suppliers/supplier-1/hard-delete',
      { method: 'DELETE' }
    );
  });
});
