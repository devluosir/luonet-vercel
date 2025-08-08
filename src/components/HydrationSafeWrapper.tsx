'use client';

import React, { useEffect, useState } from 'react';

interface HydrationSafeWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * 安全的hydration包装组件
 * 在客户端渲染完成前显示fallback，避免hydration不匹配
 */
export function HydrationSafeWrapper({ children, fallback }: HydrationSafeWrapperProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}

/**
 * 专门用于处理动态样式的组件
 */
export function DynamicStyleWrapper({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div style={{ visibility: 'hidden' }}>{children}</div>;
  }

  return <>{children}</>;
}
