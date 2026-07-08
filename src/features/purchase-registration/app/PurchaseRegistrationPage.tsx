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
  const [supplier, setSupplier] = useState('');

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

  // 筛选栏的"报价状态"等维度基于询报价登记的 record.quotedStatuses 设计，但采购部登记
  // 用的是自己专属的 purchaseQuotedStatuses（与 PurchaseRegistrationRow 的预览逻辑一致）。
  // 受限权限（仅有 purchaseRegistration、无 inquiry 权限）的用户，接口会整段裁剪掉
  // quotedStatuses 字段（sanitizeRestrictedRecord），此处用 purchaseQuotedStatuses 顶替，
  // 既保证语义正确，也避免该字段为 undefined 时筛选栏读取 .length/.some 报错。
  const filterableRecords = useMemo(
    () =>
      activeRecords.map((record) => ({
        ...record,
        quotedStatuses: record.purchaseQuotedStatuses ?? [],
      })),
    [activeRecords]
  );

  const { filter, setFilter, filteredAndSorted, baseFiltered, activeCount, reset } =
    useInquiryFilter(filterableRecords);

  // 采购部登记按"供应商"筛选（对应编辑弹窗里的采购部专属供应商列表），而不是询价人
  const supplierOptions = useMemo(
    () =>
      Array.from(
        new Set(
          activeRecords.flatMap((record) =>
            (record.purchaseSupplierStatuses ?? []).map((s) => s.supplierShortName).filter(Boolean)
          )
        )
      ).sort(),
    [activeRecords]
  );

  const matchesSupplier = (record: InquiryRecord) =>
    !supplier || (record.purchaseSupplierStatuses ?? []).some((s) => s.supplierShortName === supplier);

  const supplierFilteredBase = useMemo(
    () => baseFiltered.filter(matchesSupplier),
    [baseFiltered, supplier]
  );

  const finalRecords = useMemo(
    () => filteredAndSorted.filter(matchesSupplier),
    [filteredAndSorted, supplier]
  );

  const totalActiveCount = activeCount + (supplier ? 1 : 0);

  const handleReset = () => {
    reset();
    setSupplier('');
  };

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
            inquirers={[]}
            activeCount={totalActiveCount}
            onReset={handleReset}
            records={supplierFilteredBase}
            filteredCount={finalRecords.length}
            secondarySelect={{
              label: '供应商',
              value: supplier,
              options: supplierOptions,
              onChange: setSupplier,
            }}
          />
        </div>
        <PurchaseRegistrationTable
          records={finalRecords}
          onUpdate={(id, patch) => patchRecordForView(id, patch)}
          onEditRecord={setEditingRecord}
        />
      </div>

      <PurchaseInquiryEditModal
        record={editingRecord}
        onClose={() => setEditingRecord(null)}
        onSave={(id, patch) => patchRecordForView(id, patch)}
        supplierOptions={supplierOptions}
      />
    </AppLayout>
  );
}
