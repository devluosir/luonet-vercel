import { act, renderHook } from '@testing-library/react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import {
  computeResizableTableMinWidth,
  computeResizedWidth,
  useResizableColumns,
} from '../useResizableColumns';

function fakePointerDownEvent(clientX: number): ReactPointerEvent {
  return {
    clientX,
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
  } as unknown as ReactPointerEvent;
}

function dispatchPointerMove(clientX: number) {
  const event = new Event('pointermove') as unknown as PointerEvent;
  Object.defineProperty(event, 'clientX', { value: clientX, configurable: true });
  window.dispatchEvent(event);
}

function dispatchPointerUp() {
  window.dispatchEvent(new Event('pointerup'));
}

describe('computeResizedWidth', () => {
  it('起始宽度加上位移得到新宽度', () => {
    expect(computeResizedWidth(200, 50, 60)).toBe(250);
    expect(computeResizedWidth(200, -30, 60)).toBe(170);
  });

  it('结果不小于最小宽度', () => {
    expect(computeResizedWidth(100, -80, 60)).toBe(60);
  });

  it('结果四舍五入为整数', () => {
    expect(computeResizedWidth(100, 0.4, 60)).toBe(100);
    expect(computeResizedWidth(100, 0.6, 60)).toBe(101);
  });
});

describe('computeResizableTableMinWidth', () => {
  const columns = [
    { id: 'no', defaultWidth: 100 },
    { id: 'desc', defaultWidth: 200 },
  ];

  it('累计当前显式列宽，并为末尾弹性列保留最小宽度', () => {
    expect(computeResizableTableMinWidth(columns, { no: 130, desc: 240 }, 120)).toBe(490);
  });

  it('缺少当前列宽时回退默认值，并计入固定功能列', () => {
    expect(computeResizableTableMinWidth(columns, { no: 130 }, 120, 40)).toBe(490);
  });
});

describe('useResizableColumns', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  const columns = [
    { id: 'no', defaultWidth: 100, minWidth: 60 },
    { id: 'desc', defaultWidth: 200, minWidth: 100 },
  ];

  it('无 localStorage 记录时使用每列的默认宽度', () => {
    const { result } = renderHook(() => useResizableColumns('test.widths', columns));
    expect(result.current.widths).toEqual({ no: 100, desc: 200 });
  });

  it('有效的 localStorage 记录会覆盖默认宽度', () => {
    window.localStorage.setItem('test.widths', JSON.stringify({ no: 150, desc: 220 }));
    const { result } = renderHook(() => useResizableColumns('test.widths', columns));
    expect(result.current.widths).toEqual({ no: 150, desc: 220 });
  });

  it('低于该列 minWidth 的脏数据会被忽略，回退默认宽度', () => {
    window.localStorage.setItem('test.widths', JSON.stringify({ no: 10, desc: 220 }));
    const { result } = renderHook(() => useResizableColumns('test.widths', columns));
    expect(result.current.widths).toEqual({ no: 100, desc: 220 });
  });

  it('拖拽（pointerdown → pointermove → pointerup）会更新宽度并持久化到 localStorage', () => {
    const { result } = renderHook(() => useResizableColumns('test.widths', columns));

    act(() => {
      result.current.startResize('desc')(fakePointerDownEvent(300));
    });
    act(() => {
      dispatchPointerMove(340); // +40
    });
    expect(result.current.widths.desc).toBe(240);

    act(() => {
      dispatchPointerUp();
    });

    expect(JSON.parse(window.localStorage.getItem('test.widths') || '{}')).toEqual({
      no: 100,
      desc: 240,
    });
  });

  it('拖拽不会低于该列的 minWidth', () => {
    const { result } = renderHook(() => useResizableColumns('test.widths', columns));

    act(() => {
      result.current.startResize('no')(fakePointerDownEvent(100));
    });
    act(() => {
      dispatchPointerMove(0); // -100，但 no 的 minWidth 是 60
    });

    expect(result.current.widths.no).toBe(60);
  });

  it('resetColumn 把指定列重置为默认宽度并持久化', () => {
    window.localStorage.setItem('test.widths', JSON.stringify({ no: 180, desc: 220 }));
    const { result } = renderHook(() => useResizableColumns('test.widths', columns));

    act(() => {
      result.current.resetColumn('no');
    });

    expect(result.current.widths.no).toBe(100);
    expect(JSON.parse(window.localStorage.getItem('test.widths') || '{}').no).toBe(100);
  });

  it('列集合新增列时补齐默认宽度，已存在的列宽不变', () => {
    const { result, rerender } = renderHook(
      ({ cols }: { cols: typeof columns }) => useResizableColumns('test.widths', cols),
      { initialProps: { cols: columns } }
    );

    act(() => {
      result.current.startResize('no')(fakePointerDownEvent(100));
    });
    act(() => {
      dispatchPointerMove(150);
    });
    act(() => {
      dispatchPointerUp();
    });
    expect(result.current.widths.no).toBe(150);

    const withExtra = [...columns, { id: 'status', defaultWidth: 260, minWidth: 120 }];
    rerender({ cols: withExtra });

    expect(result.current.widths.no).toBe(150); // 已有列不受影响
    expect(result.current.widths.status).toBe(260); // 新列补齐默认宽度
  });
});
