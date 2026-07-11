'use client';

import { SessionProvider } from 'next-auth/react';
import { usePermissionInit } from '@/hooks/usePermissionInit';
import { useD1Sync } from '@/hooks/useD1Sync';
import { ToastProvider } from '@/components/ui/Toast';
import { ConfirmDialogProvider } from '@/components/ui/ConfirmDialog';
import { SidebarCollapseProvider } from '@/contexts/SidebarCollapseContext';
import { DesktopSidebarHost } from '@/components/layout/DesktopSidebarHost';
import { LogoutTransitionOverlay } from '@/components/layout/LogoutTransitionOverlay';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { usePermissionChangeWatcher } from '@/hooks/usePermissionChangeWatcher';

// ✅ 全局权限初始化组件
function PermissionInitializer() {
  usePermissionInit();
  return null;
}

function PermissionChangeWatcher() {
  usePermissionChangeWatcher();
  return null;
}

// ✅ 登录后从 D1 拉取数据到 localStorage（多设备同步）
function D1SyncInitializer() {
  useD1Sync();
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      refetchInterval={5 * 60} // 每5分钟刷新一次
      refetchOnWindowFocus={false} // 窗口获得焦点时不刷新
    >
      <ThemeProvider>
        <SidebarCollapseProvider>
          <ConfirmDialogProvider>
            <ToastProvider>
              <PermissionInitializer />
              <PermissionChangeWatcher />
              <D1SyncInitializer />
              <DesktopSidebarHost />
              <LogoutTransitionOverlay />
              {children}
            </ToastProvider>
          </ConfirmDialogProvider>
        </SidebarCollapseProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
