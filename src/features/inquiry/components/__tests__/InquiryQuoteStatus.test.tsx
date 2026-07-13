jest.mock('nanoid', () => ({ nanoid: () => 'mock-id' }));

// customerService / supplierService 在没有传 supplierOptions 时会被拉取；这里默认都传
// supplierOptions=[]（真值数组），所以组件不会调用它们，但仍需要提供最小 mock 防止真实
// localStorage/fetch 逻辑在测试里跑起来。
jest.mock('@/features/customer/services/customerService', () => ({
  getCachedCustomers: () => [],
}));
jest.mock('@/features/customer/services/supplierService', () => ({
  supplierService: { getAllSuppliers: () => Promise.resolve([]) },
}));

import { fireEvent, render, screen } from '@testing-library/react';
import { ConfirmDialogProvider } from '@/components/ui/ConfirmDialog';
import { InquiryQuoteStatus } from '../InquiryQuoteStatus';
import type { InquiryRecord } from '../../types';

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

function renderStatus(props: Partial<React.ComponentProps<typeof InquiryQuoteStatus>> = {}) {
  const onSuppliersChange = jest.fn();
  const onQuotedChange = jest.fn();
  render(
    <ConfirmDialogProvider>
      <InquiryQuoteStatus
        record={baseRecord()}
        onSuppliersChange={onSuppliersChange}
        onQuotedChange={onQuotedChange}
        supplierOptions={[]}
        {...props}
      />
    </ConfirmDialogProvider>
  );
  return { onSuppliersChange, onQuotedChange };
}

describe('13. 询报价登记页面（默认 props）保留原有文案和可编辑关闭状态', () => {
  it('默认无法报价 checkbox 文案为"已回复客户无法报价"', () => {
    renderStatus();
    expect(screen.getByText('已回复客户无法报价')).toBeInTheDocument();
  });

  it('默认显示可编辑的"询价已关闭" checkbox', () => {
    renderStatus();
    expect(screen.getByText('询价已关闭')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: '询价已关闭' })).not.toBeDisabled();
  });

  it('勾选"询价已关闭"会触发 onQuotedChange，写入 type: closed', () => {
    const { onQuotedChange } = renderStatus();
    fireEvent.click(screen.getByRole('checkbox', { name: '询价已关闭' }));
    expect(onQuotedChange).toHaveBeenCalledTimes(1);
    const [nextQuoted] = onQuotedChange.mock.calls[0];
    expect(nextQuoted).toHaveLength(1);
    expect(nextQuoted[0]).toMatchObject({ type: 'closed' });
  });

  it('默认没有 quotedTrailingContent 时不额外渲染内容', () => {
    renderStatus();
    expect(screen.queryByText(/其他 \d+ 家已报价/)).not.toBeInTheDocument();
  });
});

describe('采购部登记场景（传入窄配置 props）', () => {
  it('unavailableLabel 覆盖默认文案', () => {
    renderStatus({ unavailableLabel: '我司无法报价' });
    expect(screen.getByText('我司无法报价')).toBeInTheDocument();
    expect(screen.queryByText('已回复客户无法报价')).not.toBeInTheDocument();
  });

  it('showClosedControl=false 时完全不渲染"询价已关闭" checkbox', () => {
    renderStatus({ showClosedControl: false });
    expect(screen.queryByText('询价已关闭')).not.toBeInTheDocument();
  });

  it('quotedTrailingContent 会渲染在已报价区域', () => {
    renderStatus({ quotedTrailingContent: <span>其他 3 家已报价</span> });
    expect(screen.getByText('其他 3 家已报价')).toBeInTheDocument();
  });
});
