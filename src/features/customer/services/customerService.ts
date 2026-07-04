import { getLocalStorageJSON } from '@/utils/safeLocalStorage';
import { Contact, Customer, CustomerCategory, HistoryDocument } from '../types';

const VALID_CATEGORIES: CustomerCategory[] = ['A', 'B', 'C', 'New', 'Blacklist'];

function toCustomerCategory(value: unknown): CustomerCategory | undefined {
  return typeof value === 'string' && (VALID_CATEGORIES as string[]).includes(value)
    ? (value as CustomerCategory)
    : undefined;
}

export type CustomerProfileType = 'customer' | 'supplier' | 'consignee';

export interface FetchCustomersResult<T extends Customer = Customer> {
  items: T[];
  isStale: boolean;
}

export interface CustomerProfileInput {
  id?: string;
  type: CustomerProfileType;
  name: string;
  shortName?: string;
  code?: string;
  address?: string;
  contacts?: Contact[];
  category?: CustomerCategory;
  categoryNote?: string;
  relatedOrdersNote?: string;
  createdAt?: string;
}

export interface SavedCustomer {
  name: string;
  to: string;
  customerPO?: string;
}

export interface CustomerStats {
  customerId: string;
  totals: {
    inquiries: number;
    orders: number;
  };
  contacts: Array<{
    contactId: string;
    name: string;
    shortName?: string | null;
    isPrimary: boolean;
    inquiries: number;
    orders: number;
  }>;
  unassigned: {
    inquiries: number;
    orders: number;
  };
}

type D1Contact = {
  id: string;
  customer_id?: string;
  name: string;
  short_name?: string | null;
  email?: string | null;
  phone?: string | null;
  is_primary?: boolean | number;
  sort_order?: number;
  status?: string;
  created_at?: string;
  updated_at?: string;
};

type D1Customer = {
  id: string;
  type: CustomerProfileType;
  name: string;
  short_name?: string | null;
  code?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  data?: Record<string, unknown> | string | null;
  status?: string;
  contacts?: D1Contact[];
  created_at?: string;
  updated_at?: string;
};

