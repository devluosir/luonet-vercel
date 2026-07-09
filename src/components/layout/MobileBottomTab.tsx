'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Archive,
  Banknote,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Info,
  LayoutDashboard,
  LogOut,
  Mail,
  PackageSearch,
  Plus,
  Search,
  Settings,
  Settings2,
  ShoppingCart,
  User,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { usePermissionStore } from '@/lib/permissions';
import { QUICK_CREATE_MODULES } from '@/constants/dashboardModules';
import { LOGO_CONFIG } from '@/lib/logo-config';
import { MobileSheetModal } from './MobileSheetModal';
import { UserProfilePanel } from './UserProfilePanel';

/** 「关于」面板的展示版本号，与 package.json 内部版本号分开维护 */
const APP_DISPLAY_VERSION = 'V1.0.0';

interface MobileMenuLink {
  id: string;
  label: string;
  path: string;
  /** 「新建」子项复用 QUICK_CREATE_MODULES，其中报价/合同 4 项用 TradeDocIcons 自定义组件，类型放宽兼容两者 */
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  moduleId?: string;
  external?: boolean;
}

interface MobileCategory {
  id: string;
  label: string;
  icon: LucideIcon;
  links: MobileMenuLink[];
}

interface MobileBottomTabUser {
  name: string;
  isAdmin: boolean;
  email?: string | null;
}

interface MobileBottomTabProps {
  user: MobileBottomTabUser;
  onLogout: () => void | Promise<void>;
}

/** “新建”子项直接复用仪表盘快捷创建的数据源，id → 权限 moduleId 映射 */
const QUICK_CREATE_MODULE_ID: Record<string, string> = {
  quotation: 'quotation',
  confirmation: 'quotation',
  'quotation-domestic': 'domesticQuotation',
  'quotation-domestic-contract': 'domesticQuotation',
  packing: 'packing',
  invoice: 'invoice',
  purchase: 'purchase',
};

const NEW_LINKS: MobileMenuLink[] = QUICK_CREATE_MODULES.map((module) => ({
  id: module.id,
  label: module.name,
  path: module.path,
  icon: module.icon,
  moduleId: QUICK_CREATE_MODULE_ID[module.id],
}));

/** “登记/管理/工具”子项与 AppSidebar.tsx 的 NAV_ITEMS + PERMISSION_MODULE_MAP 保持同一套 id/moduleId */
const REGISTER_LINKS: MobileMenuLink[] = [
  { id: 'inquiry', label: '询报价登记', path: '/inquiry', icon: Search, moduleId: 'inquiry' },
  { id: 'order', label: '订单状态表', path: '/order', icon: ClipboardCheck, moduleId: 'inquiry' },
  { id: 'purchase-registration', label: '采购部登记', path: '/purchase-registration', icon: ClipboardCheck, moduleId: 'purchaseRegistration' },
  { id: 'purchase-order-table', label: '采购订单表', path: '/purchase-order-table', icon: ShoppingCart, moduleId: 'purchaseRegistration' },
];

const MANAGE_LINKS: MobileMenuLink[] = [
  { id: 'history', label: '单据历史', path: '/history', icon: Archive, moduleId: 'history' },
  { id: 'customer', label: '客户管理', path: '/customer', icon: Users, moduleId: 'customer' },
];

const TOOLS_LINKS: MobileMenuLink[] = [
  { id: 'impa', label: 'IMPA物料', path: 'https://impa.luocompany.com', icon: PackageSearch, moduleId: 'impa', external: true },
  { id: 'clock', label: '时区汇率', path: '/clock', icon: Clock, moduleId: 'clock' },
  { id: 'holidays', label: '全球假日', path: '/holidays', icon: CalendarDays, moduleId: 'holidays' },
  { id: 'rmb', label: 'RMB大写', path: '/rmb', icon: Banknote, moduleId: 'rmb' },
  { id: 'mail', label: 'AI 邮件', path: '/mail', icon: Mail, moduleId: 'ai-email' },
];

const CATEGORY_DEFS: MobileCategory[] = [
  { id: 'new', label: '新建', icon: Plus, links: NEW_LINKS },
  { id: 'register', label: '登记', icon: ClipboardList, links: REGISTER_LINKS },
  { id: 'manage', label: '管理', icon: Settings2, links: MANAGE_LINKS },
  { id: 'tools', label: '工具', icon: Wrench, links: TOOLS_LINKS },
];

const menuItemClass =
  'flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800/50';

