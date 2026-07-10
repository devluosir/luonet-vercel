'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  ChevronUp,
  Download,
  LogOut,
  Settings,
  User,
} from 'lucide-react';
import { Avatar } from '@/components/Avatar';
import { UserProfilePanel } from './UserProfilePanel';
import { preloadManager } from '@/utils/preloadUtils';
import { USER_MENU_ICON_COLORS } from '@/constants/menuIconColors';

export interface AppUserMenuProps {
  user: {
    name: string;
    isAdmin: boolean;
    email?: string | null;
  };
  onLogout: () => void | Promise<void>;
  /**
   * 弹出方向：
   *   'top-right'   → 右上角触发，向下弹（TopBar 默认）
   *   'bottom-left' → 左下角触发，向上弹（Sidebar 默认）
   */
  placement?: 'top-right' | 'bottom-left';
  /** 紧凑模式：侧边栏收缩时只显示头像，隐藏用户名和 chevron */
  compact?: boolean;
  className?: string;
}

export function AppUserMenu({
  user,
  onLogout,
  placement = 'top-right',
  compact = false,
  className = '',
}: AppUserMenuProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState<'profile' | null>(null);
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadProgress, setPreloadProgress] = useState(0);
  const [preloadStage, setPreloadStage] = useState('');
  const [isPreloaded, setIsPreloaded] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const submenuHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  const checkPreloadStatus = useCallback(() => {
    const status = preloadManager.getPreloadStatus();
    setIsPreloading(status.isPreloading);
    setPreloadProgress(status.progress);
    setIsPreloaded(preloadManager.isPreloaded());
  }, []);

  const openProfileSubmenu = useCallback(() => {
    if (submenuHideTimerRef.current) {
      clearTimeout(submenuHideTimerRef.current);
      submenuHideTimerRef.current = null;
    }
    setOpenSubmenu('profile');
  }, []);

  const scheduleCloseProfileSubmenu = useCallback(() => {
    if (isEditingPassword) return;
    if (submenuHideTimerRef.current) clearTimeout(submenuHideTimerRef.current);
    submenuHideTimerRef.current = setTimeout(() => setOpenSubmenu(null), 200);
  }, [isEditingPassword]);

  useEffect(() => {
    return () => {
      if (submenuHideTimerRef.current) clearTimeout(submenuHideTimerRef.current);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setOpenSubmenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    checkPreloadStatus();
    const interval = setInterval(checkPreloadStatus, 1000);
    return () => clearInterval(interval);
  }, [checkPreloadStatus]);

  useEffect(() => {
    const cb = (progress: number, stage?: string) => {
      setPreloadProgress(progress);
      if (stage) setPreloadStage(stage);
      if (progress > 0) setIsPreloading(true);
      if (progress >= 100) {
        setIsPreloading(false);
        setPreloadStage('');
        setIsPreloaded(true);
      }
    };
    preloadManager.onProgress(cb);
    return () => preloadManager.offProgress(cb);
  }, []);

  const handlePreload = async () => {
    if (isPreloading) return;
    setIsPreloading(true);
    setPreloadProgress(0);
    setPreloadStage('准备中...');
    const cb = (progress: number, stage?: string) => {
      setPreloadProgress(progress);
      if (stage) setPreloadStage(stage);
    };
    preloadManager.onProgress(cb);
    try {
      await preloadManager.preloadAllResources();
      setIsPreloaded(true);
    } catch (error) {
      console.error('预加载失败:', error);
    } finally {
      setIsPreloading(false);
      setPreloadStage('');
      preloadManager.offProgress(cb);
      setShowDropdown(false);
    }
  };

  const isBottomLeft = placement === 'bottom-left';
  // 弹出层定位
  const dropdownPos = isBottomLeft ? 'bottom-full left-0 mb-2' : 'right-0 top-full mt-2';
  // 子菜单定位（profile 面板）
  // 移动端侧边栏固定宽 220px，屏幕较窄时若仍向右展开会超出可视区域，
  // 因此小屏（<640px）改为在按钮下方原地展开（智能收窄），sm 及以上保持原有向右弹出。
  const submenuPos = isBottomLeft
    ? 'static mt-2 sm:absolute sm:mt-0 sm:left-full sm:top-0 sm:ml-1'
    : 'absolute right-0 top-full mt-1 sm:right-full sm:top-0 sm:mt-0 sm:-translate-x-[2px]'; // 原行为

  const ChevronIcon = isBottomLeft ? ChevronUp : ChevronDown;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* 触发按钮 */}
      <button
        type="button"
        onClick={() => setShowDropdown((v) => !v)}
        className={`flex items-center gap-2 rounded-md transition-colors focus:outline-none hover:bg-gray-100 dark:hover:bg-gray-800/50 ${
          isBottomLeft ? (compact ? 'justify-center px-1 py-1.5 w-full' : 'w-full px-2 py-2') : 'p-1.5'
        }`}
        aria-label="用户菜单"
      >
        <Avatar name={user.name} />
        {isBottomLeft && !compact && (
          <span className="min-w-0 flex-1 truncate text-left text-sm font-medium text-gray-700 dark:text-gray-200">
            {user.name}
          </span>
        )}
        {!compact && (
          <ChevronIcon
            className={`h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200 dark:text-gray-400 ${
              showDropdown ? 'rotate-180' : ''
            }`}
          />
        )}
      </button>

      {/* 下拉面板 */}
      {showDropdown && (
        <div
          className={`absolute z-[9999] w-auto min-w-[11rem] rounded-xl bg-white shadow-lg ring-1 ring-black ring-opacity-5 animate-in fade-in-0 zoom-in-95 dark:bg-app-dark-surface dark:ring-white/10 ${dropdownPos}`}
          onMouseLeave={scheduleCloseProfileSubmenu}
          onMouseEnter={() => { if (openSubmenu) openProfileSubmenu(); }}
        >
          <div className="relative py-1">
            {/* 个人信息（hover展开子面板）*/}
            <button
              type="button"
              onMouseEnter={openProfileSubmenu}
              onClick={openProfileSubmenu}
              className="relative flex w-full items-center px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800/50"
            >
              <User className={`mr-2 h-4 w-4 ${USER_MENU_ICON_COLORS.profile}`} />
              个人信息
              {openSubmenu === 'profile' && (
                <span
                  className="absolute inset-y-0 right-full w-2"
                  onMouseEnter={openProfileSubmenu}
                  onMouseLeave={scheduleCloseProfileSubmenu}
                />
              )}
            </button>

            {openSubmenu === 'profile' && (
              <div
                onMouseEnter={openProfileSubmenu}
                onMouseLeave={scheduleCloseProfileSubmenu}
                className={`w-full sm:w-auto sm:min-w-[14rem] rounded-xl bg-white p-3 shadow-xl ring-1 ring-black/5 dark:bg-app-dark-surface dark:ring-white/10 ${submenuPos}`}
              >
                <UserProfilePanel user={user} onChangePasswordToggle={setIsEditingPassword} />
              </div>
            )}

            {/* 预加载资源：完成后不再需要手动操作，直接隐藏该行，不再展示"资源已预加载"提示 */}
            {!isPreloaded && (
              <div className="relative">
                <button
                  type="button"
                  onClick={handlePreload}
                  disabled={isPreloading}
                  className={`relative flex w-full items-center overflow-hidden px-4 py-2 text-sm transition-colors duration-200 ${
                    isPreloading
                      ? 'cursor-not-allowed text-gray-400 dark:text-gray-500'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800/50'
                  }`}
                >
                  {isPreloading && (
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-blue-100 transition-all duration-300 ease-out dark:from-blue-900/10 dark:to-blue-800/20" />
                  )}
                  {isPreloading && (
                    <div
                      className="absolute inset-0 bg-gradient-to-r from-blue-200 to-blue-300 transition-all duration-300 ease-out dark:from-blue-700/40 dark:to-blue-600/50"
                      style={{ width: `${Math.max(0, Math.min(100, preloadProgress))}%` }}
                    />
                  )}
                  {isPreloading && (
                    <div
                      className="absolute inset-0 border-r-2 border-blue-400 transition-all duration-300 ease-out dark:border-blue-300"
                      style={{ width: `${Math.max(0, Math.min(100, preloadProgress))}%` }}
                    />
                  )}
                  <div className="relative z-10 flex w-full items-center">
                    <Download className={`mr-2 h-4 w-4 ${USER_MENU_ICON_COLORS.preload} ${isPreloading ? 'animate-pulse' : ''}`} />
                    <span className="flex-1 text-left">
                      {isPreloading ? (
                        <span className="flex flex-col">
                          <span className="text-sm font-medium">预加载中 {preloadProgress}%</span>
                          {preloadStage && (
                            <span className="truncate text-xs text-gray-500 dark:text-gray-400">{preloadStage}</span>
                          )}
                        </span>
                      ) : (
                        '预加载资源'
                      )}
                    </span>
                  </div>
                </button>
              </div>
            )}

            {user.isAdmin && (
              <button
                type="button"
                onClick={() => {
                  router.push('/admin');
                  setShowDropdown(false);
                }}
                className="flex w-full items-center px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800/50"
              >
                <Settings className={`mr-2 h-4 w-4 ${USER_MENU_ICON_COLORS.admin}`} />
                管理后台
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onLogout();
                setShowDropdown(false);
              }}
              className="flex w-full items-center px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800/50"
            >
              <LogOut className={`mr-2 h-4 w-4 ${USER_MENU_ICON_COLORS.logout}`} />
              退出登录
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
