'use client';

import { Suspense, useState, type ReactNode } from 'react';
import { AppBottomActionBar, type ActionButton } from './AppBottomActionBar';
import { AppSidebar } from './AppSidebar';
import { AppTopBar, type BreadcrumbItem } from './AppTopBar';
import { MobileBottomTab } from './MobileBottomTab';

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
  topBarSlot?: ReactNode;
}

export function AppLayout({
  breadcrumbs,
  user,
  onLogout,
  children,
  bottomActions,
  bottomLeftSlot,
  topBarSlot,
}: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* 移动端 overlay 侧边栏（桌面端由 DesktopSidebarHost 全局渲染） */}
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

      {/* 主内容区：margin 由 CSS 变量控制（见 globals.css .app-main-content） */}
      <div className="app-main-content flex min-h-screen flex-1 flex-col overflow-hidden">
        <AppTopBar
          breadcrumbs={breadcrumbs}
          onMenuClick={() => setSidebarOpen(true)}
          topBarSlot={topBarSlot}
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
