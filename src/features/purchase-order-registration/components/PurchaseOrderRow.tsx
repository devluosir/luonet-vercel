'use client';

import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { DeliveryStatusCell } from '@/features/order/components/DeliveryStatusCell';
import type { PurchaseOrderRecord } from '../types';

interface PurchaseOrderRowProps {
  record: PurchaseOrderRecord;
  onEdit: () => void;
  onDelete: () => void;
  onUpdate: (patch: Partial<PurchaseOrderRecord>) => void;
}

function formatAmount(record: PurchaseOrderRecord): string {
  const amount = record.amount?.trim();
  if (!amount) return '—';
  return `${record.currency} ${amount}`;
}

export function PurchaseOrderRow({ record, onEdit, onDelete, onUpdate }: PurchaseOrderRowProps) {
  const [editingStatus, setEditingStatus] = useState(false);
  const rowTextClass = record.orderDeliveryStatus?.trim().startsWith('发票')
    ? 'text-gray-900 dark:text-gray-100'
    : record.orderDeliveryStatus?.trim().startsWith('交货')
      ? 'text-blue-600 dark:text-blue-400'
      : 'text-pink-500 dark:text-pink-400';

  return (
    <tr className="border-b border-gray-100 align-middle last:border-b-0 hover:bg-gray-50/70 dark:border-gray-800 dark:hover:bg-gray-800/30">
      <td className="max-w-0 overflow-hidden px-3 py-2">
        <span className="block truncate font-mono text-[11px] font-bold text-gray-800 dark:text-gray-100">
          {record.purchaseNo}
        </span>
      </td>
      <td className="max-w-0 overflow-hidden px-2 py-2">
        <span className="block truncate text-xs text-gray-800 dark:text-gray-100" title={record.supplier}>
          {record.supplier}
        </span>
      </td>
      <td className="max-w-0 overflow-hidden px-2 py-2 text-right text-xs font-medium text-gray-800 dark:text-gray-100">
        {formatAmount(record)}
      </td>
      <td className="max-w-0 overflow-hidden px-2 py-2 text-xs text-gray-500 dark:text-gray-400">
        {new Date(record.createdAt).toLocaleDateString('zh-CN')}
      </td>
      <td className="max-w-0 overflow-hidden px-2 py-2">
        <DeliveryStatusCell
          editing={editingStatus}
          value={record.orderDeliveryStatus}
          consigneeValue={record.orderDeliveryConsignee}
          textClassName={rowTextClass}
          onActivate={() => setEditingStatus(true)}
          onSave={(status, consignee) => {
            setEditingStatus(false);
            onUpdate({
              orderDeliveryStatus: status ?? '',
              orderDeliveryConsignee: consignee ?? '',
            });
          }}
          onCancel={() => setEditingStatus(false)}
        />
      </td>
      <td className="px-2 py-2">
        <div className="flex justify-end gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            aria-label="编辑"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-300"
            aria-label="删除"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}
