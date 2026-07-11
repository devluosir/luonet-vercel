'use client';

import { useCallback, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { usePermissionStore } from '@/lib/permissions';
import { useLogoutTransitionStore } from './useLogoutTransition';
import { clearD1DocumentLocalState } from '@/utils/d1Sync';
import { useToast } from '@/components/ui/Toast';

export const LOGOUT_TIMEOUT_MS = 8_000;

export function useAppUser() {
  const permUser = usePermissionStore((state) => state.user);
  const { data: session } = useSession();
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const { showToast } = useToast();
  const router = useRouter();

  const user = {
    name: permUser?.username || session?.user?.name || session?.user?.username || '用户',
    isAdmin: permUser?.isAdmin ?? session?.user?.isAdmin ?? false,
    email: permUser?.email || session?.user?.email || null,
  };

  const handleLogout = useCallback(async () => {
    if (useLogoutTransitionStore.getState().isLoggingOut) return;

    setLogoutError(null);
    useLogoutTransitionStore.getState().setLoggingOut(true);
    const forceRedirectTimer = window.setTimeout(() => {
      window.location.replace('/');
    }, LOGOUT_TIMEOUT_MS);

    try {
      usePermissionStore.getState().clearUser();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('userCache');
        clearD1DocumentLocalState();
      }
      await signOut({ redirect: false });
      window.clearTimeout(forceRedirectTimer);
      router.push('/');
    } catch (error) {
      window.clearTimeout(forceRedirectTimer);
      useLogoutTransitionStore.getState().setLoggingOut(false);
      const message = error instanceof Error ? error.message : '退出登录失败，请稍后重试';
      setLogoutError(message);
      showToast(message, 'error');
    }
  }, [router, showToast]);

  return { user, handleLogout, logoutError };
}
