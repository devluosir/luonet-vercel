import { useEffect } from 'react';

/**
 * 自动调整textarea高度的自定义Hook
 * @param refs textarea的ref数组
 * @param deps 依赖项数组，当这些值变化时重新调整高度
 */
export function useAutoResizeTextareas(
  refs: React.RefObject<HTMLTextAreaElement>[],
  deps: any[]
) {
  useEffect(() => {
    refs.forEach(ref => {
      if (ref.current) {
        ref.current.style.height = 'auto';
        ref.current.style.height = `${ref.current.scrollHeight}px`;
      }
    });
  }, deps);
} 