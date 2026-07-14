'use client';

import { useCallback, useEffect, useState } from 'react';
import { Archive, Pencil, Plus, RefreshCw, Search } from 'lucide-react';
import { PermissionDenied } from '@/components/PermissionDenied';
import { Button } from '@/components/ui/Button';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { PurchaseSupplierFormModal } from '../components/PurchaseSupplierFormModal';
import { usePurchaseSupplierAccess } from '../hooks/usePurchaseSupplierAccess';
import { archivePurchaseSupplier, fetchPurchaseSuppliers, getPrimaryPurchaseSupplierContact, savePurchaseSupplier } from '../services/purchaseSupplierService';
import type { PurchaseSupplier, PurchaseSupplierInput } from '../types';
import { AppLayout } from '@/components/layout';
import { useAppUser } from '@/hooks/useAppUser';

export function PurchaseSupplierPage() {
  const { ready, canRead, canWrite, userId } = usePurchaseSupplierAccess();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const { user, handleLogout } = useAppUser();
  const [items, setItems] = useState<PurchaseSupplier[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [stale, setStale] = useState(false);
  const [editing, setEditing] = useState<PurchaseSupplier | undefined>();
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
      setEditing(undefined);
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (supplier: PurchaseSupplier) => {
    if (!await confirm({ title: '归档采购供应商', description: `确认归档“${supplier.shortName || supplier.name}”吗？历史单据快照不会受影响。`, confirmLabel: '归档', variant: 'danger' })) return;
    try {
      await archivePurchaseSupplier(supplier.id);
      showToast('已归档', 'success');
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '归档失败', 'error');
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
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">采购供应商</h1>
            <p className="mt-1 text-sm text-gray-500">采购侧独立主数据，不与销售侧客户管理中的供应商混用。</p>
          </div>
          {canWrite && <Button onClick={() => { setEditing(undefined); setShowForm(true); }}><Plus className="h-4 w-4" />新增采购供应商</Button>}
        </div>

        <div className="mb-4 flex items-center gap-2 rounded-xl bg-white p-3 shadow-sm dark:bg-gray-900">
          <Search className="h-4 w-4 text-gray-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none dark:text-gray-100" placeholder="搜索名称、简称、编码、联系人" />
          <button type="button" onClick={load} className="rounded p-1.5 text-gray-400 hover:bg-gray-100" aria-label="刷新"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
        </div>
        {stale && <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">网络不可用，当前显示此账号上次缓存的数据。</div>}

        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="hidden grid-cols-[1.2fr_1.6fr_1fr_1fr_auto] gap-4 border-b border-gray-100 px-5 py-3 text-xs font-medium text-gray-500 md:grid dark:border-gray-800">
            <span>简称 / 编码</span><span>供应商全称</span><span>主联系人</span><span>电话</span><span>操作</span>
          </div>
          {loading && items.length === 0 ? <div className="p-10 text-center text-sm text-gray-500">正在加载…</div> : items.length === 0 ? <div className="p-10 text-center text-sm text-gray-500">暂无采购供应商资料</div> : items.map((supplier) => {
            const contact = getPrimaryPurchaseSupplierContact(supplier);
            return (
              <div key={supplier.id} className="grid gap-2 border-b border-gray-50 px-5 py-4 last:border-0 md:grid-cols-[1.2fr_1.6fr_1fr_1fr_auto] md:items-center md:gap-4 dark:border-gray-800/70">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{supplier.shortName || supplier.name}<div className="text-xs font-normal text-gray-400">{supplier.code || '未设编码'}</div></div>
                <div className="truncate text-sm text-gray-600 dark:text-gray-300">{supplier.name}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">{contact?.name || '—'}</div>
                <div className="text-sm text-gray-500">{contact?.phone || '—'}</div>
                {canWrite && <div className="flex gap-1">
                  <button type="button" onClick={() => { setEditing(supplier); setShowForm(true); }} className="rounded p-2 text-gray-400 hover:bg-gray-100 hover:text-blue-600" aria-label="编辑"><Pencil className="h-4 w-4" /></button>
                  <button type="button" onClick={() => handleArchive(supplier)} className="rounded p-2 text-gray-400 hover:bg-red-50 hover:text-red-600" aria-label="归档"><Archive className="h-4 w-4" /></button>
                </div>}
              </div>
            );
          })}
        </div>
      </div>
      {showForm && <PurchaseSupplierFormModal supplier={editing} saving={saving} onClose={() => { setShowForm(false); setEditing(undefined); }} onSave={handleSave} />}
    </div>
    </AppLayout>
  );
}
