'use client';

import { Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useSidebarCollapse } from '@/contexts/SidebarCollapseContext';
import { useAppUser } from '@/hooks/useAppUser';
import { AppSidebar } from './AppSidebar';

/**
 * 桌面端侧边栏全局单例：不随路由切换卸载，避免导航点击时闪跳。
 * 登录页（未认证）不渲染。
 */
export function DesktopSidebarHost() {
  const { status } = useSession();
  const { user, handleLogout } = useAppUser();
  const { collapsed, toggleCollapse } = useSidebarCollapse();

  if (status !== 'authenticated') {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <AppSidebar
        className="app-sidebar hidden lg:flex"
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
        user={user}
        onLogout={handleLogout}
      />
    </Suspense>
  );
}