const CACHE_KEYS: Record<CustomerProfileType, string> = {
  customer: 'customer_cache_v2',
  supplier: 'supplier_cache_v2',
  consignee: 'consignee_cache_v2',
};

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function parseData(data: D1Customer['data']): Record<string, unknown> {
  if (!data) return {};
  if (typeof data !== 'string') return data;
  try {
    return JSON.parse(data) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function isPrimary(contact: D1Contact): boolean {
  return contact.is_primary === true || contact.is_primary === 1;
}

function toContact(contact: D1Contact): Contact {
  return {
    id: contact.id,
    name: contact.name,
    shortName: contact.short_name ?? undefined,
    email: contact.email ?? undefined,
    phone: contact.phone ?? undefined,
    isPrimary: isPrimary(contact),
  };
}

function normalizeContacts(contacts: Contact[]): Contact[] {
  const namedContacts = contacts.filter((contact) => contact.name.trim());
  if (namedContacts.length === 0) return [];

  const primaryIndex = namedContacts.findIndex((contact) => contact.isPrimary);
  const resolvedPrimaryIndex = primaryIndex >= 0 ? primaryIndex : 0;

  return namedContacts.map((contact, index) => ({
    ...contact,
    name: contact.name.trim(),
    shortName: contact.shortName?.trim() || undefined,
    email: contact.email?.trim() || undefined,
    phone: contact.phone?.trim() || undefined,
    isPrimary: index === resolvedPrimaryIndex,
  }));
}

export function getPrimaryContact(profile: Pick<Customer, 'contacts'>): Contact | undefined {
  return profile.contacts.find((contact) => contact.isPrimary) ?? profile.contacts[0];
}

function normalizeProfile(row: D1Customer): Customer {
  const data = parseData(row.data);
  const legacyCompany = typeof data.company === 'string' && data.company.trim()
    ? data.company.trim()
    : undefined;
  const createdAt = row.created_at ?? new Date().toISOString();
  const updatedAt = row.updated_at ?? createdAt;

  return {
    id: row.id,
    type: row.type,
    name: legacyCompany ?? row.name,
    shortName: row.short_name ?? undefined,
    code: row.code ?? undefined,
    address: row.address ?? '',
    contacts: normalizeContacts((row.contacts ?? []).map(toContact)),
    category: toCustomerCategory(data.category),
    categoryNote: typeof data.categoryNote === 'string' && data.categoryNote.trim() ? data.categoryNote : undefined,
    relatedOrdersNote: typeof data.relatedOrdersNote === 'string' && data.relatedOrdersNote.trim() ? data.relatedOrdersNote : undefined,
    createdAt,
    updatedAt,
  };
}

function readCache<T extends Customer>(type: CustomerProfileType): T[] {
  if (typeof window === 'undefined') return [];
  return getLocalStorageJSON<T[]>(CACHE_KEYS[type], []);
}

export function getCachedCustomers(type: CustomerProfileType = 'customer'): Customer[] {
  return readCache<Customer>(type);
}

function writeCache<T extends Customer>(type: CustomerProfileType, items: T[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CACHE_KEYS[type], JSON.stringify(items));
}

async function parseResponse(resp: Response): Promise<unknown> {
  const text = await resp.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(text);
  }
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(url, init);
  const data = await parseResponse(resp);
  if (!resp.ok) {
    const errorData = data && typeof data === 'object'
      ? data as { error?: string; details?: string }
      : {};
    throw new Error(errorData.error || errorData.details || `请求失败：HTTP ${resp.status}`);
  }
  return data as T;
}

export async function fetchAllCustomers(type: CustomerProfileType = 'customer'): Promise<FetchCustomersResult> {
  try {
    const data = await requestJson<{ customers?: D1Customer[] }>(`/api/customers?type=${encodeURIComponent(type)}`);
    const items = (data.customers ?? []).map(normalizeProfile);
    writeCache(type, items);
    return { items, isStale: false };
  } catch (error) {
    console.warn(`[customerService] 读取 ${type} D1 失败，使用离线缓存`, error);
    return { items: readCache(type), isStale: true };
  }
}

export async function getAllCustomers(): Promise<Customer[]> {
  const result = await fetchAllCustomers('customer');
  return result.items;
}

export async function getCustomerById(id: string, type: CustomerProfileType = 'customer'): Promise<Customer | null> {
  try {
    const data = await requestJson<{ customer?: D1Customer; contacts?: D1Contact[] }>(`/api/customers/${encodeURIComponent(id)}`);
    if (!data.customer) return null;
    return normalizeProfile({ ...data.customer, contacts: data.contacts ?? data.customer.contacts ?? [] });
  } catch (error) {
    console.warn('[customerService] 读取客户详情失败，使用离线缓存', error);
    return readCache(type).find((customer) => customer.id === id) ?? null;
  }
}

function buildBasePayload(profile: CustomerProfileInput) {
  const data: Record<string, unknown> = {};
  if (profile.category) data.category = profile.category;
  const categoryNote = profile.categoryNote?.trim();
  if (categoryNote) data.categoryNote = categoryNote;
  const relatedOrdersNote = profile.relatedOrdersNote?.trim();
  if (relatedOrdersNote) data.relatedOrdersNote = relatedOrdersNote;

  return {
    type: profile.type,
    name: profile.name.trim(),
    short_name: profile.shortName?.trim() || undefined,
    code: profile.code?.trim() || undefined,
    address: profile.address?.trim() || undefined,
    data,
  };
}

function buildContactsPayload(profile: CustomerProfileInput) {
  return normalizeContacts(profile.contacts ?? []).map((contact, index) => ({
    id: contact.id || createId('contact'),
    name: contact.name,
    shortName: contact.shortName,
    email: contact.email,
    phone: contact.phone,
    isPrimary: contact.isPrimary,
    sortOrder: index,
  }));
}

export async function saveCustomerProfile(profile: CustomerProfileInput): Promise<Customer> {
  const id = profile.id || createId(profile.type);
  const method = profile.id ? 'PUT' : 'POST';
  const url = profile.id ? `/api/customers/${encodeURIComponent(profile.id)}` : '/api/customers';
  const body = { id, ...buildBasePayload(profile) };

  const data = await requestJson<{ customer?: D1Customer }>(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!data.customer) {
    throw new Error('基础信息保存成功但服务端未返回记录');
  }

  try {
    const contactData = await requestJson<{ contacts?: D1Contact[] }>(`/api/customers/${encodeURIComponent(id)}/contacts`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contacts: buildContactsPayload(profile) }),
    });
    return normalizeProfile({ ...data.customer, contacts: contactData.contacts ?? [] });
  } catch (error) {
    throw new Error(`基础信息已保存，但联络人保存失败：${error instanceof Error ? error.message : '未知错误'}`);
  }
}

