'use client';

import { Edit, Mail, MapPin, Phone, UserRound } from 'lucide-react';
import type { Customer } from '../types';

interface CustomerInfoCardProps {
  customer: Customer;
  onEdit: () => void;
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

export function CustomerInfoCard({ customer, onEdit }: CustomerInfoCardProps) {
  const contacts = customer.contacts;

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

      <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-700">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
          <UserRound className="h-4 w-4 shrink-0 text-gray-400" />
          联络人
        </div>
        {contacts.length > 0 ? (
          <div className="grid gap-2 md:grid-cols-2">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-1.5 dark:border-gray-700 dark:bg-gray-900/50"
              >
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
            ))}
          </div>
        ) : (
          <span className="text-sm text-gray-400">未填写联系人</span>
        )}
      </div>
    </div>
  );
}
