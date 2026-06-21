'use client';

import { useState, type FormEvent } from 'react';
import { CustomerFormData } from '../types';

interface CustomerFormProps {
  formData: CustomerFormData;
  onInputChange: (field: keyof CustomerFormData, value: string) => void;
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
  isEditing: boolean;
  entityType: 'customers' | 'suppliers' | 'consignees';
}

interface FormFieldProps {
  id: keyof CustomerFormData;
  label: string;
  value: string;
  onInputChange: (field: keyof CustomerFormData, value: string) => void;
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

function hasContact2Value(formData: CustomerFormData): boolean {
  return Boolean(
    formData.contact2Name ||
      formData.contact2ShortName ||
      formData.contact2Phone ||
      formData.contact2Email
  );
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
  const [isContact2Open, setIsContact2Open] = useState(
    isCustomer && isEditing && hasContact2Value(formData)
  );

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
            <button
              type="button"
              onClick={() => setIsContact2Open((open) => !open)}
              aria-expanded={isContact2Open}
              aria-controls="contact2-fields"
              className="flex w-full items-center justify-between text-left text-sm font-semibold text-gray-800 dark:text-gray-100"
            >
              <span>联系人2（可选）</span>
              <span aria-hidden="true" className="text-gray-500 dark:text-gray-400">
                {isContact2Open ? '▼' : '▶'}
              </span>
            </button>
            {isContact2Open && (
              <div id="contact2-fields" className="mt-4 grid gap-4 md:grid-cols-2">
                <FormField
                  id="contact2Name"
                  label="姓名"
                  value={formData.contact2Name ?? ''}
                  onInputChange={onInputChange}
                />
                <FormField
                  id="contact2ShortName"
                  label="简称"
                  value={formData.contact2ShortName ?? ''}
                  onInputChange={onInputChange}
                  placeholder="如：Mary"
                />
                <FormField
                  id="contact2Email"
                  label="邮箱"
                  type="email"
                  value={formData.contact2Email ?? ''}
                  onInputChange={onInputChange}
                />
                <FormField
                  id="contact2Phone"
                  label="电话"
                  type="tel"
                  value={formData.contact2Phone ?? ''}
                  onInputChange={onInputChange}
                />
              </div>
            )}
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