export async function saveCustomer(customer: Customer, isNew = false): Promise<Customer> {
  return saveCustomerProfile({
    id: isNew ? undefined : customer.id,
    type: 'customer',
    name: customer.name,
    shortName: customer.shortName,
    code: customer.code,
    address: customer.address,
    contacts: customer.contacts,
    category: customer.category,
    categoryNote: customer.categoryNote,
    createdAt: customer.createdAt,
  });
}

export async function deleteCustomer(customerId: string): Promise<void> {
  await requestJson(`/api/customers/${encodeURIComponent(customerId)}`, { method: 'DELETE' });
}

export async function fetchCustomerStats(customerId: string): Promise<CustomerStats> {
  return requestJson<CustomerStats>(`/api/customers/${encodeURIComponent(customerId)}/stats`);
}

export function checkCustomerUsage(customerName: string): number {
  try {
    const quotationHistory = getLocalStorageJSON<HistoryDocument[]>('quotation_history', []);
    const packingHistory = getLocalStorageJSON<HistoryDocument[]>('packing_history', []);
    const invoiceHistory = getLocalStorageJSON<HistoryDocument[]>('invoice_history', []);

    const allHistory = [...quotationHistory, ...packingHistory, ...invoiceHistory];
    const normalizedName = customerName.split('\n')[0]?.trim();

    return allHistory.filter((doc) => {
      if (!doc) return false;
      const customerNameInDoc = doc.type === 'packing'
        ? String(doc.consigneeName || doc.customerName || '')
        : String(doc.customerName || '');
      return customerNameInDoc.trim() === normalizedName;
    }).length;
  } catch (error) {
    console.error('检查客户使用情况失败:', error);
    return 0;
  }
}

function toDropdownItems(customers: Customer[]): SavedCustomer[] {
  return customers.map((customer) => {
    const primaryContact = getPrimaryContact(customer);
    const title = customer.shortName || customer.name.split('\n')[0] || customer.name;
    const lines = [
      customer.name,
      customer.address,
      primaryContact?.email,
      primaryContact?.phone,
    ].filter(Boolean);

    return {
      name: title,
      to: lines.join('\n') || title,
      customerPO: '',
    };
  });
}

export async function getCustomersForDropdown(type: CustomerProfileType = 'customer'): Promise<SavedCustomer[]> {
  const result = await fetchAllCustomers(type);
  return toDropdownItems(result.items);
}

export const customerService = {
  fetchAllCustomers,
  getCachedCustomers,
  getAllCustomers,
  getCustomerById,
  saveCustomerProfile,
  saveCustomer,
  deleteCustomer,
  fetchCustomerStats,
  checkCustomerUsage,
  getCustomersForDropdown,
};
