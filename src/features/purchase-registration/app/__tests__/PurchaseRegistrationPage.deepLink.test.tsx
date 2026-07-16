jest.mock('nanoid', () => ({ nanoid: () => 'mock-id' }));

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { InquiryRecord } from '@/features/inquiry/types';
import type { InquiryFilterState } from '@/features/inquiry/hooks/useInquiryFilter';
import { PurchaseRegistrationPage, recordMatchesSupplier } from '../PurchaseRegistrationPage';

const mockPush = jest.fn();
const mockSetFilter = jest.fn();
const mockPatchRecord = jest.fn();
const mockInit = jest.fn();
const mockSearchParams = new URLSearchParams(
  'purchaseSupplierId=supplier-target&supplierName=%E5%BD%93%E5%89%8D%E7%AE%80%E7%A7%B0'
);
let mockRecords: InquiryRecord[] = [];
const mockPurchaseSuppliers = [{
  id: 'supplier-target',
  name: '供应商全称',
  shortName: '当前简称',
  address: '',
  contacts: [],
  data: {},
  status: 'active' as const,
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
}];

const defaultFilter: InquiryFilterState = {
  timeRange: 'month:2026-07',
  customerNo: '',
  inquirer: '',
  customerId: '',
  contactId: '',
  associationLabel: '',
  quoteStatus: 'all',
  linkStatus: 'all',
  sortDir: 'desc',
  keyword: '',
};

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
}));

jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { username: 'buyer' } },
    status: 'authenticated',
  }),
}));

jest.mock('@/hooks/useAppUser', () => ({
  useAppUser: () => ({ user: { name: '采购员' }, handleLogout: jest.fn() }),
}));

jest.mock('@/lib/permissions', () => ({
  usePermissionStore: (selector: (state: {
    user: { id: string };
    hasPermission: (moduleId: string) => boolean;
  }) => unknown) => selector({ user: { id: 'user-1' }, hasPermission: () => true }),
}));

jest.mock('@/features/inquiry/state/inquiry.store', () => ({
  useInquiryStore: Object.assign(
    (selector: (state: {
      records: InquiryRecord[];
      patchRecordForView: typeof mockPatchRecord;
    }) => unknown) => selector({ records: mockRecords, patchRecordForView: mockPatchRecord }),
    { getState: () => ({ init: mockInit }) }
  ),
}));

jest.mock('@/features/inquiry/hooks/useInquirySync', () => ({
  useInquirySync: () => ({ lastSyncedAt: null, syncStatus: { pendingCount: 0 } }),
}));

jest.mock('@/features/inquiry/hooks/useInquiryFilter', () => ({
  useInquiryFilter: (records: InquiryRecord[]) => ({
    filter: defaultFilter,
    setFilter: mockSetFilter,
    filteredAndSorted: records,
    baseFiltered: records,
    activeCount: 0,
    reset: jest.fn(),
  }),
}));

jest.mock('@/features/inquiry/components/InquiryFilterBar', () => ({
  InquiryFilterBar: ({
    secondarySelect,
  }: {
    secondarySelect: { value: string; options: string[]; onChange: (value: string) => void };
  }) => (
    <div>
      <span>筛选供应商：{secondarySelect.value || '全部'}</span>
      <span>供应商选项：{secondarySelect.options.join(',')}</span>
      <button type="button" onClick={() => secondarySelect.onChange('当前简称')}>手动选择当前简称</button>
    </div>
  ),
}));

jest.mock('../../components/PurchaseRegistrationTable', () => ({
  PurchaseRegistrationTable: ({ records }: { records: InquiryRecord[] }) => (
    <div>结果：{records.map((record) => record.inquiryNo).join(',')}</div>
  ),
}));

jest.mock('../../components/PurchaseInquiryEditModal', () => ({
  PurchaseInquiryEditModal: () => null,
}));

jest.mock('@/components/layout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/layout/FullScreenSpinner', () => ({
  FullScreenSpinner: () => <div>加载中</div>,
}));

jest.mock('@/components/PermissionDenied', () => ({
  PermissionDenied: () => <div>权限不足</div>,
}));

jest.mock('@/features/purchase-supplier/hooks/usePurchaseSupplierAccess', () => ({
  usePurchaseSupplierAccess: () => ({ canRead: true, userId: 'user-1' }),
}));

jest.mock('@/features/purchase-supplier/services/purchaseSupplierService', () => ({
  fetchPurchaseSuppliers: jest.fn(() => Promise.resolve({ items: mockPurchaseSuppliers, isStale: false })),
}));

function record(overrides: Partial<InquiryRecord>): InquiryRecord {
  return {
    id: 'record-default',
    inquiryDate: '2026-07-01',
    inquiryNo: 'INQ-DEFAULT',
    inquirer: '采购员',
    customerNo: 'C-001',
    description: '',
    supplierStatuses: [],
    quotedStatuses: [],
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('采购部登记供应商深链接', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRecords = [
      record({
        id: 'target-record',
        inquiryNo: 'INQ-TARGET',
        purchaseSupplierStatuses: [{
          id: 'status-target',
          purchaseSupplierId: 'supplier-target',
          supplierShortName: '旧名称快照',
        }],
      }),
      record({
        id: 'name-record',
        inquiryNo: 'INQ-NAME',
        purchaseSupplierStatuses: [{
          id: 'status-name',
          purchaseSupplierId: 'supplier-other',
          supplierShortName: '当前简称',
        }],
      }),
    ];
  });

  it('按 ID 优先精确匹配，改名后的旧名称快照仍能命中', () => {
    expect(recordMatchesSupplier(mockRecords[0], '当前简称', 'supplier-target')).toBe(true);
    expect(recordMatchesSupplier(mockRecords[1], '当前简称', 'supplier-target')).toBe(false);
  });

  it('没有 ID 时保留原有按名称匹配行为', () => {
    expect(recordMatchesSupplier(mockRecords[1], '当前简称')).toBe(true);
    expect(recordMatchesSupplier(mockRecords[0], '当前简称')).toBe(false);
    expect(recordMatchesSupplier(mockRecords[0], '')).toBe(true);
  });

  it('没有 ID 筛选时按主档当前名解析旧快照', () => {
    const nameById = new Map([['supplier-target', '当前简称']]);
    expect(recordMatchesSupplier(mockRecords[0], '当前简称', '', nameById)).toBe(true);
    expect(recordMatchesSupplier(mockRecords[0], '旧名称快照', '', nameById)).toBe(false);
  });

  it('解析深链接后切到全部时间并按 ID 展示；手动选择会清除 ID 筛选', async () => {
    render(<PurchaseRegistrationPage />);

    await waitFor(() => expect(screen.getByText('筛选供应商：当前简称')).toBeInTheDocument());
    expect(screen.getByText('结果：INQ-TARGET')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('供应商选项：当前简称')).toBeInTheDocument());

    const setFilterUpdater = mockSetFilter.mock.calls.find(
      ([value]) => typeof value === 'function'
    )?.[0] as (current: InquiryFilterState) => InquiryFilterState;
    expect(setFilterUpdater(defaultFilter).timeRange).toBe('all');

    fireEvent.click(screen.getByRole('button', { name: '手动选择当前简称' }));
    await waitFor(() => expect(screen.getByText('结果：INQ-TARGET,INQ-NAME')).toBeInTheDocument());
  });
});
