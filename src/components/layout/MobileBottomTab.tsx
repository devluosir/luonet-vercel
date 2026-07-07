'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Archive, ClipboardList, FileText, LayoutDashboard, Mail, type LucideIcon } from 'lucide-react';
import { usePermissionStore } from '@/lib/permissions';

interface MobileTabItem {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  moduleId?: string;
}

const MOBILE_TABS: MobileTabItem[] = [
  { id: 'dashboard', label: '首页', path: '/dashboard', icon: LayoutDashboard },
  { id: 'quotation', label: '外贸报价单', path: '/quotation', icon: FileText, moduleId: 'quotation' },
  { id: 'inquiry', label: '登记表', path: '/inquiry', icon: ClipboardList, moduleId: 'inquiry' },
  { id: 'history', label: '历史', path: '/history', icon: Archive, moduleId: 'history' },
  { id: 'mail', label: '邮件', path: '/mail', icon: Mail, moduleId: 'ai-email' },
];

function isTabActive(item: MobileTabItem, pathname: string, tab: string | null) {
  if (item.id === 'quotation') {
    return pathname.startsWith('/quotation') && tab !== 'confirmation' && tab !== 'domestic';
  }

  return pathname.startsWith(item.path);
}

export function MobileBottomTab() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
  const permissionUser = usePermissionStore((state) => state.user);
  const isLoading = usePermissionStore((state) => state.isLoading);

  const visibleTabs = MOBILE_TABS.filter((item) => {
    if (!item.moduleId) return true;
    if (isLoading || !permissionUser) return false;
    const permission = permissionUser.permissions?.find((p) => p.moduleId === item.moduleId);
    return permission?.canAccess ?? permissionUser.isAdmin;
  });

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 grid h-12 border-t border-gray-200 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.04)] dark:border-gray-700 dark:bg-app-dark-base md:hidden"
      style={{ gridTemplateColumns: `repeat(${visibleTabs.length}, minmax(0, 1fr))` }}
    >
      {visibleTabs.map((item) => {
        const Icon = item.icon;
        const active = isTabActive(item, pathname, tab);

        return (
          <Link
            key={item.id}
            href={item.path}
            className={`flex min-w-0 flex-col items-center justify-center gap-0.5 text-[11px] transition-colors ${
              active
                ? 'font-medium text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="max-w-full truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
