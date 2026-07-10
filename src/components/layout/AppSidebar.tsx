'use client';

import { useState } from 'react';
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
  LayoutDashboard,
  Mail,
  Package,
  PackageSearch,
  Receipt,
  Search,
  ShoppingCart,
  Users,
  X,
} from 'lucide-react';
import { usePermissionStore } from '@/lib/permissions';
import { LOGO_CONFIG } from '@/lib/logo-config';
import {
  ForeignQuotationIcon,
  ForeignContractIcon,
  DomesticQuotationIcon,
  DomesticContractIcon,
} from '@/components/icons/TradeDocIcons';
import { AppUserMenu } from './AppUserMenu';

// ── 类型 ──────────────────────────────────────────────────────────────────────

export interface SidebarItem {
  id: string;
  label: string;
  path: string;
  /** 大部分导航项用 lucide-react 图标，报价/合同 4 项用 TradeDocIcons 自定义组件，类型放宽兼容两者 */
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
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
  { id: 'quotation',                   label: '外贸报价', path: '/quotation?tab=quotation',                icon: ForeignQuotationIcon,  permissionKey: 'canCreateQuotation' },
  { id: 'confirmation',                label: '外贸合同', path: '/quotation?tab=confirmation',              icon: ForeignContractIcon,   permissionKey: 'canCreateQuotation' },
  { id: 'quotation-domestic',          label: '内销报价', path: '/quotation?tab=domestic&docType=quotation', icon: DomesticQuotationIcon, permissionKey: 'canCreateDomesticQuotation' },
  { id: 'quotation-domestic-contract', label: '内销合同', path: '/quotation?tab=domestic&docType=contract',  icon: DomesticContractIcon,  permissionKey: 'canCreateDomesticQuotation' },
  { id: 'packing',      label: '箱单发票',  path: '/packing',                 icon: Package,   permissionKey: 'canCreatePacking' },
  { id: 'invoice',      label: '财务发票',  path: '/invoice',                 icon: Receipt,   permissionKey: 'canCreateInvoice' },
  { id: 'purchase',     label: '采购订单',  path: '/purchase',                icon: ShoppingCart, permissionKey: 'canCreatePurchase' },
  { id: 'inquiry',      label: '询报价登记', path: '/inquiry',                icon: Search,           permissionKey: 'canViewInquiry' },
  { id: 'order',        label: '订单状态表', path: '/order',                  icon: ClipboardCheck,   permissionKey: 'canViewInquiry' },
  { id: 'purchase-registration', label: '采购部登记', path: '/purchase-registration', icon: ClipboardCheck, permissionKey: 'canViewPurchaseRegistration' },
  { id: 'purchase-order-table', label: '采购订单表', path: '/purchase-order-table', icon: ShoppingCart, permissionKey: 'canViewPurchaseRegistration' },
  { id: 'history',      label: '单据历史',  path: '/history',                 icon: Archive,          permissionKey: 'canViewHistory' },
  { id: 'customer',     label: '客户管理',  path: '/customer',                icon: Users,     permissionKey: 'canManageCustomers' },
  { id: 'impa',         label: 'IMPA物料', path: 'https://impa.luocompany.com', icon: PackageSearch, permissionKey: 'canUseImpa', external: true },
  { id: 'clock',        label: '时区汇率', path: '/clock',                   icon: Clock,    permissionKey: 'canUseClock' },
  { id: 'holidays',     label: '全球假日', path: '/holidays',                icon: CalendarDays, permissionKey: 'canUseHolidays' },
  { id: 'rmb',          label: 'RMB大写',  path: '/rmb',                     icon: Banknote, permissionKey: 'canUseRmb' },
  { id: 'mail',         label: 'AI 邮件',  path: '/mail',                    icon: Mail,      permissionKey: 'canUseAiEmail' },
];

const navItemsById = new Map(NAV_ITEMS.map((item) => [item.id, item]));

