'use client';

import { type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight, Menu } from 'lucide-react';
import { LOGO_CONFIG } from '@/lib/logo-config';
import { AppQuickTools } from './AppQuickTools';

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface AppTopBarProps {
  breadcrumbs: BreadcrumbItem[];
  /** 移动端汉堡菜单回调 */
  onMenuClick?: () => void;
  // user / onLogout 已移至 AppSidebar 底部，此处保留签名兼容性但不使用
  user?: {
    name: string;
    isAdmin: boolean;
    email?: string | null;
  };
  onLogout?: () => void | Promise<void>;
  topBarSlot?: ReactNode;
}

export function AppTopBar({ breadcrumbs, onMenuClick, topBarSlot }: AppTopBarProps) {
  const currentBreadcrumb = breadcrumbs[breadcrumbs.length - 1];

  return (
    <header className="sticky top-0 z-40 h-14 bg-white shadow-sm dark:bg-[#1c1c1e] dark:shadow-gray-800/30">
      <div className="flex h-full items-center gap-3 px-3 sm:px-4 lg:px-6">
        {/* 移动端汉堡按钮 */}
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="rounded-md p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800/50 dark:hover:text-white lg:hidden"
            aria-label="打开导航"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        {/* 移动端 Logo（桌面端 Logo 在 Sidebar 头部）*/}
        <Image
          src={LOGO_CONFIG.web.logo}
          alt="LC App Logo"
          width={28}
          height={28}
          priority
          className="shrink-0 object-contain lg:hidden"
        />

        {/* 面包屑导航 */}
        <nav className="min-w-0 flex-1" aria-label="当前位置">
          <ol className="hidden min-w-0 items-center gap-1 text-sm text-gray-500 dark:text-gray-400 md:flex">
            {breadcrumbs.map((item, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1">
                  {item.path && !isLast ? (
                    <Link
                      href={item.path}
                      className="truncate transition-colors hover:text-gray-900 dark:hover:text-white"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span
                      className={`truncate ${
                        isLast ? 'font-medium text-gray-900 dark:text-white' : ''
                      }`}
                    >
                      {item.label}
                    </span>
                  )}
                  {!isLast && <ChevronRight className="h-4 w-4 shrink-0" />}
                </li>
              );
            })}
          </ol>
          {/* 移动端：当前页名 + 可选插槽 */}
          <div className="flex items-center gap-1.5 md:hidden">
            <span className="truncate text-sm font-medium text-gray-900 dark:text-white">
              {currentBreadcrumb?.label || 'LC App'}
            </span>
            {topBarSlot && (
              <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">{topBarSlot}</span>
            )}
          </div>
        </nav>

        {/* 页面级额外信息插槽（如同步时间）*/}
        {topBarSlot && (
          <div className="hidden shrink-0 text-xs text-gray-400 dark:text-gray-500 md:block">
            {topBarSlot}
          </div>
        )}

        {/* 右侧快捷工具（计算器 / 日期计算器）*/}
        <AppQuickTools />
      </div>
    </header>
  );
}
