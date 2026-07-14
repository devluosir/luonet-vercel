import { inquiryService } from '../inquiry.service';
import type { InquiryRecord } from '../../types';

const PENDING_SYNC_KEY = 'inquiry_pending_syncs';
const STORAGE_KEY = 'inquiry_records';
const DELETED_KEY = 'inquiry_deleted_ids';
const SYNC_WATERMARK_KEY_FULL = 'inquiry_sync_watermark_full';
const SYNC_WATERMARK_KEY_RESTRICTED = 'inquiry_sync_watermark_restricted';
const LAST_FULL_SYNC_AT_KEY_FULL = 'inquiry_last_full_sync_at_full';
const LAST_FULL_SYNC_AT_KEY_RESTRICTED = 'inquiry_last_full_sync_at_restricted';

function mockRecord(overrides: Partial<InquiryRecord> = {}): InquiryRecord {
  return {
    id: 'inquiry-1',
    inquiryDate: '2026-07-08',
    inquiryNo: 'C260708F',
    inquirer: '客户A',
    customerNo: 'RFQ-001',
    description: '测试询价',
    supplierStatuses: [],
    quotedStatuses: [],
    createdAt: '2026-07-08T00:00:00.000Z',
    updatedAt: '2026-07-08T00:00:00.000Z',
    ...overrides,
  };
}

function okResponse() {
  return {
    ok: true,
    text: jest.fn().mockResolvedValue(''),
  };
}

function failedResponse() {
  return {
    ok: false,
    status: 502,
    text: jest.fn().mockResolvedValue('bad gateway'),
  };
}

async function waitFor(condition: () => boolean): Promise<void> {
  for (let i = 0; i < 20; i += 1) {
    if (condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error('condition not met');
}

function pendingQueue(): Array<{ action: string; payload?: Partial<InquiryRecord>; lastError?: string }> {
  return JSON.parse(localStorage.getItem(PENDING_SYNC_KEY) || '[]');
}

describe('inquiryService D1 sync queue', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  test('keeps a failed D1 write in the pending queue with a visible error', async () => {
    global.fetch = jest.fn().mockResolvedValue(failedResponse()) as jest.Mock;

    inquiryService.syncToD1(mockRecord());

    await waitFor(() => pendingQueue()[0]?.lastError?.includes('HTTP 502') ?? false);

    expect(pendingQueue()).toHaveLength(1);
    expect(inquiryService.getSyncStatus()).toEqual({
      pendingCount: 1,
      lastError: 'HTTP 502: bad gateway',
      lastFailedAt: expect.any(String),
    });
  });

  test('flushes a queued write after the API recovers', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(failedResponse()) as jest.Mock;

    inquiryService.updateInD1(mockRecord());
    await waitFor(() => pendingQueue().length === 1);

    (global.fetch as jest.Mock).mockResolvedValue(okResponse());
    await inquiryService.flushPendingSyncs();

    expect(pendingQueue()).toHaveLength(0);
    expect(inquiryService.getSyncStatus().pendingCount).toBe(0);
  });

  test('keeps a pending create as a full record when a later patch arrives', async () => {
    global.fetch = jest.fn().mockResolvedValue(failedResponse()) as jest.Mock;

    inquiryService.syncToD1(mockRecord());
    await waitFor(() => pendingQueue().length === 1);

    const updatedLocal = mockRecord({
      orderNo: 'ORD-001',
      updatedAt: '2026-07-08T01:00:00.000Z',
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify([updatedLocal]));

    inquiryService.patchInD1(updatedLocal.id, { orderNo: 'ORD-001' });
    await waitFor(() => pendingQueue()[0]?.payload?.orderNo === 'ORD-001');

    const [pending] = pendingQueue();
    expect(pending.action).toBe('update');
    expect(pending.payload).toMatchObject({
      id: 'inquiry-1',
      inquiryNo: 'C260708F',
      description: '测试询价',
      orderNo: 'ORD-001',
    });
  });

  test('does not auto-upload legacy local-only records that were never queued', async () => {
    global.fetch = jest.fn().mockResolvedValue(okResponse()) as jest.Mock;
    const localOnly = mockRecord({ id: 'legacy-local-only', inquiryNo: 'C260708G' });
    localStorage.setItem(STORAGE_KEY, JSON.stringify([localOnly]));

    inquiryService.pushLocalToD1([]);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(global.fetch).not.toHaveBeenCalled();
    expect(pendingQueue()).toHaveLength(0);
  });

  test('continues retrying local-only records that are already in the pending queue', async () => {
    global.fetch = jest.fn().mockResolvedValue(failedResponse()) as jest.Mock;
    const queuedLocal = mockRecord({ id: 'queued-local-only', inquiryNo: 'C260708H' });
    localStorage.setItem(STORAGE_KEY, JSON.stringify([queuedLocal]));

    inquiryService.syncToD1(queuedLocal);
    await waitFor(() => pendingQueue().length === 1);

    (global.fetch as jest.Mock).mockClear();
    inquiryService.pushLocalToD1([]);
    await waitFor(() => (global.fetch as jest.Mock).mock.calls.length > 0);

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/inquiry',
      expect.objectContaining({ method: 'POST' })
    );
  });
});

