/**
 * 从 D1 API 拉取数据并合并到 localStorage。
 * 合并规则：D1 为权威来源；D1 请求成功后，本地缺失的远端记录会补入，
 * 远端已删除的本地旧记录会移除，待提交队列中的记录临时保留。
 * 仅在用户已登录时通过 /api/documents 和 /api/customers 代理调用。
 */

import type { Contact } from '@/features/customer/types';
import {
  d1SyncDocument,
  flushPendingQueue,
  getDeletedDocIds,
  getPendingIds,
  recordDeletedDocId,
  type D1DocType,
} from '@/utils/d1Sync';

type D1Doc = {
  id: string;
  type: string;
  doc_no: string;
  customer_name: string | null;
  total_amount: number | null;
  currency: string;
  status: string;
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

function readLocalArray(storageKey: string): Array<Record<string, unknown>> {
  try {
    return JSON.parse(localStorage.getItem(storageKey) || '[]');
  } catch {
    return [];
  }
}

function getString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function getNumber(value: unknown): number {
  return typeof value === 'number' ? value : 0;
}

/**
 * 将本地各类型单据历史中 D1 尚未收录的记录推送到 D1。
 * 参照 inquiryService.pushLocalToD1 模式。
 * 只推 d1 尚未有、且本机未删除、且不在待提交队列中的记录。
 */
async function pushLocalDocsToD1(deletedIds: Set<string>): Promise<void> {
  if (typeof window === 'undefined') return;
  const pending = getPendingIds();

  const quotLocal = readLocalArray('quotation_history');
  const invLocal = readLocalArray('invoice_history');
  const packLocal = readLocalArray('packing_history');
  const purchLocal = readLocalArray('purchase_history');

  const [qRes, cRes, iRes, pkRes, puRes] = await Promise.all([
    fetchAll<{ id: string }>('/api/documents?type=quotation&status=all', 'documents'),
    fetchAll<{ id: string }>('/api/documents?type=confirmation&status=all', 'documents'),
    fetchAll<{ id: string }>('/api/documents?type=invoice&status=all', 'documents'),
    fetchAll<{ id: string }>('/api/documents?type=packing&status=all', 'documents'),
    fetchAll<{ id: string }>('/api/documents?type=purchase&status=all', 'documents'),
  ]);

  const quotD1Ids = new Set([...qRes.data, ...cRes.data].map((doc) => doc.id));
  const invD1Ids = new Set(iRes.data.map((doc) => doc.id));
  const packD1Ids = new Set(pkRes.data.map((doc) => doc.id));
  const purchD1Ids = new Set(puRes.data.map((doc) => doc.id));

  const shouldPush = (id: string, d1Ids: Set<string>, d1Ok: boolean) =>
    d1Ok && Boolean(id) && !d1Ids.has(id) && !pending.has(id) && !deletedIds.has(id);

  console.log(
    `[d1Push] 本地记录: quotation+conf=${quotLocal.length} invoice=${invLocal.length}` +
    ` packing=${packLocal.length} purchase=${purchLocal.length}` +
    ` | D1已有: quot+conf=${quotD1Ids.size} invoice=${invD1Ids.size}` +
    ` packing=${packD1Ids.size} purchase=${purchD1Ids.size}`,
  );

  for (const item of quotLocal) {
    const id = getString(item.id);
    if (!shouldPush(id, quotD1Ids, qRes.ok && cRes.ok)) continue;

    const type = (getString(item.type) || 'quotation') as D1DocType;
    d1SyncDocument('create', {
      id,
      type,
      doc_no: getString(item.quotationNo),
      customer_name: getString(item.customerName),
      total_amount: getNumber(item.totalAmount),
      currency: getString(item.currency) || 'USD',
      data: item.data,
    });
  }

  for (const item of invLocal) {
    const id = getString(item.id);
    if (!shouldPush(id, invD1Ids, iRes.ok)) continue;

    d1SyncDocument('create', {
      id,
      type: 'invoice',
      doc_no: getString(item.invoiceNo),
      customer_name: getString(item.customerName),
      total_amount: getNumber(item.totalAmount),
      currency: getString(item.currency) || 'USD',
      data: item,
    });
  }

  for (const item of packLocal) {
    const id = getString(item.id);
    if (!shouldPush(id, packD1Ids, pkRes.ok)) continue;

    d1SyncDocument('create', {
      id,
      type: 'packing',
      doc_no: getString(item.invoiceNo),
      customer_name: getString(item.consigneeName),
      total_amount: getNumber(item.totalAmount),
      currency: getString(item.currency) || 'USD',
      data: item.data,
    });
  }

  for (const item of purchLocal) {
    const id = getString(item.id);
    if (!shouldPush(id, purchD1Ids, puRes.ok)) continue;

    d1SyncDocument('create', {
      id,
      type: 'purchase',
      doc_no: getString(item.orderNo),
      customer_name: getString(item.supplierName),
      total_amount: getNumber(item.totalAmount),
      currency: getString(item.currency) || 'USD',
      data: item.data,
    });
  }
}

function mergeIntoStorage<T extends LocalStorageItem>(
  storageKey: string,
  incoming: T[],
  d1Ok: boolean,
  pendingIds: Set<string>,
  deletedIds: Set<string>,
): void {
  // D1 请求失败时不动 localStorage，避免误删本地数据
  if (!d1Ok) return;

  const raw = localStorage.getItem(storageKey);
  const existing: T[] = raw ? JSON.parse(raw) : [];
  const activeIncoming = incoming.filter((item) => !deletedIds.has(item.id));
  const incomingIds = new Set(activeIncoming.map((item) => item.id));

  // D1 为权威来源，先放入远端 active 记录；本机已删除 id 优先过滤，避免远端删除延迟时被拉回。
  const map = new Map<string, T>(activeIncoming.map((item) => [item.id, item]));

  for (const item of existing) {
    if (deletedIds.has(item.id)) continue;

    if (incomingIds.has(item.id)) continue; // D1 已有，以 D1 版本为准

    if (pendingIds.has(item.id)) {
      // 仍在待提交队列（本轮 flush 失败）→ 保留本地，等下次重试
      map.set(item.id, item);
    } else {
      // 不在队列且 D1 没有 → 视为已在其他设备删除，不保留
      recordDeletedDocId(item.id);
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
    // 先刷新待提交队列，确保本机改动已写入 D1
    await flushPendingQueue();

    // 取当前仍未成功提交的 id（flush 后仍失败的），merge 时保护它们
    let pendingIds = getPendingIds();
    const deletedIds = getDeletedDocIds();

    // 先推：本地有但 D1 可能没有的记录，防止本地有效记录被下一步 pull 误删
    await pushLocalDocsToD1(deletedIds);
    // pushLocalDocsToD1 内部调用 d1SyncDocument（fire-and-forget + 入队）
    // 再次 flush 确保刚入队的补推请求在 pull 前全部完成
    await flushPendingQueue();
    pendingIds = getPendingIds();

    const [quotRes, confRes, invRes, packRes, purchRes] = await Promise.all([
      fetchAll<D1Doc>('/api/documents?type=quotation&status=all', 'documents'),
      fetchAll<D1Doc>('/api/documents?type=confirmation&status=all', 'documents'),
      fetchAll<D1Doc>('/api/documents?type=invoice&status=all', 'documents'),
      fetchAll<D1Doc>('/api/documents?type=packing&status=all', 'documents'),
      fetchAll<D1Doc>('/api/documents?type=purchase&status=all', 'documents'),
    ]);

    const remoteDeletedIds = new Set(
      [
        ...quotRes.data,
        ...confRes.data,
        ...invRes.data,
        ...packRes.data,
        ...purchRes.data,
      ]
        .filter((doc) => doc.status === 'deleted')
        .map((doc) => doc.id),
    );
    remoteDeletedIds.forEach(recordDeletedDocId);
    const effectiveDeletedIds = new Set([
      ...Array.from(deletedIds),
      ...Array.from(remoteDeletedIds),
    ]);

    console.log(
      `[d1Pull] D1数据: quotation=${quotRes.data.length} confirmation=${confRes.data.length}` +
      ` invoice=${invRes.data.length} packing=${packRes.data.length} purchase=${purchRes.data.length}` +
      ` (ok=${quotRes.ok})`,
    );

    mergeIntoStorage(
      'quotation_history',
      [...quotRes.data, ...confRes.data].map(docToQuotationHistory),
      quotRes.ok && confRes.ok,
      pendingIds,
      effectiveDeletedIds,
    );
    mergeIntoStorage('invoice_history', invRes.data.map(docToInvoiceHistory), invRes.ok, pendingIds, effectiveDeletedIds);
    mergeIntoStorage('packing_history', packRes.data.map(docToPackingHistory), packRes.ok, pendingIds, effectiveDeletedIds);
    mergeIntoStorage('purchase_history', purchRes.data.map(docToPurchaseHistory), purchRes.ok, pendingIds, effectiveDeletedIds);

    const [custRes, suppRes, consRes] = await Promise.all([
      fetchAll<D1Customer>('/api/customers?type=customer', 'customers'),
      fetchAll<D1Customer>('/api/customers?type=supplier', 'customers'),
      fetchAll<D1Customer>('/api/customers?type=consignee', 'customers'),
    ]);

    const noDeletedCustomerIds = new Set<string>();
    mergeIntoStorage('customer_management', custRes.data.map((c) => d1CustomerToLocal(c, 'customer')), custRes.ok, pendingIds, noDeletedCustomerIds);
    mergeIntoStorage('supplier_management', suppRes.data.map((c) => d1CustomerToLocal(c, 'supplier')), suppRes.ok, pendingIds, noDeletedCustomerIds);
    mergeIntoStorage('consignee_management', consRes.data.map((c) => d1CustomerToLocal(c, 'consignee')), consRes.ok, pendingIds, noDeletedCustomerIds);

    const remaining = getPendingIds().size;
    console.log(`[d1Pull] 同步完成${remaining > 0 ? `，${remaining} 条待提交（网络不可达）` : ''}`);
  } catch (err) {
    console.warn('[d1Pull] 同步失败（不影响现有功能）:', err);
  }
}
