/**
 * 从 D1 API 拉取数据并合并到 localStorage。
 * 合并规则：D1 为权威来源；D1 请求成功后，本地缺失的远端记录会补入，
 * 远端已删除的本地旧记录会移除，2 分钟内新建的本地记录临时保留。
 * 仅在用户已登录时通过 /api/documents 和 /api/customers 代理调用。
 */

import type { Contact } from '@/features/customer/types';

type D1Doc = {
  id: string;
  type: string;
  doc_no: string;
  customer_name: string | null;
  total_amount: number | null;
  currency: string;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type D1Customer = {
  id: string;
  type: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type LocalStorageItem = {
  id: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
};

type LocalCustomerItem = LocalStorageItem & {
  contacts?: Contact[];
  contact2Name?: unknown;
  contact2ShortName?: unknown;
  contact2Phone?: unknown;
  contact2Email?: unknown;
  [key: string]: unknown;
};

function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined;
}

async function fetchAll<T>(
  url: string,
  key: string,
): Promise<{ data: T[]; ok: boolean }> {
  const results: T[] = [];
  let offset = 0;
  const limit = 500;
  let ok = false;

  while (true) {
    const resp = await fetch(`${url}&limit=${limit}&offset=${offset}`);
    if (!resp.ok) break;
    ok = true;

    const json = await resp.json();
    const items: T[] = json[key] ?? [];
    results.push(...items);

    if (items.length < limit) break;
    offset += limit;
  }

  return { data: results, ok };
}

function mergeIntoStorage<T extends LocalStorageItem>(
  storageKey: string,
  incoming: T[],
  d1Ok: boolean,
): void {
  // D1 请求失败时不动 localStorage，避免误删本地数据
  if (!d1Ok) return;

  const raw = localStorage.getItem(storageKey);
  const existing: T[] = raw ? JSON.parse(raw) : [];
  const incomingIds = new Set(incoming.map((item) => item.id));
  const now = Date.now();
  const TWO_MINUTES = 2 * 60 * 1000;

  // D1 记录为权威来源，先全部放入 map
  const map = new Map<string, T>(incoming.map((item) => [item.id, item]));

  // 保留本地有、D1 没有、但 2 分钟内刚创建的记录（double-write 可能还未到达 D1）
  for (const item of existing) {
    if (!incomingIds.has(item.id)) {
      const createdAt = new Date(item.createdAt ?? item.created_at ?? 0).getTime();
      if (now - createdAt < TWO_MINUTES) {
        map.set(item.id, item);
      }
      // 超过 2 分钟且 D1 没有 → 视为已在其他设备删除，不保留
    }
  }

  const merged = Array.from(map.values()).sort((a, b) => {
    const ta = new Date(a.createdAt ?? a.created_at ?? 0).getTime();
    const tb = new Date(b.createdAt ?? b.created_at ?? 0).getTime();
    return tb - ta;
  });

  localStorage.setItem(storageKey, JSON.stringify(merged));
}

function docToQuotationHistory(doc: D1Doc) {
  return {
    id: doc.id,
    type: doc.type as 'quotation' | 'confirmation',
    quotationNo: doc.doc_no || '',
    customerName: doc.customer_name || '',
    totalAmount: doc.total_amount || 0,
    currency: doc.currency || 'USD',
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
    data: doc.data,
  };
}

function docToInvoiceHistory(doc: D1Doc) {
  const nestedData = doc.data.data;

  return {
    id: doc.id,
    invoiceNo: doc.doc_no || '',
    customerName: doc.customer_name || '',
    totalAmount: doc.total_amount || 0,
    currency: doc.currency || 'USD',
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
    data: nestedData ?? doc.data,
  };
}

function docToPackingHistory(doc: D1Doc) {
  const invoiceNo = typeof doc.data.invoiceNo === 'string' ? doc.data.invoiceNo : '';
  const orderNo = typeof doc.data.orderNo === 'string' ? doc.data.orderNo : '';
  const documentType = typeof doc.data.documentType === 'string' ? doc.data.documentType : 'packing';

  return {
    id: doc.id,
    consigneeName: doc.customer_name || '',
    invoiceNo: doc.doc_no || invoiceNo,
    orderNo,
    totalAmount: doc.total_amount || 0,
    currency: doc.currency || 'USD',
    documentType,
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
    data: doc.data,
  };
}

function docToPurchaseHistory(doc: D1Doc) {
  return {
    id: doc.id,
    supplierName: doc.customer_name || '',
    orderNo: doc.doc_no || '',
    totalAmount: doc.total_amount || 0,
    currency: doc.currency || 'USD',
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
    data: doc.data,
  };
}

function d1CustomerToLocal(c: D1Customer, _type: 'customer' | 'supplier' | 'consignee') {
  const result: LocalCustomerItem = {
    id: c.id,
    name: c.name,
    email: c.email || '',
    phone: c.phone || '',
    address: c.address || '',
    ...c.data,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };

  if (!Array.isArray(result.contacts) && result.contact2Name) {
    result.contacts = [{
      id: `legacy-contact2-${c.id}`,
      name: String(result.contact2Name),
      shortName: toOptionalString(result.contact2ShortName),
      phone: toOptionalString(result.contact2Phone),
      email: toOptionalString(result.contact2Email),
    }];
  }

  return result;
}

/**
 * 拉取全部 D1 数据并合并到 localStorage。
 * 失败时静默（不影响现有功能）。
 */
export async function pullAllFromD1(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const [quotRes, confRes, invRes, packRes, purchRes] = await Promise.all([
      fetchAll<D1Doc>('/api/documents?type=quotation', 'documents'),
      fetchAll<D1Doc>('/api/documents?type=confirmation', 'documents'),
      fetchAll<D1Doc>('/api/documents?type=invoice', 'documents'),
      fetchAll<D1Doc>('/api/documents?type=packing', 'documents'),
      fetchAll<D1Doc>('/api/documents?type=purchase', 'documents'),
    ]);

    mergeIntoStorage(
      'quotation_history',
      [...quotRes.data, ...confRes.data].map(docToQuotationHistory),
      quotRes.ok && confRes.ok,
    );
    mergeIntoStorage('invoice_history', invRes.data.map(docToInvoiceHistory), invRes.ok);
    mergeIntoStorage('packing_history', packRes.data.map(docToPackingHistory), packRes.ok);
    mergeIntoStorage('purchase_history', purchRes.data.map(docToPurchaseHistory), purchRes.ok);

    const [custRes, suppRes, consRes] = await Promise.all([
      fetchAll<D1Customer>('/api/customers?type=customer', 'customers'),
      fetchAll<D1Customer>('/api/customers?type=supplier', 'customers'),
      fetchAll<D1Customer>('/api/customers?type=consignee', 'customers'),
    ]);

    mergeIntoStorage('customer_management', custRes.data.map((c) => d1CustomerToLocal(c, 'customer')), custRes.ok);
    mergeIntoStorage('supplier_management', suppRes.data.map((c) => d1CustomerToLocal(c, 'supplier')), suppRes.ok);
    mergeIntoStorage('consignee_management', consRes.data.map((c) => d1CustomerToLocal(c, 'consignee')), consRes.ok);

    console.log('[d1Pull] 同步完成');
  } catch (err) {
    console.warn('[d1Pull] 同步失败（不影响现有功能）:', err);
  }
}
