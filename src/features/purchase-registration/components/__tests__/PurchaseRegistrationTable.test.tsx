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

  it('询价编号/内容描述/询报价状态 3 列渲染拖拽手柄；最后一列"状态描述"是唯一不设显式宽度的撑满列，没有手柄', () => {
    render(
      <PurchaseRegistrationTable records={[baseRecord()]} onEditRecord={jest.fn()} />
    );
    expect(screen.getAllByRole('separator')).toHaveLength(3);
    expect(screen.queryByLabelText('调整"状态描述"列宽')).not.toBeInTheDocument();
  });

  it('四列表头与询报价登记保持同一单行高度，窄屏通过表格最小宽度避免末列被压缩换行', () => {
    const { container } = render(
      <PurchaseRegistrationTable records={[baseRecord()]} onEditRecord={jest.fn()} />
    );

    const headers = screen.getAllByRole('columnheader');
    expect(headers).toHaveLength(4);
    headers.forEach((header) => {
      expect(header).toHaveClass('py-2.5');
      const label = header.querySelector('span');
      expect(label).toHaveClass('h-6', 'truncate', 'whitespace-nowrap');
    });
    expect(container.querySelector('table')).toHaveStyle({ minWidth: '990px' });
  });

  it('表格始终 w-full 撑满容器，不会在列宽总和小于容器宽度时留白', () => {
    const { container } = render(
      <PurchaseRegistrationTable records={[baseRecord()]} onEditRecord={jest.fn()} />
    );
    const table = container.querySelector('table');
    expect(table).toHaveClass('w-full');
    // "状态描述"是最后一列（第 4 列），故意不设 width，交给 table-layout:fixed 分配剩余空间；
    // table 的动态 min-width 会为它至少预留 180px，避免窄屏时被压到 0 后逐字换行。
    // 必须是最后一列，否则拖动它前面的列会导致视觉上"往左扩展"而不是"往右扩展"（曾经的真实 bug）
    const cols = container.querySelectorAll('col');
    expect((cols[3] as HTMLElement).style.width).toBe('');
  });

  it('"询报价状态"列默认宽度比原来的 26% 更宽（用户反馈原宽度装不下状态提示）', () => {
    const { container } = render(
      <PurchaseRegistrationTable records={[baseRecord()]} onEditRecord={jest.fn()} />
    );
    const cols = container.querySelectorAll('col');
    // 询报价状态是第 3 列
    const statusColWidth = parseInt((cols[2] as HTMLElement).style.width, 10);
    expect(statusColWidth).toBeGreaterThanOrEqual(300);
  });

  it('拖拽状态列的手柄会增大该列宽度，并持久化到 localStorage', () => {
    const { container } = render(
      <PurchaseRegistrationTable records={[baseRecord()]} onEditRecord={jest.fn()} />
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
    expect(container.querySelector('table')).toHaveStyle({ minWidth: '1050px' });
  });

  it('回归：拖拽"内容描述"手柄只改变它自己的宽度，不影响它左边"询价编号"列的宽度', () => {
    const { container } = render(
      <PurchaseRegistrationTable records={[baseRecord()]} onEditRecord={jest.fn()} />
    );
    const cols = container.querySelectorAll('col');
    const noWidthBefore = (cols[0] as HTMLElement).style.width;

    const descHandle = screen.getByLabelText('调整"内容描述"列宽');
    act(() => {
      fireEvent(descHandle, new MouseEvent('pointerdown', { clientX: 200, bubbles: true, cancelable: true }));
    });
    act(() => {
      const moveEvent = new Event('pointermove') as unknown as PointerEvent;
      Object.defineProperty(moveEvent, 'clientX', { value: 260, configurable: true });
      window.dispatchEvent(moveEvent);
    });
    act(() => {
      window.dispatchEvent(new Event('pointerup'));
    });

    const colsAfter = container.querySelectorAll('col');
    expect((colsAfter[0] as HTMLElement).style.width).toBe(noWidthBefore); // "询价编号" 不受影响
    expect(parseInt((colsAfter[1] as HTMLElement).style.width, 10)).toBe(380); // 320 默认 + 60
  });

  it('点击内容描述与其它业务单元格都打开编辑弹窗，且不渲染行内输入框', () => {
    const item = baseRecord();
    const onEditRecord = jest.fn();
    const { container } = render(
      <PurchaseRegistrationTable records={[item]} onEditRecord={onEditRecord} />
    );

    fireEvent.click(screen.getByText('初始描述'));
    fireEvent.click(container.querySelector('tbody td:last-child') as HTMLElement);

    expect(onEditRecord).toHaveBeenCalledTimes(2);
    expect(onEditRecord).toHaveBeenLastCalledWith(item);
    expect(screen.queryByDisplayValue('初始描述')).not.toBeInTheDocument();
    expect(container.querySelector('tbody input')).not.toBeInTheDocument();
  });

  it('空记录时渲染空态提示，不渲染表格', () => {
    render(<PurchaseRegistrationTable records={[]} onEditRecord={jest.fn()} />);
    expect(screen.getByText('暂无采购部登记记录')).toBeInTheDocument();
    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
  });
});
