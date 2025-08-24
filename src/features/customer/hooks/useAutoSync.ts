import { useEffect, useState } from 'react';
import { initAutoSync } from '../services/autoTimelineService';

export function useAutoSync() {
  const [isClient, setIsClient] = useState(false);

  // 确保在客户端渲染
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // 只在客户端执行
    if (typeof window === 'undefined' || !isClient) return;

    // 初始化自动同步
    const cleanup = initAutoSync();

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [isClient]);

  return {
    isActive: typeof window !== 'undefined' && isClient
  };
}
