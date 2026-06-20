'use client';

import { useMemo, useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { AppLayout, type ActionButton } from '@/components/layout';
import { useAppUser } from '@/hooks/useAppUser';
import type { InquiryBasicInput, InquiryRecord } from '../types';
import { useInquiryActions } from '../hooks/useInquiryActions';
import { useInquiryStore } from '../state/inquiry.store';
import { InquiryFormModal } from '../components/InquiryFormModal';
import { InquiryTable } from '../components/InquiryTable';

export function InquiryPage() {
  const { user, handleLogout } = useAppUser();
  const records = useInquiryStore((state) => state.records);
  const { createRecord, updateRecordBasic, removeRecord } = useInquiryActions();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<InquiryRecord | null>(null);

  useEffect(() => {
    useInquiryStore.getState().init();
  }, []);

  const sortedRecords = useMemo(
    () => [...records].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [records]
  );

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

  const handleSubmit = (values: InquiryBasicInput) => {
    if (editingRecord) {
      updateRecordBasic(editingRecord.id, values);
    } else {
      createRecord(values);
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
          records={sortedRecords}
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
