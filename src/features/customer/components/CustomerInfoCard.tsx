'use client';

import Link from 'next/link';
import { Check, Edit, Mail, MapPin, Phone, UserRound, X } from 'lucide-react';
import { useState } from 'react';
import type { Customer } from '../types';
import type { CustomerStats } from '../services/customerService';
import { CategoryBadge } from './ProfileListParts';

interface ContactHrefInput {
  contactId: string;
  name: string;
  shortName?: string | null;
}

interface CustomerInfoCardProps {
  customer: Customer;
  onSaveField?: (field: 'name' | 'address', value: string) => Promise<boolean>;
  hideContacts?: boolean;
  isCustomerDetail?: boolean;
  stats?: CustomerStats | null;
  isLoadingStats?: boolean;
  buildInquiryHref?: () => string;
  buildOrderHref?: () => string;
  buildContactHref?: (contact: ContactHrefInput) => string;
}

type EditableField = 'name' | 'address';

function getDisplayName(customer: Customer) {
  return customer.name.split('\n')[0] || customer.name;
}

function getInitial(customer: Customer) {
  return getDisplayName(customer).charAt(0).toUpperCase() || '客';
}

function formatAddressForDisplay(address: string) {
  const trimmed = address.trim();
  if (!trimmed) return '未填写地址';
  if (trimmed.includes('\n')) return trimmed;

  return trimmed.replace(
    /(Phone|Tel|Telephone|Mobile|Mob|E-?mail|IEC|PAN\s*NO|GSTIN\s*No|GSTIN|GST|TIN)(\s*:)/gi,
    (match, label: string, colon: string, offset: number) => `${offset > 0 ? '\n' : ''}${label}${colon}`
  );
}

