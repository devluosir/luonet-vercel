'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import { Filter, Plus } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AppLayout, type ActionButton } from '@/components/layout';
import { useAppUser } from '@/hooks/useAppUser';
import type { CustomerQuoteStatus, InquiryBasicInput, InquiryRecord, SupplierQuoteStatus } from '../types';
import { useInquiryActions } from '../hooks/useInquiryActions';
import { useInquiryFilter } from '../hooks/useInquiryFilter';
import { useInquiryStore } from '../state/inquiry.store';
import { inquiryService } from '../services/inquiry.service';
import { InquiryFilterBar } from '../components/InquiryFilterBar';
import { InquiryFormModal } from '../components/InquiryFormModal';
import { InquiryTable } from '../components/InquiryTable';

export function InquiryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { user, handleLogout } = useAppUser();
  const records = useInquiryStore((state) => state.records);
  const { createRecord, removeRecord } = useInquiryActions();
  const updateRecord = useInquiryStore((state) => state.updateRecord);
  const { filter, setFilter, filteredAndSorted, customers, inquirers, activeCount, reset } =
    useInquiryFilter(records);
  const [permissionChecked, setPermissionChecked] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<InquiryRecord | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const isModalOpenRef = useRef(false);

  const hasInquiryAccess = useMemo(() => {
    if (!session?.user) return false;
    if (session.user.isAdmin) return true;
    return (session.user.permissions ?? []).some(
      (permission) => permission.moduleId === 'inquiry' && permission.canAccess
    );
  }, [session]);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }
    setPermissionChecked(true);
  }, [status, router]);

  useEffect(() => {
    useInquiryStore.getState().init();
  }, []);

  useEffect(() => {
    isModalOpenRef.current = isModalOpen;
  }, [isModalOpen]);

  useEffect(() => {
    if (!permissionChecked || !hasInquiryAccess || isModalOpen) return;

    const POLL_INTERVAL_MS = 30_000;
    let cancelled = false;

    async function syncFromD1() {
      if (isModalOpenRef.current) return;
      const d1Records = await inquiryService.pullFromD1();
      if (cancelled || isModalOpenRef.current) return;
      inquiryService.pushLocalToD1(d1Records);
      const merged = inquiryService.mergeFromD1(d1Records);
      useInquiryStore.setState({ records: merged });
      setLastSyncedAt(new Date());
    }

    void syncFromD1();

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void syncFromD1();
      }
    }, POLL_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void syncFromD1();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [hasInquiryAccess, isModalOpen, permissionChecked]);

  const openCreateModal = () => {
    setEditingRecord(null);
    setIsModalOpen(true);
  };

  const openEditModal = (record: InquiryRecord) => {
    setEditingRecord(record);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRecord(null);
  };

  const handleSubmit = (
    values: InquiryBasicInput,
    suppliers: SupplierQuoteStatus[],
    quoted: CustomerQuoteStatus[]
  ) => {
    if (editingRecord) {
      updateRecord(editingRecord.id, {
        ...values,
        supplierStatuses: suppliers,
        quotedStatuses: quoted,
      });
    } else {
      createRecord(values, suppliers, quoted);
    }
    closeModal();
  };

  const handleDeleteRecord = (recordId: string) => {
    if (window.confirm('确定删除这条询报价记录吗？')) {
      removeRecord(recordId);
    }
  };

  const bottomActions = useMemo<ActionButton[]>(
    () => [
      {
        key: 'new-inquiry',
        label: '新增询价',
        onClick: openCreateModal,
        variant: 'primary',
        icon: Plus,
      },
    ],
    []
  );

  const resultSummary =
    filteredAndSorted.length === records.length
      ? `共 ${records.length} 条`
      : `共 ${filteredAndSorted.length}/${records.length} 条`;

  if (!permissionChecked || status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
      </div>
    );
  }

  if (!hasInquiryAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-black">
        <div className="rounded-xl bg-white p-8 text-center shadow-lg dark:bg-gray-900">
          <div className="mb-4 text-6xl text-red-600 dark:text-red-400">🚫</div>
          <h1 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">权限不足</h1>
          <p className="mb-6 text-gray-600 dark:text-gray-400">您没有询报价登记的访问权限</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <AppLayout
      breadcrumbs={[
        { label: '首页', path: '/dashboard' },
        { label: '询报价登记' },
      ]}
      user={user}
      onLogout={handleLogout}
      bottomActions={bottomActions}
    >
      <div className="w-full max-w-none px-3 py-3 sm:px-5 lg:px-6">
        <div className="mb-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-800 dark:bg-[#2C2C2E]">
          <div className={`${isFilterOpen ? 'mb-2' : ''} flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between`}>
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">询报价登记</h1>
                {!isFilterOpen && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">{resultSummary}</span>
                )}
                {lastSyncedAt && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    最后同步：
                    {lastSyncedAt.toLocaleTimeString('zh-CN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                记录客户询价、供应商报价进度和已报客户版本。
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setIsFilterOpen((open) => !open)}
                className={`relative inline-flex h-8 w-8 items-center justify-center rounded-lg border text-sm transition-colors ${
                  isFilterOpen
                    ? 'border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-400'
                    : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
                aria-label={isFilterOpen ? '收起筛选' : '展开筛选'}
                aria-expanded={isFilterOpen}
                aria-controls="inquiry-filter-panel"
                title={isFilterOpen ? '收起筛选' : '展开筛选'}
              >
                <Filter className="h-4 w-4" />
                {activeCount > 0 && (
                  <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-blue-600 px-1 text-[10px] font-semibold leading-4 text-white">
                    {activeCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                新增询价
              </button>
            </div>
          </div>
          {isFilterOpen && (
            <InquiryFilterBar
              id="inquiry-filter-panel"
              filter={filter}
              setFilter={setFilter}
              customers={customers}
              inquirers={inquirers}
              activeCount={activeCount}
              filteredCount={filteredAndSorted.length}
              totalCount={records.length}
              onReset={reset}
            />
          )}
        </div>

        <InquiryTable
          records={filteredAndSorted}
          sortDir={filter.sortDir}
          onSortToggle={() =>
            setFilter({ ...filter, sortDir: filter.sortDir === 'desc' ? 'asc' : 'desc' })
          }
          onEditRecord={openEditModal}
          onDeleteRecord={handleDeleteRecord}
          emptyMessage={activeCount > 0 ? '没有符合条件的记录' : '暂无询报价记录'}
          emptySubMessage={
            activeCount > 0
              ? '尝试调整筛选条件，或点击"重置筛选"查看全部。'
              : '点击"新增询价"后，会在这里登记供应商询价和客户报价状态。'
          }
        />
      </div>

      <InquiryFormModal
        isOpen={isModalOpen}
        mode={editingRecord ? 'edit' : 'create'}
        record={editingRecord}
        existingRecords={records}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />
    </AppLayout>
  );
}
