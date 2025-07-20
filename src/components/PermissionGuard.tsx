'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { usePermissionStore } from '@/lib/permissions';

interface PermissionGuardProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
  fallback?: React.ReactNode;
  redirectTo?: string;
  fastCheck?: boolean; // 新增快速验证模式参数
}

export function PermissionGuard({ 
  children, 
  requiredPermissions = [], 
  fallback = null,
  redirectTo = '/dashboard',
  fastCheck = true // 默认使用快速验证
}: PermissionGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { user, isLoading, hasPermission, fetchUser } = usePermissionStore();

  useEffect(() => {
    if (status === 'loading' || isLoading) return;

    if (!session) {
      router.push('/');
      return;
    }

    // 快速验证模式：直接使用store中的权限数据
    if (fastCheck && user) {
      return;
    }

    // 如果没有用户信息，获取用户信息
    if (!user) {
      fetchUser();
      return;
    }

    // 完整验证模式：检查权限
    if (!fastCheck && requiredPermissions.length > 0) {
      const hasRequiredPermissions = requiredPermissions.every(permission => 
        hasPermission(permission)
      );

      if (!hasRequiredPermissions) {
        if (redirectTo) {
          router.push(redirectTo);
        }
        return;
      }
    }
  }, [session, status, user, isLoading, requiredPermissions, hasPermission, fetchUser, router, redirectTo, fastCheck]);

  // 快速验证模式：直接检查权限
  if (fastCheck && user) {
    if (requiredPermissions.length > 0) {
      const hasRequiredPermissions = requiredPermissions.every(permission => 
        hasPermission(permission)
      );

      if (!hasRequiredPermissions) {
        return fallback;
      }
    }
    return <>{children}</>;
  }

  // 加载状态
  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-lg">验证权限中...</div>
        </div>
      </div>
    );
  }

  // 未登录
  if (!session) {
    return null;
  }

  // 权限不足（完整验证模式）
  if (!fastCheck && requiredPermissions.length > 0 && user) {
    const hasRequiredPermissions = requiredPermissions.every(permission => 
      hasPermission(permission)
    );

    if (!hasRequiredPermissions) {
      return fallback || (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-600 mb-4">权限不足</div>
            <div className="text-sm text-gray-500 mb-4">
              您没有访问此页面的权限
            </div>
            <button
              onClick={() => router.push(redirectTo)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              返回首页
            </button>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}

// 便捷的权限检查Hook
export function usePermissionGuard(requiredPermissions: string[] = []) {
  const { user, hasPermission } = usePermissionStore();
  
  const hasRequiredPermissions = requiredPermissions.length === 0 || 
    requiredPermissions.every(permission => hasPermission(permission));

  return {
    hasRequiredPermissions,
    user,
    isAdmin: user?.isAdmin || false
  };
} 