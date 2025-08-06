'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { handlePermissionRefresh } from '@/lib/refresh';
import { RefreshCw } from 'lucide-react';

interface PermissionRefreshButtonProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function PermissionRefreshButton({ 
  className = '', 
  showText = true,
  size = 'md'
}: PermissionRefreshButtonProps) {
  const { data: session } = useSession();
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!session?.user?.name) {
    return null;
  }

  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await handlePermissionRefresh(session.user.name);
      // 可以添加成功提示
      console.log('权限刷新成功');
    } catch (error) {
      console.error('权限刷新失败:', error);
      // 可以添加错误提示
    } finally {
      setIsRefreshing(false);
    }
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <button
      onClick={handleRefresh}
      disabled={isRefreshing}
      className={`
        inline-flex items-center gap-2 
        bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400
        text-white font-medium rounded-md transition-colors
        ${sizeClasses[size]}
        ${className}
      `}
      title="刷新权限"
    >
      <RefreshCw 
        className={`${iconSizes[size]} ${isRefreshing ? 'animate-spin' : ''}`} 
      />
      {showText && (
        <span>{isRefreshing ? '刷新中...' : '刷新权限'}</span>
      )}
    </button>
  );
} 