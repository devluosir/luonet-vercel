'use client';

import { useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { usePermissionStore } from '@/lib/permissions';

export function useAppUser() {
  const permUser = usePermissionStore((state) => state.user);
  const { data: session } = useSession();

  const user = {
    name: permUser?.username || session?.user?.name || session?.user?.username || '用户',
    isAdmin: permUser?.isAdmin ?? session?.user?.isAdmin ?? false,
    email: permUser?.email || session?.user?.email || null,
  };

  const handleLogout = useCallback(async () => {
    usePermissionStore.getState().clearUser();
    if (typeof window !== 'undefined') localStorage.removeItem('userCache');
    await signOut();
  }, []);

  return { user, handleLogout };
}
