'use client';

import Link from 'next/link';
import { Edit, Mail, MapPin, Phone, UserRound } from 'lucide-react';
import type { Customer } from '../types';
import type { CustomerStats } from '../services/customerService';

interface ContactHrefInput {
  contactId: string;
  name: string;
  shortName?: string | null;
}

interface CustomerInfoCardProps {
  customer: Customer;
  onEdit: () => void;
  isCustomerDetail?: boolean;
  stats?: CustomerStats | null;
  isLoadingStats?: boolean;
  buildInquiryHref?: () => string;
  buildOrderHref?: () => string;
  buildContactHref?: (contact: ContactHrefInput) => string;
}

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
  onEdit,
  isCustomerDetail = false,
  stats,
  isLoadingStats,
  buildInquiryHref,
  buildOrderHref,
  buildContactHref,
}: CustomerInfoCardProps) {
  const contacts = customer.contacts;
  const showEmptyStatsHint =
    isCustomerDetail && !isLoadingStats && Boolean(stats) && stats!.totals.inquiries === 0 && stats!.totals.orders === 0;

  return (
    <div className="mb-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
            {getInitial(customer)}
          </div>
          <div className="min-w-0">
            <h1 className="whitespace-pre-wrap break-words text-lg font-semibold leading-snug text-gray-900 dark:text-white">
              {customer.name}
            </h1>
            {customer.shortName && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                简称：{customer.shortName}
              </p>
            )}
            <div className="mt-2 flex items-start gap-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
              <span className="whitespace-pre-wrap break-words">
                {formatAddressForDisplay(customer.address)}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onEdit}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          <Edit className="h-4 w-4" />
          编辑
        </button>
      </div>

      {isCustomerDetail && (
        <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-700">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">业务统计</h2>
            {isLoadingStats && <span className="text-xs text-gray-400 dark:text-gray-500">加载中...</span>}
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            <Link
              href={buildInquiryHref ? buildInquiryHref() : '#'}
              className="rounded-lg bg-blue-50 p-2.5 transition hover:ring-2 hover:ring-blue-200 dark:bg-blue-950/30 dark:hover:ring-blue-800"
            >
              <p className="text-xs text-blue-500 dark:text-blue-300">公司询价</p>
              <p className="mt-0.5 text-xl font-semibold text-blue-700 dark:text-blue-200">
                {stats?.totals.inquiries ?? 0}
              </p>
            </Link>
            <Link
              href={buildOrderHref ? buildOrderHref() : '#'}
              className="rounded-lg bg-green-50 p-2.5 transition hover:ring-2 hover:ring-green-200 dark:bg-green-950/30 dark:hover:ring-green-800"
            >
              <p className="text-xs text-green-500 dark:text-green-300">公司订单</p>
              <p className="mt-0.5 text-xl font-semibold text-green-700 dark:text-green-200">
                {stats?.totals.orders ?? 0}
              </p>
            </Link>
            <div className="rounded-lg bg-gray-50 p-2.5 dark:bg-gray-900/60">
              <p className="text-xs text-gray-500 dark:text-gray-400">未分配联络人</p>
              <p className="mt-0.5 text-xl font-semibold text-gray-800 dark:text-gray-100">
                {stats?.unassigned.inquiries ?? 0}
              </p>
            </div>
          </div>
          {showEmptyStatsHint && (
            <p className="mt-2.5 text-xs text-gray-500 dark:text-gray-400">
              暂无关联的询价/订单记录，可能是历史数据尚未关联客户，可到
              <Link href="/inquiry" className="mx-1 text-blue-600 hover:underline dark:text-blue-400">
                询报价登记表
              </Link>
              使用「待关联客户」筛选手动补充
            </p>
          )}
        </div>
      )}

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
    </div>
  );
}
