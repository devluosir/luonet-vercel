'use client';

import { useEffect, useState } from 'react';
import { Archive, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type {
  PurchaseSupplier,
  PurchaseSupplierContact,
  PurchaseSupplierData,
} from '../types';

type SupplierFieldKey = 'name' | 'shortName' | 'code' | 'address';
type SupplierDataFieldKey = keyof PurchaseSupplierData;
type EditField = SupplierFieldKey | `data.${SupplierDataFieldKey}` | 'contacts';

export interface PurchaseSupplierFieldChanges {
  name?: string;
  shortName?: string;
  code?: string;
  address?: string;
  contacts?: PurchaseSupplierContact[];
  data?: Partial<PurchaseSupplierData>;
}

interface PurchaseSupplierInfoCardProps {
  supplier: PurchaseSupplier;
  canWrite: boolean;
  onSaveField: (changes: PurchaseSupplierFieldChanges) => Promise<boolean>;
}

interface FieldDefinition {
  key: EditField;
  label: string;
  multiline?: boolean;
}

const FIELD_GROUPS: Array<{ title: string; fields: FieldDefinition[] }> = [
  {
    title: '基本信息',
    fields: [
      { key: 'name', label: '供应商全称' },
      { key: 'shortName', label: '简称' },
      { key: 'code', label: '供应商编码' },
      { key: 'address', label: '地址', multiline: true },
    ],
  },
  {
    title: '采购设置',
    fields: [
      { key: 'data.supplyScope', label: '供应产品 / 业务范围', multiline: true },
      { key: 'data.supplierType', label: '供应商类型' },
      { key: 'data.paymentTerms', label: '默认付款条件' },
      { key: 'data.defaultCurrency', label: '默认币种' },
      { key: 'data.remark', label: '备注', multiline: true },
    ],
  },
];

const INPUT_CLASS = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100';

function createContact(primary = false): PurchaseSupplierContact {
  const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `contact-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return { id, name: '', isPrimary: primary };
}

function getFieldValue(supplier: PurchaseSupplier, key: EditField): string {
  if (key === 'contacts') return '';
  if (key.startsWith('data.')) {
    const dataKey = key.slice(5) as SupplierDataFieldKey;
    return supplier.data[dataKey] || '';
  }
  return supplier[key as SupplierFieldKey] || '';
}

function normalizeContacts(contacts: PurchaseSupplierContact[]): PurchaseSupplierContact[] {
  const trimmed = contacts
    .filter((contact) => contact.name.trim())
    .map((contact) => ({
      ...contact,
      name: contact.name.trim(),
      shortName: contact.shortName?.trim() || undefined,
      phone: contact.phone?.trim() || undefined,
      email: contact.email?.trim() || undefined,
    }));
  if (trimmed.length === 0) return [];
  const primaryIndex = trimmed.findIndex((contact) => contact.isPrimary);
  const resolvedPrimaryIndex = primaryIndex >= 0 ? primaryIndex : 0;
  return trimmed.map((contact, index) => ({
    ...contact,
    isPrimary: index === resolvedPrimaryIndex,
  }));
}

export function PurchaseSupplierInfoCard({
  supplier,
  canWrite,
  onSaveField,
}: PurchaseSupplierInfoCardProps) {
  const [editingField, setEditingField] = useState<EditField | null>(null);
  const [draftValue, setDraftValue] = useState('');
  const [contactDrafts, setContactDrafts] = useState<PurchaseSupplierContact[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setEditingField(null);
    setDraftValue('');
    setContactDrafts([]);
    setError('');
  }, [supplier.id]);

  const beginFieldEdit = (field: EditField) => {
    setEditingField(field);
    setDraftValue(getFieldValue(supplier, field));
    setError('');
  };

  const beginContactEdit = () => {
    setEditingField('contacts');
    setContactDrafts(
      supplier.contacts.length > 0
        ? supplier.contacts.map((contact) => ({ ...contact }))
        : [createContact(true)]
    );
    setError('');
  };

  const cancelEdit = () => {
    setEditingField(null);
    setDraftValue('');
    setContactDrafts([]);
    setError('');
  };

  const saveValueField = async (field: Exclude<EditField, 'contacts'>) => {
    const nextValue = draftValue.trim();
    if (field === 'name' && !nextValue) {
      setError('供应商全称不能为空');
      return;
    }

    const changes: PurchaseSupplierFieldChanges = field.startsWith('data.')
      ? { data: { [field.slice(5) as SupplierDataFieldKey]: nextValue } }
      : { [field]: nextValue };

    setSaving(true);
    setError('');
    try {
      const success = await onSaveField(changes);
      if (success) cancelEdit();
      else setError('此字段保存失败，原资料未改变，请重试');
    } catch {
      setError('此字段保存失败，原资料未改变，请重试');
    } finally {
      setSaving(false);
    }
  };

  const saveContacts = async () => {
    setSaving(true);
    setError('');
    try {
      const success = await onSaveField({ contacts: normalizeContacts(contactDrafts) });
      if (success) cancelEdit();
      else setError('联系人保存失败，原资料未改变，请重试');
    } catch {
      setError('联系人保存失败，原资料未改变，请重试');
    } finally {
      setSaving(false);
    }
  };

  const updateContact = (id: string, changes: Partial<PurchaseSupplierContact>) => {
    setContactDrafts((current) => current.map((contact) => (
      contact.id === id ? { ...contact, ...changes } : contact
    )));
  };

  return (
    <section className="mb-5 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              {supplier.shortName || supplier.name}
            </h1>
            {supplier.status === 'archived' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                <Archive className="h-3.5 w-3.5" />已归档
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500">采购侧独立供应商主数据</p>
        </div>
        {!canWrite && (
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
            只读
          </span>
        )}
      </div>

      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {FIELD_GROUPS.map((group) => (
          <div key={group.title} className="px-5 py-3">
            <h2 className="mb-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100">{group.title}</h2>
            <dl className="grid gap-x-8 md:grid-cols-2">
              {group.fields.map((field) => {
                const value = getFieldValue(supplier, field.key);
                const isEditing = editingField === field.key;
                return (
                  <div key={field.key} className={`group py-1.5 ${field.multiline ? 'md:col-span-2' : ''}`}>
                    <dt className="mb-0.5 text-xs font-medium text-gray-500">{field.label}</dt>
                    <dd>
                      {isEditing ? (
                        <div>
                          {field.multiline ? (
                            <textarea
                              aria-label={field.label}
                              value={draftValue}
                              onChange={(event) => setDraftValue(event.target.value)}
                              rows={3}
                              className={`${INPUT_CLASS} resize-y`}
                              autoFocus
                            />
                          ) : (
                            <input
                              aria-label={field.label}
                              value={draftValue}
                              onChange={(event) => setDraftValue(event.target.value)}
                              className={INPUT_CLASS}
                              autoFocus
                            />
                          )}
                          {error && <p role="alert" className="mt-1.5 text-xs text-red-600">{error}</p>}
                          <div className="mt-2 flex gap-2">
                            <Button
                              type="button"
                              size="xs"
                              disabled={saving}
                              onClick={() => void saveValueField(field.key as Exclude<EditField, 'contacts'>)}
                              aria-label={`保存${field.label}`}
                            >
                              <Save className="h-3.5 w-3.5" />{saving ? '保存中…' : '保存'}
                            </Button>
                            <Button type="button" size="xs" variant="secondary" disabled={saving} onClick={cancelEdit}>
                              <X className="h-3.5 w-3.5" />取消
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex min-h-6 items-start justify-between gap-3">
                          <span className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200">{value || '—'}</span>
                          {canWrite && (
                            <button
                              type="button"
                              onClick={() => beginFieldEdit(field.key)}
                              className="rounded p-1 text-gray-400 opacity-70 hover:bg-gray-100 hover:text-blue-600 group-hover:opacity-100 dark:hover:bg-gray-800"
                              aria-label={`编辑${field.label}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
        ))}

        <div className="px-5 py-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">联系人</h2>
            {canWrite && editingField !== 'contacts' && (
              <Button type="button" variant="secondary" size="xs" onClick={beginContactEdit} aria-label="编辑联系人">
                <Pencil className="h-3.5 w-3.5" />编辑联系人
              </Button>
            )}
          </div>

          {editingField === 'contacts' ? (
            <div>
              <div className="space-y-3">
                {contactDrafts.map((contact) => (
                  <div key={contact.id} className="grid gap-2 rounded-lg bg-gray-50 p-3 lg:grid-cols-[1fr_1fr_1fr_1fr_auto_auto] lg:items-center dark:bg-gray-950/60">
                    <input aria-label="联系人姓名" value={contact.name} onChange={(event) => updateContact(contact.id, { name: event.target.value })} className={INPUT_CLASS} placeholder="姓名" />
                    <input aria-label="联系人简称" value={contact.shortName || ''} onChange={(event) => updateContact(contact.id, { shortName: event.target.value })} className={INPUT_CLASS} placeholder="简称" />
                    <input aria-label="联系人电话" value={contact.phone || ''} onChange={(event) => updateContact(contact.id, { phone: event.target.value })} className={INPUT_CLASS} placeholder="电话" />
                    <input aria-label="联系人邮箱" value={contact.email || ''} onChange={(event) => updateContact(contact.id, { email: event.target.value })} className={INPUT_CLASS} placeholder="邮箱" />
                    <label className="flex items-center gap-1.5 whitespace-nowrap text-xs text-gray-600 dark:text-gray-300">
                      <input
                        type="radio"
                        name="primary-purchase-supplier-contact"
                        checked={Boolean(contact.isPrimary)}
                        onChange={() => setContactDrafts((current) => current.map((item) => ({
                          ...item,
                          isPrimary: item.id === contact.id,
                        })))}
                      />
                      主联系人
                    </label>
                    <button
                      type="button"
                      onClick={() => setContactDrafts((current) => current.filter((item) => item.id !== contact.id))}
                      className="rounded p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                      aria-label={`删除联系人 ${contact.name || '未命名'}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="secondary"
                size="xs"
                className="mt-3"
                onClick={() => setContactDrafts((current) => [...current, createContact(current.length === 0)])}
              >
                <Plus className="h-3.5 w-3.5" />新增联系人
              </Button>
              {error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
              <div className="mt-3 flex gap-2">
                <Button type="button" size="xs" disabled={saving} onClick={() => void saveContacts()} aria-label="保存联系人">
                  <Save className="h-3.5 w-3.5" />{saving ? '保存中…' : '保存联系人'}
                </Button>
                <Button type="button" variant="secondary" size="xs" disabled={saving} onClick={cancelEdit}>
                  <X className="h-3.5 w-3.5" />取消
                </Button>
              </div>
            </div>
          ) : supplier.contacts.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {supplier.contacts.map((contact) => (
                <div key={contact.id} className="rounded-lg border border-gray-100 p-3 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{contact.name}</span>
                    {contact.isPrimary && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">主联系人</span>}
                  </div>
                  {contact.shortName && <p className="mt-1 text-xs text-gray-500">简称：{contact.shortName}</p>}
                  <p className="mt-1 text-xs text-gray-500">电话：{contact.phone || '—'}</p>
                  <p className="mt-1 break-all text-xs text-gray-500">邮箱：{contact.email || '—'}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">暂无联系人</p>
          )}
        </div>
      </div>
    </section>
  );
}
