'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Archive,
  FileCheck,
  FileText,
  LayoutDashboard,
  Mail,
  Package,
  Receipt,
  ShoppingCart,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { usePermissionStore } from '@/lib/permissions';
import { LOGO_CONFIG } from '@/lib/logo-config';
import { AppUserMenu } from './AppUserMenu';

export interface SidebarItem {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  dividerBefore?: boolean;
  permissionKey?: string;
}

interface AppSidebarProps {
  className?: string;
  onClose?: () => void;
  user?: {
    name: string;
    isAdmin: boolean;
    email?: string | null;
  };
  onLogout?: () => void | Promise<void>;
}

export const NAV_ITEMS: SidebarItem[] = [
  { id: 'dashboard', label: '首页', path: '/dashboard', icon: LayoutDashboard },
  {
    id: 'quotation',
    label: '报价单',
    path: '/quotation',
    icon: FileText,
    dividerBefore: true,
    permissionKey: 'canCreateQuotation',
  },
  {
    id: 'confirmation',
    label: '销售确认',
    path: '/quotation?tab=confirmation',
    icon: FileCheck,
    permissionKey: 'canCreateConfirmation',
  },
  {
    id: 'packing',
    label: '箱单发票',
    path: '/packing',
    icon: Package,
    permissionKey: 'canCreatePacking',
  },
  {
    id: 'invoice',
    label: '财务发票',
    path: '/invoice',
    icon: Receipt,
    permissionKey: 'canCreateInvoice',
  },
  {
    id: 'purchase',
    label: '采购订单',
    path: '/purchase',
    icon: ShoppingCart,
    permissionKey: 'canCreatePurchase',
  },
  {
    id: 'history',
    label: '单据历史',
    path: '/history',
    icon: Archive,
    dividerBefore: true,
    permissionKey: 'canViewHistory',
  },
  {
    id: 'customer',
    label: '客户管理',
    path: '/customer',
    icon: Users,
    permissionKey: 'canManageCustomers',
  },
  {
    id: 'mail',
    label: 'AI邮件',
    path: '/mail',
    icon: Mail,
    dividerBefore: true,
  },
];

const PERMISSION_MODULE_MAP: Record<string, string> = {
  canCreateQuotation: 'quotation',
  canCreateConfirmation: 'quotation',
  canCreatePacking: 'packing',
  canCreateInvoice: 'invoice',
  canCreatePurchase: 'purchase',
  canViewHistory: 'history',
  canManageCustomers: 'customer',
};

function isItemActive(item: SidebarItem, pathname: string, tab: string | null) {
  if (item.id === 'confirmation') {
    return pathname.startsWith('/quotation') && tab === 'confirmation';
  }
  if (item.id === 'quotation') {
    return pathname.startsWith('/quotation') && tab !== 'confirmation';
  }
  return pathname.startsWith(item.path.split('?')[0]);
}

export function AppSidebar({ className = '', onClose, user, onLogout }: AppSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
  const permissionUser = usePermissionStore((state) => state.user);
  const isLoading = usePermissionStore((state) => state.isLoading);

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.permissionKey) return true;
    // 权限加载中或 user 未就绪时，显示全部项目（避免闪烁消失）
    if (isLoading || !permissionUser) return true;
    // 管理员看全部
    if (permissionUser.isAdmin) return true;
    const moduleId = PERMISSION_MODULE_MAP[item.permissionKey];
    if (!moduleId) return true;
    return permissionUser.permissions?.some(
      (permission) => permission.moduleId === moduleId && permission.canAccess
    ) ?? false;
  });

  return (
    <aside
      className={`fixed left-0 top-0 z-30 flex h-screen w-[200px] flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-[#1c1c1e] ${className}`}
    >
      {/* ── 头部：Logo + 应用名 ── */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-700">
        <div className="flex min-w-0 items-center gap-2.5">
          <Image
            src={LOGO_CONFIG.web.logo}
            alt="LC App"
            width={28}
            height={28}
            priority
            className="shrink-0 object-contain"
          />
          <span className="truncate text-sm font-semibold text-gray-900 dark:text-white">
            LC App
          </span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-gray-200 lg:hidden"
            aria-label="关闭导航"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── 导航列表 ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = isItemActive(item, pathname, tab);

          return (
            <div
              key={item.id}
              className={item.dividerBefore ? 'mt-1 border-t border-gray-200 pt-1 dark:border-gray-700' : undefined}
            >
              <Link
                href={item.path}
                onClick={onClose}
                className={`flex h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors ${
                  active
                    ? 'bg-blue-50 font-medium text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800/50'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            </div>
          );
        })}
      </nav>

      {/* ── 底部：用户菜单 ── */}
      {user && onLogout && (
        <div className="shrink-0 border-t border-gray-200 px-3 py-3 dark:border-gray-700">
          <AppUserMenu user={user} onLogout={onLogout} placement="bottom-left" />
        </div>
      )}
    </aside>
  );
}
