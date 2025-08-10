import { useEffect, useRef } from 'react';

/**
 * 开发期循环哨兵 - 帮助检测无限循环渲染
 * @param tag 组件标识
 * @param threshold 警告阈值，默认100
 */
export function useRenderLoopGuard(tag: string, threshold = 100) {
  const n = useRef(0);
  
  useEffect(() => {
    n.current += 1;
    if (n.current > threshold) {
      // eslint-disable-next-line no-console
      console.warn(`[LoopGuard] ${tag} excessive renders:`, n.current);
    }
  });
}
