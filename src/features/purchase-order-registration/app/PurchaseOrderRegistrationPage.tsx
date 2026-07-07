'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout';
import { FullScreenSpinner } from '@/components/layout/FullScreenSpinner';
import { PermissionDenied } from '@/components/PermissionDenied';
import { useAppUser } from '@/hooks/useAppUser';
import { usePermissionStore } from '@/lib/permissions';
import { usePurchaseOrderStore } from '../state/purchase-order.store';
import type { PurchaseOrderDraft, PurchaseOrderRecord } from '../types';
import { PurchaseOrderFilterBar } from '../components/PurchaseOrderFilterBar';
import { PurchaseOrderFormModal } from '../components/PurchaseOrderFormModal';
import { PurchaseOrderTable } from '../components/PurchaseOrderTable';

function matchesKeyword(record: PurchaseOrderRecord, keyword: string): boolean {
  const q = keyword.trim().toLowerCase();
  if (!q) return true;
  return [
    record.purchaseNo,
    record.supplier,
    record.amount,
    record.currency,
    record.orderDeliveryStatus,
    record.orderDeliveryConsignee,
  ].some((value) => String(value ?? '').toLowerCase().includes(q));
}

export function PurchaseOrderRegistrationPage() {
  const { status } = useSession();
  const router = useRouter();
  const { user, handleLogout } = useAppUser();
  const permissionUser = usePermissionStore((s) => s.user);
  const hasAccess = usePermissionStore((s) => s.hasPermission('purchaseOrderTable'));
  const records = usePurchaseOrderStore((s) => s.records);
  const isLoading = usePurchaseOrderStore((s) => s.isLoading);
  const lastSyncedAt = usePurchaseOrderStore((s) => s.lastSyncedAt);
  const init = usePurchaseOrderStore((s) => s.init);
  const refresh = usePurchaseOrderStore((s) => s.refresh);
  const addRecord = usePurchaseOrderStore((s) => s.addRecord);
  const updateRecord = usePurchaseOrderStore((s) => s.updateRecord);
  const removeRecord = usePurchaseOrderStore((s) => s.removeRecord);

  const [keyword, setKeyword] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PurchaseOrderRecord | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') router.push('/');
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated' || !hasAccess) return;
    void init();
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, 30_000);
    return () => window.clearInterval(interval);
  }, [hasAccess, init, refresh, status]);

  const filteredRecords = useMemo(
    () => records.filter((record) => matchesKeyword(record, keyword)),
    [records, keyword]
  );

  if (status === 'loading' || !user || !permissionUser) {
    return <FullScreenSpinner />;
  }

  if (!hasAccess) {
    return <PermissionDenied message="您没有采购订单表的访问权限" />;
  }

  const topBarSlot = lastSyncedAt ? (
    <span>
      同步{' '}
      {lastSyncedAt.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })}
    </span>
  ) : undefined;

  const closeModal = () => {
    setModalOpen(false);
    setEditingRecord(null);
  };

  const handleSubmit = async (draft: PurchaseOrderDraft) => {
    if (editingRecord) {
      await updateRecord(editingRecord.id, draft);
    } else {
      await addRecord(draft);
    }
  };

  return (
    <AppLayout
      breadcrumbs={[{ label: '首页', path: '/dashboard' }, { label: '采购订单表' }]}
      user={user}
      onLogout={handleLogout}
      topBarSlot={topBarSlot}
    >
      <div className="w-full px-3 py-3 sm:px-5 lg:px-6">
        <PurchaseOrderFilterBar
          keyword={keyword}
          isRefreshing={isLoading}
          onKeywordChange={setKeyword}
          onRefresh={() => void refresh()}
          onCreate={() => {
            setEditingRecord(null);
            setModalOpen(true);
          }}
        />
        <PurchaseOrderTable
          records={filteredRecords}
          onEdit={(record) => {
            setEditingRecord(record);
            setModalOpen(true);
          }}
          onDelete={(record) => {
            if (window.confirm(`确认删除采购订单 ${record.purchaseNo}？`)) {
              void removeRecord(record.id);
            }
          }}
          onUpdate={(id, patch) => void updateRecord(id, patch)}
        />
      </div>

      <PurchaseOrderFormModal
        open={modalOpen}
        record={editingRecord}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />
    </AppLayout>
  );
}