export function CustomerInfoCard({
  customer,
  onSaveField,
  hideContacts = false,
  isCustomerDetail = false,
  stats,
  isLoadingStats,
  buildInquiryHref,
  buildOrderHref,
  buildContactHref,
}: CustomerInfoCardProps) {
  const contacts = customer.contacts;
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [draftValue, setDraftValue] = useState('');
  const [inlineError, setInlineError] = useState('');
  const [savingField, setSavingField] = useState<EditableField | null>(null);
  const showEmptyStatsHint =
    isCustomerDetail && !isLoadingStats && Boolean(stats) && stats!.totals.inquiries === 0 && stats!.totals.orders === 0;

  const startEditing = (field: EditableField) => {
    setEditingField(field);
    setDraftValue(field === 'name' ? customer.name : customer.address);
    setInlineError('');
  };

  const cancelEditing = () => {
    setEditingField(null);
    setDraftValue('');
    setInlineError('');
  };

  const saveEditing = async () => {
    if (!editingField || !onSaveField) return;

    const nextValue = draftValue.trim();
    if (editingField === 'name' && !nextValue) {
      setInlineError('名称不能为空');
      return;
    }

    setSavingField(editingField);
    setInlineError('');
    const success = await onSaveField(editingField, editingField === 'name' ? nextValue : draftValue);
    setSavingField(null);
    if (success) {
      cancelEditing();
      return;
    }
    setInlineError('保存失败，请重试');
  };

  return (
    <div className="mb-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 flex-1 gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
            {getInitial(customer)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {editingField === 'name' ? (
                <div className="flex w-full max-w-3xl flex-col gap-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <input
                      value={draftValue}
                      onChange={(event) => setDraftValue(event.target.value)}
                      className="h-9 min-w-0 flex-1 rounded-md border border-blue-300 px-2.5 text-lg font-semibold text-gray-900 outline-none ring-2 ring-blue-100 focus:border-blue-500 dark:border-blue-700 dark:bg-gray-900 dark:text-white dark:ring-blue-950/50"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={saveEditing}
                      disabled={savingField === 'name'}
                      title="保存名称"
                      aria-label="保存名称"
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditing}
                      disabled={savingField === 'name'}
                      title="取消修改名称"
                      aria-label="取消修改名称"
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  {inlineError && <p className="text-xs text-red-500">{inlineError}</p>}
                </div>
              ) : (
                <>
                  <h1 className="whitespace-pre-wrap break-words text-lg font-semibold leading-snug text-gray-900 dark:text-white">
                    {customer.name}
                  </h1>
                  {onSaveField && (
                    <button
                      type="button"
                      onClick={() => startEditing('name')}
                      title="修改名称"
                      aria-label="修改名称"
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  )}
                </>
              )}
              <CategoryBadge category={customer.category} note={customer.categoryNote} />
            </div>
            {customer.shortName && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                简称：{customer.shortName}
              </p>
            )}
            {customer.categoryNote && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                分类备注：{customer.categoryNote}
              </p>
            )}
            <div className="mt-2 flex items-start gap-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
              {editingField === 'address' ? (
                <div className="min-w-0 flex-1">
                  <div className="max-w-5xl">
                    <textarea
                      value={draftValue}
                      onChange={(event) => setDraftValue(event.target.value)}
                      rows={5}
                      className="h-36 w-full resize-none rounded-md border border-blue-300 px-3 py-2 text-sm leading-relaxed text-gray-900 outline-none ring-2 ring-blue-100 focus:border-blue-500 dark:border-blue-700 dark:bg-gray-900 dark:text-white dark:ring-blue-950/50"
                      autoFocus
                    />
                    <div className="mt-2 flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={saveEditing}
                        disabled={savingField === 'address'}
                        title="保存地址"
                        aria-label="保存地址"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditing}
                        disabled={savingField === 'address'}
                        title="取消修改地址"
                        aria-label="取消修改地址"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {inlineError && <p className="mt-1 text-xs text-red-500">{inlineError}</p>}
                </div>
              ) : (
                <>
                  <span className="min-w-0 flex-1 whitespace-pre-wrap break-words">
                    {formatAddressForDisplay(customer.address)}
                  </span>
                  {onSaveField && (
                    <button
                      type="button"
                      onClick={() => startEditing('address')}
                      title="修改地址"
                      aria-label="修改地址"
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {isCustomerDetail && (
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={buildInquiryHref ? buildInquiryHref() : '#'}
              className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-600 transition hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:bg-blue-950/50"
            >
              询价 <span className="font-semibold">{isLoadingStats ? '…' : (stats?.totals.inquiries ?? 0)}</span>
            </Link>
            <Link
              href={buildOrderHref ? buildOrderHref() : '#'}
              className="rounded-lg bg-green-50 px-2.5 py-1.5 text-xs font-medium text-green-700 transition hover:bg-green-100 dark:bg-green-950/30 dark:text-green-300 dark:hover:bg-green-950/50"
            >
              订单 <span className="font-semibold">{isLoadingStats ? '…' : (stats?.totals.orders ?? 0)}</span>
            </Link>
          </div>
        )}
      </div>

      {showEmptyStatsHint && (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          暂无关联的询价/订单记录，可能是历史数据尚未关联客户，可到
          <Link href="/inquiry" className="mx-1 text-blue-600 hover:underline dark:text-blue-400">
            询报价登记表
          </Link>
          使用「待关联客户」筛选手动补充
        </p>
      )}

      {!hideContacts && (
        <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-700">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
            <UserRound className="h-4 w-4 shrink-0 text-gray-400" />
            联络人
          </div>
          {contacts.length > 0 ? (
            <div className="grid gap-2 md:grid-cols-2">
              {contacts.map((contact) => {
                const contactStat = stats?.contacts.find((stat) => stat.contactId === contact.id);
                return (
                  <div
                    key={contact.id}
                    className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-1.5 dark:border-gray-700 dark:bg-gray-900/50"
                  >
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-sm font-medium text-gray-900 dark:text-white">{contact.name}</span>
                        {contact.shortName && (
                          <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">({contact.shortName})</span>
                        )}
                        {contact.isPrimary && (
                          <span className="shrink-0 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                            主
                          </span>
                        )}
                      </div>
                      {isCustomerDetail && buildContactHref && (
                        <Link
                          href={buildContactHref({ contactId: contact.id, name: contact.name, shortName: contact.shortName })}
                          className="shrink-0 whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium text-gray-500 transition hover:bg-blue-100 hover:text-blue-700 dark:text-gray-400 dark:hover:bg-blue-950/40 dark:hover:text-blue-300"
                        >
                          询{contactStat?.inquiries ?? 0}·单{contactStat?.orders ?? 0}
                        </Link>
                      )}
                    </div>
                    {(contact.phone || contact.email) && (
                      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                        {contact.phone && (
                          <a
                            href={`tel:${contact.phone}`}
                            className="inline-flex min-w-0 items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400"
                          >
                            <Phone className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{contact.phone}</span>
                          </a>
                        )}
                        {contact.email && (
                          <a
                            href={`mailto:${contact.email}`}
                            className="inline-flex min-w-0 items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400"
                          >
                            <Mail className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{contact.email}</span>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <span className="text-sm text-gray-400">未填写联系人</span>
          )}
        </div>
      )}
    </div>
  );
}
