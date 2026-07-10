'use client';

import { useEffect, useRef, useState } from 'react';

export const STATUS_PRESETS = [
  { label: '备货', value: '备货', immediate: true },
  { label: '交货', value: '交货', immediate: false },
  { label: '发票', value: '发票', immediate: false },
] as const;

interface DeliveryStatusCellProps {
  editing: boolean;
  value: string | undefined;
  consigneeValue?: string | undefined;
  consigneeOptions?: string[];
  textClassName?: string;
  onActivate: () => void;
  onSave: (status: string | undefined, consignee: string | undefined) => void;
  onCancel: () => void;
}

export function DeliveryStatusCell({
  editing,
  value,
  consigneeValue,
  consigneeOptions = [],
  textClassName,
  onActivate,
  onSave,
  onCancel,
}: DeliveryStatusCellProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const editContainerRef = useRef<HTMLDivElement>(null);
  const pointerDownInsideRef = useRef(false);
  const displayStr = value != null ? String(value).trim() || null : null;
  const displayConsignee = consigneeValue?.trim() || null;
  const shouldShowConsignee = Boolean(displayConsignee);
  const [editStatus, setEditStatus] = useState('');
  const [editConsignee, setEditConsignee] = useState('');

  useEffect(() => {
    if (!editing) return;
    setEditStatus(displayStr ?? '');
    setEditConsignee(displayConsignee ?? '');
  }, [displayConsignee, displayStr, editing]);

  const isDeliveryStatus = editStatus.trim().startsWith('交货');

  const saveCurrent = (status: string, consignee: string) => {
    const nextStatus = status.trim() || undefined;
    const nextConsignee = consignee.trim() || undefined;
    onSave(nextStatus, nextConsignee);
  };

  const updateEditStatus = (status: string) => {
    setEditStatus(status);
  };

  if (editing) {
    return (
      <div
        ref={editContainerRef}
        className="flex flex-col gap-1"
        onMouseDownCapture={() => {
          pointerDownInsideRef.current = true;
          window.setTimeout(() => {
            pointerDownInsideRef.current = false;
          }, 0);
        }}
        onBlur={(e) => {
          if (pointerDownInsideRef.current) return;
          const nextTarget = e.relatedTarget;
          if (nextTarget instanceof Node && editContainerRef.current?.contains(nextTarget)) return;
          saveCurrent(editStatus, editConsignee);
        }}
      >
        <input
          ref={inputRef}
          autoFocus
          type="text"
          value={editStatus}
          onChange={(e) => updateEditStatus(e.target.value)}
          placeholder="自由输入或选预设"
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveCurrent(editStatus, editConsignee);
            if (e.key === 'Escape') {
              e.preventDefault();
              onCancel();
            }
          }}
          className="w-full rounded border border-blue-300 bg-white px-1.5 py-0.5 text-xs outline-none
            focus:ring-1 focus:ring-blue-200 dark:border-blue-600 dark:bg-gray-900 dark:text-gray-100"
        />
        <div className="flex gap-1">
          {STATUS_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                if (p.immediate) {
                  onSave(p.value, editConsignee.trim() || undefined);
                } else {
                  updateEditStatus(p.value);
                  if (inputRef.current) {
                    inputRef.current.focus();
                    const len = p.value.length;
                    inputRef.current.setSelectionRange(len, len);
                  }
                }
              }}
              className="rounded-full border border-gray-200 px-2 py-0.5 text-[10px] font-semibold
                text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-700
                dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:text-gray-200"
            >
              {p.label}
            </button>
          ))}
          {displayStr && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onSave(undefined, undefined);
              }}
              className="ml-auto rounded-full border border-red-200 px-2 py-0.5 text-[10px] font-semibold
                text-red-400 hover:border-red-400 hover:text-red-600
                dark:border-red-800 dark:text-red-500 dark:hover:border-red-600"
            >
              清除
            </button>
          )}
        </div>
        {isDeliveryStatus && consigneeOptions.length > 0 && (
          <select
            value={editConsignee}
            onChange={(e) => {
              const nextConsignee = e.target.value;
              setEditConsignee(nextConsignee);
              saveCurrent(editStatus, nextConsignee);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                onCancel();
              }
            }}
            className="w-full rounded border border-blue-200 bg-white px-1.5 py-0.5 text-xs text-gray-700 outline-none
              focus:ring-1 focus:ring-blue-200 dark:border-blue-700 dark:bg-gray-900 dark:text-gray-100"
          >
            <option value="">选择收货人</option>
            {consigneeOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        )}
      </div>
    );
  }

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={onActivate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onActivate();
      }}
      title={[displayStr, shouldShowConsignee ? displayConsignee : null].filter(Boolean).join('\n') || undefined}
      className={`block min-h-[1.25rem] min-w-0 truncate cursor-text rounded px-0.5 text-[13px]
        hover:bg-black/5 dark:hover:bg-white/5
        ${displayStr ? textClassName ?? 'text-gray-800 dark:text-gray-100' : 'text-gray-200 dark:text-gray-700'}`}
    >
      <span className="block truncate">{displayStr ?? '执行情况'}</span>
      {shouldShowConsignee && (
        <span className="block truncate text-blue-600 dark:text-blue-400">
          {displayConsignee}
        </span>
      )}
    </span>
  );
}
