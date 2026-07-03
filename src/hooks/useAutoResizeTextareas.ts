import { useEffect } from 'react';

/**
 * 自动调整textarea高度的自定义Hook
 * @param refs textarea的ref数组
 * @param deps 依赖项数组，当这些值变化时重新调整高度
 */
export function useAutoResizeTextareas(
  refs: React.RefObject<HTMLTextAreaElement>[],
  deps: React.DependencyList
) {
  useEffect(() => {
    refs.forEach(ref => {
      if (ref.current) {
        ref.current.style.height = 'auto';
        ref.current.style.height = `${ref.current.scrollHeight}px`;
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- 该通用 hook 明确由调用方传入触发依赖；refs 数组由页面创建，加入后会造成无意义重复调整。
  }, deps);
}
