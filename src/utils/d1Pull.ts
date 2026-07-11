/**
 * 从 D1 API 拉取数据并合并到 localStorage。
 * 合并规则：D1 请求成功后，本地缺失的远端记录会补入；同 id 记录按
 * updatedAt/updated_at 取较新版本，待提交队列中的记录临时保留。
 * 远端已删除的本地旧记录会移除。
 * 仅在用户已登录时通过 /api/documents 和 /api/customers 代理调用。
 */

import {
  d1SyncDocument,
  flushPendingQueue,
  getD1ActiveUserId,
  getDeletedDocIds,
  getDocsLastFullSyncAt,
  getDocsLastSyncAttemptAt,
  getDocSyncWatermark,
  getPendingIds,
  recordDeletedDocId,
  setDocsLastFullSyncAt,
  setDocsLastSyncAttemptAt,
  setDocSyncWatermark,
  type D1DocType,
} from '@/utils/d1Sync';
import { persistHistoryToStorage } from '@/utils/storageQuotaManager';

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

type LocalStorageItem = {
  id: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
};

async function fetchAll<T>(
  url: string,
  key: string,
  since?: string,
): Promise<{ data: T[]; ok: boolean }> {
  const results: T[] = [];
  let offset = 0;
  const limit = 500;
  let ok = false;

  while (true) {
    const sinceQuery = since ? `&since=${encodeURIComponent(since)}` : '';
    const resp = await fetch(`${url}&limit=${limit}&offset=${offset}${sinceQuery}`);
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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function getQuotationLocalType(item: Record<string, unknown>): D1DocType {
  const data = asRecord(item.data);
  if (data.mode === 'domestic') return 'domestic';

  const type = getString(item.type);
  if (type === 'quotation' || type === 'confirmation' || type === 'domestic') {
    return type;
  }

  return 'quotation';
}

function normalizeTimestamp(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;

  const trimmed = value.trim();
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)
    ? `${trimmed.replace(' ', 'T')}Z`
    : trimmed;

  return Number.isNaN(new Date(normalized).getTime()) ? undefined : normalized;
}

function getDocumentTimestamp(doc: D1Doc, key: 'createdAt' | 'updatedAt', dbKey: 'created_at' | 'updated_at'): string {
  const data = asRecord(doc.data);
  const nestedData = asRecord(data.data);

  return normalizeTimestamp(data[key])
    ?? normalizeTimestamp(nestedData[key])
    ?? normalizeTimestamp(doc[dbKey])
    ?? new Date().toISOString();
}

/**
 * 将本地各类型单据历史中 D1 尚未收录的记录推送到 D1。
 * 参照 inquiryService.pushLocalToD1 模式。
 * 只推 d1 尚未有、且本机未删除、且不在待提交队列中的记录。
 */
async function pushLocalDocsToD1(deletedIds: Set<string>): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!getD1ActiveUserId()) return;
  const pending = getPendingIds();

  const quotLocal = readLocalArray('quotation_history');
  const invLocal = readLocalArray('invoice_history');
  const packLocal = readLocalArray('packing_history');
  const purchLocal = readLocalArray('purchase_history');

  const [qRes, cRes, dRes, iRes, pkRes, puRes] = await Promise.all([
    fetchAll<{ id: string }>('/api/documents?type=quotation&status=all', 'documents'),
    fetchAll<{ id: string }>('/api/documents?type=confirmation&status=all', 'documents'),
    fetchAll<{ id: string }>('/api/documents?type=domestic&status=all', 'documents'),
    fetchAll<{ id: string }>('/api/documents?type=invoice&status=all', 'documents'),
    fetchAll<{ id: string }>('/api/documents?type=packing&status=all', 'documents'),
    fetchAll<{ id: string }>('/api/documents?type=purchase&status=all', 'documents'),
  ]);

  const quotD1Ids = new Set([...qRes.data, ...cRes.data, ...dRes.data].map((doc) => doc.id));
  const invD1Ids = new Set(iRes.data.map((doc) => doc.id));
  const packD1Ids = new Set(pkRes.data.map((doc) => doc.id));
  const purchD1Ids = new Set(puRes.data.map((doc) => doc.id));

  const shouldPush = (id: string, d1Ids: Set<string>, d1Ok: boolean) =>
    d1Ok && Boolean(id) && !d1Ids.has(id) && !pending.has(id) && !deletedIds.has(id);

  console.log(
    `[d1Push] 本地记录: quotation+conf=${quotLocal.length} invoice=${invLocal.length}` +
    ` packing=${packLocal.length} purchase=${purchLocal.length}` +
    ` | D1已有: quot+conf+domestic=${quotD1Ids.size} invoice=${invD1Ids.size}` +
    ` packing=${packD1Ids.size} purchase=${purchD1Ids.size}`,
  );

  for (const item of quotLocal) {
    const id = getString(item.id);
    if (!shouldPush(id, quotD1Ids, qRes.ok && cRes.ok && dRes.ok)) continue;

    const type = getQuotationLocalType(item);
    d1SyncDocument('create', {
      id,
      type,
      doc_no: getString(item.quotationNo),
      customer_name: getString(item.customerName),
      total_amount: getNumber(item.totalAmount),
      currency: getString(item.currency) || 'USD',
      created_at: getString(item.createdAt),
      updated_at: getString(item.updatedAt),
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
      created_at: getString(item.createdAt),
      updated_at: getString(item.updatedAt),
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
      created_at: getString(item.createdAt),
      updated_at: getString(item.updatedAt),
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
      created_at: getString(item.createdAt),
      updated_at: getString(item.updatedAt),
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
  isFullSync: boolean,
): void {
  // D1 请求失败时不动 localStorage，避免误删本地数据
  if (!d1Ok) return;

  const raw = localStorage.getItem(storageKey);
  const existing: T[] = raw ? JSON.parse(raw) : [];
  const existingById = new Map(existing.map((item) => [item.id, item]));
  const activeIncoming = incoming.filter((item) => !deletedIds.has(item.id));

  const map = new Map<string, T>();

  for (const remote of activeIncoming) {
    const local = existingById.get(remote.id);

    if (local && pendingIds.has(remote.id)) {
      // 本地这条记录还有未确认落地的写入，当前 GET 快照可能落后于本地保存。
      map.set(remote.id, local);
      continue;
    }

    if (local) {
      const localTime = new Date(local.updatedAt ?? local.updated_at ?? 0).getTime();
      const remoteTime = new Date(remote.updatedAt ?? remote.updated_at ?? 0).getTime();
      map.set(remote.id, remoteTime > localTime ? remote : local);
    } else {
      map.set(remote.id, remote);
    }
  }

  for (const item of existing) {
    if (deletedIds.has(item.id)) continue;

    if (map.has(item.id)) continue;

    if (!isFullSync) {
      // 增量响应里没出现只代表近期没变化，不能据此推断远端已删除。
      map.set(item.id, item);
      continue;
    }

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

  if (!persistHistoryToStorage(storageKey, merged)) {
    console.warn(`[d1Pull] 合并写入失败: ${storageKey}`);
  }
}

const MIN_SYNC_INTERVAL_MS = 60_000;
const FORCE_FULL_SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;

function getAllDocuments(results: Array<{ data: D1Doc[] }>): D1Doc[] {
  return results.flatMap((result) => result.data);
}

function getMaxUpdatedAt(documents: D1Doc[], baseline?: string): string | null {
  let maxValue = baseline ?? null;
  let maxTime = baseline ? Date.parse(baseline) : Number.NEGATIVE_INFINITY;

  for (const doc of documents) {
    const time = Date.parse(doc.updated_at);
    if (!Number.isNaN(time) && time > maxTime) {
      maxTime = time;
      maxValue = doc.updated_at;
    }
  }

  return maxValue;
}

function getRemoteDeletedIds(documents: D1Doc[]): Set<string> {
  return new Set(
    documents
      .filter((doc) => doc.status === 'deleted')
      .map((doc) => doc.id),
  );
}

function docToQuotationHistory(doc: D1Doc) {
  return {
    id: doc.id,
    type: doc.type as 'quotation' | 'confirmation' | 'domestic',
    quotationNo: doc.doc_no || '',
    customerName: doc.customer_name || '',
    totalAmount: doc.total_amount || 0,
    currency: doc.currency || 'USD',
    createdAt: getDocumentTimestamp(doc, 'createdAt', 'created_at'),
    updatedAt: getDocumentTimestamp(doc, 'updatedAt', 'updated_at'),
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
    createdAt: getDocumentTimestamp(doc, 'createdAt', 'created_at'),
    updatedAt: getDocumentTimestamp(doc, 'updatedAt', 'updated_at'),
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
    createdAt: getDocumentTimestamp(doc, 'createdAt', 'created_at'),
    updatedAt: getDocumentTimestamp(doc, 'updatedAt', 'updated_at'),
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
    createdAt: getDocumentTimestamp(doc, 'createdAt', 'created_at'),
    updatedAt: getDocumentTimestamp(doc, 'updatedAt', 'updated_at'),
    data: doc.data,
  };
}

async function fullSyncFromD1(): Promise<void> {
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

  const [quotRes, confRes, domesticRes, invRes, packRes, purchRes] = await Promise.all([
    fetchAll<D1Doc>('/api/documents?type=quotation&status=all', 'documents'),
    fetchAll<D1Doc>('/api/documents?type=confirmation&status=all', 'documents'),
    fetchAll<D1Doc>('/api/documents?type=domestic&status=all', 'documents'),
    fetchAll<D1Doc>('/api/documents?type=invoice&status=all', 'documents'),
    fetchAll<D1Doc>('/api/documents?type=packing&status=all', 'documents'),
    fetchAll<D1Doc>('/api/documents?type=purchase&status=all', 'documents'),
  ]);

  const results = [quotRes, confRes, domesticRes, invRes, packRes, purchRes];
  const allDocuments = getAllDocuments(results);
  const remoteDeletedIds = getRemoteDeletedIds(allDocuments);
  remoteDeletedIds.forEach(recordDeletedDocId);
  const effectiveDeletedIds = new Set([
    ...Array.from(deletedIds),
    ...Array.from(remoteDeletedIds),
  ]);

  console.log(
    `[d1Pull] D1数据: quotation=${quotRes.data.length} confirmation=${confRes.data.length}` +
    ` domestic=${domesticRes.data.length} invoice=${invRes.data.length} packing=${packRes.data.length} purchase=${purchRes.data.length}` +
    ` (ok=${quotRes.ok})`,
  );

  mergeIntoStorage(
    'quotation_history',
    [...quotRes.data, ...confRes.data, ...domesticRes.data].map(docToQuotationHistory),
    quotRes.ok && confRes.ok && domesticRes.ok,
    pendingIds,
    effectiveDeletedIds,
    true,
  );
  mergeIntoStorage('invoice_history', invRes.data.map(docToInvoiceHistory), invRes.ok, pendingIds, effectiveDeletedIds, true);
  mergeIntoStorage('packing_history', packRes.data.map(docToPackingHistory), packRes.ok, pendingIds, effectiveDeletedIds, true);
  mergeIntoStorage('purchase_history', purchRes.data.map(docToPurchaseHistory), purchRes.ok, pendingIds, effectiveDeletedIds, true);

  if (results.every((result) => result.ok)) {
    const maxUpdatedAt = getMaxUpdatedAt(allDocuments);
    if (maxUpdatedAt) setDocSyncWatermark(maxUpdatedAt);
    setDocsLastFullSyncAt(Date.now());
  }

  const remaining = getPendingIds().size;
  console.log(`[d1Pull] 同步完成${remaining > 0 ? `，${remaining} 条待提交（网络不可达）` : ''}`);
}

async function incrementalSyncFromD1(since: string): Promise<void> {
  await flushPendingQueue();

  const pendingIds = getPendingIds();
  const deletedIds = getDeletedDocIds();
  const [quotRes, confRes, domesticRes, invRes, packRes, purchRes] = await Promise.all([
    fetchAll<D1Doc>('/api/documents?type=quotation&status=all', 'documents', since),
    fetchAll<D1Doc>('/api/documents?type=confirmation&status=all', 'documents', since),
    fetchAll<D1Doc>('/api/documents?type=domestic&status=all', 'documents', since),
    fetchAll<D1Doc>('/api/documents?type=invoice&status=all', 'documents', since),
    fetchAll<D1Doc>('/api/documents?type=packing&status=all', 'documents', since),
    fetchAll<D1Doc>('/api/documents?type=purchase&status=all', 'documents', since),
  ]);

  const results = [quotRes, confRes, domesticRes, invRes, packRes, purchRes];
  const allDocuments = getAllDocuments(results);
  const remoteDeletedIds = getRemoteDeletedIds(allDocuments);
  remoteDeletedIds.forEach(recordDeletedDocId);
  const effectiveDeletedIds = new Set([...Array.from(deletedIds), ...Array.from(remoteDeletedIds)]);

  mergeIntoStorage(
    'quotation_history',
    [...quotRes.data, ...confRes.data, ...domesticRes.data].map(docToQuotationHistory),
    quotRes.ok && confRes.ok && domesticRes.ok,
    pendingIds,
    effectiveDeletedIds,
    false,
  );
  mergeIntoStorage('invoice_history', invRes.data.map(docToInvoiceHistory), invRes.ok, pendingIds, effectiveDeletedIds, false);
  mergeIntoStorage('packing_history', packRes.data.map(docToPackingHistory), packRes.ok, pendingIds, effectiveDeletedIds, false);
  mergeIntoStorage('purchase_history', purchRes.data.map(docToPurchaseHistory), purchRes.ok, pendingIds, effectiveDeletedIds, false);

  if (results.every((result) => result.ok)) {
    const maxUpdatedAt = getMaxUpdatedAt(allDocuments, since);
    if (maxUpdatedAt) setDocSyncWatermark(maxUpdatedAt);
  }

  const remaining = getPendingIds().size;
  console.log(`[d1Pull] 增量同步完成${remaining > 0 ? `，${remaining} 条待提交（网络不可达）` : ''}`);
}

/** 按持久化水位选择全量或增量同步；失败不影响 localStorage 主流程。 */
export async function pullAllFromD1(force = false): Promise<void> {
  if (typeof window === 'undefined') return;

  const now = Date.now();
  if (!force && now - getDocsLastSyncAttemptAt() < MIN_SYNC_INTERVAL_MS) return;
  setDocsLastSyncAttemptAt(now);

  const watermark = getDocSyncWatermark();
  const needsFull = force || !watermark || now - getDocsLastFullSyncAt() > FORCE_FULL_SYNC_INTERVAL_MS;

  try {
    if (needsFull) {
      await fullSyncFromD1();
    } else {
      await incrementalSyncFromD1(watermark);
    }
  } catch (err) {
    console.warn('[d1Pull] 同步失败（不影响现有功能）:', err);
  }
}
