'use client';

import { type FormEvent } from 'react';
import { Contact, CustomerCategory, CustomerFormData } from '../types';

const CATEGORY_OPTIONS: Array<{ value: CustomerCategory; label: string }> = [
  { value: 'A', label: 'A类' },
  { value: 'B', label: 'B类' },
  { value: 'C', label: 'C类' },
  { value: 'New', label: 'New（未成单新客户）' },
  { value: 'Blacklist', label: '黑名单' },
];

type TextFieldId = Exclude<keyof CustomerFormData, 'contacts'>;

interface CustomerFormProps {
  formData: CustomerFormData;
  onInputChange: (
    field: keyof CustomerFormData,
    value: CustomerFormData[keyof CustomerFormData]
  ) => void;
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
  isEditing: boolean;
  entityType: 'customers' | 'suppliers' | 'consignees';
}

interface FormFieldProps {
  id: TextFieldId;
  label: string;
  value: string;
  onInputChange: (field: TextFieldId, value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  hint?: string;
}

const FIELD_CLASS =
  'mt-1 block h-10 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm ' +
  'focus:border-blue-500 focus:outline-none focus:ring-blue-500 ' +
  'dark:border-gray-600 dark:bg-gray-700 dark:text-white';
const TEXTAREA_CLASS =
  'mt-1 block min-h-24 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm ' +
  'focus:border-blue-500 focus:outline-none focus:ring-blue-500 ' +
  'dark:border-gray-600 dark:bg-gray-700 dark:text-white';

const SECTION_CLASS = 'rounded-lg border border-gray-200 p-4 dark:border-gray-700';

function createContactId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `contact_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function FormField({
  id,
  label,
  value,
  onInputChange,
  type = 'text',
  placeholder,
  required,
  className,
  hint,
}: FormFieldProps) {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {hint && <span className="ml-1 text-xs font-normal text-gray-400">{hint}</span>}
      </label>
      <input
        type={type}
        id={id}
        value={value}
        onChange={(e) => onInputChange(id, e.target.value)}
        className={FIELD_CLASS}
        placeholder={placeholder}
        required={required}
      />
    </div>
  );
}

export function CustomerForm({
  formData,
  onInputChange,
  onSubmit,
  onCancel,
  isEditing,
  entityType
}: CustomerFormProps) {
  const contacts = formData.contacts ?? [];

  const updateContacts = (nextContacts: Contact[]) => {
    if (nextContacts.length === 0) {
      onInputChange('contacts', [{ id: createContactId(), name: '', isPrimary: true }]);
      return;
    }
    const primaryIndex = nextContacts.findIndex((contact) => contact.isPrimary);
    const resolvedPrimaryIndex = primaryIndex >= 0 ? primaryIndex : 0;
    onInputChange(
      'contacts',
      nextContacts.map((contact, index) => ({
        ...contact,
        isPrimary: index === resolvedPrimaryIndex,
      }))
    );
  };

  const addContact = () => {
    updateContacts([
      ...contacts,
      { id: createContactId(), name: '', isPrimary: contacts.length === 0 },
    ]);
  };

  const removeContact = (contactId: string) => {
    updateContacts(contacts.filter((contact) => contact.id !== contactId));
  };

  const updateContact = (contactId: string, field: keyof Omit<Contact, 'id' | 'isPrimary'>, value: string) => {
    updateContacts(
      contacts.map((contact) =>
        contact.id === contactId ? { ...contact, [field]: value } : contact
      )
    );
  };

  const setPrimaryContact = (contactId: string) => {
    updateContacts(
      contacts.map((contact) => ({
        ...contact,
        isPrimary: contact.id === contactId,
      }))
    );
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <fieldset className={SECTION_CLASS}>
        <legend className="px-1 text-sm font-semibold text-gray-800 dark:text-gray-100">
          公司信息
        </legend>
        {entityType === 'consignees' ? (
          <div className="mt-3 space-y-4">
            <FormField
              id="name"
              label="收货人全称"
              value={formData.name}
              onInputChange={onInputChange}
              required
            />
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                地址
              </label>
              <textarea
                id="address"
                value={formData.address}
                onChange={(e) => onInputChange('address', e.target.value)}
                className={TEXTAREA_CLASS}
                rows={4}
                placeholder="可分多行填写地址、电话、邮箱、税号等信息"
              />
            </div>
          </div>
        ) : (
          <div className="mt-3 grid gap-4 md:grid-cols-3">
            <FormField
              id="name"
              label={entityType === 'suppliers' ? '供应商全称' : '客户公司全称'}
              value={formData.name}
              onInputChange={onInputChange}
              required
              className="md:col-span-2"
            />
            <FormField
              id="shortName"
              label="简称"
              value={formData.shortName ?? ''}
              onInputChange={onInputChange}
              placeholder="如：LC"
            />
            <FormField
              id="code"
              label="编号"
              value={formData.code ?? ''}
              onInputChange={onInputChange}
              placeholder="可选"
            />
            {entityType === 'customers' && (
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  客户分类
                  <span className="ml-1 text-xs font-normal text-gray-400">人为评定，可随时调整</span>
                </label>
                <select
                  id="category"
                  value={formData.category ?? 'New'}
                  onChange={(e) => onInputChange('category', e.target.value as CustomerCategory)}
                  className={FIELD_CLASS}
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {entityType === 'customers' && (
              <div className="md:col-span-3">
                <label htmlFor="categoryNote" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  分类备注
                  <span className="ml-1 text-xs font-normal text-gray-400">简述评定理由，如订单量、回款情况等</span>
                </label>
                <input
                  type="text"
                  id="categoryNote"
                  value={formData.categoryNote ?? ''}
                  onChange={(e) => onInputChange('categoryNote', e.target.value)}
                  className={FIELD_CLASS}
                  placeholder="可选，如：月均3单，回款及时"
                />
              </div>
            )}
            <div className="md:col-span-2">
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                地址
              </label>
              <textarea
                id="address"
                value={formData.address}
                onChange={(e) => onInputChange('address', e.target.value)}
                className={TEXTAREA_CLASS}
                rows={4}
                placeholder="可分多行填写地址、电话、邮箱、税号等信息"
              />
            </div>
          </div>
        )}
      </fieldset>

      {entityType !== 'consignees' && (
        <fieldset className={SECTION_CLASS}>
          <legend className="px-1 text-sm font-semibold text-gray-800 dark:text-gray-100">
            联络人
          </legend>
          <div className="mt-3 space-y-3">
            {contacts.map((contact, index) => (
              <div
                key={contact.id}
                className="space-y-3 rounded-md border border-gray-200 p-3 dark:border-gray-600"
              >
                <div className="flex items-center justify-between gap-3">
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300">
                    <input
                      type="radio"
                      name="primary-contact"
                      checked={Boolean(contact.isPrimary)}
                      onChange={() => setPrimaryContact(contact.id)}
                      className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    联络人{index + 1}
                    {contact.isPrimary && (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                        主联络人
                      </span>
                    )}
                  </label>
                  <button
                    type="button"
                    onClick={() => removeContact(contact.id)}
                    disabled={contacts.length <= 1}
                    className="text-xs text-red-400 transition-colors hover:text-red-600 disabled:cursor-not-allowed disabled:text-gray-300"
                  >
                    删除
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor={`contact-name-${contact.id}`}
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      姓名
                    </label>
                    <input
                      type="text"
                      id={`contact-name-${contact.id}`}
                      value={contact.name}
                      onChange={(e) => updateContact(contact.id, 'name', e.target.value)}
                      className={FIELD_CLASS}
                      required={entityType === 'customers'}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`contact-short-${contact.id}`}
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      简称
                    </label>
                    <input
                      type="text"
                      id={`contact-short-${contact.id}`}
                      value={contact.shortName ?? ''}
                      onChange={(e) => updateContact(contact.id, 'shortName', e.target.value)}
                      className={FIELD_CLASS}
                      placeholder="如：Roger"
                    />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor={`contact-email-${contact.id}`}
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      邮箱
                    </label>
                    <input
                      type="email"
                      id={`contact-email-${contact.id}`}
                      value={contact.email ?? ''}
                      onChange={(e) => updateContact(contact.id, 'email', e.target.value)}
                      className={FIELD_CLASS}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`contact-phone-${contact.id}`}
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      电话
                    </label>
                    <input
                      type="tel"
                      id={`contact-phone-${contact.id}`}
                      value={contact.phone ?? ''}
                      onChange={(e) => updateContact(contact.id, 'phone', e.target.value)}
                      className={FIELD_CLASS}
                    />
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addContact}
              className="w-full rounded-md border border-dashed border-blue-300 py-2 text-sm text-blue-600 transition-colors hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/20"
            >
              + 添加联络人
            </button>
          </div>
        </fieldset>
      )}

      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-4 py-2 text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
        >
          取消
        </button>
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {isEditing ? '更新' : '保存'}
        </button>
      </div>
    </form>
  );
}
