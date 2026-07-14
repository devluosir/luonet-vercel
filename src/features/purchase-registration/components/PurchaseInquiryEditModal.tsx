'use client';

import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { InquiryQuoteStatus } from '@/features/inquiry/components/InquiryQuoteStatus';
import { stripDateBrackets } from '@/features/inquiry/utils/inquiryUtils';
import { useInquiryStore } from '@/features/inquiry/state/inquiry.store';
import type { CustomerQuoteStatus, InquiryRecord, PurchaseSupplierQuoteStatus } from '@/features/inquiry/types';
import {
  computeSelfSupplierPatch,
  countOtherQuotedSuppliers,
  findLatestOtherQuotedDate,
  findSalesSupplemented,
  findSalesUnavailable,
  findSelfSupplierNeedInfo,
} from '../utils/purchaseInquiryStatus';

interface PurchaseInquiryEditModalProps {
  record: InquiryRecord | null;
  onClose: () => void;
  onSave: (id: string, patch: Partial<InquiryRecord>) => void;
  /** 采购部登记自己已用过的供应商简称列表（来自 purchaseSupplierStatuses），与询报价登记的客户管理供应商库分开 */
  supplierOptions?: Array<string | { id: string; name: string }>;
}

export function PurchaseInquiryEditModal({ record: recordProp, onClose, onSave, supplierOptions }: PurchaseInquiryEditModalProps) {
  // 弹窗打开期间 store 可能因为后台同步而更新（例如另一设备/受限视图周期性拉取），
  // 优先按 record.id 从最新 store 解析记录，避免保存时用打开弹窗那一刻的旧快照覆盖飞罗同步判断。
  // 找不到（记录被删除等极端情况）时退回 props 传入的快照，不阻塞关闭弹窗。
  const storeRecord = useInquiryStore((s) =>
    recordProp ? s.records.find((r) => r.id === recordProp.id) : undefined
  );
  const record = storeRecord ?? recordProp;

  const [localSuppliers, setLocalSuppliers] = useState<PurchaseSupplierQuoteStatus[]>([]);
  const [localQuoted, setLocalQuoted] = useState<CustomerQuoteStatus[]>([]);
  const [localDescription, setLocalDescription] = useState('');

  // 依赖 record?.id（而非整个 record 对象）：只在打开一条新记录时重置本地编辑状态，
  // 避免同一条记录在编辑过程中因为 store 后台同步刷新而清空用户尚未保存的输入。
  useEffect(() => {
    if (!record) return;
    setLocalSuppliers(record.purchaseSupplierStatuses ?? []);
    setLocalQuoted(record.purchaseQuotedStatuses ?? []);
    setLocalDescription(record.description ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record?.id]);

  // 借用询报价登记的供应商/已报价编辑器：该组件只读写 record.supplierStatuses / record.quotedStatuses，
  // 与 record 其余字段无关，因此用「影子记录」把采购部专属数组接到这两个字段名上即可复用，
  // 编辑内容互不影响询报价登记原本的 supplierStatuses / quotedStatuses。
  const shimRecord = useMemo<InquiryRecord | null>(() => {
    if (!record) return null;
    return { ...record, supplierStatuses: localSuppliers, quotedStatuses: localQuoted };
  }, [record, localSuppliers, localQuoted]);

  if (!record || !shimRecord) return null;

  // 销售侧真实的"询价已关闭"状态：只读展示，采购部不能创建/取消/修改，也不能被历史遗留的
  // purchaseQuotedStatuses.type === 'closed' 覆盖——那是旧数据，不再作为采购部关闭状态的依据。
  const salesClosedStatus = record.quotedStatuses?.find((s) => s.type === 'closed');
  // 销售侧飞罗为需补资料时，采购部要能读到提示（含日期）；但不能凭空创建/修改某一家
  // purchaseSupplierStatuses，因为销售侧信息无法确定具体是哪一家采购供应商需要资料。
  const selfSupplierNeedInfoEntry = findSelfSupplierNeedInfo(record.supplierStatuses);
  // 销售侧登记的"已补充信息"（从客户那边拿到资料）：与采购部自己的 purchaseQuotedStatuses.supplemented
  // 是两个独立标记，互不覆盖，这里只读展示，让采购部知道客户那边的资料已经补上了。
  const salesSupplementedStatus = findSalesSupplemented(record.quotedStatuses);
  // 销售侧登记的"已回复客户无法报价"：与采购部自己的"我司无法报价"是两个独立标记，这里只读展示，
  // 让采购部知道客户那边已经被回复无法报价，不用再继续跟进供应商报价。
  const salesUnavailableStatus = findSalesUnavailable(record.quotedStatuses);
  // "其他 n 家已报价"：数据来源、去重、排除飞罗的规则，以及日期取值（最新一条报价日期）
  // 都与采购部登记表状态列完全共用同一组工具函数，不重复实现。
  const othersQuotedCount = countOtherQuotedSuppliers(record.supplierStatuses);
  const othersQuotedDate = findLatestOtherQuotedDate(record.supplierStatuses);

  const handleSave = () => {
    const patch: Partial<InquiryRecord> = {
      description: localDescription.trim(),
      purchaseSupplierStatuses: localSuppliers,
      purchaseQuotedStatuses: localQuoted,
    };

    // 采购部登记状态变化后，按优先级（无法报价 > 需补资料 > 已报价）把销售侧"飞罗"同步过去；
    // 只在确实需要修改时才带上 supplierStatuses 补丁，且只改飞罗这一条，不动其它供应商，
    // 也绝不写 quotedStatuses（采购部无权修改询报价登记的关闭状态等销售侧字段）。
    const supplierPatch = computeSelfSupplierPatch(record.supplierStatuses, localSuppliers, localQuoted);
    if (supplierPatch) {
      patch.supplierStatuses = supplierPatch;
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
            <p className="mt-0.5 font-mono text-sm font-bold text-blue-700 dark:text-blue-300">{record.inquiryNo}</p>
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

          {(selfSupplierNeedInfoEntry || salesSupplementedStatus || salesUnavailableStatus) && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {selfSupplierNeedInfoEntry && (
                <span className="inline-flex items-center rounded-lg bg-yellow-50 px-3 py-2 text-xs font-medium text-yellow-700 ring-1 ring-yellow-100 dark:bg-yellow-950/30 dark:text-yellow-400 dark:ring-yellow-900">
                  销售侧提示：飞罗需补充信息
                  {selfSupplierNeedInfoEntry.quoteDate ? `（${stripDateBrackets(selfSupplierNeedInfoEntry.quoteDate)}）` : ''}
                </span>
              )}
              {salesSupplementedStatus && (
                <span className="inline-flex items-center rounded-lg bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:ring-blue-900">
                  销售侧提示：已补充信息（{stripDateBrackets(salesSupplementedStatus.quoteDate)}）
                </span>
              )}
              {salesUnavailableStatus && (
                <span className="inline-flex items-center rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-600 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700">
                  销售侧提示：已回复客户无法报价（{stripDateBrackets(salesUnavailableStatus.quoteDate)}）
                </span>
              )}
            </div>
          )}

          <div className="mb-4 rounded-xl bg-gray-50 p-4 ring-1 ring-gray-100 dark:bg-gray-800/50 dark:ring-gray-700">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              询报价状态（更新为已报价后，报价状态会同步到销售部&ldquo;飞罗已报价&rdquo;）
            </p>
            <InquiryQuoteStatus
              record={shimRecord}
              onSuppliersChange={(suppliers) => setLocalSuppliers(suppliers as PurchaseSupplierQuoteStatus[])}
              onQuotedChange={setLocalQuoted}
              supplierOptions={supplierOptions ?? []}
              unavailableLabel="我司无法报价"
              showClosedControl={false}
              extraNeedInfo={!!selfSupplierNeedInfoEntry}
              showPurchaseSupplierLinkStatus
              quotedTrailingContent={
                othersQuotedCount > 0 ? (
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600 dark:bg-blue-950/30 dark:text-blue-400">
                    其他 {othersQuotedCount} 家已报价
                    {othersQuotedDate ? `（${stripDateBrackets(othersQuotedDate)}）` : ''}
                  </span>
                ) : null
              }
            />

            {/* 询价已关闭：完全由销售侧 record.quotedStatuses 决定，采购部只读展示，不提供任何编辑入口 */}
            {salesClosedStatus && (
              <p className="mt-3 rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                询价已关闭（{stripDateBrackets(salesClosedStatus.quoteDate)}）
              </p>
            )}
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