function navGroupItems(ids: string[]): SidebarItem[] {
  return ids.flatMap((id) => {
    const item = navItemsById.get(id);
    return item ? [item] : [];
  });
}

/** 分组配置 */
const NAV_GROUPS: NavGroup[] = [
  {
    id: 'home',
    label: '',
    items: navGroupItems(['dashboard']),
  },
  {
    id: 'documents',
    label: '新单据',
    items: navGroupItems(['quotation', 'confirmation', 'quotation-domestic', 'quotation-domestic-contract', 'packing', 'invoice', 'purchase']),
  },
  {
    id: 'registration',
    label: '登记表',
    items: navGroupItems(['inquiry', 'order', 'purchase-registration', 'purchase-order-table']),
  },
  {
    id: 'management',
    label: '管理',
    items: navGroupItems(['history', 'customer']),
  },
  {
    id: 'tools',
    label: '工具',
    items: navGroupItems(['clock', 'holidays', 'rmb', 'mail', 'impa']),
  },
];

/** 权限 key → 模块 ID 映射 */
const PERMISSION_MODULE_MAP: Record<string, string> = {
  canCreateQuotation:   'quotation',
  canCreateDomesticQuotation: 'domesticQuotation',
  canCreatePacking:     'packing',
  canCreateInvoice:     'invoice',
  canCreatePurchase:    'purchase',
  canViewInquiry:       'inquiry',
  canViewPurchaseRegistration: 'purchaseRegistration',
  canViewHistory:       'history',
  canManageCustomers:   'customer',
  canUseClock:          'clock',
  canUseHolidays:       'holidays',
  canUseRmb:            'rmb',
  canUseImpa:           'impa',
  canUseAiEmail:        'ai-email',
};

// ── 辅助函数 ──────────────────────────────────────────────────────────────────

