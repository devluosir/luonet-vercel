'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { getLocalStorageJSON, setLocalStorage } from '@/utils/safeLocalStorage';

export interface ResizableColumnDef {
  /** 稳定的列语义 id（不要用数组下标——权限/断点会导致列增删，下标会错位） */
  id: string;
  /** 初始/新出现时的默认像素宽度 */
  defaultWidth: number;
  /** 拖拽时允许的最小像素宽度，默认 60 */
  minWidth?: number;
}

export interface UseResizableColumnsResult {
  /** 当前各列像素宽度，key 为列 id */
  widths: Record<string, number>;
  /** 绑定到 resize 手柄的 onPointerDown：startResize(columnId) 返回事件处理函数 */
  startResize: (columnId: string) => (e: ReactPointerEvent) => void;
  /** 双击手柄可调用，重置某一列为默认宽度 */
  resetColumn: (columnId: string) => void;
}

const DEFAULT_MIN_WIDTH = 60;

/** 纯函数，方便单测：根据起始宽度 + 拖拽位移 + 最小宽度算出新宽度 */
export function computeResizedWidth(startWidth: number, deltaX: number, minWidth: number): number {
  return Math.max(minWidth, Math.round(startWidth + deltaX));
}

/**
 * 计算可拖拽表格的最小宽度：显式列使用当前/默认宽度，另为末尾吸收剩余空间的列保留下限。
 * 当容器比这个宽度更窄时，由表格外层的 overflow-x-auto 提供横向滚动，避免末列被压到 0。
 */
export function computeResizableTableMinWidth(
  columns: readonly ResizableColumnDef[],
  widths: Record<string, number>,
  flexColumnMinWidth: number,
  fixedColumnsWidth = 0
): number {
  return columns.reduce(
    (total, column) => total + (widths[column.id] ?? column.defaultWidth),
    fixedColumnsWidth + flexColumnMinWidth
  );
}

/**
 * 通用可拖拽列宽 hook：像素宽度存 localStorage，按列 id 持久化。
 * 用于「本身有响应式断点」的表格时，只在调用方判断「当前处于全列展示断点」时才启用
 * （即只在该断点下把这个 hook 的 widths 用于渲染），窄屏继续用原有百分比布局，不接入这个 hook，
 * 避免拖拽出的像素宽度在小屏上撑出横向滚动，破坏现有响应式体验。
 */
export function useResizableColumns(
  storageKey: string,
  columns: ResizableColumnDef[]
): UseResizableColumnsResult {
  const defaultsById = useMemo(() => {
    const map: Record<string, ResizableColumnDef> = {};
    columns.forEach((c) => {
      map[c.id] = c;
    });
    return map;
  }, [columns]);

  const [widths, setWidths] = useState<Record<string, number>>(() => {
    const saved = getLocalStorageJSON<Record<string, number>>(storageKey, {});
    const initial: Record<string, number> = {};
    columns.forEach((c) => {
      const minWidth = c.minWidth ?? DEFAULT_MIN_WIDTH;
      const savedValue = saved?.[c.id];
      initial[c.id] = typeof savedValue === 'number' && savedValue >= minWidth ? savedValue : c.defaultWidth;
    });
    return initial;
  });

  // 列集合变化时（权限/断点导致列增删）补齐新列的默认宽度，已存在的列宽不动
  const columnIdsKey = columns.map((c) => c.id).join('|');
  useEffect(() => {
    setWidths((prev) => {
      let changed = false;
      const next = { ...prev };
      columns.forEach((c) => {
        if (!(c.id in next)) {
          next[c.id] = c.defaultWidth;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnIdsKey]);

  const widthsRef = useRef(widths);
  widthsRef.current = widths;

  const dragState = useRef<{ columnId: string; startX: number; startWidth: number } | null>(null);

  const startResize = useCallback(
    (columnId: string) => (e: ReactPointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const minWidth = defaultsById[columnId]?.minWidth ?? DEFAULT_MIN_WIDTH;
      const startWidth = widthsRef.current[columnId] ?? defaultsById[columnId]?.defaultWidth ?? 100;
      dragState.current = { columnId, startX: e.clientX, startWidth };

      const handleMove = (moveEvent: PointerEvent) => {
        if (!dragState.current || dragState.current.columnId !== columnId) return;
        const nextWidth = computeResizedWidth(dragState.current.startWidth, moveEvent.clientX - dragState.current.startX, minWidth);
        setWidths((prev) => (prev[columnId] === nextWidth ? prev : { ...prev, [columnId]: nextWidth }));
      };

      const handleUp = () => {
        dragState.current = null;
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
        setLocalStorage(storageKey, widthsRef.current);
      };

      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
    },
    [defaultsById, storageKey]
  );

  const resetColumn = useCallback(
    (columnId: string) => {
      const def = defaultsById[columnId];
      if (!def) return;
      setWidths((prev) => {
        const next = { ...prev, [columnId]: def.defaultWidth };
        setLocalStorage(storageKey, next);
        return next;
      });
    },
    [defaultsById, storageKey]
  );

  return { widths, startResize, resetColumn };
}
