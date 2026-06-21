'use client';

import { useMemo, useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AppLayout, type ActionButton } from '@/components/layout';
import { useAppUser } from '@/hooks/useAppUser';
import type { CustomerQuoteStatus, InquiryBasicInput, InquiryRecord, SupplierQuoteStatus } from '../types';
import { useInquiryActions } from '../hooks/useInquiryActions';
import { useInquiryStore } from '../state/inquiry.store';
import { inquiryService } from '../services/inquiry.service';
import { InquiryFormModal } from '../components/InquiryFormModal';
import { InquiryTable } from '../components/InquiryTable';

export function InquiryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { user, handleLogout } = useAppUser();
  const records = useInquiryStore((state) => state.records);
  const { createRecord, updateRecordBasic, removeRecord } = useInquiryActions();
  const [permissionChecked, setPermissionChecked] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<InquiryRecord | null>(null);

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
    if (!permissionChecked || !hasInquiryAccess) return;

    let cancelled = false;
    void inquiryService.pullFromD1().then((d1Records) => {
      if (cancelled) return;
      inquiryService.pushLocalToD1(d1Records);
      const merged = inquiryService.mergeFromD1(d1Records);
      useInquiryStore.setState({ records: merged });
    });

    return () => {
      cancelled = true;
    };
  }, [hasInquiryAccess, permissionChecked]);

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
      updateRecordBasic(editingRecord.id, values);
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
      <div className="w-full max-w-none px-3 py-4 sm:px-5 lg:px-6">
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm dark:border-gray-800 dark:bg-[#2C2C2E] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">询报价登记</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              记录客户询价、供应商报价进度和已报客户版本。
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            新增询价
          </button>
        </div>

        <InquiryTable
          records={records}
          onEditRecord={openEditModal}
          onDeleteRecord={handleDeleteRecord}
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
