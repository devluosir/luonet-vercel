'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { usePurchaseSupplierAccess } from '../hooks/usePurchaseSupplierAccess';
import { fetchPurchaseSuppliers, getPrimaryPurchaseSupplierContact } from '../services/purchaseSupplierService';
import type { PurchaseSupplier, PurchaseSupplierSelection } from '../types';

interface PurchaseSupplierPickerProps {
  selectedId?: string;
  value: string;
  onChange: (selection: PurchaseSupplierSelection) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function PurchaseSupplierPicker({
  selectedId,
  value,
  onChange,
  placeholder = '选择或输入采购供应商',
  className = '',
  disabled = false,
}: PurchaseSupplierPickerProps) {
  const { canRead, userId } = usePurchaseSupplierAccess();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<PurchaseSupplier[]>([]);
  const [query, setQuery] = useState(value);

  useEffect(() => setQuery(value), [value]);

  useEffect(() => {
    if (!open || !canRead || !userId) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLoading(true);
      fetchPurchaseSuppliers({ userId, canRead, search: query, limit: 30 })
        .then(({ items: next }) => {
          if (!cancelled) setItems(next);
        })
        .catch(() => {
          if (!cancelled) setItems([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [canRead, open, query, userId]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const sortedItems = useMemo(() => {
    if (!selectedId) return items;
    return [...items].sort((a, b) => Number(b.id === selectedId) - Number(a.id === selectedId));
  }, [items, selectedId]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          value={query}
          disabled={disabled}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            const name = event.target.value;
            setQuery(name);
            setOpen(true);
            onChange({ name });
          }}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 pr-9 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-blue-900/30"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((current) => !current)}
          className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-gray-400"
          aria-label="展开采购供应商列表"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {open && canRead && (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-xl dark:border-gray-700 dark:bg-gray-800">
          {sortedItems.length === 0 && !loading ? (
            <div className="px-3 py-2 text-xs text-gray-500">没有匹配资料，可保留自由输入</div>
          ) : sortedItems.map((supplier) => {
            const contact = getPrimaryPurchaseSupplierContact(supplier);
            return (
              <button
                key={supplier.id}
                type="button"
                onClick={() => {
                  const name = supplier.shortName || supplier.name;
                  setQuery(name);
                  setOpen(false);
                  onChange({ id: supplier.id, name, supplier });
                }}
                className={`block w-full px-3 py-2 text-left hover:bg-blue-50 dark:hover:bg-gray-700 ${supplier.id === selectedId ? 'bg-blue-50 dark:bg-gray-700' : ''}`}
              >
                <span className="block truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                  {supplier.shortName || supplier.name}
                  {supplier.code ? <span className="ml-2 text-xs font-normal text-gray-400">{supplier.code}</span> : null}
                </span>
                <span className="block truncate text-xs text-gray-500">
                  {supplier.name}{contact ? ` · ${contact.name}${contact.phone ? ` ${contact.phone}` : ''}` : ''}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
