'use client';

import { Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useSidebarCollapse } from '@/contexts/SidebarCollapseContext';
import { useAppUser } from '@/hooks/useAppUser';
import { AppSidebar } from './AppSidebar';

/**
 * 桌面端侧边栏全局单例：不随路由切换卸载，避免导航点击时闪跳。
 * 登录页不渲染（无论认证状态），避免登录成功到路由跳转完成之间提前出现。
 */
export function DesktopSidebarHost() {
  const { status } = useSession();
  const pathname = usePathname();
  const { user, handleLogout } = useAppUser();
  const { collapsed, toggleCollapse } = useSidebarCollapse();

  if (status !== 'authenticated' || pathname === '/') {
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
