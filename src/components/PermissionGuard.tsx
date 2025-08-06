'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
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
  const { user, isLoading, hasPermission } = usePermissionStore();

  useEffect(() => {
    if (isLoading) return;
    
    // 快速验证模式：直接使用store中的权限数据
    if (fastCheck && user) {
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
  }, [user, isLoading, requiredPermissions, hasPermission, router, redirectTo, fastCheck]);

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

  // 只在权限加载时显示加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-lg">加载权限中...</div>
        </div>
      </div>
    );
  }

  // 权限不足（完整验证模式）
  if (!fastCheck && requiredPermissions.length > 0) {
    const hasRequiredPermissions = requiredPermissions.every(permission => 
      hasPermission(permission)
    );

    if (!hasRequiredPermissions) {
      return fallback;
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