'use client';

import { Edit, Mail, MapPin, Phone, UserRound } from 'lucide-react';
import type { Contact, Customer } from '../types';
import { getPrimaryContact } from '../services/customerService';

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

function formatContact(contact: Contact) {
  const shortName = contact.shortName ? `(${contact.shortName})` : '';
  return `${contact.name}${shortName}${contact.isPrimary ? ' 主' : ''}`;
}

export function CustomerInfoCard({ customer, onEdit }: CustomerInfoCardProps) {
  const displayName = getDisplayName(customer);
  const contacts = customer.contacts;
  const primaryContact = getPrimaryContact(customer);

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white">
            {getInitial(customer)}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold text-gray-900 dark:text-white">
              {displayName}
            </h1>
            {customer.shortName && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                简称：{customer.shortName}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onEdit}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          <Edit className="h-4 w-4" />
          编辑
        </button>
      </div>

      <div className="mt-5 grid gap-3 text-sm text-gray-600 dark:text-gray-300 md:grid-cols-3">
        <div className="flex min-w-0 items-center gap-2">
          <Mail className="h-4 w-4 shrink-0 text-gray-400" />
          <span className="truncate">{primaryContact?.email || '未填写邮箱'}</span>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <Phone className="h-4 w-4 shrink-0 text-gray-400" />
          <span className="truncate">{primaryContact?.phone || '未填写电话'}</span>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0 text-gray-400" />
          <span className="truncate">{customer.address || '未填写地址'}</span>
        </div>
      </div>

      <div className="mt-5 border-t border-gray-100 pt-4 dark:border-gray-700">
        <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
          <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
          <div className="min-w-0">
            <span className="font-medium text-gray-700 dark:text-gray-200">联系人：</span>
            {contacts.length > 0 ? (
              <span>{contacts.map(formatContact).join(' · ')}</span>
            ) : (
              <span className="text-gray-400">未填写联系人</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
