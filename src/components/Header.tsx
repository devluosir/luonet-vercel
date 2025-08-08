'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ChevronDown, LogOut, Settings, User, Download, Palette } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { Avatar } from './Avatar';
import { PermissionRefreshButton } from './PermissionRefreshButton';
import { format } from 'date-fns';
import { preloadManager } from '@/utils/preloadUtils';
import { LOGO_CONFIG } from '@/lib/logo-config';
import { useThemeSettings } from '@/hooks/useThemeSettings';
import { apiRequestWithError, API_ENDPOINTS } from '@/lib/api-config';

interface HeaderProps {
  user: {
    name: string;
    isAdmin: boolean;
    email?: string | null;
  };
  onLogout: () => void;
  title?: string;
  showWelcome?: boolean;
}

export function Header({ 
  user, 
  onLogout, 
  title = 'LC App',
  showWelcome = false
}: HeaderProps) {
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
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const submenuHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const { settings, setButtonTheme } = useThemeSettings();

  // 检查预加载状态
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
    // 若修改密码区域已展开，则不自动关闭子菜单
    if (showChangePassword) return;
    if (submenuHideTimerRef.current) {
      clearTimeout(submenuHideTimerRef.current);
    }
    submenuHideTimerRef.current = setTimeout(() => {
      setOpenSubmenu(null);
    }, 200);
  }, [showChangePassword]);

  useEffect(() => {
    return () => {
      if (submenuHideTimerRef.current) {
        clearTimeout(submenuHideTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 初始化预加载状态
  useEffect(() => {
    checkPreloadStatus();
  }, [checkPreloadStatus]);

  // 定期检查预加载状态
  useEffect(() => {
    const interval = setInterval(() => {
      checkPreloadStatus();
    }, 1000); // 每秒检查一次

    return () => clearInterval(interval);
  }, [checkPreloadStatus]);

  const handleLogout = async () => {
    // 先调用onLogout回调，让dashboard清理权限store
    onLogout();
    // 然后调用signOut，避免重复退出
    await signOut();
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
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
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      setPasswordSuccess('密码修改成功');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      // 1.5秒后收起表单
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

  // 处理预加载
  const handlePreload = async () => {
    if (isPreloading) return;
    
    setIsPreloading(true);
    setPreloadProgress(0);
    setPreloadStage('准备中...');
    
    // 监听预加载进度
    const progressCallback = (progress: number, stage?: string) => {
      console.log('进度回调被调用:', progress, stage);
      setPreloadProgress(progress);
      if (stage) setPreloadStage(stage);
    };
    
    preloadManager.onProgress(progressCallback);
    
    try {
      await preloadManager.preloadAllResources();
      console.log('预加载完成！');
      // ✅ 新增：更新本地预加载状态
      setIsPreloaded(true);
    } catch (error) {
      console.error('预加载失败:', error);
    } finally {
      setIsPreloading(false);
      setPreloadStage('');
      preloadManager.offProgress(progressCallback);
      setShowDropdown(false);
    }
  };

  // 监听预加载进度
  useEffect(() => {
    // 直接监听preloadManager的进度
    const progressCallback = (progress: number, stage?: string) => {
      console.log('Header收到预加载进度:', progress, stage);
      setPreloadProgress(progress);
      if (stage) setPreloadStage(stage);
      if (progress > 0) setIsPreloading(true);
      if (progress >= 100) {
        setIsPreloading(false);
        setPreloadStage('');
      }
    };

    // 注册进度回调
    preloadManager.onProgress(progressCallback);

    // 初始化当前状态
    const status = preloadManager.getPreloadStatus();
    if (status.isPreloading) {
      setIsPreloading(true);
      setPreloadProgress(status.progress);
    }

    return () => {
      preloadManager.offProgress(progressCallback);
    };
  }, []);

  // 获取当前日期和星期几
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    const dateStr = format(now, 'yyyy-MM-dd');
    const dayOfWeek = now.getDay(); // 0-6 (周日-周六)
    const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
    return { date: dateStr, dayOfWeek: dayNames[dayOfWeek] };
  });

  // 每分钟更新一次日期
  useEffect(() => {
    const updateDate = () => {
      const now = new Date();
      const dateStr = format(now, 'yyyy-MM-dd');
      const dayOfWeek = now.getDay();
      const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
      setCurrentDate({ date: dateStr, dayOfWeek: dayNames[dayOfWeek] });
    };

    // 立即更新一次
    updateDate();
    
    // 每分钟更新一次
    const interval = setInterval(updateDate, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const { date, dayOfWeek } = currentDate;

  return (
    <header className="bg-white dark:bg-[#1c1c1e] shadow-sm dark:shadow-gray-800/30">
      <div className="w-full max-w-none px-2 sm:px-4 lg:px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Image
            src={LOGO_CONFIG.web.logo}
            alt="LC APP Logo"
            width={48}
            height={48}
            priority
            className="object-contain"
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
            onLoad={(e) => {
              // 确保图片加载完成后立即显示，避免闪烁
              const img = e.target as HTMLImageElement;
              img.style.opacity = '1';
            }}
            style={{
              opacity: 0,
              transition: 'opacity 0.2s ease-in-out'
            }}
          />
          <div className="flex flex-col">
            {/* 小屏时隐藏标题，中屏及以上显示 */}
            <h1 className="hidden sm:block text-xl font-semibold text-gray-900 dark:text-white">{title}</h1>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {showWelcome && (
            <>
              {/* 小屏时显示用户名和简化日期 */}
              <div className="flex sm:hidden items-center mr-4">
                <span className="text-sm text-gray-900 dark:text-white font-medium mr-2">
                  {user.name}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {date} {dayOfWeek}
                </span>
              </div>
              {/* 中屏和大屏时显示用户名、日期和完整星期几 */}
              <div className="hidden sm:flex items-center space-x-2 mr-4">
                <span className="text-sm text-gray-900 dark:text-white font-medium">
                  {user.name}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {date} 星期{dayOfWeek}
                </span>
              </div>
            </>
          )}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center space-x-2 focus:outline-none transition-colors duration-200"
              aria-label="用户菜单"
            >
              <Avatar name={user.name} />
              <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400 transition-transform duration-200" 
                          style={{ transform: showDropdown ? 'rotate(180deg)' : 'rotate(0deg)' }} />
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-auto min-w-[11rem] rounded-xl shadow-lg bg-white dark:bg-[#2c2c2e] ring-1 ring-black ring-opacity-5 dark:ring-white/10 z-[9999] animate-in fade-in-0 zoom-in-95"
                   onMouseLeave={scheduleCloseProfileSubmenu}
                   onMouseEnter={() => {
                     if (openSubmenu) openProfileSubmenu();
                   }}>
                <div className="py-1 relative">
                  <button
                    onMouseEnter={openProfileSubmenu}
                    className="flex items-center px-4 py-2 text-sm w-full text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors duration-200 group relative"
                  >
                    <User className="h-4 w-4 mr-2" />
                    个人信息
                    {/* 把子菜单做成可悬停桥接区域，避免移出时闪跳 */}
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
                      className="absolute top-0 right-full mr-0 -translate-x-[2px] w-auto min-w-[14rem] rounded-xl shadow-xl bg-white dark:bg-[#2c2c2e] ring-1 ring-black/5 dark:ring-white/10 p-3"
                    >
                      <div className="space-y-2.5">
                        <div>
                          <div className="flex items-center flex-wrap gap-2">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white leading-tight truncate max-w-[9.5rem]">{user.name}</span>
                            <button
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
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</div>
                          )}
                        </div>

                        {/* 修改密码 - 折叠区域 */}
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
                              className="w-[12rem] px-2.5 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                              autoComplete="current-password"
                              required
                            />
                            <input
                              type="password"
                              placeholder="新密码（至少6位）"
                              value={passwordForm.newPassword}
                              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                              className="w-[12rem] px-2.5 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                              autoComplete="new-password"
                              required
                            />
                            <input
                              type="password"
                              placeholder="确认新密码"
                              value={passwordForm.confirmPassword}
                              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                              className="w-[12rem] px-2.5 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                              autoComplete="new-password"
                              required
                            />
                            <div className="flex items-center gap-2">
                              <button
                                type="submit"
                                disabled={passwordLoading}
                                className={`px-2.5 py-1 text-xs rounded text-white ${passwordLoading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}
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
                                className="px-2.5 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                              >
                                取消
                              </button>
                            </div>
                          </form>
                        </div>

                        <div className="pt-1 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex items-center text-xs text-gray-600 dark:text-gray-300 mb-1.5">
                            <Palette className="w-3.5 h-3.5 mr-1.5" />
                            <span className="mr-2">主题</span>
                            <div className="inline-flex rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                              <button
                                onClick={() => setButtonTheme('colorful')}
                                className={`px-2.5 py-1 text-[11px] transition-colors ${
                                  settings.buttonTheme === 'colorful'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white dark:bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/40'
                                }`}
                              >
                                彩色
                              </button>
                              <button
                                onClick={() => setButtonTheme('classic')}
                                className={`px-2.5 py-1 text-[11px] transition-colors border-l border-gray-200 dark:border-gray-700 ${
                                  settings.buttonTheme === 'classic'
                                    ? 'bg-gray-700 text-white'
                                    : 'bg-white dark:bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/40'
                                }`}
                              >
                                简洁
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* ✅ 使用新的权限刷新按钮 */}
                  <PermissionRefreshButton />
                  
                  <div className="relative">
                      <button
                        onClick={handlePreload}
                        disabled={isPreloading}
                        className={`flex items-center px-4 py-2 text-sm w-full transition-colors duration-200 relative overflow-hidden ${
                          isPreloading
                            ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/50'
                        }`}
                      >
                        {/* 进度条背景 */}
                        {isPreloading && (
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/10 dark:to-blue-800/20 transition-all duration-300 ease-out" />
                        )}
                        
                        {/* 进度条 */}
                        {isPreloading && (
                          <div 
                            className="absolute inset-0 bg-gradient-to-r from-blue-200 to-blue-300 dark:from-blue-700/40 dark:to-blue-600/50 transition-all duration-300 ease-out"
                            style={{ width: `${preloadProgress}%` }}
                          />
                        )}
                        
                        {/* 进度条边框 */}
                        {isPreloading && (
                          <div 
                            className="absolute inset-0 border-r-2 border-blue-400 dark:border-blue-300 transition-all duration-300 ease-out"
                            style={{ width: `${preloadProgress}%` }}
                          />
                        )}
                        
                        {/* 内容 */}
                        <div className="relative z-10 flex items-center w-full">
                          <Download className={`h-4 w-4 mr-2 ${isPreloading ? 'animate-pulse' : ''}`} />
                          <span className="flex-1 text-left">
                            {isPreloading 
                              ? (
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium">预加载中 {preloadProgress}%</span>
                                  {preloadStage && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                      {preloadStage}
                                    </span>
                                  )}
                                </div>
                              )
                              : isPreloaded 
                                ? '资源已预加载 (100%)' 
                                : '预加载资源'
                            }
                          </span>
                        </div>
                      </button>
                    </div>
                  {user.isAdmin && (
                    <button
                      onClick={() => {
                        router.push('/admin');
                        setShowDropdown(false);
                      }}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/50 w-full transition-colors duration-200"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      管理后台
                    </button>
                  )}
                  <button
                    onClick={() => {
                      handleLogout();
                      setShowDropdown(false);
                    }}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/50 w-full transition-colors duration-200"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    退出登录
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
} 