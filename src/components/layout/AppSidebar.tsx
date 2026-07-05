'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Archive,
  Banknote,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  ClipboardCheck,
  FileCheck,
  FileText,
  LayoutDashboard,
  Mail,
  Package,
  PackageSearch,
  Receipt,
  Search,
  ShoppingCart,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { usePermissionStore } from '@/lib/permissions';
import { LOGO_CONFIG } from '@/lib/logo-config';
import { AppUserMenu } from './AppUserMenu';

// ── 类型 ──────────────────────────────────────────────────────────────────────

export interface SidebarItem {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  permissionKey?: string;
  external?: boolean;
}

interface NavGroup {
  id: string;
  label: string; // 空字符串 = 不显示标题
  items: SidebarItem[];
}

interface AppSidebarProps {
  className?: string;
  /** 桌面端收缩状态（仅桌面侧边栏使用，移动端 overlay 忽略此属性） */
  collapsed?: boolean;
  /** 切换收缩/展开 */
  onToggleCollapse?: () => void;
  /** 移动端关闭侧边栏 */
  onClose?: () => void;
  user?: {
    name: string;
    isAdmin: boolean;
    email?: string | null;
  };
  onLogout?: () => void | Promise<void>;
}

// ── 导航数据 ──────────────────────────────────────────────────────────────────

/** 全量平铺列表（供外部引用） */
export const NAV_ITEMS: SidebarItem[] = [
  { id: 'dashboard',    label: '首页',      path: '/dashboard',               icon: LayoutDashboard },
  { id: 'quotation',    label: '报价单',    path: '/quotation',               icon: FileText,  permissionKey: 'canCreateQuotation' },
  { id: 'confirmation', label: '销售确认',  path: '/quotation?tab=confirmation', icon: FileCheck, permissionKey: 'canCreateConfirmation' },
  { id: 'packing',      label: '箱单发票',  path: '/packing',                 icon: Package,   permissionKey: 'canCreatePacking' },
  { id: 'invoice',      label: '财务发票',  path: '/invoice',                 icon: Receipt,   permissionKey: 'canCreateInvoice' },
  { id: 'purchase',     label: '采购订单',  path: '/purchase',                icon: ShoppingCart, permissionKey: 'canCreatePurchase' },
  { id: 'inquiry',      label: '询报价登记', path: '/inquiry',                icon: Search,           permissionKey: 'canViewInquiry' },
  { id: 'order',        label: '订单状态表', path: '/order',                  icon: ClipboardCheck,   permissionKey: 'canViewInquiry' },
  { id: 'history',      label: '单据历史',  path: '/history',                 icon: Archive,          permissionKey: 'canViewHistory' },
  { id: 'customer',     label: '客户管理',  path: '/customer',                icon: Users,     permissionKey: 'canManageCustomers' },
  { id: 'impa',         label: 'IMPA物料', path: 'https://impa.luocompany.com', icon: PackageSearch, permissionKey: 'canUseImpa', external: true },
  { id: 'clock',        label: '时区汇率', path: '/clock',                   icon: Clock,    permissionKey: 'canUseClock' },
  { id: 'holidays',     label: '全球假日', path: '/holidays',                icon: CalendarDays, permissionKey: 'canUseHolidays' },
  { id: 'rmb',          label: 'RMB大写',  path: '/rmb',                     icon: Banknote, permissionKey: 'canUseRmb' },
  { id: 'mail',         label: 'AI 邮件',  path: '/mail',                    icon: Mail,      permissionKey: 'canUseAiEmail' },
];

/** 分组配置 */
const NAV_GROUPS: NavGroup[] = [
  {
    id: 'home',
    label: '',
    items: NAV_ITEMS.slice(0, 1), // 首页
  },
  {
    id: 'documents',
    label: '新单据',
    items: NAV_ITEMS.slice(1, 6), // 报价单 ~ 采购订单
  },
  {
    id: 'registration',
    label: '登记表',
    items: NAV_ITEMS.slice(6, 8), // 询报价登记、订单状态表
  },
  {
    id: 'management',
    label: '管理',
    items: NAV_ITEMS.slice(8, 10), // 单据历史、客户管理
  },
  {
    id: 'tools',
    label: '工具',
    items: NAV_ITEMS.slice(10),    // AI 邮件、时区汇率…
  },
];

/** 权限 key → 模块 ID 映射 */
const PERMISSION_MODULE_MAP: Record<string, string> = {
  canCreateQuotation:   'quotation',
  canCreateConfirmation:'quotation',
  canCreatePacking:     'packing',
  canCreateInvoice:     'invoice',
  canCreatePurchase:    'purchase',
  canViewInquiry:       'inquiry',
  canViewHistory:       'history',
  canManageCustomers:   'customer',
  canUseClock:          'clock',
  canUseHolidays:       'holidays',
  canUseRmb:            'rmb',
  canUseImpa:           'impa',
  canUseAiEmail:        'ai-email',
};

// ── 辅助函数 ──────────────────────────────────────────────────────────────────

