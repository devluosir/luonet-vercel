'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { PurchaseSupplier, PurchaseSupplierContact, PurchaseSupplierInput } from '../types';

interface Props {
  supplier?: PurchaseSupplier;
  saving: boolean;
  onClose: () => void;
  onSave: (input: PurchaseSupplierInput) => void;
}

function newContact(primary = false): PurchaseSupplierContact {
  return { id: crypto.randomUUID(), name: '', isPrimary: primary };
}

export function PurchaseSupplierFormModal({ supplier, saving, onClose, onSave }: Props) {
  const [form, setForm] = useState<PurchaseSupplierInput>({
    name: '', address: '', contacts: [newContact(true)], data: {},
  });

  useEffect(() => {
    setForm(supplier ? {
      id: supplier.id,
      code: supplier.code,
      name: supplier.name,
      shortName: supplier.shortName,
      address: supplier.address,
      contacts: supplier.contacts.length ? supplier.contacts : [newContact(true)],
      data: supplier.data,
    } : { name: '', address: '', contacts: [newContact(true)], data: {} });
  }, [supplier]);

  const inputClass = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100';
  const updateContact = (id: string, patch: Partial<PurchaseSupplierContact>) => {
    setForm((current) => ({
      ...current,
      contacts: current.contacts.map((contact) => contact.id === id ? { ...contact, ...patch } : contact),
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={onClose}>
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-gray-800" onMouseDown={(event) => event.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{supplier ? '编辑采购供应商' : '新增采购供应商'}</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-5 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-gray-600 dark:text-gray-300">供应商全称 *
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={`${inputClass} mt-1`} />
            </label>
            <label className="text-sm text-gray-600 dark:text-gray-300">简称
              <input value={form.shortName || ''} onChange={(e) => setForm({ ...form, shortName: e.target.value })} className={`${inputClass} mt-1`} />
            </label>
            <label className="text-sm text-gray-600 dark:text-gray-300">供应商编码
              <input value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} className={`${inputClass} mt-1`} placeholder="非空时全局唯一" />
            </label>
            <label className="text-sm text-gray-600 dark:text-gray-300">供应商类型
              <input value={form.data.supplierType || ''} onChange={(e) => setForm({ ...form, data: { ...form.data, supplierType: e.target.value } })} className={`${inputClass} mt-1`} />
            </label>
            <label className="text-sm text-gray-600 dark:text-gray-300 sm:col-span-2">地址
              <textarea value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} className={`${inputClass} mt-1 resize-y`} />
            </label>
            <label className="text-sm text-gray-600 dark:text-gray-300">供货范围
              <input value={form.data.supplyScope || ''} onChange={(e) => setForm({ ...form, data: { ...form.data, supplyScope: e.target.value } })} className={`${inputClass} mt-1`} />
            </label>
            <label className="text-sm text-gray-600 dark:text-gray-300">付款条件
              <input value={form.data.paymentTerms || ''} onChange={(e) => setForm({ ...form, data: { ...form.data, paymentTerms: e.target.value } })} className={`${inputClass} mt-1`} />
            </label>
            <label className="text-sm text-gray-600 dark:text-gray-300">默认币种
              <input value={form.data.defaultCurrency || ''} onChange={(e) => setForm({ ...form, data: { ...form.data, defaultCurrency: e.target.value } })} className={`${inputClass} mt-1`} />
            </label>
            <label className="text-sm text-gray-600 dark:text-gray-300">备注
              <input value={form.data.remark || ''} onChange={(e) => setForm({ ...form, data: { ...form.data, remark: e.target.value } })} className={`${inputClass} mt-1`} />
            </label>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">联系人</h3>
              <Button type="button" variant="secondary" size="xs" onClick={() => setForm((current) => ({ ...current, contacts: [...current.contacts, newContact()] }))}>
                <Plus className="h-3.5 w-3.5" />新增联系人
              </Button>
            </div>
            <div className="space-y-2">
              {form.contacts.map((contact) => (
                <div key={contact.id} className="grid items-center gap-2 rounded-lg bg-gray-50 p-3 sm:grid-cols-[1.1fr_1fr_1fr_auto_auto] dark:bg-gray-900/60">
                  <input value={contact.name} onChange={(e) => updateContact(contact.id, { name: e.target.value })} className={inputClass} placeholder="姓名" />
                  <input value={contact.phone || ''} onChange={(e) => updateContact(contact.id, { phone: e.target.value })} className={inputClass} placeholder="电话" />
                  <input value={contact.email || ''} onChange={(e) => updateContact(contact.id, { email: e.target.value })} className={inputClass} placeholder="邮箱" />
                  <label className="flex items-center gap-1 whitespace-nowrap text-xs text-gray-500">
                    <input type="radio" checked={!!contact.isPrimary} onChange={() => setForm((current) => ({ ...current, contacts: current.contacts.map((item) => ({ ...item, isPrimary: item.id === contact.id })) }))} />主联系人
                  </label>
                  <button type="button" onClick={() => setForm((current) => ({ ...current, contacts: current.contacts.filter((item) => item.id !== contact.id) }))} className="p-1 text-gray-400 hover:text-red-500" aria-label="删除联系人"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4 dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={onClose}>取消</Button>
          <Button type="button" disabled={saving || !form.name.trim()} onClick={() => onSave({ ...form, contacts: form.contacts.filter((contact) => contact.name.trim()) })}>
            {saving ? '保存中…' : '保存'}
          </Button>
        </div>
      </div>
    </div>
  );
}
