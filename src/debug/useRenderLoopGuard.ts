import { useEffect, useRef } from 'react';

const isDev = process.env.NODE_ENV !== 'production';

/**
 * 通用渲染循环哨兵 - 开发环境监控组件渲染次数
 * @param tag 组件标识
 * @param threshold 警告阈值，默认80
 */
export function useRenderLoopGuard(tag: string, threshold = 80) {
  const renders = useRef(0);
  
  useEffect(() => {
    if (!isDev) return;
    
    renders.current += 1;
    if (renders.current === threshold) {
      // eslint-disable-next-line no-console
      console.warn(`[LoopGuard] ${tag} renders reached ${threshold}. Check unstable selectors/effects.`);
    }
  });
}