function isItemActive(item: SidebarItem, pathname: string, tab: string | null) {
  if (item.id === 'confirmation') return pathname.startsWith('/quotation') && tab === 'confirmation';
  if (item.id === 'quotation')    return pathname.startsWith('/quotation') && tab !== 'confirmation';
  return pathname.startsWith(item.path.split('?')[0]);
}

// ── 组件 ──────────────────────────────────────────────────────────────────────

export function AppSidebar({
  className = '',
  collapsed = false,
  onToggleCollapse,
  onClose,
  user,
  onLogout,
}: AppSidebarProps) {
  const pathname    = usePathname();
  const searchParams = useSearchParams();
  const tab         = searchParams.get('tab');
  const permissionUser = usePermissionStore((state) => state.user);
  const isLoading   = usePermissionStore((state) => state.isLoading);

  // 移动端侧边栏（有 onClose）始终展开
  const isMobile = !!onClose;
  const isCollapsed = !isMobile && collapsed;

  function isVisible(item: SidebarItem) {
    if (!item.permissionKey) return true;
    if (isLoading || !permissionUser) return false;
    const moduleId = PERMISSION_MODULE_MAP[item.permissionKey];
    if (!moduleId) return true;
    const permission = permissionUser.permissions?.find((p) => p.moduleId === moduleId);
    return permission?.canAccess ?? permissionUser.isAdmin;
  }

  const widthClass = isMobile ? 'w-[220px]' : 'app-sidebar';

  return (
    <aside
      className={`fixed left-0 top-0 z-30 flex h-screen flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-[#1c1c1e] ${widthClass} ${className}`}
    >
      {/* ── 头部 ── */}
      <div className="flex h-14 shrink-0 items-center border-b border-gray-200 dark:border-gray-700"
           style={{ padding: isCollapsed ? '0' : '0 12px' }}>
        {/* 收缩态头部（CSS 首屏预置 + React 状态双保险） */}
        {!isMobile && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className={`app-sidebar-header-collapsed h-full w-full items-center justify-center text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white ${isCollapsed ? 'flex' : 'hidden'}`}
            aria-label="展开侧边栏"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        {/* 展开态头部 */}
        {(isMobile || !isCollapsed) && (
          <div className={`app-sidebar-header-expanded flex min-w-0 flex-1 items-center ${isMobile ? 'w-full' : ''}`}
               style={{ padding: isMobile ? '0 12px' : undefined }}>
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <Image
                src={LOGO_CONFIG.web.logo}
                alt="LC App"
                width={26}
                height={26}
                priority
                className="shrink-0 object-contain"
              />
              <span className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                LC App
              </span>
            </div>

            {!isMobile && onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-gray-800/50 dark:hover:text-gray-300"
                aria-label="收起侧边栏"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}

            {isMobile && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-gray-800/50 dark:hover:text-gray-300"
                aria-label="关闭导航"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── 导航列表 ── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2"
           style={{ padding: isCollapsed ? '8px 0' : '8px 10px' }}>
        {NAV_GROUPS.map((group, groupIndex) => {
          const visibleItems = group.items.filter(isVisible);
          if (visibleItems.length === 0) return null;

          return (
            <div
              key={group.id}
              className={groupIndex > 0 ? 'mt-1 border-t border-gray-100 pt-1 dark:border-gray-800' : undefined}
            >
              {/* 组标签（仅展开时显示） */}
              {group.label && !isCollapsed && (
                <div className="app-sidebar-group-label mb-0.5 mt-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  {group.label}
                </div>
              )}

              {/* 导航项 */}
              {visibleItems.map((item) => {
                const Icon   = item.icon;
                const active = isItemActive(item, pathname, tab);
                const navItemClassName = `flex h-9 items-center rounded-md text-sm transition-colors ${
                  isCollapsed
                    ? 'justify-center px-0 mx-1'
                    : 'gap-2.5 px-2'
                } ${
                  active
                    ? 'bg-blue-50 font-medium text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800/50'
                }`;

                return (
                  <div key={item.id} className="relative group/nav">
                    {item.external ? (
                      <a
                        href={item.path}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={onClose}
                        className={navItemClassName}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {!isCollapsed && (
                          <span className="app-sidebar-nav-label truncate">{item.label}</span>
                        )}
                      </a>
                    ) : (
                      <Link
                        href={item.path}
                        onClick={onClose}
                        className={navItemClassName}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {!isCollapsed && (
                          <span className="app-sidebar-nav-label truncate">{item.label}</span>
                        )}
                      </Link>
                    )}

                    {/* 收缩时的 tooltip */}
                    {isCollapsed && (
                      <div
                        className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover/nav:opacity-100 dark:bg-gray-700"
                        role="tooltip"
                      >
                        {item.label}
                        {/* 小三角 */}
                        <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900 dark:border-r-gray-700" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* ── 底部：用户菜单 ── */}
      {user && onLogout && (
        <div className={`shrink-0 border-t border-gray-200 py-2 dark:border-gray-700 ${isCollapsed ? 'px-1' : 'px-2'}`}>
          <AppUserMenu
            user={user}
            onLogout={onLogout}
            placement="bottom-left"
            compact={isCollapsed}
          />
        </div>
      )}
    </aside>
  );
}
