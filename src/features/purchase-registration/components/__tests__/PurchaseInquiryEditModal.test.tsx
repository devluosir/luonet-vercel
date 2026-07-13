jest.mock('nanoid', () => ({ nanoid: () => 'mock-id' }));

jest.mock('@/features/customer/services/customerService', () => ({
  getCachedCustomers: () => [],
}));
jest.mock('@/features/customer/services/supplierService', () => ({
  supplierService: { getAllSuppliers: () => Promise.resolve([]) },
}));

// inquiryService 会真的读写 localStorage/发起 fetch；store 内部调用它做持久化和 D1 同步，
// 这里跟弹窗行为无关，mock 掉避免测试环境里报错或产生副作用。
jest.mock('@/features/inquiry/services/inquiry.service', () => ({
  inquiryService: {
    getAll: () => [],
    save: jest.fn(),
    update: (records: unknown[]) => records,
    patchInD1: jest.fn(),
    updateInD1: jest.fn(),
    syncToD1: jest.fn(),
  },
}));

import { act, fireEvent, render, screen } from '@testing-library/react';
import { ConfirmDialogProvider } from '@/components/ui/ConfirmDialog';
import { useInquiryStore } from '@/features/inquiry/state/inquiry.store';
import type { InquiryRecord } from '@/features/inquiry/types';
import { PurchaseInquiryEditModal } from '../PurchaseInquiryEditModal';

function baseRecord(overrides: Partial<InquiryRecord> = {}): InquiryRecord {
  return {
    id: 'r1',
    inquiryDate: '2026-07-13',
    inquiryNo: 'C260713F',
    inquirer: '张三',
    customerNo: 'CUST-1',
    description: '初始描述',
    supplierStatuses: [],
    quotedStatuses: [],
    purchaseSupplierStatuses: [],
    purchaseQuotedStatuses: [],
    createdAt: '2026-07-13T00:00:00.000Z',
    updatedAt: '2026-07-13T00:00:00.000Z',
    ...overrides,
  };
}

function renderModal(record: InquiryRecord, onSave = jest.fn(), onClose = jest.fn()) {
  useInquiryStore.setState({ records: [record] });
  render(
    <ConfirmDialogProvider>
      <PurchaseInquiryEditModal record={record} onClose={onClose} onSave={onSave} supplierOptions={[]} />
    </ConfirmDialogProvider>
  );
  return { onSave, onClose };
}

describe('10. 销售侧 closed 在采购弹窗中只读显示', () => {
  it('record.quotedStatuses 有 closed 时显示灰色只读提示，带日期', () => {
    const record = baseRecord({
      quotedStatuses: [{ id: 'q1', type: 'closed', quoteDate: '[6.20]', supplierShortName: '', version: '' }],
    });
    renderModal(record);
    expect(screen.getByText('询价已关闭（6.20）')).toBeInTheDocument();
  });

  it('不显示任何可编辑的关闭 checkbox（采购部无法修改）', () => {
    const record = baseRecord({
      quotedStatuses: [{ id: 'q1', type: 'closed', quoteDate: '[6.20]', supplierShortName: '', version: '' }],
    });
    renderModal(record);
    expect(screen.queryByRole('checkbox', { name: '询价已关闭' })).not.toBeInTheDocument();
  });
});

describe('11. 销售侧没有 closed 时采购弹窗不显示关闭提示', () => {
  it('quotedStatuses 为空时不渲染关闭提示', () => {
    renderModal(baseRecord());
    expect(screen.queryByText(/询价已关闭/)).not.toBeInTheDocument();
  });

  it('历史 purchaseQuotedStatuses 里存在 type === closed 也不应影响——只看销售侧 quotedStatuses', () => {
    const record = baseRecord({
      quotedStatuses: [],
      purchaseQuotedStatuses: [{ id: 'legacy', type: 'closed', quoteDate: '[5.1]', supplierShortName: '', version: '' }],
    });
    renderModal(record);
    expect(screen.queryByText(/询价已关闭/)).not.toBeInTheDocument();
  });
});

