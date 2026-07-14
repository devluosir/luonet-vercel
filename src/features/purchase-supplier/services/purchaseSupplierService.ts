import type {
  PurchaseSupplier,
  PurchaseSupplierContact,
  PurchaseSupplierData,
  PurchaseSupplierInput,
} from '../types';

const CACHE_PREFIX = 'purchase_supplier_cache_v1';

type D1Contact = {
  id: string;
  name: string;
  short_name?: string | null;
  email?: string | null;
  phone?: string | null;
  is_primary?: boolean | number;
};

type D1Supplier = {
  id: string;
  code?: string | null;
  name: string;
  short_name?: string | null;
  address?: string | null;
  data?: PurchaseSupplierData | string | null;
  contacts?: D1Contact[];
  status?: 'active' | 'archived';
  created_at?: string;
  updated_at?: string;
};

class PurchaseSupplierRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export function normalizePurchaseSupplierCacheUserId(userId: string): string {
  return userId.trim().toLowerCase();
}

export function getPurchaseSupplierCacheKey(userId: string): string {
  return `${CACHE_PREFIX}:${normalizePurchaseSupplierCacheUserId(userId)}`;
}

export function clearPurchaseSupplierLocalState(userId?: string): void {
  if (typeof window === 'undefined') return;
  if (userId?.trim()) {
    localStorage.removeItem(getPurchaseSupplierCacheKey(userId));
    return;
  }
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(`${CACHE_PREFIX}:`)) localStorage.removeItem(key);
  }
}

function parseData(value: D1Supplier['data']): PurchaseSupplierData {
  if (!value) return {};
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value) as PurchaseSupplierData;
  } catch {
    return {};
  }
}

function normalizeContacts(contacts: D1Contact[] = []): PurchaseSupplierContact[] {
  const items = contacts
    .filter((contact) => contact.name?.trim())
    .map((contact) => ({
      id: contact.id,
      name: contact.name.trim(),
      shortName: contact.short_name?.trim() || undefined,
      email: contact.email?.trim() || undefined,
      phone: contact.phone?.trim() || undefined,
      isPrimary: contact.is_primary === true || contact.is_primary === 1,
    }));
  if (items.length === 0) return [];
  const primaryIndex = items.findIndex((contact) => contact.isPrimary);
  return items.map((contact, index) => ({
    ...contact,
    isPrimary: index === (primaryIndex >= 0 ? primaryIndex : 0),
  }));
}

function normalizeSupplier(row: D1Supplier): PurchaseSupplier {
  const createdAt = row.created_at || new Date().toISOString();
  return {
    id: row.id,
    code: row.code?.trim() || undefined,
    name: row.name.trim(),
    shortName: row.short_name?.trim() || undefined,
    address: row.address?.trim() || '',
    contacts: normalizeContacts(row.contacts),
    data: parseData(row.data),
    status: row.status === 'archived' ? 'archived' : 'active',
    createdAt,
    updatedAt: row.updated_at || createdAt,
  };
}

function readCache(userId: string): PurchaseSupplier[] {
  if (typeof window === 'undefined' || !userId.trim()) return [];
  try {
    const value = JSON.parse(localStorage.getItem(getPurchaseSupplierCacheKey(userId)) || '[]');
    return Array.isArray(value) ? value as PurchaseSupplier[] : [];
  } catch {
    return [];
  }
}

function writeCache(userId: string, suppliers: PurchaseSupplier[]): void {
  if (typeof window === 'undefined' || !userId.trim()) return;
  localStorage.setItem(getPurchaseSupplierCacheKey(userId), JSON.stringify(suppliers));
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const raw = await response.text();
  let data: unknown = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = {};
  }
  if (!response.ok) {
    const message = data && typeof data === 'object' && 'error' in data
      ? String((data as { error?: unknown }).error || `请求失败：HTTP ${response.status}`)
      : `请求失败：HTTP ${response.status}`;
    throw new PurchaseSupplierRequestError(message, response.status);
  }
  return data as T;
}

