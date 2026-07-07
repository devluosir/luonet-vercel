'use client';

import { type FormEvent, useEffect, useState } from 'react';
import type { PurchaseOrderCurrency, PurchaseOrderDraft, PurchaseOrderRecord } from '../types';

interface PurchaseOrderFormModalProps {
  open: boolean;
  record?: PurchaseOrderRecord | null;
  onClose: () => void;
  onSubmit: (draft: PurchaseOrderDraft) => Promise<void>;
}

const CURRENCIES: PurchaseOrderCurrency[] = ['CNY', 'USD', 'EUR'];

export function PurchaseOrderFormModal({ open, record, onClose, onSubmit }: PurchaseOrderFormModalProps) {
  const [purchaseNo, setPurchaseNo] = useState('');
  const [supplier, setSupplier] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<PurchaseOrderCurrency>('CNY');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPurchaseNo(record?.purchaseNo ?? '');
    setSupplier(record?.supplier ?? '');
    setAmount(record?.amount ?? '');
    setCurrency(record?.currency ?? 'CNY');
  }, [open, record]);

  if (!open) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      await onSubmit({
        purchaseNo: purchaseNo.trim(),
        supplier: supplier.trim(),
        amount: amount.trim(),
        currency,
        orderDeliveryStatus: record?.orderDeliveryStatus,
        orderDeliveryConsignee: record?.orderDeliveryConsignee,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-[#2C2C2E]"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {record ? '编辑采购订单' : '新增采购订单'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            关闭
          </button>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">采购单号</span>
            <input
              required
              value={purchaseNo}
              onChange={(e) => setPurchaseNo(e.target.value)}
              className="h-9 w-full rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">供应商</span>
            <input
              required
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              className="h-9 w-full rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
          </label>
          <div className="grid grid-cols-[1fr_96px] gap-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">金额</span>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                className="h-9 w-full rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">币种</span>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as PurchaseOrderCurrency)}
                className="h-9 w-full rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              >
                {CURRENCIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-8 rounded-lg border border-gray-200 px-3 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="h-8 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {isSaving ? '保存中...' : '保存'}
          </button>
        </div>
      </form>
    </div>
  );
}
