import { getLocalStorageJSON, setLocalStorage } from '@/utils/safeLocalStorage';
import type { InquiryRecord } from '../types';

const STORAGE_KEY = 'inquiry_records';
const DELETED_KEY = 'inquiry_deleted_ids';  // id → deletedAt ISO string
const PENDING_SYNC_KEY = 'inquiry_pending_syncs';
const SYNC_STATUS_EVENT = 'inquiry-sync-status-change';
const SYNC_WATERMARK_KEY_FULL = 'inquiry_sync_watermark_full';
const SYNC_WATERMARK_KEY_RESTRICTED = 'inquiry_sync_watermark_restricted';
const LAST_FULL_SYNC_AT_KEY_FULL = 'inquiry_last_full_sync_at_full';
const LAST_FULL_SYNC_AT_KEY_RESTRICTED = 'inquiry_last_full_sync_at_restricted';
const API_BASE = '/api/inquiry';

type DeletedMap = Record<string, string>;
type SyncAction = 'create' | 'update' | 'patch' | 'delete';

interface PendingSyncOp {
  opId: string;
  action: SyncAction;
  recordId: string;
  payload?: Partial<InquiryRecord>;
  createdAt: string;
  attempts: number;
  lastTriedAt?: string;
  lastError?: string;
}

export interface InquirySyncStatus {
  pendingCount: number;
  lastError: string | null;
  lastFailedAt: string | null;
}

/**
 * JSON.stringify 会静默丢弃值为 undefined 的 key（整个 key 都不出现在报文里），
 * 服务端因此完全无法区分"这个字段没传"和"这个字段被清空了"。字段真正被清空时
 * （比如执行情况的"清除"按钮 onSave(undefined, undefined)），会导致服务端保留旧值，
 * 本地清空后一刷新/一同步又被旧值覆盖回来。这里在真正序列化前把 undefined 显式转成
 * null——null 会被 JSON.stringify 保留，worker.ts 的 `{...existingData, ...body}` 合并
 * 逻辑本来就会用 null 正确覆盖旧值，不需要改动服务端。
 * 只转换payload 对象里"确实存在"的 key（Object.entries 只会枚举自身可枚举属性），
 * 不会影响调用方根本没提及的字段——那些字段本就不在 payload 里，属于"partial patch
 * 未提及=不动"，而不是"undefined=清空"。
 */
function normalizeSyncPayload(payload: Partial<InquiryRecord> | undefined): Record<string, unknown> {
  if (!payload) return {};
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [key, value === undefined ? null : value])
  );
}

function isRemoteNewer(remote: InquiryRecord, local: InquiryRecord): boolean {
  const remoteTime = new Date(remote.updatedAt).getTime();
  const localTime = new Date(local.updatedAt).getTime();
  return Number.isFinite(remoteTime) && (!Number.isFinite(localTime) || remoteTime > localTime);
}

function loadPendingQueue(): PendingSyncOp[] {
  return getLocalStorageJSON<PendingSyncOp[]>(PENDING_SYNC_KEY, []);
}

function notifySyncStatusChange(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(SYNC_STATUS_EVENT));
}

function savePendingQueue(queue: PendingSyncOp[]): void {
  setLocalStorage(PENDING_SYNC_KEY, queue);
  notifySyncStatusChange();
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '未知错误';
}

function getLatestFullLocalRecord(recordId: string): InquiryRecord | null {
  return getLocalStorageJSON<InquiryRecord[]>(STORAGE_KEY, [])
    .find((record) => record.id === recordId) ?? null;
}

