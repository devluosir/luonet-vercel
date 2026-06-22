/**
 * D1 同步帮助函数（带本地待提交队列）。
 *
 * 流程：
 *   1. 操作发起时立即写入本地队列（localStorage d1_pending_syncs）
 *   2. 异步发起 API 请求；成功后从队列中移除
 *   3. 如果请求失败，留在队列等待下次 flushPendingQueue() 重试
 *   4. pullAllFromD1 调用前先执行 flushPendingQueue，确保 D1 有最新数据
 *
 * localStorage 始终是主存储，D1 是云端权威副本。
 */

export type D1DocType = 'quotation' | 'confirmation' | 'invoice' | 'packing' | 'purchase';

export interface D1DocumentPayload {
  id: string;
  type: D1DocType;
  doc_no: string;
  customer_name?: string;
  total_amount?: number;
  currency?: string;
  data: unknown;
}

export interface D1CustomerPayload {
  id: string;
  type: 'customer' | 'supplier' | 'consignee';
  name: string;
  code?: string;
  email?: string;
  phone?: string;
  address?: string;
  data?: unknown;
}

type SyncAction = 'create' | 'update' | 'delete';

interface PendingOp {
  opId: string;
  kind: 'document' | 'customer';
  action: SyncAction;
  payload: D1DocumentPayload | D1CustomerPayload;
}

const QUEUE_KEY = 'd1_pending_syncs';
const DELETED_DOC_IDS_KEY = 'd1_deleted_doc_ids';

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
  const base = op.kind === 'document' ? '/api/documents' : '/api/customers';
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
      console.warn(`[d1Sync] ${op.kind} ${op.action} ${op.payload.id} → HTTP ${resp.status}`);
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`[d1Sync] ${op.kind} ${op.action} ${op.payload.id} → 网络错误:`, err);
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

/** 同步单条客户到 D1（create / update / delete）。写入前入队，成功后出队。 */
export function d1SyncCustomer(
  action: SyncAction,
  payload: D1CustomerPayload
): void {
  if (typeof window === 'undefined') return;
  const op: PendingOp = {
    opId: `${payload.id}-${action}-${Date.now()}`,
    kind: 'customer',
    action,
    payload,
  };
  enqueue(op);
  fireAndForget(op);
}
