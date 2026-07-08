'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout';
import { FullScreenSpinner } from '@/components/layout/FullScreenSpinner';
import { PermissionDenied } from '@/components/PermissionDenied';
import { useAppUser } from '@/hooks/useAppUser';
import { usePermissionStore } from '@/lib/permissions';
import { useInquiryFilter } from '@/features/inquiry/hooks/useInquiryFilter';
import { useInquirySync } from '@/features/inquiry/hooks/useInquirySync';
import { useInquiryStore } from '@/features/inquiry/state/inquiry.store';
import { InquiryFilterBar } from '@/features/inquiry/components/InquiryFilterBar';
import type { InquiryRecord } from '@/features/inquiry/types';
import { PurchaseRegistrationTable } from '../components/PurchaseRegistrationTable';
import { PurchaseInquiryEditModal } from '../components/PurchaseInquiryEditModal';

export function PurchaseRegistrationPage() {
  const { status } = useSession();
  const router = useRouter();
  const { user, handleLogout } = useAppUser();
  const permissionUser = usePermissionStore((s) => s.user);
  const hasAccess = usePermissionStore((s) => s.hasPermission('purchaseRegistration'));
  const records = useInquiryStore((s) => s.records);
  const patchRecordForView = useInquiryStore((s) => s.patchRecordForView);
  const { lastSyncedAt, syncStatus } = useInquirySync({
    enabled: status === 'authenticated' && hasAccess,
    pushLocal: false,
    mergeLocal: false,
  });

  const [editingRecord, setEditingRecord] = useState<InquiryRecord | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') router.push('/');
  }, [status, router]);

  useEffect(() => {
    useInquiryStore.getState().init();
  }, []);

  const activeRecords = useMemo(
    () => records.filter((record) => record.status !== 'deleted'),
    [records]
  );

  const { filter, setFilter, filteredAndSorted, baseFiltered, inquirers, activeCount, reset } =
    useInquiryFilter(activeRecords);

  if (status === 'loading' || !user || !permissionUser) {
    return <FullScreenSpinner />;
  }

  if (!hasAccess) {
    return <PermissionDenied message="您没有采购部登记的访问权限" />;
  }

  const topBarSlot = syncStatus.pendingCount > 0 ? (
    <span
      className="text-amber-600 dark:text-amber-400"
      title={syncStatus.lastError ? `最近同步失败：${syncStatus.lastError}` : undefined}
    >
      待同步 {syncStatus.pendingCount} 条
    </span>
  ) : lastSyncedAt ? (
    <span>
      同步{' '}
      {lastSyncedAt.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })}
    </span>
  ) : undefined;

  return (
    <AppLayout
      breadcrumbs={[{ label: '首页', path: '/dashboard' }, { label: '采购部登记' }]}
      user={user}
      onLogout={handleLogout}
      topBarSlot={topBarSlot}
    >
      <div className="w-full px-3 py-3 sm:px-5 lg:px-6">
        <div className="mb-3 overflow-visible rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-800 dark:bg-[#2C2C2E]">
          <InquiryFilterBar
            id="purchase-registration-filter-panel"
            filter={filter}
            setFilter={setFilter}
            inquirers={inquirers}
            activeCount={activeCount}
            onReset={reset}
            records={baseFiltered}
            filteredCount={filteredAndSorted.length}
          />
        </div>
        <PurchaseRegistrationTable
          records={filteredAndSorted}
          onUpdate={(id, patch) => patchRecordForView(id, patch)}
          onEditRecord={setEditingRecord}
        />
      </div>

      <PurchaseInquiryEditModal
        record={editingRecord}
        onClose={() => setEditingRecord(null)}
        onSave={(id, patch) => patchRecordForView(id, patch)}
      />
    </AppLayout>
  );
}
