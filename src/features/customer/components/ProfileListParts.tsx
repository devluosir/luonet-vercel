'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Edit, MoreHorizontal, Trash2 } from 'lucide-react';
import type { Consignee, Customer, Supplier } from '../types';
import { getPrimaryContact } from '../services/customerService';

export type ProfileListItem = Customer | Supplier | Consignee;
const MENU_WIDTH = 112;
const MENU_OFFSET = 4;

export function getProfileTitle(item: ProfileListItem) {
  return item.name.split('\n')[0] || item.name;
}

export function PrimaryContactSummary({ item }: { item: ProfileListItem }) {
  const primaryContact = getPrimaryContact(item);
  const extraCount = Math.max(item.contacts.length - 1, 0);

  if (!primaryContact?.name) {
    return <span className="text-gray-400 dark:text-gray-500">—</span>;
  }

  return (
    <span className="inline-flex max-w-full items-center gap-1.5">
      <span className="truncate">
        {primaryContact.name}
        {primaryContact.shortName ? (
          <span className="ml-1 text-gray-400 dark:text-gray-500">({primaryContact.shortName})</span>
        ) : null}
      </span>
      {extraCount > 0 && (
        <span className="shrink-0 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500 dark:bg-gray-700 dark:text-gray-300">
          +{extraCount}
        </span>
      )}
    </span>
  );
}

export function ProfileShortName({ value }: { value?: string }) {
  if (!value) return null;

  return (
    <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] font-medium text-gray-500 dark:text-gray-400">
      <span className="h-1 w-1 shrink-0 rounded-full bg-gray-300 dark:bg-gray-600" />
      <span className="truncate">{value}</span>
    </p>
  );
}

interface RowActionMenuProps {
  item: ProfileListItem;
  onEdit: (item: ProfileListItem) => void;
  onDelete: (item: ProfileListItem) => void;
}

export function RowActionMenu({ item, onEdit, onDelete }: RowActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const close = () => setOpen(false);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);

    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  const toggleOpen = () => {
    if (open) {
      setOpen(false);
      return;
    }

    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      setPosition({
        top: rect.bottom + MENU_OFFSET,
        left: Math.max(MENU_OFFSET, rect.right - MENU_WIDTH),
      });
    }
    setOpen(true);
  };

  const menu = open && typeof document !== 'undefined'
    ? createPortal(
      <>
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
        <div
          className="fixed z-50 min-w-[7rem] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-[#2C2C2E]"
          style={{ top: position.top, left: position.left }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onEdit(item);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700/50"
          >
            <Edit className="h-4 w-4 text-gray-400" />
            编辑
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onDelete(item);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            <Trash2 className="h-4 w-4" />
            删除
          </button>
        </div>
      </>,
      document.body
    )
    : null;

  return (
    <div className="relative flex w-12 shrink-0 justify-end pl-2" onClick={(event) => event.stopPropagation()}>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleOpen}
        title="更多操作"
        className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {menu}
    </div>
  );
}
