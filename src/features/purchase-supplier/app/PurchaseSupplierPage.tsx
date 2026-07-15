'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, RefreshCw, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PermissionDenied } from '@/components/PermissionDenied';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { PurchaseSupplierFormModal } from '../components/PurchaseSupplierFormModal';
import { usePurchaseSupplierAccess } from '../hooks/usePurchaseSupplierAccess';
import { fetchPurchaseSuppliers, getPrimaryPurchaseSupplierContact, savePurchaseSupplier } from '../services/purchaseSupplierService';
import type { PurchaseSupplier, PurchaseSupplierInput } from '../types';
import { AppLayout } from '@/components/layout';
import { useAppUser } from '@/hooks/useAppUser';

export function PurchaseSupplierPage() {
  const router = useRouter();
  const { ready, canRead, canWrite, userId } = usePurchaseSupplierAccess();
  const { showToast } = useToast();
  const { user, handleLogout } = useAppUser();
  const [items, setItems] = useState<PurchaseSupplier[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [stale, setStale] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!canRead || !userId) return;
    setLoading(true);
    try {
      const result = await fetchPurchaseSuppliers({ userId, canRead, search: query, limit: 200 });
      setItems(result.items);
      setStale(result.isStale);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '采购供应商加载失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [canRead, query, showToast, userId]);

  useEffect(() => {
    const timer = window.setTimeout(load, 180);
    return () => window.clearTimeout(timer);
  }, [load]);

  if (!ready) return <div className="flex min-h-[50vh] items-center justify-center text-sm text-gray-500">正在加载权限…</div>;
  if (!canWrite) return <PermissionDenied message="您没有采购供应商管理权限" />;

  const handleSave = async (input: PurchaseSupplierInput) => {
    setSaving(true);
    try {
      await savePurchaseSupplier(input);
      showToast(input.id ? '采购供应商已更新' : '采购供应商已创建', 'success');
      setShowForm(false);
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout
      breadcrumbs={[{ label: '首页', path: '/dashboard' }, { label: '采购供应商' }]}
      user={user}
      onLogout={handleLogout}
    >
    <div className="min-h-full bg-gray-50 p-4 pb-20 md:p-8 dark:bg-gray-950">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">采购供应商</h1>
          </div>
          {canWrite && <Button className="shrink-0" onClick={() => setShowForm(true)}><Plus className="h-4 w-4" />新增采购供应商</Button>}
        </div>

        <div className="mb-4 flex items-center gap-2 rounded-xl bg-white p-3 shadow-sm dark:bg-gray-900">
          <Search className="h-4 w-4 text-gray-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none dark:text-gray-100" placeholder="搜索名称、简称、编码、联系人" />
          <button type="button" onClick={load} className="rounded p-1.5 text-gray-400 hover:bg-gray-100" aria-label="刷新"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
        </div>
        {stale && <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">网络不可用，当前显示此账号上次缓存的数据。</div>}

        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="hidden grid-cols-[1.8fr_1fr_1.3fr] gap-4 border-b border-gray-100 px-5 py-2.5 text-xs font-medium text-gray-500 md:grid dark:border-gray-800">
            <span>供应商</span><span>主联系人</span><span>供货范围</span>
          </div>
          {loading && items.length === 0 ? <div className="p-10 text-center text-sm text-gray-500">正在加载…</div> : items.length === 0 ? <div className="p-10 text-center text-sm text-gray-500">暂无采购供应商资料</div> : items.map((supplier) => {
            const contact = getPrimaryPurchaseSupplierContact(supplier);
            return (
              <div
                key={supplier.id}
                role="link"
                tabIndex={0}
                aria-label={`查看采购供应商 ${supplier.shortName || supplier.name}`}
                onClick={() => router.push(`/purchase-supplier/detail?id=${encodeURIComponent(supplier.id)}`)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    router.push(`/purchase-supplier/detail?id=${encodeURIComponent(supplier.id)}`);
                  }
                }}
                className="grid cursor-pointer gap-2 border-b border-gray-50 px-5 py-3 transition-colors last:border-0 hover:bg-blue-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 md:grid-cols-[1.8fr_1fr_1.3fr] md:items-center md:gap-4 dark:border-gray-800/70 dark:hover:bg-blue-950/20"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{supplier.name}</div>
                  {supplier.shortName && supplier.shortName !== supplier.name && (
                    <div className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">{supplier.shortName}</div>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 md:contents">
                  <div className="text-sm text-gray-600 dark:text-gray-300">{contact?.name || '—'}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{supplier.data.supplyScope || '—'}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {showForm && <PurchaseSupplierFormModal saving={saving} onClose={() => setShowForm(false)} onSave={handleSave} />}
    </div>
    </AppLayout>
  );
}
