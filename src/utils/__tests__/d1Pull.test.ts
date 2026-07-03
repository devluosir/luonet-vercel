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
});
