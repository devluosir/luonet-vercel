/** @jest-environment node */

import worker, { type Env } from '@/worker';

interface InquiryDocumentRow {
  id: string;
  user_id: string;
  type: 'inquiry';
  doc_no: string;
  customer_name: string;
  customer_id: string | null;
  contact_id: string | null;
  total_amount: number;
  currency: string;
  status: 'active' | 'deleted';
  data: string;
  created_at: string;
  updated_at: string;
}

function createMockDatabase() {
  const documents = new Map<string, InquiryDocumentRow>();

  const statement = (sql: string, args: unknown[] = []) => ({
    first: async <T,>() => {
      if (sql.includes('COUNT(*) as cnt')) {
        return { cnt: documents.size, maxUpdatedAt: null } as T;
      }
      return null;
    },
    all: async <T,>() => ({ results: Array.from(documents.values()) as T[] }),
    run: async () => {
      if (sql.includes('DELETE FROM Document')) {
        return { meta: { changes: documents.delete(String(args[0])) ? 1 : 0 } };
      }
      if (sql.includes("SET status = 'deleted'")) {
        const id = String(args[1]);
        const current = documents.get(id);
        if (!current) return { meta: { changes: 0 } };
        documents.set(id, {
          ...current,
          status: 'deleted',
          updated_at: String(args[0]),
        });
        return { meta: { changes: 1 } };
      }
      return { meta: { changes: 0 } };
    },
  });

  const database = {
    prepare: (sql: string) => ({
      bind: (...args: unknown[]) => statement(sql, args),
    }),
  };

  return { database, documents };
}

function seedInquiry(state: ReturnType<typeof createMockDatabase>) {
  state.documents.set('inquiry-1', {
    id: 'inquiry-1',
    user_id: '_shared_',
    type: 'inquiry',
    doc_no: 'C260714F',
    customer_name: 'RFQ-001',
    customer_id: null,
    contact_id: null,
    total_amount: 0,
    currency: 'CNY',
    status: 'active',
    data: JSON.stringify({
      id: 'inquiry-1',
      inquiryNo: 'C260714F',
      customerNo: 'RFQ-001',
      description: '测试硬删除',
      supplierStatuses: [],
      quotedStatuses: [],
      createdAt: '2026-07-14T00:00:00.000Z',
      updatedAt: '2026-07-14T00:00:00.000Z',
    }),
    created_at: '2026-07-14T00:00:00.000Z',
    updated_at: '2026-07-14T00:00:00.000Z',
  });
}

function createEnv(state: ReturnType<typeof createMockDatabase>): Env {
  return {
    USERS_DB: state.database,
    DB: state.database,
    API_TOKEN: 'test-token',
  } as unknown as Env;
}

function request(path: string, method = 'GET', authorized = true) {
  return new Request(`https://worker.test${path}`, {
    method,
    headers: authorized ? { Authorization: 'Bearer test-token' } : undefined,
  });
}

describe('Worker 询报价永久删除', () => {
  it('无 Bearer 时拒绝硬删除且数据保持不变', async () => {
    const state = createMockDatabase();
    seedInquiry(state);

    const response = await worker.fetch(
      request('/api/inquiry/inquiry-1/hard-delete', 'DELETE', false),
      createEnv(state),
      {}
    );

    expect(response.status).toBe(401);
    expect(state.documents.has('inquiry-1')).toBe(true);
  });

  it('真正删除 Document 行，随后包含软删除宽限期的列表也查不到', async () => {
    const state = createMockDatabase();
    seedInquiry(state);
    const env = createEnv(state);

    const deleteResponse = await worker.fetch(
      request('/api/inquiry/inquiry-1/hard-delete', 'DELETE'),
      env,
      {}
    );
    expect(deleteResponse.status).toBe(200);
    expect(state.documents.has('inquiry-1')).toBe(false);

    const listResponse = await worker.fetch(request('/api/inquiry'), env, {});
    await expect(listResponse.json()).resolves.toMatchObject({ records: [], total: 0 });
  });

  it('删除不存在的记录返回 404', async () => {
    const state = createMockDatabase();
    const response = await worker.fetch(
      request('/api/inquiry/missing/hard-delete', 'DELETE'),
      createEnv(state),
      {}
    );
    expect(response.status).toBe(404);
  });

  it('原 DELETE 路由仍只做软删除，记录继续出现在 30 天宽限列表', async () => {
    const state = createMockDatabase();
    seedInquiry(state);
    const env = createEnv(state);

    const softDeleteResponse = await worker.fetch(
      request('/api/inquiry/inquiry-1', 'DELETE'),
      env,
      {}
    );
    expect(softDeleteResponse.status).toBe(200);
    expect(state.documents.get('inquiry-1')?.status).toBe('deleted');

    const listResponse = await worker.fetch(request('/api/inquiry'), env, {});
    const body = await listResponse.json() as { records: Array<{ id: string; status: string }> };
    expect(body.records).toContainEqual(expect.objectContaining({
      id: 'inquiry-1',
      status: 'deleted',
    }));
  });
});
