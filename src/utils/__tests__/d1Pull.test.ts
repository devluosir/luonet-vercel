import { pullAllFromD1 } from '../d1Pull';

type MockDocument = {
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

const okResponse = (documents: MockDocument[] = []) => ({
  ok: true,
  json: jest.fn().mockResolvedValue({ documents }),
});

const failedResponse = () => ({
  ok: false,
  status: 500,
  text: jest.fn().mockResolvedValue('failed'),
});

const mockDocument = (overrides: Partial<MockDocument>): MockDocument => ({
  id: 'doc-1',
  type: 'quotation',
  doc_no: 'QT-001',
  customer_name: 'Remote Customer',
  total_amount: 100,
  currency: 'USD',
  status: 'active',
  data: { source: 'remote' },
  created_at: '2026-07-01T00:00:00.000Z',
  updated_at: '2026-07-01T00:00:00.000Z',
  ...overrides,
});

describe('pullAllFromD1 merge behavior', () => {
  let warnSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
    logSpy.mockRestore();
  });

  test('keeps a newer local document when D1 returns an older snapshot', async () => {
    localStorage.setItem('quotation_history', JSON.stringify([
      {
        id: 'doc-1',
        type: 'quotation',
        quotationNo: 'QT-LOCAL',
        customerName: 'Local Customer',
        totalAmount: 200,
        currency: 'USD',
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-03T10:00:00.000Z',
        data: { source: 'local' },
      },
    ]));

    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('type=quotation')) {
        return Promise.resolve(okResponse([
          mockDocument({ updated_at: '2026-07-02T10:00:00.000Z' }),
        ]));
      }
      return Promise.resolve(okResponse());
    }) as jest.Mock;

    await pullAllFromD1();

    const merged = JSON.parse(localStorage.getItem('quotation_history') || '[]');
    expect(merged).toHaveLength(1);
    expect(merged[0].quotationNo).toBe('QT-LOCAL');
    expect(merged[0].customerName).toBe('Local Customer');
    expect(merged[0].data).toEqual({ source: 'local' });
  });

  test('keeps a pending local document even when D1 has a newer timestamp', async () => {
    localStorage.setItem('quotation_history', JSON.stringify([
      {
        id: 'doc-1',
        type: 'quotation',
        quotationNo: 'QT-PENDING',
        customerName: 'Pending Customer',
        totalAmount: 300,
        currency: 'USD',
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-02T10:00:00.000Z',
        data: { source: 'pending-local' },
      },
    ]));
    localStorage.setItem('d1_pending_syncs', JSON.stringify([
      {
        opId: 'doc-1-update-test',
        kind: 'document',
        action: 'update',
        payload: {
          id: 'doc-1',
          type: 'quotation',
          doc_no: 'QT-PENDING',
          created_at: '2026-07-01T00:00:00.000Z',
          updated_at: '2026-07-02T10:00:00.000Z',
          data: { source: 'pending-local' },
        },
      },
    ]));

    global.fetch = jest.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === 'PUT') {
        return Promise.resolve(failedResponse());
      }
      if (url.includes('type=quotation')) {
        return Promise.resolve(okResponse([
          mockDocument({ updated_at: '2026-07-03T10:00:00.000Z' }),
        ]));
      }
      return Promise.resolve(okResponse());
    }) as jest.Mock;

    await pullAllFromD1();

    const merged = JSON.parse(localStorage.getItem('quotation_history') || '[]');
    expect(merged).toHaveLength(1);
    expect(merged[0].quotationNo).toBe('QT-PENDING');
    expect(merged[0].customerName).toBe('Pending Customer');
    expect(merged[0].data).toEqual({ source: 'pending-local' });
    expect(JSON.parse(localStorage.getItem('d1_pending_syncs') || '[]')).toHaveLength(1);
  });

  test('uses the persisted watermark and preserves documents absent from an incremental response', async () => {
    const watermark = '2026-07-05T10:00:00.000Z';
    localStorage.setItem('d1_docs_sync_watermark', watermark);
    localStorage.setItem('d1_docs_last_full_sync_at', String(Date.now()));
    localStorage.setItem('quotation_history', JSON.stringify([
      {
        id: 'older-local-doc',
        type: 'quotation',
        quotationNo: 'QT-OLDER',
        customerName: 'Existing Customer',
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-02T00:00:00.000Z',
        data: { source: 'existing-local' },
      },
    ]));
    global.fetch = jest.fn().mockResolvedValue(okResponse()) as jest.Mock;

    await pullAllFromD1();

    const merged = JSON.parse(localStorage.getItem('quotation_history') || '[]');
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe('older-local-doc');
    expect(global.fetch).toHaveBeenCalledTimes(6);
    for (const [url] of (global.fetch as jest.Mock).mock.calls) {
      expect(url).toContain(`since=${encodeURIComponent(watermark)}`);
    }
    expect(localStorage.getItem('d1_docs_sync_watermark')).toBe(watermark);
  });

  test('removes a locally cached document when an incremental response contains its tombstone', async () => {
    const watermark = '2026-07-05T10:00:00.000Z';
    const deletedAt = '2026-07-06T10:00:00.000Z';
    localStorage.setItem('d1_docs_sync_watermark', watermark);
    localStorage.setItem('d1_docs_last_full_sync_at', String(Date.now()));
    localStorage.setItem('quotation_history', JSON.stringify([
      {
        id: 'deleted-remotely',
        type: 'quotation',
        quotationNo: 'QT-DELETED',
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-02T00:00:00.000Z',
        data: { source: 'local' },
      },
    ]));
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('type=quotation')) {
        return Promise.resolve(okResponse([
          mockDocument({ id: 'deleted-remotely', status: 'deleted', updated_at: deletedAt }),
        ]));
      }
      return Promise.resolve(okResponse());
    }) as jest.Mock;

    await pullAllFromD1();

    expect(JSON.parse(localStorage.getItem('quotation_history') || '[]')).toEqual([]);
    expect(localStorage.getItem('d1_docs_sync_watermark')).toBe(deletedAt);
  });

  test('throttles repeated sync attempts for 60 seconds', async () => {
    const watermark = '2026-07-05T10:00:00.000Z';
    localStorage.setItem('d1_docs_sync_watermark', watermark);
    localStorage.setItem('d1_docs_last_full_sync_at', String(Date.now()));
    global.fetch = jest.fn().mockResolvedValue(okResponse()) as jest.Mock;

    await pullAllFromD1();
    await pullAllFromD1();

    expect(global.fetch).toHaveBeenCalledTimes(6);
  });

  test('allows a forced sync inside the 60-second throttle window', async () => {
    localStorage.setItem('d1_docs_last_sync_attempt_at', String(Date.now()));
    global.fetch = jest.fn().mockResolvedValue(okResponse()) as jest.Mock;

    await pullAllFromD1();
    expect(global.fetch).not.toHaveBeenCalled();

    await pullAllFromD1(true);
    expect(global.fetch).toHaveBeenCalledTimes(6);
    for (const [url] of (global.fetch as jest.Mock).mock.calls) {
      expect(url).not.toContain('since=');
    }
  });

  test('forces a full sync with push-check even when a recent watermark exists', async () => {
    localStorage.setItem('d1_active_user_id', 'test-user');
    localStorage.setItem('d1_docs_sync_watermark', '2026-07-08T10:00:00.000Z');
    localStorage.setItem('d1_docs_last_full_sync_at', String(Date.now()));
    global.fetch = jest.fn().mockResolvedValue(okResponse()) as jest.Mock;

    await pullAllFromD1(true);

    expect(global.fetch).toHaveBeenCalledTimes(12);
    for (const [url] of (global.fetch as jest.Mock).mock.calls) {
      expect(url).not.toContain('since=');
    }
  });

  test('records the maximum server updated_at after a successful full sync', async () => {
    const newestTimestamp = '2026-07-08T10:00:00.000Z';
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('type=invoice')) {
        return Promise.resolve(okResponse([
          mockDocument({ id: 'invoice-1', type: 'invoice', updated_at: newestTimestamp }),
        ]));
      }
      if (url.includes('type=quotation')) {
        return Promise.resolve(okResponse([
          mockDocument({ updated_at: '2026-07-07T10:00:00.000Z' }),
        ]));
      }
      return Promise.resolve(okResponse());
    }) as jest.Mock;

    await pullAllFromD1();

    expect(localStorage.getItem('d1_docs_sync_watermark')).toBe(newestTimestamp);
    expect(Number(localStorage.getItem('d1_docs_last_full_sync_at'))).toBeGreaterThan(0);
  });
});
