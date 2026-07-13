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
import { restoreOriginalRecords } from '../utils/purchaseInquiryStatus';

function recordMatchesSupplier(record: InquiryRecord, supplier: string) {
  return !supplier
    || (record.purchaseSupplierStatuses ?? [])
      .some((status) => status.supplierShortName === supplier);
}

function recordMatchesSupplierLink(
  record: InquiryRecord,
  supplierLinkFilter: 'all' | 'unlinked'
) {
  return supplierLinkFilter !== 'unlinked'
    || (record.purchaseSupplierStatuses ?? []).length === 0;
}

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
  const [supplierLinkFilter, setSupplierLinkFilter] = useState<'all' | 'unlinked'>('all');

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

  // 按 id 索引的原始记录，用于筛选/排序结束后把"影子记录"（见下方 filterableRecords 注释）
  // 换回真实数据，避免渲染层读到被覆盖的 quotedStatuses
  const activeRecordsById = useMemo(
    () => new Map(activeRecords.map((record) => [record.id, record])),
    [activeRecords]
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

  // "待关联供应商"：采购部登记自己的供应商列表（purchaseSupplierStatuses）还没有任何一条，
  // 替代原本复用询报价登记"待关联客户"（record.customerId，那是销售侧概念，采购部登记用不上）
  const supplierFilteredBase = useMemo(
    () => baseFiltered.filter((record) => recordMatchesSupplier(record, supplier)),
    [baseFiltered, supplier]
  );

  const linkFilteredBase = useMemo(
    () => supplierFilteredBase.filter(
      (record) => recordMatchesSupplierLink(record, supplierLinkFilter)
    ),
    [supplierFilteredBase, supplierLinkFilter]
  );

  const unlinkedSupplierCount = useMemo(
    () => linkFilteredBase.filter((record) => (record.purchaseSupplierStatuses ?? []).length === 0).length,
    [linkFilteredBase]
  );

  const finalRecords = useMemo(
    () =>
      restoreOriginalRecords(
        filteredAndSorted
          .filter((record) => recordMatchesSupplier(record, supplier))
          .filter((record) => recordMatchesSupplierLink(record, supplierLinkFilter)),
        activeRecordsById
      ),
    [filteredAndSorted, supplier, supplierLinkFilter, activeRecordsById]
  );

  const totalActiveCount = activeCount + (supplier ? 1 : 0) + (supplierLinkFilter === 'unlinked' ? 1 : 0);

  const handleReset = () => {
    reset();
    setSupplier('');
    setSupplierLinkFilter('all');
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
            records={linkFilteredBase}
            filteredCount={finalRecords.length}
            secondarySelect={{
              label: '供应商',
              value: supplier,
              options: supplierOptions,
              onChange: setSupplier,
            }}
            linkFilter={{
              label: '待关联供应商',
              active: supplierLinkFilter === 'unlinked',
              count: unlinkedSupplierCount,
              onToggle: () => setSupplierLinkFilter((prev) => (prev === 'unlinked' ? 'all' : 'unlinked')),
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
