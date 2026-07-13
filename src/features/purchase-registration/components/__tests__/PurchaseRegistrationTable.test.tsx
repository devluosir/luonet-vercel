jest.mock('nanoid', () => ({ nanoid: () => 'mock-id' }));

import { act, fireEvent, render, screen } from '@testing-library/react';
import type { InquiryRecord } from '@/features/inquiry/types';
import { PurchaseRegistrationTable } from '../PurchaseRegistrationTable';

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
    createdAt: '2026-07-13T00:00:00.000Z',
    updatedAt: '2026-07-13T00:00:00.000Z',
    ...overrides,
  };
}

describe('PurchaseRegistrationTable 可拖拽列宽（本表无响应式断点，全量启用）', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('4 列表头都渲染一个拖拽手柄（role=separator）', () => {
    render(
      <PurchaseRegistrationTable records={[baseRecord()]} onUpdate={jest.fn()} onEditRecord={jest.fn()} />
    );
    expect(screen.getAllByRole('separator')).toHaveLength(4);
  });

  it('"询报价状态"列默认宽度比原来的 26% 更宽（用户反馈原宽度装不下状态提示）', () => {
    const { container } = render(
      <PurchaseRegistrationTable records={[baseRecord()]} onUpdate={jest.fn()} onEditRecord={jest.fn()} />
    );
    const cols = container.querySelectorAll('col');
    // 询报价状态是第 3 列
    const statusColWidth = parseInt((cols[2] as HTMLElement).style.width, 10);
    expect(statusColWidth).toBeGreaterThanOrEqual(300);
  });

  it('拖拽状态列的手柄会增大该列宽度，并持久化到 localStorage', () => {
    const { container } = render(
      <PurchaseRegistrationTable records={[baseRecord()]} onUpdate={jest.fn()} onEditRecord={jest.fn()} />
    );
    const statusHandle = screen.getByLabelText('调整"询报价状态"列宽');

    // jsdom 不支持 PointerEvent 构造函数，用带 clientX 的 MouseEvent 冒充 pointerdown
    // （只看 event.type 做 DOM 派发匹配，React 的 onPointerDown 监听的就是这个 type）
    act(() => {
      fireEvent(statusHandle, new MouseEvent('pointerdown', { clientX: 300, bubbles: true, cancelable: true }));
    });
    act(() => {
      const moveEvent = new Event('pointermove') as unknown as PointerEvent;
      Object.defineProperty(moveEvent, 'clientX', { value: 360, configurable: true });
      window.dispatchEvent(moveEvent);
    });
    act(() => {
      window.dispatchEvent(new Event('pointerup'));
    });

    const cols = container.querySelectorAll('col');
    const statusColWidth = parseInt((cols[2] as HTMLElement).style.width, 10);
    expect(statusColWidth).toBe(400); // 340 默认 + 60

    const saved = JSON.parse(window.localStorage.getItem('purchaseRegistration.tableColWidths') || '{}');
    expect(saved.status).toBe(400);
  });

  it('空记录时渲染空态提示，不渲染表格', () => {
    render(<PurchaseRegistrationTable records={[]} onUpdate={jest.fn()} onEditRecord={jest.fn()} />);
    expect(screen.getByText('暂无采购部登记记录')).toBeInTheDocument();
    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
  });
});
