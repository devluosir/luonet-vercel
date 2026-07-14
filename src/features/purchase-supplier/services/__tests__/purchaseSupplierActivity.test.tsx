import { act, render, screen } from '@testing-library/react';
import { useInquiryStore } from '@/features/inquiry/state/inquiry.store';
import type { InquiryRecord } from '@/features/inquiry/types';
import { PurchaseSupplierActivityFeed } from '../../components/PurchaseSupplierActivityFeed';
import { derivePurchaseSupplierActivities } from '../purchaseSupplierActivity';
import type { PurchaseSupplier } from '../../types';

const mockInquiryState: { records: InquiryRecord[] } = { records: [] };

jest.mock('@/features/inquiry/state/inquiry.store', () => ({
  useInquiryStore: Object.assign(
    (selector: (state: typeof mockInquiryState) => unknown) => selector(mockInquiryState),
    {
      setState: (patch: Partial<typeof mockInquiryState>) => Object.assign(mockInquiryState, patch),
    }
  ),
}));

function record(overrides: Partial<InquiryRecord>): InquiryRecord {
  return {
    id: 'record-default',
    inquiryDate: '2026-07-01',
    inquiryNo: 'INQ-DEFAULT',
    inquirer: '采购员',
    customerNo: 'CUSTOMER-DEFAULT',
    description: '',
    supplierStatuses: [],
    quotedStatuses: [],
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

const supplier: PurchaseSupplier = {
  id: 'supplier-target',
  name: '目标供应商',
  shortName: '目标',
  address: '',
  contacts: [],
  data: {},
  status: 'active',
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
};

describe('采购供应商活动派生与展示', () => {
  afterEach(() => {
    act(() => useInquiryStore.setState({ records: [] }));
  });

  it('仅按 purchaseSupplierId 精确匹配多条记录，并按询价日期倒序', () => {
    const records = [
      record({
        id: 'older',
        inquiryDate: '2026-07-01',
        inquiryNo: 'INQ-OLD',
        purchaseSupplierStatuses: [{
          id: 'status-old',
          purchaseSupplierId: supplier.id,
          supplierShortName: '目标旧简称',
          status: 'pending',
        }],
      }),
      record({
        id: 'newer',
        inquiryDate: '2026-07-10',
        inquiryNo: 'INQ-NEW',
        purchaseSupplierStatuses: [{
          id: 'status-new',
          purchaseSupplierId: supplier.id,
          supplierShortName: '目标新简称',
          status: 'quoted',
        }],
      }),
      record({
        id: 'same-name-without-id',
        inquiryNo: 'INQ-NAME-ONLY',
        purchaseSupplierStatuses: [{
          id: 'status-name-only',
          supplierShortName: supplier.shortName || '',
          status: 'quoted',
        }],
      }),
      record({
        id: 'different-id',
        inquiryNo: 'INQ-OTHER',
        purchaseSupplierStatuses: [{
          id: 'status-other',
          purchaseSupplierId: 'supplier-other',
          supplierShortName: supplier.shortName || '',
          status: 'quoted',
        }],
      }),
      record({
        id: 'deleted',
        status: 'deleted',
        inquiryNo: 'INQ-DELETED',
        purchaseSupplierStatuses: [{
          id: 'status-deleted',
          purchaseSupplierId: supplier.id,
          supplierShortName: '目标',
        }],
      }),
    ];

    const activities = derivePurchaseSupplierActivities(records, supplier.id);

    expect(activities.map((item) => item.inquiryNo)).toEqual(['INQ-NEW', 'INQ-OLD']);
  });

  it('命中含订单号的记录时显示“已转订单”，且不提供就地编辑入口', () => {
    act(() => useInquiryStore.setState({
      records: [record({
        id: 'ordered',
        inquiryNo: 'INQ-ORDERED',
        customerNo: 'CN-001',
        orderNo: 'PO-1001',
        purchaseSupplierStatuses: [{
          id: 'status-ordered',
          purchaseSupplierId: supplier.id,
          supplierShortName: '目标',
          status: 'quoted',
          quoteDate: '[7.12]',
        }],
      })],
    }));

    render(<PurchaseSupplierActivityFeed supplier={supplier} />);

    expect(screen.getByText('INQ-ORDERED')).toBeInTheDocument();
    expect(screen.getByText('已转订单')).toBeInTheDocument();
    expect(screen.getByText('客户询价编号：CN-001')).toBeInTheDocument();
    expect(screen.getByText('报价日期：[7.12]')).toBeInTheDocument();
    expect(screen.getByText(/PO-1001/)).toBeInTheDocument();
    expect(screen.getByText(/时间：/)).toBeInTheDocument();
    expect(screen.getByText('INQ-ORDERED').closest('article')?.firstElementChild).toHaveClass(
      'flex-wrap',
      'md:flex-nowrap'
    );
    expect(screen.queryByRole('button', { name: /编辑/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /打开采购部登记/ })).toHaveAttribute(
      'href',
      '/purchase-registration?purchaseSupplierId=supplier-target&supplierName=%E7%9B%AE%E6%A0%87'
    );
  });

  it('零命中时显示明确空状态', () => {
    act(() => useInquiryStore.setState({ records: [record({ purchaseSupplierStatuses: [] })] }));
    render(<PurchaseSupplierActivityFeed supplier={supplier} />);
    expect(screen.getByText('暂无已关联的采购询价活动')).toBeInTheDocument();
  });
});
