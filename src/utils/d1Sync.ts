/**
 * D1 同步帮助函数（带本地待提交队列）。
 *
 * 流程：
 *   1. 操作发起时立即写入本地队列（localStorage d1_pending_syncs）
 *   2. 异步发起 API 请求；成功后从队列中移除
 *   3. 如果请求失败，留在队列等待下次 flushPendingQueue() 重试
 *   4. pullAllFromD1 调用前先执行 flushPendingQueue，确保 D1 有最新数据
 *
 * 业务单据仍以 localStorage 为主存储，D1 是云端权威副本。
 */

export type D1DocType = 'quotation' | 'confirmation' | 'domestic' | 'invoice' | 'packing' | 'purchase';

export interface D1DocumentPayload {
  id: string;
  type: D1DocType;
  doc_no: string;
  customer_name?: string;
  customer_id?: string;
  contact_id?: string;
  total_amount?: number;
  currency?: string;
  created_at?: string;
  updated_at?: string;
  data: unknown;
}

type SyncAction = 'create' | 'update' | 'delete';

interface PendingOp {
  opId: string;
  kind: 'document';
  action: SyncAction;
  payload: D1DocumentPayload;
}

const QUEUE_KEY = 'd1_pending_syncs';
const DELETED_DOC_IDS_KEY = 'd1_deleted_doc_ids';
const ACTIVE_USER_KEY = 'd1_active_user_id';
const DOC_SYNC_WATERMARK_KEY = 'd1_docs_sync_watermark';
const DOC_SYNC_LAST_FULL_AT_KEY = 'd1_docs_last_full_sync_at';
const DOC_SYNC_LAST_ATTEMPT_AT_KEY = 'd1_docs_last_sync_attempt_at';
const DOCUMENT_HISTORY_KEYS = [
  'quotation_history',
  'invoice_history',
  'packing_history',
  'purchase_history',
];

function notifyDocumentHistoryCleared(): void {
  DOCUMENT_HISTORY_KEYS.forEach((key) => {
    window.dispatchEvent(new CustomEvent('customStorageChange', { detail: { key } }));
  });
}

/** 当前浏览器本地单据历史归属的用户 id。用于防止同浏览器换账号后串记录。 */
export function getD1ActiveUserId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACTIVE_USER_KEY);
}

/** 已知的服务端最大 updated_at，用于 documents 增量拉取。 */
export function getDocSyncWatermark(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(DOC_SYNC_WATERMARK_KEY);
}

export function setDocSyncWatermark(iso: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DOC_SYNC_WATERMARK_KEY, iso);
}

/** 上次成功完成全量同步的客户端时间，仅用于 24 小时兜底判断。 */
export function getDocsLastFullSyncAt(): number {
  if (typeof window === 'undefined') return 0;
  return Number(localStorage.getItem(DOC_SYNC_LAST_FULL_AT_KEY) || 0);
}

export function setDocsLastFullSyncAt(ts: number): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DOC_SYNC_LAST_FULL_AT_KEY, String(ts));
}

/** 上次发起同步尝试的客户端时间，用于跨页面加载节流。 */
export function getDocsLastSyncAttemptAt(): number {
  if (typeof window === 'undefined') return 0;
  return Number(localStorage.getItem(DOC_SYNC_LAST_ATTEMPT_AT_KEY) || 0);
}

export function setDocsLastSyncAttemptAt(ts: number): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DOC_SYNC_LAST_ATTEMPT_AT_KEY, String(ts));
}

/** 清空本地单据同步状态。退出登录或检测到换用户时调用。 */
export function clearD1DocumentLocalState(clearActiveUser = true): void {
  if (typeof window === 'undefined') return;

  DOCUMENT_HISTORY_KEYS.forEach((key) => localStorage.removeItem(key));
  localStorage.removeItem(QUEUE_KEY);
  localStorage.removeItem(DELETED_DOC_IDS_KEY);
  localStorage.removeItem(DOC_SYNC_WATERMARK_KEY);
  localStorage.removeItem(DOC_SYNC_LAST_FULL_AT_KEY);
  localStorage.removeItem(DOC_SYNC_LAST_ATTEMPT_AT_KEY);
  if (clearActiveUser) {
    localStorage.removeItem(ACTIVE_USER_KEY);
  }
  notifyDocumentHistoryCleared();
}

