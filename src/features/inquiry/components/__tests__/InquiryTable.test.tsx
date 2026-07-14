jest.mock('nanoid', () => ({ nanoid: () => 'mock-id' }));

import { act, fireEvent, render, screen } from '@testing-library/react';
import type { InquiryRecord } from '../../types';
import { InquiryTable } from '../InquiryTable';

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

function setViewportWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
  act(() => {
    window.dispatchEvent(new Event('resize'));
  });
}

describe('InquiryTable 可拖拽列宽（只在 lg 断点启用，其余断点保持原有响应式百分比不变）', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('lg 断点（全列展示）下，4 个资料列有拖拽手柄，checkbox/询报价状态没有，且不再渲染操作列', () => {
    setViewportWidth(1280);
    render(
      <InquiryTable records={[baseRecord()]} sortDir="desc" onSortToggle={jest.fn()} onEditRecord={jest.fn()} canBatchEdit />
    );
    expect(screen.getAllByRole('separator')).toHaveLength(4);
    expect(screen.queryByRole('columnheader', { name: '操作' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /删除 C260713F/ })).not.toBeInTheDocument();
    // "询报价状态"是表格最后一列、唯一不设显式宽度的撑满列，没有手柄——
    // 必须是最后一个，否则拖动它前面的列会导致视觉上"往左扩展"而不是"往右扩展"（曾经的真实 bug）
    expect(screen.queryByLabelText('调整"询报价状态"列宽')).not.toBeInTheDocument();
  });

  it('lg 断点下表格始终 w-full 撑满容器，不会在列宽总和小于容器宽度时留白', () => {
    setViewportWidth(1280);
    const { container } = render(
      <InquiryTable records={[baseRecord()]} sortDir="desc" onSortToggle={jest.fn()} onEditRecord={jest.fn()} />
    );
    expect(container.querySelector('table')).toHaveClass('w-full');
  });

  it('md/sm 断点下不渲染任何拖拽手柄，沿用原有响应式百分比布局', () => {
    setViewportWidth(500);
    render(
      <InquiryTable records={[baseRecord()]} sortDir="desc" onSortToggle={jest.fn()} onEditRecord={jest.fn()} />
    );
    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
  });

  it('lg 断点下拖拽"内容简述"列手柄会增大该列宽度并持久化', () => {
    setViewportWidth(1280);
    render(
      <InquiryTable records={[baseRecord()]} sortDir="desc" onSortToggle={jest.fn()} onEditRecord={jest.fn()} />
    );
    const handle = screen.getByLabelText('调整"内容简述"列宽');

    // jsdom 不支持 PointerEvent 构造函数，用带 clientX 的 MouseEvent 冒充 pointerdown
    act(() => {
      fireEvent(handle, new MouseEvent('pointerdown', { clientX: 200, bubbles: true, cancelable: true }));
    });
    act(() => {
      const moveEvent = new Event('pointermove') as unknown as PointerEvent;
      Object.defineProperty(moveEvent, 'clientX', { value: 230, configurable: true });
      window.dispatchEvent(moveEvent);
    });
    act(() => {
      window.dispatchEvent(new Event('pointerup'));
    });

    const saved = JSON.parse(window.localStorage.getItem('inquiry.tableColWidths') || '{}');
    expect(saved.desc).toBe(260); // 230 默认 + 30
  });

  it('回归：拖拽"内容简述"手柄只改变它自己的宽度，不影响它左边"客户编号"列的宽度', () => {
    setViewportWidth(1280);
    render(
      <InquiryTable records={[baseRecord()]} sortDir="desc" onSortToggle={jest.fn()} onEditRecord={jest.fn()} />
    );
    const custnoWidthBefore = screen.getByLabelText('调整"客户编号"列宽').closest('th')?.style.width;

    const descHandle = screen.getByLabelText('调整"内容简述"列宽');
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

    const custnoWidthAfter = screen.getByLabelText('调整"客户编号"列宽').closest('th')?.style.width;
    expect(custnoWidthAfter).toBe(custnoWidthBefore); // "客户编号" 不受影响
  });

  it('点击资料行仍打开编辑，不依赖已移除的操作列', () => {
    const onEditRecord = jest.fn();
    render(
      <InquiryTable records={[baseRecord()]} sortDir="desc" onSortToggle={jest.fn()} onEditRecord={onEditRecord} />
    );

    fireEvent.click(screen.getByText('C260713F'));

    expect(onEditRecord).toHaveBeenCalledWith(expect.objectContaining({ id: 'r1' }));
  });
});
