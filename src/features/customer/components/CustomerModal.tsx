'use client';

import { X } from 'lucide-react';
import { CustomerForm } from './CustomerForm';
import type { CustomerFormData, TabType } from '../types';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: CustomerFormData;
  onInputChange: (
    field: keyof CustomerFormData,
    value: CustomerFormData[keyof CustomerFormData]
  ) => void;
  onSubmit: (e: React.FormEvent) => void;
  isEditing: boolean;
  activeTab: TabType;
}

const LABEL: Record<TabType, string> = {
  customers: '客户',
  suppliers: '供应商',
  consignees: '收货人',
};

export function CustomerModal({
  isOpen,
  onClose,
  formData,
  onInputChange,
  onSubmit,
  isEditing,
  activeTab,
}: CustomerModalProps) {
  if (!isOpen) return null;

  const label = LABEL[activeTab];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-[#1c1c1e]">

        {/* 头部 */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            {isEditing ? `编辑${label}` : `新增${label}`}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 可滚动表单区 */}
        <div className="flex-1 overflow-y-auto p-4">
          <CustomerForm
            formData={formData}
            onInputChange={onInputChange}
            onSubmit={onSubmit}
            onCancel={onClose}
            isEditing={isEditing}
            entityType={activeTab}
          />
        </div>
      </div>
    </div>
  );
}