describe('inquiryService hardDelete', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  test('同步等待独立硬删除接口成功后，才清理本地记录、墓碑和同记录待同步操作', async () => {
    const target = mockRecord();
    const retained = mockRecord({ id: 'inquiry-2', inquiryNo: 'C260708G' });
    localStorage.setItem(STORAGE_KEY, JSON.stringify([target, retained]));
    localStorage.setItem(DELETED_KEY, JSON.stringify({
      [target.id]: '2026-07-14T00:00:00.000Z',
      [retained.id]: '2026-07-14T00:00:00.000Z',
    }));
    localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify([
      { opId: 'target-update', action: 'update', recordId: target.id, createdAt: '', attempts: 0 },
      { opId: 'retained-update', action: 'update', recordId: retained.id, createdAt: '', attempts: 0 },
    ]));
    global.fetch = jest.fn().mockResolvedValue(okResponse()) as jest.Mock;

    await inquiryService.hardDelete(target.id);

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/inquiry/inquiry-1/hard-delete',
      { method: 'DELETE' }
    );
    expect(inquiryService.getAll().map((record) => record.id)).toEqual(['inquiry-2']);
    expect(JSON.parse(localStorage.getItem(DELETED_KEY) || '{}')).toEqual({
      'inquiry-2': '2026-07-14T00:00:00.000Z',
    });
    expect(pendingQueue()).toEqual([
      expect.objectContaining({ recordId: 'inquiry-2' }),
    ]);
  });

  test('接口失败时明确报错，且本地记录、墓碑和待同步操作完全不变', async () => {
    const target = mockRecord();
    localStorage.setItem(STORAGE_KEY, JSON.stringify([target]));
    localStorage.setItem(DELETED_KEY, JSON.stringify({ [target.id]: '2026-07-14T00:00:00.000Z' }));
    localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify([
      { opId: 'target-update', action: 'update', recordId: target.id, createdAt: '', attempts: 0 },
    ]));
    global.fetch = jest.fn().mockResolvedValue(failedResponse()) as jest.Mock;

    await expect(inquiryService.hardDelete(target.id)).rejects.toThrow(
      '永久删除失败：HTTP 502 - bad gateway'
    );

    expect(inquiryService.getAll()).toEqual([target]);
    expect(JSON.parse(localStorage.getItem(DELETED_KEY) || '{}')).toHaveProperty(target.id);
    expect(pendingQueue()).toHaveLength(1);
  });
});

