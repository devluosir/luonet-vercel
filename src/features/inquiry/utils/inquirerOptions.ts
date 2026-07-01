import { customerService } from '@/features/customer/services/customerService';

/**
 * 从客户库读取询价人选项。
 * 仅包含同时配置了「公司简称」和「联络人简称」的客户。
 * 返回格式：公司简称-联络人简称，如 ["LC-Roger", "LC-Mary"]。
 */
export async function getInquirerOptions(): Promise<string[]> {
  if (typeof window === 'undefined') return [];

  const { items: customers } = await customerService.fetchAllCustomers('customer');
  const options: string[] = [];

  for (const customer of customers) {
    if (!customer.shortName) continue;
    for (const contact of customer.contacts) {
      if (contact.shortName) {
        options.push(`${customer.shortName}-${contact.shortName}`);
      }
    }
  }

  return Array.from(new Set(options)).sort();
}
