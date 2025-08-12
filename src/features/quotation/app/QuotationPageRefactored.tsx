'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { 
  DocumentLayout,
  BaseFormSection,
  FormField,
  FormRow,
  useBaseDocument,
  createBaseDocumentStore,
  createSelectors,
  useAutoSave,
} from '@/features/core';
import { useQuotationStore } from '../state/useQuotationStore';
import { QuotationService } from '../services/quotation.service';
import { CustomerInfoSection } from '../components/CustomerInfoSection';
import { ItemsTableSection } from '../components/ItemsTableSection';
import { NotesSection } from '../components/NotesSection';
import type { QuotationData, DocumentPermission } from '../types';

// 创建报价单Store
const quotationStore = createBaseDocumentStore<QuotationData>(
  {
    id: '',
    documentNo: '',
    date: new Date().toISOString().split('T')[0],
    currency: 'CNY',
    totalAmount: 0,
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    inquiryNo: '',
    quotationNo: '',
    contractNo: '',
    to: { name: '', address: '', contact: '', email: '', phone: '' },
    from: { name: '', address: '', contact: '', email: '', phone: '' },
    items: [],
    otherFees: [],
    notes: [],
    notesConfig: {} as any,
    paymentTerms: '',
    deliveryTerms: '',
    validity: '',
    paymentDate: '',
    showBank: true,
    showStamp: true,
    amountInWords: '',
    additionalPaymentTerms: '',
  },
  'quotation'
);

// 创建选择器
const selectors = createSelectors<QuotationData>();

export default function QuotationPageRefactored() {
  const params = useParams();
  const editId = params?.id as string;
  
  // 使用核心模块的权限管理
  const permissions: DocumentPermission = {
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canExport: true,
    canPreview: true,
  };

  // 使用核心模块的文档管理Hook
  const {
    data,
    isLoading,
    isSaving,
    isGenerating,
    error,
    isReadOnly,
    canExport,
    canPreview,
    safeUpdateData,
    safeSave,
    safeGeneratePDF,
    safePreviewPDF,
  } = useBaseDocument<QuotationData>(quotationStore, permissions);

  // 使用核心模块的自动保存
  const { isDirty, lastSaved } = useAutoSave(
    quotationStore,
    async () => {
      const service = new QuotationService();
      if (editId) {
        await service.update(editId, data);
      } else {
        await service.create(data);
      }
    },
    300
  );

  // 页面操作
  const handleSave = async () => {
    await safeSave();
  };

  const handleExport = async () => {
    await safeGeneratePDF();
  };

  const handlePreview = async () => {
    await safePreviewPDF();
  };

  const handleSettings = () => {
    // 打开设置面板
  };

  return (
    <DocumentLayout
      title={editId ? '编辑报价单' : '新建报价单'}
      backPath="/dashboard"
      permissions={permissions}
      actions={{
        onSave: handleSave,
        onExport: handleExport,
        onPreview: handlePreview,
        onSettings: handleSettings,
      }}
      loading={isLoading}
      saving={isSaving}
      generating={isGenerating}
    >
      <div className="space-y-6">
        {/* 客户信息区块 */}
        <BaseFormSection title="客户信息" required>
          <CustomerInfoSection
            data={data}
            onUpdate={safeUpdateData}
            isReadOnly={isReadOnly}
          />
        </BaseFormSection>

        {/* 商品信息区块 */}
        <BaseFormSection title="商品信息" required>
          <ItemsTableSection
            items={data.items}
            otherFees={data.otherFees}
            onUpdate={safeUpdateData}
            isReadOnly={isReadOnly}
          />
        </BaseFormSection>

        {/* 条款信息区块 */}
        <BaseFormSection title="条款信息" collapsible defaultCollapsed>
          <NotesSection
            data={data}
            onChange={safeUpdateData}
          />
        </BaseFormSection>

        {/* 支付信息区块 */}
        <BaseFormSection title="支付信息">
          <FormRow>
            <FormField label="支付条款" required>
              <input
                type="text"
                value={data.paymentTerms}
                onChange={(e) => safeUpdateData({ paymentTerms: e.target.value })}
                disabled={isReadOnly}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </FormField>
            
            <FormField label="交货条款" required>
              <input
                type="text"
                value={data.deliveryTerms}
                onChange={(e) => safeUpdateData({ deliveryTerms: e.target.value })}
                disabled={isReadOnly}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </FormField>
            
            <FormField label="有效期" required>
              <input
                type="text"
                value={data.validity}
                onChange={(e) => safeUpdateData({ validity: e.target.value })}
                disabled={isReadOnly}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </FormField>
          </FormRow>
        </BaseFormSection>

        {/* 状态信息 */}
        {isDirty && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex items-center">
              <div className="text-yellow-800">
                有未保存的更改
                {lastSaved && (
                  <span className="text-sm text-yellow-600 ml-2">
                    上次保存: {new Date(lastSaved).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 错误信息 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-red-800">{error}</div>
          </div>
        )}
      </div>
    </DocumentLayout>
  );
}
