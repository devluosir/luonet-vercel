'use client';

import { type FormEvent } from 'react';
import { Contact, CustomerFormData } from '../types';

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
  const isCustomer = entityType === 'customers';
  const contacts = formData.contacts ?? [];

  const updateContacts = (nextContacts: Contact[]) => {
    onInputChange('contacts', nextContacts);
  };

  const addContact = () => {
    updateContacts([...contacts, { id: createContactId(), name: '' }]);
  };

  const removeContact = (contactId: string) => {
    updateContacts(contacts.filter((contact) => contact.id !== contactId));
  };

  const updateContact = (contactId: string, field: keyof Omit<Contact, 'id'>, value: string) => {
    updateContacts(
      contacts.map((contact) =>
        contact.id === contactId ? { ...contact, [field]: value } : contact
      )
    );
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {isCustomer ? (
        <>
          <fieldset className={SECTION_CLASS}>
            <legend className="px-1 text-sm font-semibold text-gray-800 dark:text-gray-100">
              公司信息
            </legend>
            <div className="mt-3 grid gap-4 md:grid-cols-3">
              <FormField
                id="company"
                label="公司全称"
                value={formData.company}
                onInputChange={onInputChange}
                className="md:col-span-2"
              />
              <FormField
                id="companyShortName"
                label="公司简称"
                value={formData.companyShortName ?? ''}
                onInputChange={onInputChange}
                placeholder="如：LC"
              />
              <FormField
                id="address"
                label="地址"
                value={formData.address}
                onInputChange={onInputChange}
                className="md:col-span-3"
              />
            </div>
          </fieldset>

          <fieldset className={SECTION_CLASS}>
            <legend className="px-1 text-sm font-semibold text-gray-800 dark:text-gray-100">
              联系人1
            </legend>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <FormField
                id="name"
                label="姓名"
                value={formData.name}
                onInputChange={onInputChange}
                required
              />
              <FormField
                id="contact1ShortName"
                label="简称"
                value={formData.contact1ShortName ?? ''}
                onInputChange={onInputChange}
                placeholder="如：Roger"
              />
              <FormField
                id="email"
                label="邮箱"
                type="email"
                value={formData.email}
                onInputChange={onInputChange}
              />
              <FormField
                id="phone"
                label="电话"
                type="tel"
                value={formData.phone}
                onInputChange={onInputChange}
              />
            </div>
          </fieldset>

          <fieldset className={SECTION_CLASS}>
            <legend className="px-1 text-sm font-semibold text-gray-800 dark:text-gray-100">
              附加联系人
            </legend>
            <div className="mt-3 space-y-3">
              {contacts.map((contact, index) => (
                <div
                  key={contact.id}
                  className="space-y-3 rounded-md border border-gray-200 p-3 dark:border-gray-600"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      联系人{index + 2}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeContact(contact.id)}
                      className="text-xs text-red-400 transition-colors hover:text-red-600"
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
                        required
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
                        placeholder="如：Mary"
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
                + 添加联系人
              </button>
            </div>
          </fieldset>
        </>
      ) : (
        <fieldset className={SECTION_CLASS}>
          <legend className="px-1 text-sm font-semibold text-gray-800 dark:text-gray-100">
            基本信息
          </legend>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <FormField
              id="name"
              label="名称"
              value={formData.name}
              onInputChange={onInputChange}
              required
              className="md:col-span-2"
            />
            <FormField
              id="company"
              label="公司"
              value={formData.company}
              onInputChange={onInputChange}
              className="md:col-span-2"
            />
            <FormField
              id="email"
              label="邮箱"
              type="email"
              value={formData.email}
              onInputChange={onInputChange}
            />
            <FormField
              id="phone"
              label="电话"
              type="tel"
              value={formData.phone}
              onInputChange={onInputChange}
            />
            <FormField
              id="address"
              label="地址"
              value={formData.address}
              onInputChange={onInputChange}
              className="md:col-span-2"
            />
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
