'use client';

import { useCallback, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { usePermissionStore } from '@/lib/permissions';
import { clearD1DocumentLocalState } from '@/utils/d1Sync';

export function useAppUser() {
  const permUser = usePermissionStore((state) => state.user);
  const { data: session } = useSession();
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const user = {
    name: permUser?.username || session?.user?.name || session?.user?.username || '用户',
    isAdmin: permUser?.isAdmin ?? session?.user?.isAdmin ?? false,
    email: permUser?.email || session?.user?.email || null,
  };

  const handleLogout = useCallback(async () => {
    setLogoutError(null);
    try {
      usePermissionStore.getState().clearUser();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('userCache');
        clearD1DocumentLocalState();
      }
      await signOut();
    } catch (error) {
      const message = error instanceof Error ? error.message : '退出登录失败，请稍后重试';
      setLogoutError(message);
      if (typeof window !== 'undefined') {
        window.alert(message);
      }
    }
  }, []);

  return { user, handleLogout, logoutError };
}
