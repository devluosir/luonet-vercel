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

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <Suspense fallback={null}>
        <AppSidebar className="hidden lg:flex" />
      </Suspense>

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
            />
          </Suspense>
        </>
      )}

      <div className="flex min-h-screen flex-1 flex-col overflow-hidden lg:ml-[200px]">
        <AppTopBar
          breadcrumbs={breadcrumbs}
          user={user}
          onLogout={onLogout}
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