/**
 * 绑定本地单据缓存到当前登录用户。
 * 如果同一浏览器切换了用户，必须先清空旧用户的本地历史和待同步队列，
 * 否则旧用户 localStorage 记录会被 pushLocalToD1 推到新用户账号下。
 */
export function prepareD1DocumentSyncForUser(userId: string): void {
  if (typeof window === 'undefined' || !userId) return;

  const activeUserId = getD1ActiveUserId();
  if (activeUserId && activeUserId !== userId) {
    clearD1DocumentLocalState(false);
  }

  localStorage.setItem(ACTIVE_USER_KEY, userId);
}

/** 记录本机已删除的文档 id，防止 pushLocalToD1 将其重新推上 D1 */
export function recordDeletedDocId(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const map: Record<string, string> = JSON.parse(localStorage.getItem(DELETED_DOC_IDS_KEY) || '{}');
    map[id] = new Date().toISOString();

    // 清理 30 天前的条目
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    for (const [key, value] of Object.entries(map)) {
      if (new Date(value).getTime() < cutoff) {
        delete map[key];
      }
    }

    localStorage.setItem(DELETED_DOC_IDS_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

/** 返回本机已删除的文档 id 集合 */
export function getDeletedDocIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const map: Record<string, string> = JSON.parse(localStorage.getItem(DELETED_DOC_IDS_KEY) || '{}');
    return new Set(Object.keys(map));
  } catch {
    return new Set();
  }
}

function loadQueue(): PendingOp[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveQueue(q: PendingOp[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  } catch { /* 配额不足时忽略 */ }
}

function enqueue(op: PendingOp): void {
  const q = loadQueue();
  // 同一记录同一动作去重，保留最新
  const filtered = q.filter(
    (o) => !(o.payload.id === op.payload.id && o.action === op.action && o.kind === op.kind)
  );
  filtered.push(op);
  saveQueue(filtered);
}

function dequeue(opId: string): void {
  saveQueue(loadQueue().filter((o) => o.opId !== opId));
}

/** 返回当前队列中所有待同步的记录 id（用于 merge 时保护未确认记录）。 */
export function getPendingIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  return new Set(loadQueue().map((o) => o.payload.id));
}

async function executeOp(op: PendingOp): Promise<boolean> {
  const base = '/api/documents';
  try {
    let resp: Response;
    if (op.action === 'delete') {
      resp = await fetch(`${base}/${op.payload.id}`, { method: 'DELETE' });
    } else if (op.action === 'update') {
      resp = await fetch(`${base}/${op.payload.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(op.payload),
      });
    } else {
      resp = await fetch(base, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(op.payload),
      });
    }
    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      console.warn(`[d1Sync] ✗ ${op.kind} ${op.action} ${op.payload.id} → HTTP ${resp.status}`, errText);
      return false;
    }
    console.log(`[d1Sync] ✓ ${op.kind} ${op.action} ${op.payload.id}`);
    return true;
  } catch (err) {
    console.warn(`[d1Sync] ✗ ${op.kind} ${op.action} ${op.payload.id} → 网络错误:`, err);
    return false;
  }
}

/**
 * 刷新待提交队列：重试所有未成功的写入。
 * pullAllFromD1 调用前自动执行，外部也可手动调用。
 */
export async function flushPendingQueue(): Promise<void> {
  if (typeof window === 'undefined') return;
  const queue = loadQueue();
  if (queue.length === 0) return;
  console.log(`[d1Sync] 刷新待提交队列，共 ${queue.length} 条`);
  for (const op of queue) {
    const ok = await executeOp(op);
    if (ok) {
      dequeue(op.opId);
      console.log(`[d1Sync] 重试成功: ${op.kind} ${op.action} ${op.payload.id}`);
    }
  }
}

function fireAndForget(op: PendingOp): void {
  void (async () => {
    const ok = await executeOp(op);
    if (ok) {
      dequeue(op.opId);
    }
    // 失败时保留队列，等待 flushPendingQueue 重试
  })();
}

/** 同步单条文档到 D1（create / update / delete）。写入前入队，成功后出队。 */
export function d1SyncDocument(
  action: SyncAction,
  payload: D1DocumentPayload
): void {
  if (typeof window === 'undefined') return;
  if (action === 'delete') {
    recordDeletedDocId(payload.id);
  }
  const op: PendingOp = {
    opId: `${payload.id}-${action}-${Date.now()}`,
    kind: 'document',
    action,
    payload,
  };
  enqueue(op);
  fireAndForget(op);
}
