'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

/**
 * 页面级模块权限守卫。
 * 未登录跳转 /；业务模块必须显式授权，管理员身份不再自动获得业务模块访问权。
 */
export function useModulePermissionGuard(moduleId: string) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  const allowed = useMemo(() => {
    if (!session?.user) return false;
    const permission = (session.user.permissions ?? []).find((item) => item.moduleId === moduleId);
    return permission?.canAccess === true;
  }, [session, moduleId]);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }
    setReady(true);
  }, [status, router]);

  return {
    ready: ready && status !== 'loading',
    allowed,
    status,
    session,
  };
}
