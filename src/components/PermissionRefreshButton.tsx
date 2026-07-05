'use client';

import { RefreshCw } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { usePermissionRefresh } from '@/hooks/usePermissionRefresh';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/Toast';

interface PermissionRefreshButtonProps {
  variant?: 'row' | 'icon';
  className?: string;
}

export function PermissionRefreshButton({ variant = 'row', className = '' }: PermissionRefreshButtonProps) {
  const { data: session } = useSession();
  const { refresh, isRefreshing, refreshSuccess, refreshError } = usePermissionRefresh();
  const { showToast } = useToast();
  const [hasRequestedRefresh, setHasRequestedRefresh] = useState(false);

  const username = session?.user?.username || session?.user?.name;

  const handleClick = async () => {
    if (username) {
      setHasRequestedRefresh(true);
      await refresh(username);
    }
  };

  useEffect(() => {
    if (refreshSuccess && hasRequestedRefresh) {
      showToast('权限刷新成功，页面即将重载...', 'success');
    }
  }, [hasRequestedRefresh, refreshSuccess, showToast]);

  useEffect(() => {
    if (refreshError && hasRequestedRefresh) {
      showToast(refreshError, 'error');
    }
  }, [hasRequestedRefresh, refreshError, showToast]);

  if (!username) {
    return null;
  }

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={isRefreshing}
        className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-blue-300 ${className}`}
        title={isRefreshing ? '正在刷新权限' : '刷新权限'}
        aria-label={isRefreshing ? '正在刷新权限' : '刷新权限'}
      >
        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isRefreshing}
      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-200 dark:hover:bg-white/10 ${className}`}
      title="刷新用户权限"
    >
      <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
      <span>{isRefreshing ? '刷新中...' : '刷新权限'}</span>
    </button>
  );
}
