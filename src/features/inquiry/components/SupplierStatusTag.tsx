'use client';

import { X } from 'lucide-react';
import type { SupplierQuoteStatus } from '../types';
import { getSupplierStatusClass, roundDateBrackets } from '../utils/inquiryUtils';

interface Props {
  supplier: SupplierQuoteStatus;
  onEdit: (supplierId: string) => void;
  onDelete: (supplierId: string) => void;
}

export function SupplierStatusTag({ supplier, onEdit, onDelete }: Props) {
  const colorClass = getSupplierStatusClass(supplier);
  const label = supplier.quoteDate
    ? `${supplier.supplierShortName}${roundDateBrackets(supplier.quoteDate)}`
    : supplier.supplierShortName;

  return (
    <span className="inline-flex items-center rounded-full bg-gray-50 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
      <button
        type="button"
        onClick={() => onEdit(supplier.id)}
        className={`max-w-[180px] truncate rounded-l-full px-2.5 py-1 text-xs font-medium hover:opacity-70 ${colorClass}`}
        title="编辑供应商状态"
      >
        {label}
      </button>
      <button
        type="button"
        onClick={() => onDelete(supplier.id)}
        className="rounded-r-full border-l border-gray-200 px-1.5 py-1 text-gray-400 hover:text-red-500 dark:border-gray-700"
        aria-label={`删除供应商 ${supplier.supplierShortName}`}
        title="删除"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
