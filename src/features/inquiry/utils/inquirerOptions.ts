import { getLocalStorageJSON } from '@/utils/safeLocalStorage';
import type { Customer } from '@/features/customer/types';

function normalizeOptionPart(value?: string): string {
  return value?.trim() ?? '';
}

/**
 * 从客户管理 localStorage 实时读取询价人选项。
 * 仅包含同时配置了「公司简称」和至少一个「联系人简称」的客户。
 */
export function getInquirerOptions(): string[] {
  if (typeof window === 'undefined') return [];

  const customers = getLocalStorageJSON<Customer[]>('customer_management', []);
  const options: string[] = [];

  for (const customer of customers) {
    const companyShortName = normalizeOptionPart(customer.companyShortName);
    if (!companyShortName) continue;

    const contact1ShortName = normalizeOptionPart(customer.contact1ShortName);
    if (contact1ShortName) {
      options.push(`${companyShortName}-${contact1ShortName}`);
    }

    const contact2ShortName = normalizeOptionPart(customer.contact2ShortName);
    if (contact2ShortName) {
      options.push(`${companyShortName}-${contact2ShortName}`);
    }
  }

  const uniqueOptions: string[] = [];
  for (const option of options) {
    if (uniqueOptions.indexOf(option) === -1) {
      uniqueOptions.push(option);
    }
  }

  return uniqueOptions.sort((a, b) => a.localeCompare(b));
}
