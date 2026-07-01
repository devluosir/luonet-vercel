'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import type { Contact, Customer } from '../types';

export interface CustomerContactOption {
  customerId: string;
  contactId: string;
  customer: Customer;
  contact: Contact;
  label: string;
}

interface CustomerContactPickerProps {
  customers: Customer[];
  value: { customerId: string; contactId: string } | null;
  onSelect: (option: CustomerContactOption) => void;
  onCreateNew?: (query: string) => void;
  onClear?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

function normalizeText(value: string | undefined) {
  return (value ?? '').trim().toLowerCase();
}

export function buildCustomerContactLabel(customer: Customer, contact: Contact) {
  const customerPart = customer.shortName || customer.code || customer.name;
  if (customer.shortName && !contact.shortName) return customer.shortName;
  const contactPart = contact.shortName || contact.name;
  return `${customerPart}-${contactPart}`;
}

function buildOptions(customers: Customer[]): CustomerContactOption[] {
  return customers.flatMap((customer) =>
    customer.contacts
      .filter((contact) => contact.id && contact.name.trim())
      .map((contact) => ({
        customerId: customer.id,
        contactId: contact.id,
        customer,
        contact,
        label: buildCustomerContactLabel(customer, contact),
      }))
  );
}

function optionMatches(option: CustomerContactOption, query: string) {
  const q = normalizeText(query);
  if (!q) return true;
  return [
    option.label,
    option.customer.name,
    option.customer.shortName,
    option.customer.code,
    option.contact.name,
    option.contact.shortName,
  ].some((value) => normalizeText(value).includes(q));
}

export function CustomerContactPicker({
  customers,
  value,
  onSelect,
  onCreateNew,
  onClear,
  placeholder = '搜索客户简称/联络人简称',
  autoFocus = false,
}: CustomerContactPickerProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const committedLabelRef = useRef('');

  const options = useMemo(() => buildOptions(customers), [customers]);
  const selectedOption = useMemo(() => {
    if (!value) return null;
    return options.find(
      (option) => option.customerId === value.customerId && option.contactId === value.contactId
    ) ?? null;
  }, [options, value]);

  useEffect(() => {
    if (!selectedOption) {
      if (!value && committedLabelRef.current) {
        const previousLabel = committedLabelRef.current;
        committedLabelRef.current = '';
        setQuery((current) => (current === previousLabel ? '' : current));
      }
      return;
    }
    committedLabelRef.current = selectedOption.label;
    setQuery(selectedOption.label);
  }, [selectedOption, value]);

  const effectiveQuery = isFocused && query === committedLabelRef.current ? '' : query;
  const filteredOptions = useMemo(
    () => options.filter((option) => optionMatches(option, effectiveQuery)).slice(0, 20),
    [effectiveQuery, options]
  );
  const canCreate = Boolean(onCreateNew && query.trim() && filteredOptions.length === 0);

  const handleSelect = (option: CustomerContactOption) => {
    committedLabelRef.current = option.label;
    setQuery(option.label);
    setOpen(false);
    onSelect(option);
  };

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
      <input
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          committedLabelRef.current = '';
          onClear?.();
          setOpen(true);
        }}
        onFocus={() => {
          setIsFocused(true);
          setOpen(true);
        }}
        onBlur={() => {
          setIsFocused(false);
          setOpen(false);
        }}
        className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-8 pr-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        placeholder={placeholder}
        autoComplete="off"
        autoFocus={autoFocus}
      />

      {open && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
          {filteredOptions.map((option) => (
            <button
              key={`${option.customerId}:${option.contactId}`}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => handleSelect(option)}
              className={`block w-full border-b border-gray-100 px-3 py-2 text-left last:border-b-0 hover:bg-blue-50 dark:border-gray-800 dark:hover:bg-blue-950/30 ${
                value?.customerId === option.customerId && value?.contactId === option.contactId
                  ? 'bg-blue-50 dark:bg-blue-950/30'
                  : ''
              }`}
            >
              <div className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                {option.label}
              </div>
              <div className="truncate text-xs text-gray-500 dark:text-gray-400">
                {option.customer.name}
              </div>
            </button>
          ))}

          {filteredOptions.length === 0 && !canCreate && (
            <div className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500">
              没有匹配的客户联络人
            </div>
          )}

          {canCreate && (
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setOpen(false);
                onCreateNew?.(query.trim());
              }}
              className="flex w-full items-center gap-2 border-t border-gray-100 px-3 py-2 text-left text-xs text-gray-500 hover:bg-gray-50 hover:text-blue-600 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-blue-300"
            >
              <Plus className="h-3.5 w-3.5" />
              新建客户：{query.trim()}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
