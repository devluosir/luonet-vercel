'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ChevronDown, LogOut, Settings, User, RefreshCw } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { Avatar } from './Avatar';

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
    await signOut();
    onLogout();
  };

  const handleRefreshPermissions = () => {
    if (onRefreshPermissions) {
      onRefreshPermissions();
      setShowDropdown(false);
    }
  };

  // 获取当前日期和星期几
  const getCurrentDate = () => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const dayOfWeek = now.getDay(); // 0-6 (周日-周六)
    const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
    return { date: dateStr, dayOfWeek: dayNames[dayOfWeek] };
  };

  const { date, dayOfWeek } = getCurrentDate();

  return (
    <header className="bg-white dark:bg-[#1c1c1e] shadow-sm dark:shadow-gray-800/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Image
            src="/logo/logo.png"
            alt="LC APP Logo"
            width={48}
            height={48}
            priority
            className="object-contain"
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
          />
          <div className="flex flex-col">
            {/* 小屏时隐藏标题，中屏及以上显示 */}
            <h1 className="hidden sm:block text-xl font-semibold text-gray-900 dark:text-white">{title}</h1>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {showWelcome && (
            <>
              {/* 小屏时只显示日期和简化星期几 */}
              <div className="flex sm:hidden items-center mr-4">
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