describe('9. 销售侧飞罗 need_info 能在采购部弹窗显示', () => {
  it('supplierStatuses 里飞罗为 need_info 时显示提示', () => {
    const record = baseRecord({
      supplierStatuses: [{ id: 'fl', supplierShortName: '飞罗', status: 'need_info', quoteDate: '[6.1]' }],
    });
    renderModal(record);
    expect(screen.getByText(/飞罗需补充资料/)).toBeInTheDocument();
  });

  it('飞罗不是 need_info 时不显示提示', () => {
    const record = baseRecord({
      supplierStatuses: [{ id: 'fl', supplierShortName: '飞罗', status: 'quoted', quoteDate: '[6.1]' }],
    });
    renderModal(record);
    expect(screen.queryByText(/飞罗需补充资料/)).not.toBeInTheDocument();
  });

  it('回归：飞罗 need_info 且本地 purchaseSupplierStatuses 都没有 need_info 时，仍要显示"已补充信息" checkbox', () => {
    // 此前 bug：hasNeedInfoSupplier 只看本地 purchaseSupplierStatuses，飞罗的 need_info 是
    // 销售侧只读信号（不体现在 purchaseSupplierStatuses 里），导致采购部看得到提示却没有勾选入口。
    const record = baseRecord({
      supplierStatuses: [{ id: 'fl', supplierShortName: '飞罗', status: 'need_info', quoteDate: '[6.1]' }],
      purchaseSupplierStatuses: [{ id: 'p1', supplierShortName: 'X供应商', status: 'quoted', quoteDate: '[6.1]' }],
    });
    renderModal(record);
    expect(screen.getByText('已补充信息')).toBeInTheDocument();
  });

  it('勾选"已补充信息"并保存后，patch.purchaseQuotedStatuses 里出现 type: supplemented', () => {
    const record = baseRecord({
      supplierStatuses: [{ id: 'fl', supplierShortName: '飞罗', status: 'need_info', quoteDate: '[6.1]' }],
    });
    const { onSave } = renderModal(record);
    fireEvent.click(screen.getByRole('checkbox', { name: '已补充信息' }));
    fireEvent.click(screen.getByRole('button', { name: '保存修改' }));
    const patch = onSave.mock.calls[0][1] as Partial<InquiryRecord>;
    expect(patch.purchaseQuotedStatuses).toEqual([
      expect.objectContaining({ type: 'supplemented' }),
    ]);
  });
});

describe('"其他 n 家已报价"只读提示', () => {
  it('大于 0 时显示', () => {
    const record = baseRecord({
      supplierStatuses: [
        { id: 's1', supplierShortName: 'A供应商', status: 'quoted', quoteDate: '[6.1]' },
        { id: 's2', supplierShortName: 'B供应商', status: 'quoted', quoteDate: '[6.2]' },
      ],
    });
    renderModal(record);
    expect(screen.getByText('其他 2 家已报价')).toBeInTheDocument();
  });

  it('等于 0 时不显示', () => {
    renderModal(baseRecord());
    expect(screen.queryByText(/其他 \d+ 家已报价/)).not.toBeInTheDocument();
  });
});

describe('采购部保存：复选框文案与补丁内容', () => {
  it('复选框文案为"我司无法报价"（不是"已回复客户无法报价"）', () => {
    renderModal(baseRecord());
    expect(screen.getByText('我司无法报价')).toBeInTheDocument();
    expect(screen.queryByText('已回复客户无法报价')).not.toBeInTheDocument();
  });

  it('保存时补丁绝不包含 quotedStatuses', () => {
    const { onSave } = renderModal(baseRecord());
    fireEvent.click(screen.getByRole('button', { name: '保存修改' }));
    const patch = onSave.mock.calls[0][1] as Partial<InquiryRecord>;
    expect(patch).not.toHaveProperty('quotedStatuses');
  });

  it('勾选"我司无法报价"保存后，飞罗补丁为 unavailable + 对应日期', () => {
    const { onSave } = renderModal(baseRecord());
    fireEvent.click(screen.getByRole('checkbox', { name: '我司无法报价' }));
    fireEvent.click(screen.getByRole('button', { name: '保存修改' }));
    const patch = onSave.mock.calls[0][1] as Partial<InquiryRecord>;
    expect(patch.supplierStatuses).toHaveLength(1);
    expect(patch.supplierStatuses?.[0]).toMatchObject({ supplierShortName: '飞罗', status: 'unavailable' });
  });

  it('状态和日期已一致时不发送 supplierStatuses 补丁', () => {
    const record = baseRecord({
      supplierStatuses: [{ id: 'fl', supplierShortName: '飞罗', status: 'quoted', quoteDate: '[6.20]' }],
      purchaseQuotedStatuses: [
        { id: 'q1', quoteDate: '[6.20]', supplierShortName: 'X供应商', version: 'a' },
      ],
    });
    const { onSave } = renderModal(record);
    fireEvent.click(screen.getByRole('button', { name: '保存修改' }));
    const patch = onSave.mock.calls[0][1] as Partial<InquiryRecord>;
    expect(patch).not.toHaveProperty('supplierStatuses');
  });
});

describe('并发保存安全：弹窗打开期间 store 后台更新不清空未保存输入', () => {
  it('store 里同一条记录的其它字段发生变化时，用户已输入的描述不会被清空', () => {
    const record = baseRecord();
    const onSave = jest.fn();
    renderModal(record, onSave);

    fireEvent.change(screen.getByPlaceholderText('产品名称、规格、数量…（选填）'), {
      target: { value: '用户正在输入的新描述' },
    });

    // 模拟后台同步把 store 里这条记录的其它字段刷新了（例如另一设备改了 supplierStatuses）
    act(() => {
      useInquiryStore.setState({
        records: [
          {
            ...record,
            supplierStatuses: [{ id: 'fl', supplierShortName: '飞罗', status: 'quoted', quoteDate: '[6.30]' }],
            updatedAt: '2026-07-13T01:00:00.000Z',
          },
        ],
      });
    });

    expect(screen.getByPlaceholderText('产品名称、规格、数量…（选填）')).toHaveValue('用户正在输入的新描述');

    fireEvent.click(screen.getByRole('button', { name: '保存修改' }));
    const patch = onSave.mock.calls[0][1] as Partial<InquiryRecord>;
    expect(patch.description).toBe('用户正在输入的新描述');
  });
});
