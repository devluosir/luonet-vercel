'use client';

import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { InquiryQuoteStatus } from '@/features/inquiry/components/InquiryQuoteStatus';
import type { CustomerQuoteStatus, InquiryRecord, SupplierQuoteStatus } from '@/features/inquiry/types';

interface PurchaseInquiryEditModalProps {
  record: InquiryRecord | null;
  onClose: () => void;
  onSave: (id: string, patch: Partial<InquiryRecord>) => void;
}

export function PurchaseInquiryEditModal({ record, onClose, onSave }: PurchaseInquiryEditModalProps) {
  const [localSuppliers, setLocalSuppliers] = useState<SupplierQuoteStatus[]>([]);
  const [localQuoted, setLocalQuoted] = useState<CustomerQuoteStatus[]>([]);

  useEffect(() => {
    if (!record) return;
    setLocalSuppliers(record.purchaseSupplierStatuses ?? []);
    setLocalQuoted(record.purchaseQuotedStatuses ?? []);
  }, [record]);

  // 借用询报价登记的供应商/已报价编辑器：该组件只读写 record.supplierStatuses / record.quotedStatuses，
  // 与 record 其余字段无关，因此用「影子记录」把采购部专属数组接到这两个字段名上即可复用，
  // 编辑内容互不影响询报价登记原本的 supplierStatuses / quotedStatuses。
  const shimRecord = useMemo<InquiryRecord | null>(() => {
    if (!record) return null;
    return { ...record, supplierStatuses: localSuppliers, quotedStatuses: localQuoted };
  }, [record, localSuppliers, localQuoted]);

  if (!record || !shimRecord) return null;

  const handleSave = () => {
    onSave(record.id, {
      purchaseSupplierStatuses: localSuppliers,
      purchaseQuotedStatuses: localQuoted,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl dark:bg-[#2C2C2E]">
        <div className="flex items-center justify-between px-6 pb-4 pt-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">编辑询价</h2>
            <p className="mt-0.5 font-mono text-xs text-gray-400 dark:text-gray-500">{record.inquiryNo}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
            aria-label="关闭弹窗"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="h-px bg-gray-100 dark:bg-gray-700" />

        <div className="px-6 py-5">
          {record.description && (
            <p className="mb-4 truncate text-sm text-gray-500 dark:text-gray-400" title={record.description}>
              {record.description}
            </p>
          )}

          <div className="mb-4 rounded-xl bg-gray-50 p-4 ring-1 ring-gray-100 dark:bg-gray-800/50 dark:ring-gray-700">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              询报价状态（采购部专属，不影响询报价登记）
            </p>
            <InquiryQuoteStatus
              record={shimRecord}
              onSuppliersChange={setLocalSuppliers}
              onQuotedChange={setLocalQuoted}
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              取消
            </button>
            <Button type="button" onClick={handleSave} className="px-5">
              保存修改
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
