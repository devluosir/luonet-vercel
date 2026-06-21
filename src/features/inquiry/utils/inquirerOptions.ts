import { getLocalStorageJSON } from '@/utils/safeLocalStorage';
import type { Customer } from '@/features/customer/types';

/**
 * 从客户管理 localStorage 实时读取询价人选项。
 * 仅包含同时配置了「公司简称」和至少一个「联系人简称」的客户。
 * 返回格式：公司简称-联系人简称，如 ["LC-Roger", "LC-Mary"]
 * 每次调用都实时读取，保证弹窗打开时数据最新。
 */
export function getInquirerOptions(): string[] {
  if (typeof window === 'undefined') return [];

  const customers = getLocalStorageJSON<Customer[]>('customer_management', []);
  const options: string[] = [];

  for (const c of customers) {
    if (!c.companyShortName) continue;
    if (c.contact1ShortName) {
      options.push(`${c.companyShortName}-${c.contact1ShortName}`);
    }
    if (Array.isArray(c.contacts)) {
      for (const contact of c.contacts) {
        if (contact.shortName) {
          options.push(`${c.companyShortName}-${contact.shortName}`);
        }
      }
    } else if (c.contact2ShortName) {
      options.push(`${c.companyShortName}-${c.contact2ShortName}`);
    }
  }

  return Array.from(new Set(options)).sort();
}
