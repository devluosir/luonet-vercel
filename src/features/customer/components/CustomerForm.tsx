'use client';

import { type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Contact, CustomerCategory, CustomerFormData } from '../types';
import { CATEGORY_OPTIONS } from './ProfileListParts';
import { ContactsEditor } from './ContactsEditor';

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

  const handleContactsChange = (nextContacts: Contact[]) => {
    onInputChange('contacts', nextContacts);
  };

  const companyFields = entityType === 'consignees' ? (
    <div className="space-y-4">
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
    <fieldset className={SECTION_CLASS}>
      <legend className="px-1 text-sm font-semibold text-gray-800 dark:text-gray-100">
        公司信息
      </legend>
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
    </fieldset>
  );

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {companyFields}

      {entityType !== 'consignees' && (
        <fieldset className={SECTION_CLASS}>
          <legend className="px-1 text-sm font-semibold text-gray-800 dark:text-gray-100">
            联络人
          </legend>
          <div className="mt-3">
            <ContactsEditor
              contacts={contacts}
              onChange={handleContactsChange}
              requireName={entityType === 'customers'}
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
        <Button
          type="submit"
        >
          {isEditing ? '更新' : '保存'}
        </Button>
      </div>
    </form>
  );
}