function isItemActive(item: SidebarItem, pathname: string, tab: string | null, docType: string | null) {
  if (pathname.startsWith('/quotation')) {
    switch (item.id) {
      case 'quotation':                   return tab !== 'domestic' && tab !== 'confirmation';
      case 'confirmation':                return tab === 'confirmation';
      case 'quotation-domestic':          return tab === 'domestic' && docType !== 'contract';
      case 'quotation-domestic-contract': return tab === 'domestic' && docType === 'contract';
      default: return false;
    }
  }
  const itemPath = item.path.split('?')[0];
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
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
  const docType     = searchParams.get('docType');
  const permissionUser = usePermissionStore((state) => state.user);
  const isLoading   = usePermissionStore((state) => state.isLoading);

  // 移动端侧边栏（有 onClose）始终展开
  const isMobile = !!onClose;
  const isCollapsed = !isMobile && collapsed;

  // 收缩态悬浮提示：用 fixed 定位 + 鼠标进入时读取图标的 getBoundingClientRect 单独渲染一个
  // tooltip，不能像原来那样直接挂在导航项内部用 absolute 定位——nav 容器需要
  // overflow-x-hidden 防止收缩/展开宽度过渡时出现横向滚动条，会把伸到 nav 外面的
  // tooltip 一起裁掉，导致收缩态鼠标移上去完全看不到提示（2026-07-10 用户反馈）。
  const [tooltip, setTooltip] = useState<{ id: string; label: string; top: number; left: number } | null>(null);

  function showTooltip(itemId: string, label: string, target: HTMLElement) {
    const rect = target.getBoundingClientRect();
    setTooltip({ id: itemId, label, top: rect.top + rect.height / 2, left: rect.right + 8 });
  }

  function hideTooltip() {
    setTooltip(null);
  }

  function isVisible(item: SidebarItem) {
    if (!item.permissionKey) return true;
    if (isLoading || !permissionUser) return false;
    const moduleId = PERMISSION_MODULE_MAP[item.permissionKey];
    if (!moduleId) return true;
    const permission = permissionUser.permissions?.find((p) => p.moduleId === moduleId);
    return permission?.canAccess ?? permissionUser.isAdmin;
  }

  const widthClass = isMobile ? 'w-[260px]' : 'app-sidebar';

  return (
    <aside
      className={`app-h-dvh fixed left-0 top-0 z-30 flex flex-col border-r border-sidebar-border bg-sidebar-bg ${widthClass} ${className}`}
    >
      {/* ── 头部 ── */}
      <div className="flex h-14 shrink-0 items-center border-b border-sidebar-border"
           style={{ padding: isCollapsed ? '0' : '0 16px' }}>
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
      <nav className="flex-1 overflow-y-auto overflow-x-hidden"
           style={{ padding: isCollapsed ? '16px 0' : '16px' }}
           onScroll={hideTooltip}>
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter(isVisible);
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.id}>
              {/* 组标签（仅展开时显示）：12px / 600 / #9CA3AF / 大写，与上一组保持 20-24px 间距 */}
              {group.label && !isCollapsed && (
                <div className="app-sidebar-group-label mb-2 mt-6 px-3 text-xs font-semibold uppercase tracking-wide text-sidebar-section-title first:mt-0">
                  {group.label}
                </div>
              )}

              {/* 导航项：默认统一中性灰（图标 #64748B / 文字 #4B5563），
                  激活态品牌蓝背景 + 蓝色文字/图标 + 左侧 3px 指示条，不再使用逐项彩色图标 */}
              {visibleItems.map((item) => {
                const Icon   = item.icon;
                const active = isItemActive(item, pathname, tab, docType);
                const navItemClassName = `flex h-11 items-center rounded-[10px] text-[15px] font-medium transition-colors ${
                  isCollapsed
                    ? 'justify-center px-0 mx-1'
                    : 'gap-3 px-3'
                } ${
                  active
                    ? 'bg-sidebar-item-active-bg text-sidebar-item-active-text'
                    : 'text-sidebar-item-text hover:bg-sidebar-item-hover-bg'
                }`;
                const iconClassName = `h-5 w-5 shrink-0 ${active ? 'text-sidebar-item-active-icon' : 'text-sidebar-item-icon'}`;

                return (
                  <div
                    key={item.id}
                    className="relative group/nav mb-0.5"
                    onMouseEnter={isCollapsed ? (e) => showTooltip(item.id, item.label, e.currentTarget) : undefined}
                    onMouseLeave={isCollapsed ? hideTooltip : undefined}
                  >
                    {/* 激活态左侧品牌蓝指示条 */}
                    {active && !isCollapsed && (
                      <span className="pointer-events-none absolute -left-4 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-sidebar-item-active-indicator" />
                    )}

                    {item.external ? (
                      <a
                        href={item.path}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={onClose}
                        className={navItemClassName}
                      >
                        <Icon className={iconClassName} strokeWidth={1.75} />
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
                        <Icon className={iconClassName} strokeWidth={1.75} />
                        {!isCollapsed && (
                          <span className="app-sidebar-nav-label truncate">{item.label}</span>
                        )}
                      </Link>
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
        <div className={`shrink-0 border-t border-sidebar-border py-2 ${isCollapsed ? 'px-1' : 'px-2'}`}>
          <AppUserMenu
            user={user}
            onLogout={onLogout}
            placement="bottom-left"
            compact={isCollapsed}
          />
        </div>
      )}

      {/* 收缩态悬浮提示：fixed 定位，不受 nav 的 overflow-x-hidden 裁剪影响 */}
      {isCollapsed && tooltip && (
        <div
          className="animate-in fade-in-0 pointer-events-none fixed z-50 -translate-y-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg dark:bg-gray-700"
          style={{ top: tooltip.top, left: tooltip.left }}
          role="tooltip"
        >
          {tooltip.label}
          {/* 小三角 */}
          <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900 dark:border-r-gray-700" />
        </div>
      )}
    </aside>
  );
}
