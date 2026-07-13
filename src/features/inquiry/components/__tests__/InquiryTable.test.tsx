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

  it('lg 断点（全列展示）下，5 个内容列各有一个拖拽手柄，checkbox/操作列没有', () => {
    setViewportWidth(1280);
    render(
      <InquiryTable records={[baseRecord()]} sortDir="desc" onSortToggle={jest.fn()} onEditRecord={jest.fn()} onDeleteRecord={jest.fn()} canBatchEdit />
    );
    expect(screen.getAllByRole('separator')).toHaveLength(5);
  });

  it('md/sm 断点下不渲染任何拖拽手柄，沿用原有响应式百分比布局', () => {
    setViewportWidth(500);
    render(
      <InquiryTable records={[baseRecord()]} sortDir="desc" onSortToggle={jest.fn()} onEditRecord={jest.fn()} onDeleteRecord={jest.fn()} />
    );
    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
  });

  it('lg 断点下拖拽"内容简述"列手柄会增大该列宽度并持久化', () => {
    setViewportWidth(1280);
    render(
      <InquiryTable records={[baseRecord()]} sortDir="desc" onSortToggle={jest.fn()} onEditRecord={jest.fn()} onDeleteRecord={jest.fn()} />
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
});
