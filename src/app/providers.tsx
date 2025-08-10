'use client';

import { SessionProvider } from 'next-auth/react';
import { usePermissionInit } from '@/hooks/usePermissionInit';
import { ToastProvider } from '@/components/ui/Toast';

// ✅ 全局权限初始化组件
function PermissionInitializer() {
  usePermissionInit();
  return null; // 这个组件不渲染任何内容，只负责初始化
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>
        <PermissionInitializer />
        {children}
      </ToastProvider>
    </SessionProvider>
  );
} 