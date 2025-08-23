import { useEffect, useRef } from 'react';
import { initAutoSync } from '../services/autoTimelineService';

export function useAutoSync() {
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // 初始化自动同步
    const cleanup = initAutoSync();
    if (cleanup) {
      cleanupRef.current = cleanup;
    }

    // 清理函数
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  return {
    isActive: true
  };
}
