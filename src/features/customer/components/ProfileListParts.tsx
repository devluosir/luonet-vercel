'use client';

import { useState } from 'react';
import { Edit, MoreHorizontal, Trash2 } from 'lucide-react';
import type { Consignee, Customer, Supplier } from '../types';
import { getPrimaryContact } from '../services/customerService';

export type ProfileListItem = Customer | Supplier | Consignee;

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

interface RowActionMenuProps {
  item: ProfileListItem;
  onEdit: (item: ProfileListItem) => void;
  onDelete: (item: ProfileListItem) => void;
}

export function RowActionMenu({ item, onEdit, onDelete }: RowActionMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex w-10 shrink-0 justify-end" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((next) => !next)}
        title="更多操作"
        className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-50 min-w-[7rem] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-[#2C2C2E]">
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
        </>
      )}
    </div>
  );
}