describe('inquiryService persisted sync baselines (TASK-139)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('stores full-view and restricted-view watermarks independently', () => {
    inquiryService.setSyncWatermark(true, '2026-07-11T01:00:00.000Z');

    expect(inquiryService.getSyncWatermark(true)).toBe('2026-07-11T01:00:00.000Z');
    expect(inquiryService.getSyncWatermark(false)).toBeNull();
    expect(localStorage.getItem(SYNC_WATERMARK_KEY_FULL)).toBe('2026-07-11T01:00:00.000Z');

    inquiryService.setSyncWatermark(false, '2026-07-11T02:00:00.000Z');

    expect(inquiryService.getSyncWatermark(true)).toBe('2026-07-11T01:00:00.000Z');
    expect(inquiryService.getSyncWatermark(false)).toBe('2026-07-11T02:00:00.000Z');
    expect(localStorage.getItem(SYNC_WATERMARK_KEY_RESTRICTED)).toBe('2026-07-11T02:00:00.000Z');
  });

  test('stores full-view and restricted-view full-sync times independently', () => {
    inquiryService.setLastFullSyncAt(true, 1000);

    expect(inquiryService.getLastFullSyncAt(true)).toBe(1000);
    expect(inquiryService.getLastFullSyncAt(false)).toBe(0);
    expect(localStorage.getItem(LAST_FULL_SYNC_AT_KEY_FULL)).toBe('1000');

    inquiryService.setLastFullSyncAt(false, 2000);

    expect(inquiryService.getLastFullSyncAt(true)).toBe(1000);
    expect(inquiryService.getLastFullSyncAt(false)).toBe(2000);
    expect(localStorage.getItem(LAST_FULL_SYNC_AT_KEY_RESTRICTED)).toBe('2000');
  });
});

describe('inquiryService.mergeFromD1 full-view self-healing', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('补齐受限视图先落缓存后缺失的销售字段，即使 updatedAt 相同且已有 quotedStatuses', () => {
    const fullRecord = mockRecord({
      id: 'restricted-first',
      inquirer: 'Nord-Kamila',
      customerNo: 'RFQ-2026-001',
      customerId: 'customer-1',
      contactId: 'contact-1',
      quotedStatuses: [],
      updatedAt: '2026-07-13T08:00:00.000Z',
    });
    const restrictedRecord: Partial<InquiryRecord> = { ...fullRecord };
    delete restrictedRecord.inquirer;
    delete restrictedRecord.customerNo;
    delete restrictedRecord.customerId;
    delete restrictedRecord.contactId;
    localStorage.setItem(STORAGE_KEY, JSON.stringify([restrictedRecord]));

    const result = inquiryService.mergeFromD1([fullRecord]);
    const healed = result.find((record) => record.id === fullRecord.id);

    expect(healed).toMatchObject({
      inquirer: 'Nord-Kamila',
      customerNo: 'RFQ-2026-001',
      customerId: 'customer-1',
      contactId: 'contact-1',
      quotedStatuses: [],
    });
  });

  test('同时间戳自愈只补缺失字段，不覆盖本地已有值', () => {
    const local = mockRecord({
      id: 'preserve-local',
      description: '本地已有描述',
      updatedAt: '2026-07-13T08:00:00.000Z',
    });
    const localWithoutInquirer: Partial<InquiryRecord> = { ...local };
    delete localWithoutInquirer.inquirer;
    localStorage.setItem(STORAGE_KEY, JSON.stringify([localWithoutInquirer]));

    const fullRecord = mockRecord({
      id: 'preserve-local',
      inquirer: '完整视图询价人',
      description: '服务端同时间戳描述',
      updatedAt: local.updatedAt,
    });
    const result = inquiryService.mergeFromD1([fullRecord]);
    const healed = result.find((record) => record.id === fullRecord.id);

    expect(healed?.inquirer).toBe('完整视图询价人');
    expect(healed?.description).toBe('本地已有描述');
  });
});

/**
 * TASK-128：mergeFieldsOnly 从"以 d1Records 为源的 filter/map 管道"改成 Map-based upsert，
 * 是为了配合询报价同步从"整表轮询"改成"增量拉取"（见 useInquirySync.ts 的 incrementalSync）。
 * 这个函数过去半年已经因为类似的边界问题出过两次线上 bug（TASK-124 pending 保护缺失、受限视图
 * 裁剪字段冲掉共享缓存），这里补上此前完全没有的自动化测试覆盖，锁定四条关键行为。
 */
