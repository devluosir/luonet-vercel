import { inquiryService } from '../inquiry.service';
import type { InquiryRecord } from '../../types';

const PENDING_SYNC_KEY = 'inquiry_pending_syncs';
const STORAGE_KEY = 'inquiry_records';

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
});