export function MobileBottomTab({ user, onLogout }: MobileBottomTabProps) {
  const pathname = usePathname();
  const router = useRouter();
  const permissionUser = usePermissionStore((state) => state.user);
  const isLoading = usePermissionStore((state) => state.isLoading);

  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [showAbout, setShowAbout] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenCategory(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function isLinkVisible(link: MobileMenuLink) {
    if (!link.moduleId) return true;
    if (isLoading || !permissionUser) return false;
    const permission = permissionUser.permissions?.find((p) => p.moduleId === link.moduleId);
    return permission?.canAccess ?? permissionUser.isAdmin;
  }

  function isCategoryActive(links: MobileMenuLink[]) {
    return links.some((link) => {
      if (link.external) return false;
      const base = link.path.split('?')[0];
      return pathname === base || pathname.startsWith(`${base}/`);
    });
  }

  const visibleCategories = CATEGORY_DEFS.map((category) => ({
    ...category,
    links: category.links.filter(isLinkVisible),
  })).filter((category) => category.links.length > 0);

  // “首页”为直达链接（不受权限过滤，等同旧版行为）；“我”入口固定常驻，也不受权限过滤
  const allEntries: Array<
    | { kind: 'link'; id: string; label: string; icon: LucideIcon; path: string }
    | { kind: 'links'; id: string; label: string; icon: LucideIcon; links: MobileMenuLink[] }
    | { kind: 'me'; id: 'me'; label: string; icon: LucideIcon }
  > = [
    { kind: 'link' as const, id: 'dashboard', label: '首页', icon: LayoutDashboard, path: '/dashboard' },
    ...visibleCategories.map((category) => ({ kind: 'links' as const, ...category })),
    { kind: 'me' as const, id: 'me', label: '我', icon: User },
  ];

  return (
    <>
      <nav
        ref={navRef}
        className="fixed inset-x-0 bottom-0 z-40 grid h-12 border-t border-gray-200 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.04)] dark:border-gray-700 dark:bg-app-dark-base md:hidden"
        style={{ gridTemplateColumns: `repeat(${allEntries.length}, minmax(0, 1fr))` }}
      >
        {allEntries.map((entry, index) => {
          const Icon = entry.icon;
          const isOpen = openCategory === entry.id;
          const active =
            entry.kind === 'links'
              ? isCategoryActive(entry.links)
              : entry.kind === 'link'
                ? pathname === entry.path || pathname.startsWith(`${entry.path}/`)
                : false;
          const panelPositionClass =
            index === 0 ? 'left-0' : index === allEntries.length - 1 ? 'right-0' : 'left-1/2 -translate-x-1/2';
          const buttonClassName = `flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] transition-colors ${
            active || isOpen
              ? 'font-medium text-blue-600 dark:text-blue-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`;

          if (entry.kind === 'link') {
            return (
              <div key={entry.id} className="relative flex">
                <Link href={entry.path} onClick={() => setOpenCategory(null)} className={buttonClassName}>
                  <Icon className="h-4 w-4" />
                  <span className="max-w-full truncate">{entry.label}</span>
                </Link>
              </div>
            );
          }

          return (
            <div key={entry.id} className="relative flex">
              <button
                type="button"
                onClick={() => setOpenCategory(isOpen ? null : entry.id)}
                aria-expanded={isOpen}
                className={buttonClassName}
              >
                <Icon className="h-4 w-4" />
                <span className="max-w-full truncate">{entry.label}</span>
              </button>

              {isOpen && (
                <div
                  className={`absolute bottom-full z-50 mb-2 w-48 rounded-xl border border-gray-100 bg-white p-1.5 shadow-lg ring-1 ring-black/5 dark:border-gray-700 dark:bg-app-dark-surface dark:ring-white/10 ${panelPositionClass}`}
                >
                  {entry.kind === 'me' ? (
                    <div className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => {
                          setOpenCategory(null);
                          setShowAbout(true);
                        }}
                        className={menuItemClass}
                      >
                        <Info className="h-4 w-4 shrink-0" />
                        <span className="truncate">关于</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOpenCategory(null);
                          setShowProfile(true);
                        }}
                        className={menuItemClass}
                      >
                        <User className="h-4 w-4 shrink-0" />
                        <span className="truncate">个人信息</span>
                      </button>
                      {user.isAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            setOpenCategory(null);
                            router.push('/admin');
                          }}
                          className={menuItemClass}
                        >
                          <Settings className="h-4 w-4 shrink-0" />
                          <span className="truncate">管理后台</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setOpenCategory(null);
                          onLogout();
                        }}
                        className={menuItemClass}
                      >
                        <LogOut className="h-4 w-4 shrink-0" />
                        <span className="truncate">退出登录</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      {entry.links.map((link) => {
                        const LinkIcon = link.icon;
                        const content = (
                          <>
                            <LinkIcon className="h-4 w-4 shrink-0" />
                            <span className="truncate">{link.label}</span>
                          </>
                        );
                        return link.external ? (
                          <a
                            key={link.id}
                            href={link.path}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setOpenCategory(null)}
                            className={menuItemClass}
                          >
                            {content}
                          </a>
                        ) : (
                          <Link
                            key={link.id}
                            href={link.path}
                            onClick={() => setOpenCategory(null)}
                            className={menuItemClass}
                          >
                            {content}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <MobileSheetModal open={showAbout} title="关于" onClose={() => setShowAbout(false)}>
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <Image
            src={LOGO_CONFIG.web.logo}
            alt="LC App"
            width={64}
            height={64}
            className="shrink-0 object-contain"
          />
          <span className="text-base font-semibold text-gray-900 dark:text-white">LC App</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">{APP_DISPLAY_VERSION}</span>
        </div>
      </MobileSheetModal>

      <MobileSheetModal open={showProfile} title="个人信息" onClose={() => setShowProfile(false)}>
        <UserProfilePanel user={user} layout="sheet" />
      </MobileSheetModal>
    </>
  );
}
