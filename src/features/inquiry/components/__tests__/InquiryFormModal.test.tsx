// 用递增计数器而不是固定字符串：新增模式下 InquiryFormModal 会用 createId() 生成两个默认供应商
// （飞罗、昆同），固定 id 会触发 React "duplicate key" 警告，跟本文件要测的提示逻辑无关。
let mockIdCounter = 0;
jest.mock('nanoid', () => ({ nanoid: () => `mock-id-${mockIdCounter++}` }));

jest.mock('@/features/customer/services/customerService', () => ({
  customerService: {
    getCachedCustomers: () => [],
    fetchAllCustomers: () => Promise.resolve({ items: [] }),
  },
  getCachedCustomers: () => [],
  getPrimaryContact: () => undefined,
}));
jest.mock('@/features/customer/services/supplierService', () => ({
  supplierService: { getAllSuppliers: () => Promise.resolve([]) },
}));

import { act, render, screen } from '@testing-library/react';
import { ConfirmDialogProvider } from '@/components/ui/ConfirmDialog';
import type { InquiryRecord } from '@/features/inquiry/types';
import { InquiryFormModal } from '../InquiryFormModal';

function baseRecord(overrides: Partial<InquiryRecord> = {}): InquiryRecord {
  return {
    id: 'r1',
    inquiryDate: '2026-07-13',
    inquiryNo: 'C260713F',
    inquirer: '张三',
    customerNo: 'CUST-1',
    description: '',
    supplierStatuses: [],
    quotedStatuses: [],
    createdAt: '2026-07-13T00:00:00.000Z',
    updatedAt: '2026-07-13T00:00:00.000Z',
    ...overrides,
  };
}

// customerService.fetchAllCustomers / supplierService.getAllSuppliers 都是异步 mock（resolve 一个
// 空结果），组件挂载时会触发这两个 effect。用 act 包一次微任务 flush，让这些状态更新在断言前
// 落地，避免测试里出现无意义的 "not wrapped in act" 警告（跟本次要验证的提示逻辑无关）。
async function renderModal(record: InquiryRecord | null) {
  await act(async () => {
    render(
      <ConfirmDialogProvider>
        <InquiryFormModal
          isOpen
          mode={record ? 'edit' : 'create'}
          record={record}
          existingRecords={[]}
          onClose={jest.fn()}
          onSubmit={jest.fn()}
        />
      </ConfirmDialogProvider>
    );
  });
}

describe('销售侧"采购侧提示"（需补充信息 / 已补充信息）只读展示', () => {
  it('purchaseSupplierStatuses 有 need_info 供应商时显示"采购侧提示：需补充信息"，带最新日期', async () => {
    const record = baseRecord({
      purchaseSupplierStatuses: [
        { id: 'p1', supplierShortName: 'A供应商', status: 'need_info', quoteDate: '[6.5]' },
        { id: 'p2', supplierShortName: 'B供应商', status: 'need_info', quoteDate: '[6.20]' },
      ],
    });
    await renderModal(record);
    expect(screen.getByText('采购侧提示：需补充信息（6.20）')).toBeInTheDocument();
  });

  it('purchaseQuotedStatuses 有 supplemented 时显示"采购侧提示：已补充信息"，带日期', async () => {
    const record = baseRecord({
      purchaseQuotedStatuses: [
        { id: 'pq1', type: 'supplemented', quoteDate: '[6.10]', supplierShortName: '', version: '' },
      ],
    });
    await renderModal(record);
    expect(screen.getByText('采购侧提示：已补充信息（6.10）')).toBeInTheDocument();
  });

  it('两条提示可以同时显示在同一行（同一容器的兄弟节点）', async () => {
    const record = baseRecord({
      purchaseSupplierStatuses: [
        { id: 'p1', supplierShortName: 'A供应商', status: 'need_info', quoteDate: '[6.5]' },
      ],
      purchaseQuotedStatuses: [
        { id: 'pq1', type: 'supplemented', quoteDate: '[6.10]', supplierShortName: '', version: '' },
      ],
    });
    await renderModal(record);
    const needInfoBanner = screen.getByText('采购侧提示：需补充信息（6.5）');
    const supplementedBanner = screen.getByText('采购侧提示：已补充信息（6.10）');
    expect(needInfoBanner.parentElement).toBe(supplementedBanner.parentElement);
  });

  it('采购部字段都为空/不存在时不显示任何提示', async () => {
    await renderModal(baseRecord());
    expect(screen.queryByText(/采购侧提示/)).not.toBeInTheDocument();
  });

  it('新增模式（record 为 null）不报错，也不显示提示', async () => {
    await renderModal(null);
    expect(screen.queryByText(/采购侧提示/)).not.toBeInTheDocument();
  });

  it('purchaseQuotedStatuses 有 unavailable（我司无法报价）时显示"采购侧提示：我司无法报价"，带日期', async () => {
    const record = baseRecord({
      purchaseQuotedStatuses: [
        { id: 'pq1', type: 'unavailable', quoteDate: '[7.13]', supplierShortName: '', version: '' },
      ],
    });
    await renderModal(record);
    expect(screen.getByText('采购侧提示：我司无法报价（7.13）')).toBeInTheDocument();
  });

  it('三条提示（需补充信息/已补充信息/我司无法报价）可以同时显示在同一行', async () => {
    const record = baseRecord({
      purchaseSupplierStatuses: [
        { id: 'p1', supplierShortName: 'A供应商', status: 'need_info', quoteDate: '[6.5]' },
      ],
      purchaseQuotedStatuses: [
        { id: 'pq1', type: 'supplemented', quoteDate: '[6.10]', supplierShortName: '', version: '' },
        { id: 'pq2', type: 'unavailable', quoteDate: '[7.13]', supplierShortName: '', version: '' },
      ],
    });
    await renderModal(record);
    const needInfoBanner = screen.getByText('采购侧提示：需补充信息（6.5）');
    const supplementedBanner = screen.getByText('采购侧提示：已补充信息（6.10）');
    const unavailableBanner = screen.getByText('采购侧提示：我司无法报价（7.13）');
    expect(needInfoBanner.parentElement).toBe(supplementedBanner.parentElement);
    expect(needInfoBanner.parentElement).toBe(unavailableBanner.parentElement);
  });
});
