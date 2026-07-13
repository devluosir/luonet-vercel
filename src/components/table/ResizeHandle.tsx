'use client';

import type { PointerEvent as ReactPointerEvent } from 'react';

interface ResizeHandleProps {
  onPointerDown: (e: ReactPointerEvent) => void;
  onDoubleClick?: () => void;
  /** 用于无障碍标签，例如"询价编号" */
  label?: string;
}

/** 表头列宽拖拽手柄：绝对定位在 th 右边缘，th 需要有 relative 定位。
 *  双击可选地重置该列为默认宽度。 */
export function ResizeHandle({ onPointerDown, onDoubleClick, label }: ResizeHandleProps) {
  return (
    <span
      role="separator"
      aria-orientation="vertical"
      aria-label={label ? `调整"${label}"列宽` : '调整列宽'}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
      onClick={(e) => e.stopPropagation()}
      className="absolute inset-y-0 -right-1 z-10 w-2 cursor-col-resize touch-none select-none"
    >
      <span className="mx-auto block h-full w-px bg-transparent hover:bg-blue-400/70 active:bg-blue-500" />
    </span>
  );
}