export async function fetchPurchaseSuppliers(params: {
  userId: string;
  canRead: boolean;
  search?: string;
  status?: 'active' | 'archived' | 'all';
  limit?: number;
  offset?: number;
}): Promise<{ items: PurchaseSupplier[]; isStale: boolean }> {
  if (!params.canRead || !params.userId.trim()) {
    clearPurchaseSupplierLocalState(params.userId);
    throw new PurchaseSupplierRequestError('没有采购供应商读取权限', 403);
  }
  const query = new URLSearchParams({
    status: params.status || 'active',
    limit: String(params.limit || 100),
    offset: String(params.offset || 0),
  });
  if (params.search?.trim()) query.set('search', params.search.trim());

  try {
    const result = await requestJson<{ suppliers?: D1Supplier[] }>(`/api/purchase-suppliers?${query.toString()}`);
    const items = (result.suppliers ?? []).map(normalizeSupplier);
    if (!params.search?.trim() && (params.offset || 0) === 0 && (params.status || 'active') === 'active') {
      writeCache(params.userId, items);
    }
    return { items, isStale: false };
  } catch (error) {
    if (error instanceof PurchaseSupplierRequestError && (error.status === 401 || error.status === 403)) {
      clearPurchaseSupplierLocalState(params.userId);
      throw error;
    }
    if (!params.search?.trim() && (params.offset || 0) === 0 && (params.status || 'active') === 'active') {
      return { items: readCache(params.userId), isStale: true };
    }
    throw error;
  }
}

export async function fetchPurchaseSupplierById(params: {
  id: string;
  userId: string;
  canRead: boolean;
}): Promise<PurchaseSupplier> {
  if (!params.canRead || !params.userId.trim()) {
    clearPurchaseSupplierLocalState(params.userId);
    throw new PurchaseSupplierRequestError('没有采购供应商读取权限', 403);
  }

  try {
    const result = await requestJson<{ supplier?: D1Supplier }>(
      `/api/purchase-suppliers/${encodeURIComponent(params.id)}`
    );
    if (!result.supplier) throw new Error('服务端未返回采购供应商资料');
    return normalizeSupplier(result.supplier);
  } catch (error) {
    if (error instanceof PurchaseSupplierRequestError && (error.status === 401 || error.status === 403)) {
      clearPurchaseSupplierLocalState(params.userId);
    }
    throw error;
  }
}

function buildPayload(input: PurchaseSupplierInput) {
  return {
    id: input.id,
    code: input.code?.trim() || null,
    name: input.name.trim(),
    short_name: input.shortName?.trim() || null,
    address: input.address?.trim() || null,
    data: input.data,
    contacts: input.contacts.map((contact, index) => ({
      id: contact.id,
      name: contact.name.trim(),
      short_name: contact.shortName?.trim() || null,
      email: contact.email?.trim() || null,
      phone: contact.phone?.trim() || null,
      is_primary: contact.isPrimary === true,
      sort_order: index,
    })),
  };
}

export async function savePurchaseSupplier(input: PurchaseSupplierInput): Promise<PurchaseSupplier> {
  const result = await requestJson<{ supplier?: D1Supplier }>(
    input.id ? `/api/purchase-suppliers/${encodeURIComponent(input.id)}` : '/api/purchase-suppliers',
    {
      method: input.id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload(input)),
    }
  );
  if (!result.supplier) throw new Error('服务端未返回采购供应商资料');
  return normalizeSupplier(result.supplier);
}

export async function archivePurchaseSupplier(id: string): Promise<void> {
  await requestJson(`/api/purchase-suppliers/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function deletePurchaseSupplierPermanently(id: string): Promise<void> {
  await requestJson(
    `/api/purchase-suppliers/${encodeURIComponent(id)}/hard-delete`,
    { method: 'DELETE' }
  );
}

export function getPrimaryPurchaseSupplierContact(supplier: PurchaseSupplier) {
  return supplier.contacts.find((contact) => contact.isPrimary) ?? supplier.contacts[0];
}
