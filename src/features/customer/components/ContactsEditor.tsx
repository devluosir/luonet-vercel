'use client';

import type { Contact } from '../types';
import { addContact, removeContact, setPrimaryContact, updateContactField } from '../utils/contacts';

const FIELD_CLASS =
  'mt-1 block h-10 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm ' +
  'focus:border-blue-500 focus:outline-none focus:ring-blue-500 ' +
  'dark:border-gray-600 dark:bg-gray-700 dark:text-white';

interface ContactsEditorProps {
  contacts: Contact[];
  onChange: (contacts: Contact[]) => void;
  requireName?: boolean;
}

// 联络人编辑列表，供客户表单弹窗（CustomerForm）和客户详情页内联编辑（CustomerInfoCard）共用。
// 组件自身只负责渲染 + 通过 utils/contacts.ts 的纯函数计算下一份 contacts，
// 具体何时持久化（表单提交 / 详情页保存按钮）由调用方决定。
export function ContactsEditor({ contacts, onChange, requireName = false }: ContactsEditorProps) {
  return (
    <div className="space-y-3">
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
                onChange={() => onChange(setPrimaryContact(contacts, contact.id))}
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
              onClick={() => onChange(removeContact(contacts, contact.id))}
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
                onChange={(e) => onChange(updateContactField(contacts, contact.id, 'name', e.target.value))}
                className={FIELD_CLASS}
                required={requireName}
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
                onChange={(e) => onChange(updateContactField(contacts, contact.id, 'shortName', e.target.value))}
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
                onChange={(e) => onChange(updateContactField(contacts, contact.id, 'email', e.target.value))}
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
                onChange={(e) => onChange(updateContactField(contacts, contact.id, 'phone', e.target.value))}
                className={FIELD_CLASS}
              />
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange(addContact(contacts))}
        className="w-full rounded-md border border-dashed border-blue-300 py-2 text-sm text-blue-600 transition-colors hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/20"
      >
        + 添加联络人
      </button>
    </div>
  );
}
