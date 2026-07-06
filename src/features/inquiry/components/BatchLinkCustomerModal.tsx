'use client';

import { useEffect, useState } from 'react';
import { Link2, X } from 'lucide-react';
import {
  CustomerContactPicker,
  type CustomerContactOption,
} from '@/features/customer/components/CustomerContactPicker';
import { Button } from '@/components/ui/Button';
import type { Customer } from '@/features/customer/types';
import { customerService } from '@/features/customer/services/customerService';

interface BatchLinkCustomerModalProps {
  isOpen: boolean;
  count: number;
  onClose: () => void;
  onConfirm: (customerId: string, contactId: string, inquirer: string) => void;
}

export function BatchLinkCustomerModal({
  isOpen,
  count,
  onClose,
  onConfirm,
}: BatchLinkCustomerModalProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selected, setSelected] = useState<CustomerContactOption | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setSelected(null);
    setIsLoading(true);
    void customerService.fetchAllCustomers('customer')
      .then(({ items }) => {
        if (!cancelled) setCustomers(items);
      })
      .catch((error) => {
        console.warn('加载客户库失败:', error);
        if (!cancelled) setCustomers([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-[#2C2C2E]">
        <div className="flex items-center justify-between px-5 pb-4 pt-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">批量关联客户</h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              将把选中的 {count} 条询价记录关联到下方选择的客户
            </p>
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

        <div className="space-y-3 px-5 py-4">
          {isLoading ? (
            <div className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-400 dark:border-gray-700">
              加载客户库...
            </div>
          ) : (
            <CustomerContactPicker
              customers={customers}
              value={selected ? { customerId: selected.customerId, contactId: selected.contactId } : null}
              onSelect={setSelected}
              placeholder="搜索客户简称/联络人简称"
              autoFocus
            />
          )}

          {selected && (
            <div className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
              已选择：{selected.label}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-4 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            取消
          </button>
          <Button
            type="button"
            disabled={!selected || count === 0}
            onClick={() => {
              if (!selected) return;
              onConfirm(selected.customerId, selected.contactId, selected.label);
            }}
            className="gap-1.5 disabled:bg-gray-300 dark:disabled:bg-gray-700"
          >
            <Link2 className="h-4 w-4" />
            确认关联
          </Button>
        </div>
      </div>
    </div>
  );
}
