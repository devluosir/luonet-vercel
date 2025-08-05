'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ChevronDown, LogOut, Settings, User, RefreshCw, Download } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { Avatar } from './Avatar';
import { format } from 'date-fns';
import { preloadManager } from '@/utils/preloadUtils';
import { LOGO_CONFIG } from '@/lib/logo-config';

interface HeaderProps {
  user: {
    name: string;
    isAdmin: boolean;
  };
  onLogout: () => void;
  onProfile: () => void;
  onRefreshPermissions?: () => void;
  isRefreshing?: boolean;
  title?: string;
  showWelcome?: boolean;
}

export function Header({ 
  user, 
  onLogout, 
  onProfile, 
  onRefreshPermissions,
  isRefreshing = false,
  title = 'LC App',
  showWelcome = false
}: HeaderProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadProgress, setPreloadProgress] = useState(0);
  const [preloadStage, setPreloadStage] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    // 先调用onLogout回调，让dashboard清理权限store
    onLogout();
    // 然后调用signOut，避免重复退出
    await signOut();
  };

  const handleRefreshPermissions = () => {
    if (onRefreshPermissions) {
      onRefreshPermissions();
      setShowDropdown(false);
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
              <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-[#2c2c2e] ring-1 ring-black ring-opacity-5 dark:ring-white/10 z-[9999] animate-in fade-in-0 zoom-in-95">
                <div className="py-1">
                  <button
                    onClick={() => {
                      onProfile();
                      setShowDropdown(false);
                    }}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/50 w-full transition-colors duration-200"
                  >
                    <User className="h-4 w-4 mr-2" />
                    个人信息
                  </button>
                  {onRefreshPermissions && (
                    <button
                      onClick={handleRefreshPermissions}
                      disabled={isRefreshing}
                      className={`flex items-center px-4 py-2 text-sm w-full transition-colors duration-200 ${
                        isRefreshing
                          ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/50'
                      }`}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                      {isRefreshing ? '刷新中...' : '刷新权限'}
                    </button>
                  )}
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
                              : preloadManager.isPreloaded() 
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