describe('inquiryService.mergeFieldsOnly (TASK-128)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function seedPendingOp(recordId: string): void {
    localStorage.setItem(
      PENDING_SYNC_KEY,
      JSON.stringify([
        {
          opId: `${recordId}-update-1`,
          action: 'update',
          recordId,
          payload: {},
          createdAt: '2026-07-10T00:00:00.000Z',
          attempts: 0,
        },
      ])
    );
  }

  test('保留增量结果集里没出现的本地记录，不因缺席而被当成已删除丢弃', () => {
    const untouched = mockRecord({ id: 'A', inquiryNo: 'INQ-A' });
    const changed = mockRecord({ id: 'B', inquiryNo: 'INQ-B' });
    localStorage.setItem(STORAGE_KEY, JSON.stringify([untouched, changed]));

    // 增量响应里只有 B 变化了，A 完全没出现在这次响应里
    const updatedB = { ...changed, description: '已更新', updatedAt: '2026-07-10T08:00:00.000Z' };
    const result = inquiryService.mergeFieldsOnly([updatedB]);

    expect(result.map((r) => r.id).sort()).toEqual(['A', 'B']);
    expect(result.find((r) => r.id === 'A')).toEqual(untouched);
    expect(result.find((r) => r.id === 'B')?.description).toBe('已更新');
  });

  test('D1 软删除标记的记录会被从结果里移除', () => {
    const record = mockRecord({ id: 'C' });
    localStorage.setItem(STORAGE_KEY, JSON.stringify([record]));

    const deleted = { ...record, status: 'deleted' as const, updatedAt: '2026-07-10T08:00:00.000Z' };
    const result = inquiryService.mergeFieldsOnly([deleted]);

    expect(result.find((r) => r.id === 'C')).toBeUndefined();
  });

  test('有 pending 同步操作的记录不会被 d1Record 的旧值覆盖（TASK-124 保护）', () => {
    const local = mockRecord({
      id: 'D',
      orderCustomerNo: '客户刚编辑的新值',
      updatedAt: '2026-07-10T09:00:00.000Z',
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify([local]));
    seedPendingOp('D'); // 模拟这条记录的 PUT 还在排队/重试中

    // D1 侧还是旧数据（增量或全量拉取都可能拿到这种"过期"响应）
    const staleFromD1 = { ...local, orderCustomerNo: undefined, updatedAt: '2026-07-09T00:00:00.000Z' };
    const result = inquiryService.mergeFieldsOnly([staleFromD1]);

    expect(result.find((r) => r.id === 'D')?.orderCustomerNo).toBe('客户刚编辑的新值');
  });

  test('字段级合并：受限视图响应缺失的字段不会清空本地已缓存的其它字段', () => {
    const local = mockRecord({
      id: 'E',
      quotedStatuses: [{ id: 'q1', quoteDate: '2026-07-01', supplierShortName: '飞罗', version: 'v1' }],
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify([local]));

    // 受限视图响应里没有 quotedStatuses 这个 key（服务端裁剪掉了，不是 undefined）
    const restrictedView: Partial<InquiryRecord> = mockRecord({
      id: 'E',
      description: '受限视图更新的描述',
      updatedAt: '2026-07-10T08:00:00.000Z',
    });
    delete restrictedView.quotedStatuses;

    const result = inquiryService.mergeFieldsOnly([restrictedView as InquiryRecord]);

    expect(result.find((r) => r.id === 'E')?.description).toBe('受限视图更新的描述');
    expect(result.find((r) => r.id === 'E')?.quotedStatuses).toEqual([
      { id: 'q1', quoteDate: '2026-07-01', supplierShortName: '飞罗', version: 'v1' },
    ]);
  });
});
