import { useEffect, useRef } from 'react';

export function useEffectOncePerChange<T>(depsKey: T, effect: (key: T) => void) {
  const lastKeyRef = useRef<T | null>(null);
  useEffect(() => {
    if (lastKeyRef.current !== depsKey) {
      lastKeyRef.current = depsKey;
      effect(depsKey); // 开发环境 StrictMode 也只会打一次
    }
  }, [depsKey, effect]);
}
