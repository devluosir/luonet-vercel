'use client';

import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface MobileSheetModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** 移动端底部弹出的通用小面板（关于 / 个人信息等） */
export function MobileSheetModal({ open, title, onClose, children }: MobileSheetModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-sm overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl dark:bg-app-dark-surface dark:ring-1 dark:ring-white/10 sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800/50 dark:hover:text-gray-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
