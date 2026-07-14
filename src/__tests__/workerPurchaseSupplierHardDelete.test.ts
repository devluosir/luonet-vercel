/** @jest-environment node */

import worker, { type Env } from '@/worker';

interface SupplierRow {
  id: string;
  name: string;
  short_name: string | null;
  code: string | null;
  address: string | null;
  data: string;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

interface ContactRow {
  id: string;
  supplier_id: string;
  name: string;
  status: 'active';
  is_primary: number;
  sort_order: number;
}

function createMockDatabase() {
  const suppliers = new Map<string, SupplierRow>();
  const contacts = new Map<string, ContactRow[]>();

  const createStatement = (sql: string, args: unknown[] = []) => ({
    first: async <T,>() => {
      if (sql.includes('SELECT * FROM PurchaseSupplier WHERE id')) {
        return (suppliers.get(String(args[0])) ?? null) as T | null;
      }
      return null;
    },
    all: async <T,>() => {
      if (sql.includes('FROM PurchaseSupplierContact')) {
        return { results: (contacts.get(String(args[0])) ?? []) as T[] };
      }
      return { results: [] as T[] };
    },
    run: async () => {
      if (sql.includes('DELETE FROM PurchaseSupplierContact')) {
        const supplierId = String(args[0]);
        const changes = contacts.get(supplierId)?.length ?? 0;
        contacts.delete(supplierId);
        return { meta: { changes } };
      }
      if (sql.includes('DELETE FROM PurchaseSupplier WHERE id')) {
        return { meta: { changes: suppliers.delete(String(args[0])) ? 1 : 0 } };
      }
      if (sql.includes("SET status = 'archived'")) {
        const supplierId = String(args[1]);
        const supplier = suppliers.get(supplierId);
        if (!supplier || supplier.status === 'archived') return { meta: { changes: 0 } };
        suppliers.set(supplierId, { ...supplier, status: 'archived' });
        return { meta: { changes: 1 } };
      }
      return { meta: { changes: 0 } };
    },
  });

  const database = {
    prepare: (sql: string) => ({
      bind: (...args: unknown[]) => createStatement(sql, args),
      all: <T,>() => createStatement(sql).all<T>(),
    }),
    batch: async (statements: Array<{ run: () => Promise<unknown> }>) => {
      for (const statement of statements) await statement.run();
    },
  };

  return { database, suppliers, contacts };
}

function seedSupplier(state: ReturnType<typeof createMockDatabase>) {
  state.suppliers.set('supplier-1', {
    id: 'supplier-1',
    name: '测试供应商',
    short_name: '测试',
    code: 'PS-001',
    address: null,
    data: '{}',
    status: 'active',
    created_at: '2026-07-14T00:00:00.000Z',
    updated_at: '2026-07-14T00:00:00.000Z',
  });
  state.contacts.set('supplier-1', [{
    id: 'contact-1',
    supplier_id: 'supplier-1',
    name: '张三',
    status: 'active',
    is_primary: 1,
    sort_order: 0,
  }]);
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

describe('Worker 采购供应商永久删除', () => {
  it('无 Bearer 时拒绝硬删除且数据保持不变', async () => {
    const state = createMockDatabase();
    seedSupplier(state);

    const response = await worker.fetch(
      request('/api/purchase-suppliers/supplier-1/hard-delete', 'DELETE', false),
      createEnv(state),
      {}
    );

    expect(response.status).toBe(401);
    expect(state.suppliers.has('supplier-1')).toBe(true);
    expect(state.contacts.get('supplier-1')).toHaveLength(1);
  });

  it('显式删除联系人和主档，之后同 ID GET 返回 404', async () => {
    const state = createMockDatabase();
    seedSupplier(state);
    const env = createEnv(state);

    const deleteResponse = await worker.fetch(
      request('/api/purchase-suppliers/supplier-1/hard-delete', 'DELETE'),
      env,
      {}
    );

    expect(deleteResponse.status).toBe(200);
    expect(state.contacts.has('supplier-1')).toBe(false);
    expect(state.suppliers.has('supplier-1')).toBe(false);

    const getResponse = await worker.fetch(
      request('/api/purchase-suppliers/supplier-1'),
      env,
      {}
    );
    expect(getResponse.status).toBe(404);
  });

  it('原归档路由仍只更新状态，主档和联系人可以继续读取', async () => {
    const state = createMockDatabase();
    seedSupplier(state);
    const env = createEnv(state);

    const archiveResponse = await worker.fetch(
      request('/api/purchase-suppliers/supplier-1', 'DELETE'),
      env,
      {}
    );

    expect(archiveResponse.status).toBe(200);
    expect(state.suppliers.get('supplier-1')?.status).toBe('archived');
    expect(state.contacts.get('supplier-1')).toHaveLength(1);

    const getResponse = await worker.fetch(
      request('/api/purchase-suppliers/supplier-1'),
      env,
      {}
    );
    expect(getResponse.status).toBe(200);
    await expect(getResponse.json()).resolves.toMatchObject({
      supplier: { id: 'supplier-1', status: 'archived' },
    });
  });
});
