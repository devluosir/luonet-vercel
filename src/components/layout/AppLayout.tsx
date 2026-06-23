'use client';

import { Suspense, useCallback, useEffect, useState, type ReactNode } from 'react';
import { AppBottomActionBar, type ActionButton } from './AppBottomActionBar';
import { AppSidebar } from './AppSidebar';
import { AppTopBar, type BreadcrumbItem } from './AppTopBar';
import { MobileBottomTab } from './MobileBottomTab';

const COLLAPSED_KEY = 'sidebar_collapsed';

function readCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
}

interface AppLayoutProps {
  breadcrumbs: BreadcrumbItem[];
  user: {
    name: string;
    isAdmin: boolean;
    email?: string | null;
  };
  onLogout: () => void | Promise<void>;
  children: ReactNode;
  bottomActions?: ActionButton[];
  bottomLeftSlot?: ReactNode;
}

export function AppLayout({
  breadcrumbs,
  user,
  onLogout,
  children,
  bottomActions,
  bottomLeftSlot,
}: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // 从 localStorage 恢复收缩状态（客户端挂载后）
  useEffect(() => {
    setCollapsed(readCollapsed());
  }, []);

  const handleToggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(COLLAPSED_KEY, String(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* 桌面侧边栏 */}
      <Suspense fallback={null}>
        <AppSidebar
          className="hidden lg:flex"
          collapsed={collapsed}
          onToggleCollapse={handleToggleCollapse}
          user={user}
          onLogout={onLogout}
        />
      </Suspense>

      {/* 移动端 overlay 侧边栏 */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <Suspense fallback={null}>
            <AppSidebar
              className="z-50 lg:hidden"
              onClose={() => setSidebarOpen(false)}
              user={user}
              onLogout={onLogout}
            />
          </Suspense>
        </>
      )}

      {/* 主内容区：随收缩状态切换 margin */}
      <div
        className={`flex min-h-screen flex-1 flex-col overflow-hidden transition-[margin-left] duration-200 ease-in-out ${
          collapsed ? 'lg:ml-14' : 'lg:ml-[220px]'
        }`}
      >
        <AppTopBar
          breadcrumbs={breadcrumbs}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto pb-12 md:pb-0">{children}</main>
        {bottomActions && bottomActions.length > 0 && (
          <AppBottomActionBar actions={bottomActions} leftSlot={bottomLeftSlot} />
        )}
        <Suspense fallback={null}>
          <MobileBottomTab />
        </Suspense>
      </div>
    </div>
  );
}
