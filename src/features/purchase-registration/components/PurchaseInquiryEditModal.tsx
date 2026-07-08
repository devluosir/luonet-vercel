'use client';

import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { InquiryQuoteStatus } from '@/features/inquiry/components/InquiryQuoteStatus';
import { createId } from '@/features/inquiry/utils/inquiryUtils';
import type { CustomerQuoteStatus, InquiryRecord, SupplierQuoteStatus } from '@/features/inquiry/types';

/** 飞罗（上海飞罗贸易有限公司）在供应商列表中的短名，代表"我方自己"这一自供应商身份 */
const SELF_SUPPLIER_NAME = '飞罗';

/**
 * 从采购部登记的"已报价"列表里取出用来同步的日期：
 * 只看常规已报价条目（排除无法报价/已补充/已关闭），按 m.D 取最大（最新）的一条。
 */
function pickLatestQuoteDate(statuses: CustomerQuoteStatus[]): string | undefined {
  const regular = statuses.filter((s) => !s.type || s.type === 'quoted');
  if (regular.length === 0) return undefined;

  const parse = (raw: string): number => {
    const clean = raw.replace(/[[\]]/g, '');
    const [mStr, dStr] = clean.split('.');
    const m = parseInt(mStr ?? '0', 10);
    const d = parseInt(dStr ?? '0', 10);
    return m ? m * 100 + (d || 0) : 0;
  };

  return regular.reduce((best, current) =>
    parse(current.quoteDate) >= parse(best.quoteDate) ? current : best
  ).quoteDate;
}

interface PurchaseInquiryEditModalProps {
  record: InquiryRecord | null;
  onClose: () => void;
  onSave: (id: string, patch: Partial<InquiryRecord>) => void;
  /** 采购部登记自己已用过的供应商简称列表（来自 purchaseSupplierStatuses），与询报价登记的客户管理供应商库分开 */
  supplierOptions?: string[];
}

export function PurchaseInquiryEditModal({ record, onClose, onSave, supplierOptions }: PurchaseInquiryEditModalProps) {
  const [localSuppliers, setLocalSuppliers] = useState<SupplierQuoteStatus[]>([]);
  const [localQuoted, setLocalQuoted] = useState<CustomerQuoteStatus[]>([]);
  const [localDescription, setLocalDescription] = useState('');

  useEffect(() => {
    if (!record) return;
    setLocalSuppliers(record.purchaseSupplierStatuses ?? []);
    setLocalQuoted(record.purchaseQuotedStatuses ?? []);
    setLocalDescription(record.description ?? '');
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
    const patch: Partial<InquiryRecord> = {
      description: localDescription.trim(),
      purchaseSupplierStatuses: localSuppliers,
      purchaseQuotedStatuses: localQuoted,
    };

    // 采购部登记的询报价状态一旦变为"已报价"——不管这次用的供应商、已报价单位是不是飞罗——
    // 都自动把询报价登记原始供应商列表里的"飞罗"同步为已报价，日期取采购部登记这边已报价的日期。
    const latestQuoteDate = pickLatestQuoteDate(localQuoted);
    if (latestQuoteDate) {
      const selfSupplier = record.supplierStatuses.find(
        (s) => s.supplierShortName === SELF_SUPPLIER_NAME
      );
      const needsSync =
        !selfSupplier || selfSupplier.status !== 'quoted' || selfSupplier.quoteDate !== latestQuoteDate;

      if (needsSync) {
        patch.supplierStatuses = selfSupplier
          ? record.supplierStatuses.map((s) =>
              s.supplierShortName === SELF_SUPPLIER_NAME
                ? { ...s, status: 'quoted', quoteDate: latestQuoteDate }
                : s
            )
          : [
              ...record.supplierStatuses,
              { id: createId(), supplierShortName: SELF_SUPPLIER_NAME, status: 'quoted', quoteDate: latestQuoteDate },
            ];
      }
    }

    onSave(record.id, patch);
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
          <div className="mb-4 space-y-1">
            <label className="block text-xs font-medium text-gray-400 dark:text-gray-500">内容描述</label>
            <input
              value={localDescription}
              onChange={(e) => setLocalDescription(e.target.value)}
              placeholder="产品名称、规格、数量…（选填）"
              className={
                'h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none ' +
                'focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 ' +
                'dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-blue-400'
              }
            />
          </div>

          <div className="mb-4 rounded-xl bg-gray-50 p-4 ring-1 ring-gray-100 dark:bg-gray-800/50 dark:ring-gray-700">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              询报价状态（更新为已报价后，报价状态会同步到销售部“飞罗已报价”）
            </p>
            <InquiryQuoteStatus
              record={shimRecord}
              onSuppliersChange={setLocalSuppliers}
              onQuotedChange={setLocalQuoted}
              supplierOptions={supplierOptions ?? []}
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
