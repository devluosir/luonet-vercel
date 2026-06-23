'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  ChevronUp,
  Download,
  LogOut,
  Palette,
  Settings,
  User,
} from 'lucide-react';
import { Avatar } from '@/components/Avatar';
import { PermissionRefreshButton } from '@/components/PermissionRefreshButton';
import { ThemeCompactToggle } from '@/components/ThemeToggle';
import { apiRequestWithError, API_ENDPOINTS } from '@/lib/api-config';
import { preloadManager } from '@/utils/preloadUtils';

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
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
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
    if (showChangePassword) return;
    if (submenuHideTimerRef.current) clearTimeout(submenuHideTimerRef.current);
    submenuHideTimerRef.current = setTimeout(() => setOpenSubmenu(null), 200);
  }, [showChangePassword]);

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

  const handleChangePassword = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);
    const { currentPassword, newPassword, confirmPassword } = passwordForm;
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('请完整填写所有字段');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('新密码与确认密码不一致');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('新密码长度至少6位');
      return;
    }
    setPasswordLoading(true);
    try {
      await apiRequestWithError(API_ENDPOINTS.USERS.CHANGE_PASSWORD, {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setPasswordSuccess('密码修改成功');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => {
        setShowChangePassword(false);
        setPasswordSuccess(null);
      }, 1500);
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : '修改密码失败');
    } finally {
      setPasswordLoading(false);
    }
  };

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
  const submenuPos = isBottomLeft
    ? 'left-full top-0 ml-1'                                          // 向右展开
    : 'right-0 top-full mt-1 sm:right-full sm:top-0 sm:mt-0 sm:-translate-x-[2px]'; // 原行为

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
          className={`absolute z-[9999] w-auto min-w-[11rem] rounded-xl bg-white shadow-lg ring-1 ring-black ring-opacity-5 animate-in fade-in-0 zoom-in-95 dark:bg-[#2c2c2e] dark:ring-white/10 ${dropdownPos}`}
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
              <User className="mr-2 h-4 w-4" />
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
                className={`absolute w-auto min-w-[14rem] rounded-xl bg-white p-3 shadow-xl ring-1 ring-black/5 dark:bg-[#2c2c2e] dark:ring-white/10 ${submenuPos}`}
              >
                <div className="space-y-2.5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="max-w-[9.5rem] truncate text-sm font-semibold leading-tight text-gray-900 dark:text-white">
                        {user.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowChangePassword((v) => !v);
                          setPasswordError(null);
                          setPasswordSuccess(null);
                        }}
                        className="text-[11px] text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        {showChangePassword ? '收起' : '修改密码'}
                      </button>
                    </div>
                    {user.email && (
                      <div className="truncate text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
                    )}
                  </div>

                  <div className={showChangePassword ? 'block' : 'hidden'}>
                    <form onSubmit={handleChangePassword} className="space-y-2">
                      {passwordError && (
                        <div className="text-[11px] text-red-600 dark:text-red-400">{passwordError}</div>
                      )}
                      {passwordSuccess && (
                        <div className="text-[11px] text-green-600 dark:text-green-400">{passwordSuccess}</div>
                      )}
                      <input
                        type="password"
                        placeholder="当前密码"
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                        className="w-[12rem] rounded border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        autoComplete="current-password"
                        required
                      />
                      <input
                        type="password"
                        placeholder="新密码（至少6位）"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        className="w-[12rem] rounded border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        autoComplete="new-password"
                        required
                      />
                      <input
                        type="password"
                        placeholder="确认新密码"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        className="w-[12rem] rounded border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        autoComplete="new-password"
                        required
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="submit"
                          disabled={passwordLoading}
                          className={`rounded px-2.5 py-1 text-xs text-white ${
                            passwordLoading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
                          }`}
                        >
                          {passwordLoading ? '提交中...' : '保存'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowChangePassword(false);
                            setPasswordError(null);
                            setPasswordSuccess(null);
                            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                          }}
                          className="rounded border border-gray-300 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800/50"
                        >
                          取消
                        </button>
                      </div>
                    </form>
                  </div>

                  <div className="border-t border-gray-200 pt-1 dark:border-gray-700">
                    <div className="mb-1.5 flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
                      <div className="flex items-center">
                        <Palette className="mr-1.5 h-3.5 w-3.5" />
                        <span>主题设置</span>
                      </div>
                      <ThemeCompactToggle />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="px-1 py-1">
              <PermissionRefreshButton />
            </div>

            {/* 预加载资源 */}
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
                  <Download className={`mr-2 h-4 w-4 ${isPreloading ? 'animate-pulse' : ''}`} />
                  <span className="flex-1 text-left">
                    {isPreloading ? (
                      <span className="flex flex-col">
                        <span className="text-sm font-medium">预加载中 {preloadProgress}%</span>
                        {preloadStage && (
                          <span className="truncate text-xs text-gray-500 dark:text-gray-400">{preloadStage}</span>
                        )}
                      </span>
                    ) : isPreloaded ? (
                      '资源已预加载 (100%)'
                    ) : (
                      '预加载资源'
                    )}
                  </span>
                </div>
              </button>
            </div>

            {user.isAdmin && (
              <button
                type="button"
                onClick={() => {
                  router.push('/admin');
                  setShowDropdown(false);
                }}
                className="flex w-full items-center px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800/50"
              >
                <Settings className="mr-2 h-4 w-4" />
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
              <LogOut className="mr-2 h-4 w-4" />
              退出登录
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
