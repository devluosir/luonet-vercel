import { customerService } from '@/features/customer/services/customerService';

/**
 * 从客户库读取询价人选项。
 * 优先返回「公司简称-联络人简称」；若联络人没有简称，仅返回公司简称。
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
      } else {
        options.push(customer.shortName);
      }
    }
  }

  return Array.from(new Set(options)).sort();
}