function buildPendingOp(
  action: SyncAction,
  recordId: string,
  payload?: Partial<InquiryRecord>
): PendingSyncOp {
  return {
    opId: `${recordId}-${action}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    action,
    recordId,
    payload,
    createdAt: new Date().toISOString(),
    attempts: 0,
  };
}

function compactWithNewOp(queue: PendingSyncOp[], op: PendingSyncOp): PendingSyncOp[] {
  const sameRecord = queue.filter((item) => item.recordId === op.recordId);
  const otherRecords = queue.filter((item) => item.recordId !== op.recordId);

  if (op.action === 'delete') {
    return [...otherRecords, op];
  }

  const deletePending = sameRecord.find((item) => item.action === 'delete');
  if (deletePending) {
    // 本机已排队删除的记录，不允许后续旧编辑把它重新推回 D1。
    return [...otherRecords, deletePending];
  }

  const fullPending = sameRecord.find(
    (item) => item.action === 'create' || item.action === 'update'
  );
  if (fullPending && op.action === 'patch') {
    return [
      ...otherRecords,
      {
        ...fullPending,
        payload: { ...fullPending.payload, ...op.payload },
      },
    ];
  }

  if (op.action === 'patch') {
    const patchPending = sameRecord.find((item) => item.action === 'patch');
    if (patchPending) {
      return [
        ...otherRecords,
        {
          ...patchPending,
          payload: { ...patchPending.payload, ...op.payload },
        },
      ];
    }
  }

  return [...otherRecords, op];
}

function enqueueSync(op: PendingSyncOp): PendingSyncOp {
  const queue = compactWithNewOp(loadPendingQueue(), op);
  const queuedOp = queue.find((item) => item.recordId === op.recordId) ?? op;
  savePendingQueue(queue);
  return queuedOp;
}

function removePendingOp(opId: string): void {
  savePendingQueue(loadPendingQueue().filter((item) => item.opId !== opId));
}

function updatePendingOp(opId: string, patch: Partial<PendingSyncOp>): void {
  savePendingQueue(
    loadPendingQueue().map((item) =>
      item.opId === opId ? { ...item, ...patch } : item
    )
  );
}

async function executeSyncOp(op: PendingSyncOp): Promise<void> {
  let res: Response;

  if (op.action === 'delete') {
    res = await fetch(`${API_BASE}/${encodeURIComponent(op.recordId)}`, { method: 'DELETE' });
  } else if (op.action === 'create') {
    res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(normalizeSyncPayload(op.payload)),
    });
  } else {
    res = await fetch(`${API_BASE}/${encodeURIComponent(op.recordId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(normalizeSyncPayload(op.payload)),
    });
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`);
  }
}

async function trySyncOp(op: PendingSyncOp): Promise<boolean> {
  try {
    await executeSyncOp(op);
    removePendingOp(op.opId);
    return true;
  } catch (error) {
    const now = new Date().toISOString();
    const message = getErrorMessage(error);
    console.warn(`[inquirySync] ${op.action} ${op.recordId} failed: ${message}`);
    updatePendingOp(op.opId, {
      attempts: op.attempts + 1,
      lastTriedAt: now,
      lastError: message,
    });
    return false;
  }
}

function enqueueAndTry(action: SyncAction, recordId: string, payload?: Partial<InquiryRecord>): void {
  const op = enqueueSync(buildPendingOp(action, recordId, payload));
  void trySyncOp(op);
}

export const inquiryService = {
  getAll(): InquiryRecord[] {
    return getLocalStorageJSON<InquiryRecord[]>(STORAGE_KEY, []);
  },

  save(records: InquiryRecord[]): void {
    setLocalStorage(STORAGE_KEY, records);
  },

  add(record: InquiryRecord): InquiryRecord[] {
    const records = this.getAll();
    const updated = [...records, record];
    this.save(updated);
    return updated;
  },

  update(id: string, patch: Partial<InquiryRecord>): InquiryRecord[] {
    const records = this.getAll().map((record) =>
      record.id === id
        ? { ...record, ...patch, updatedAt: new Date().toISOString() }
        : record
    );
    this.save(records);
    return records;
  },

  remove(id: string): InquiryRecord[] {
    // 记录删除 ID，防止 mergeFromD1 将其从 D1 重新拉回
    const deleted = getLocalStorageJSON<DeletedMap>(DELETED_KEY, {});
    deleted[id] = new Date().toISOString();
    setLocalStorage(DELETED_KEY, deleted);

    const records = this.getAll().filter((record) => record.id !== id);
    this.save(records);
    return records;
  },

  /**
   * TASK-128：since 传入上次已知的服务端水位（meta.maxUpdatedAt），只拉这之后变化过的记录，
   * 用于增量同步。不传 since 时行为不变，仍是整表拉取。
   */
  async pullFromD1(since?: string): Promise<InquiryRecord[]> {
    const PAGE_SIZE = 2000;
    const all: InquiryRecord[] = [];
    let offset = 0;
    const sinceQuery = since ? `&since=${encodeURIComponent(since)}` : '';

    try {
      while (true) {
        const res = await fetch(
          `${API_BASE}?limit=${PAGE_SIZE}&offset=${offset}${sinceQuery}`,
          { cache: 'no-store' }
        );
        if (!res.ok) break;

        const data = await res.json() as { records?: InquiryRecord[]; total?: number };
        const page = Array.isArray(data.records) ? data.records : [];
        all.push(...page);

        // 若本页不足一页，或已达到服务端报告的总数，则结束
        if (page.length < PAGE_SIZE) break;
        if (typeof data.total === 'number' && all.length >= data.total) break;

        offset += PAGE_SIZE;
      }
    } catch {
      // 网络失败时返回已拉到的部分，不清空
    }

    return all;
  },

  async getMeta(): Promise<{ count: number; maxUpdatedAt: string | null }> {
    try {
      const res = await fetch(`${API_BASE}/meta`, { cache: 'no-store' });
      if (!res.ok) return { count: -1, maxUpdatedAt: null };
      return await res.json() as { count: number; maxUpdatedAt: string | null };
    } catch {
      return { count: -1, maxUpdatedAt: null };
    }
  },

  getSyncWatermark(isFullView: boolean): string | null {
    if (typeof window === 'undefined') return null;
    const key = isFullView ? SYNC_WATERMARK_KEY_FULL : SYNC_WATERMARK_KEY_RESTRICTED;
    return localStorage.getItem(key);
  },

  setSyncWatermark(isFullView: boolean, iso: string): void {
    if (typeof window === 'undefined') return;
    const key = isFullView ? SYNC_WATERMARK_KEY_FULL : SYNC_WATERMARK_KEY_RESTRICTED;
    localStorage.setItem(key, iso);
  },

  getLastFullSyncAt(isFullView: boolean): number {
    if (typeof window === 'undefined') return 0;
    const key = isFullView ? LAST_FULL_SYNC_AT_KEY_FULL : LAST_FULL_SYNC_AT_KEY_RESTRICTED;
    return Number(localStorage.getItem(key) || 0);
  },

  setLastFullSyncAt(isFullView: boolean, ts: number): void {
    if (typeof window === 'undefined') return;
    const key = isFullView ? LAST_FULL_SYNC_AT_KEY_FULL : LAST_FULL_SYNC_AT_KEY_RESTRICTED;
    localStorage.setItem(key, String(ts));
  },

  getSyncStatus(): InquirySyncStatus {
    const queue = loadPendingQueue();
    const lastFailed = [...queue].reverse().find((op) => op.lastError);
    return {
      pendingCount: queue.length,
      lastError: lastFailed?.lastError ?? null,
      lastFailedAt: lastFailed?.lastTriedAt ?? null,
    };
  },

  subscribeSyncStatus(callback: () => void): () => void {
    if (typeof window === 'undefined') return () => {};
    window.addEventListener(SYNC_STATUS_EVENT, callback);
    return () => window.removeEventListener(SYNC_STATUS_EVENT, callback);
  },

  getPendingSyncIds(): Set<string> {
    return new Set(loadPendingQueue().map((op) => op.recordId));
  },

  async flushPendingSyncs(): Promise<void> {
    const queue = loadPendingQueue();
    if (queue.length === 0) return;

    for (const op of queue) {
      const latest = loadPendingQueue().find((item) => item.opId === op.opId);
      if (!latest) continue;
      await trySyncOp(latest);
    }
  },

  syncToD1(record: InquiryRecord): void {
    enqueueAndTry('create', record.id, record);
  },

  updateInD1(record: InquiryRecord): void {
    enqueueAndTry('update', record.id, record);
  },

  patchInD1(id: string, patch: Partial<InquiryRecord>): void {
    const pendingIds = this.getPendingSyncIds();
    const fullRecord = pendingIds.has(id) ? getLatestFullLocalRecord(id) : null;
    enqueueAndTry(fullRecord ? 'update' : 'patch', id, fullRecord ?? patch);
  },

  deleteFromD1(id: string): void {
    enqueueAndTry('delete', id);
  },

  mergeFromD1(d1Records: InquiryRecord[]): InquiryRecord[] {
    // 清理 30 天前的删除记录，避免 localStorage 无限增长
    const rawDeleted = getLocalStorageJSON<DeletedMap>(DELETED_KEY, {});
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const deletedIds: DeletedMap = Object.fromEntries(
      Object.entries(rawDeleted).filter(([, ts]) => new Date(ts).getTime() > cutoff)
    );
    setLocalStorage(DELETED_KEY, deletedIds);

    const local = this.getAll();
    const localMap = new Map(local.map((record) => [record.id, record]));
    const pendingIds = this.getPendingSyncIds();

    for (const d1Record of d1Records) {
      if (pendingIds.has(d1Record.id)) continue;
      // D1 软删除标记 → 从本地移除，并写入 deletedIds 防止被重新拉回
      if (d1Record.status === 'deleted') {
        localMap.delete(d1Record.id);
        deletedIds[d1Record.id] = d1Record.updatedAt;
        setLocalStorage(DELETED_KEY, deletedIds);
        continue;
      }
      // 本地已删除的记录不允许 D1 旧版本重新覆盖
      if (deletedIds[d1Record.id]) continue;
      const localRecord = localMap.get(d1Record.id);
      if (!localRecord || isRemoteNewer(d1Record, localRecord)) {
        // 字段级合并而非整条覆盖：受限视图（如采购部登记）拉取到的记录会被服务端
        // 裁剪掉 quotedStatuses/inquirer/customerId 等字段（键本身缺失，而非 undefined），
        // 若直接整条替换会用"残缺记录"冲掉本地已缓存的完整记录，污染询报价登记等
        // 依赖完整字段的页面。这里用 spread 只覆盖 d1Record 真正带回来的字段。
        localMap.set(d1Record.id, localRecord ? { ...localRecord, ...d1Record } : d1Record);
      } else if (
        !Object.prototype.hasOwnProperty.call(localRecord, 'quotedStatuses') &&
        Object.prototype.hasOwnProperty.call(d1Record, 'quotedStatuses')
      ) {
        // 自愈：本地记录此前被受限视图（字段被裁剪）的一次同步污染过，缺失
        // quotedStatuses 等字段。若这次是完整视图的拉取（带回了该字段），即便
        // updatedAt 没有变化（没有发生新编辑）也要补全，否则残缺记录会一直卡在本地。
        localMap.set(d1Record.id, { ...localRecord, ...d1Record });
      }
    }

    const merged = Array.from(localMap.values()).sort((a, b) =>
      b.inquiryNo.localeCompare(a.inquiryNo)
    );
    this.save(merged);
    return merged;
  },

  /**
   * 用于 mergeLocal:false 场景（如采购部登记/采购订单表）：这些页面只需要展示
   * "当前 D1 最新数据"，不需要 mergeFromD1 的时间戳/pending 比较逻辑。但拉取结果
   * 可能是受限视图（字段被服务端裁剪），不能直接整条 save() 覆盖共享本地缓存
   * inquiry_records —— 否则会冲掉其它字段（quotedStatuses 等），导致询报价登记表
   * 读到缺字段的记录而崩溃。这里对已存在的本地记录做字段级合并，保留响应中缺失的字段。
   *
   * 2026-07-10 修复（TASK-124）：跟 mergeFromD1 一样要跳过有 pending 同步操作的记录，否则会出现
   * "订单状态表能看到刚编辑的客户订单号，采购订单表看不到"的问题——用户在 /order 编辑了
   * orderCustomerNo，PUT 请求还在排队/失败重试中（本地已落盘，D1 还是旧数据），这时如果
   * 打开 /purchase-order-table，它独立拉一次 D1（还是旧的、没有该字段），在没有 pendingIds
   * 保护的情况下会用 D1 的旧值覆盖本地这条记录，把刚编辑的值从共享 store 里冲掉，导致两个
   * 页面读到的是同一份被污染后的记录（不是两边渲染逻辑不一致，是共享数据被覆盖了）。
   *
   * 2026-07-10 改写（TASK-128）：原实现是"以 d1Records 为源的 filter/map 管道"，返回值只包含
   * 这次响应里出现过的记录——整表拉取下没问题（缺席=D1 没有=已删除），但配合增量同步
   * （useInquirySync 只传近期变化过的记录）就会导致列表里只剩这次变化的几条，其余历史记录全部
   * 从共享 store 里消失。改成跟 mergeFromD1 一样的 Map-based upsert：以本地已有记录为底，只对
   * d1Records 里出现的 id 做更新/删除，没出现在这次响应里的本地记录原样保留，这样无论传入的是
   * 整表还是增量结果集都是安全的。删除信号从"filter 掉、管道里消失"改成显式 localMap.delete；
   * pending 保护从"filter 掉再 concat 本地版本回来"改成"跳过合并、localMap 里保留原样"，效果一致。
   */
  mergeFieldsOnly(d1Records: InquiryRecord[]): InquiryRecord[] {
    const local = this.getAll();
    const localMap = new Map(local.map((record) => [record.id, record]));
    const pendingIds = this.getPendingSyncIds();

    for (const d1Record of d1Records) {
      // 有 pending 同步操作的记录：不参与字段合并，保留 localMap 里的本地版本原样
      if (pendingIds.has(d1Record.id)) continue;
      if (d1Record.status === 'deleted') {
        localMap.delete(d1Record.id);
        continue;
      }
      const localRecord = localMap.get(d1Record.id);
      // 字段级合并而非整条覆盖：受限视图响应可能裁剪了 quotedStatuses 等字段，
      // 只用 d1Record 真正带回来的字段覆盖，不清空本地已缓存的其它字段。
      localMap.set(d1Record.id, localRecord ? { ...localRecord, ...d1Record } : d1Record);
    }

    return Array.from(localMap.values())
      .filter((record) => record.status !== 'deleted')
      .sort((a, b) => b.inquiryNo.localeCompare(a.inquiryNo));
  },

  pushLocalToD1(d1Records: InquiryRecord[]): void {
    const d1Map = new Map(d1Records.map((record) => [record.id, record]));
    const pendingIds = this.getPendingSyncIds();
    const local = this.getAll();

    for (const localRecord of local) {
      const d1Record = d1Map.get(localRecord.id);
      if (!d1Record) {
        if (pendingIds.has(localRecord.id)) {
          this.syncToD1(localRecord);
        } else {
          console.warn(
            `[inquirySync] 跳过未入队的本地独有记录 ${localRecord.id} (${localRecord.inquiryNo})，避免把历史幽灵记录推到 D1`
          );
        }
      } else if (d1Record.status !== 'deleted' && isRemoteNewer(localRecord, d1Record)) {
        // D1 已软删除的记录不允许本地旧版本覆盖回来
        this.updateInD1(localRecord);
      }
    }
  },
};
