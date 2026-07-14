'use client';

import { useSession } from 'next-auth/react';
import { usePermissionStore } from '@/lib/permissions';

export function usePurchaseSupplierAccess() {
  const { data: session, status } = useSession();
  const permissionUser = usePermissionStore((state) => state.user);
  const permissions = permissionUser?.permissions ?? session?.user?.permissions ?? [];
  const canWrite = permissions.some((permission) =>
    permission.moduleId === 'purchaseSupplier' && permission.canAccess === true
  );
  const canRead = permissions.some((permission) =>
    ['purchaseSupplier', 'purchaseRegistration', 'purchase'].includes(permission.moduleId)
      && permission.canAccess === true
  );
  return {
    ready: status !== 'loading' && Boolean(permissionUser || session?.user),
    canRead,
    canWrite,
    sessionStatus: status,
    userId: permissionUser?.id || session?.user?.id || session?.user?.username || '',
  };
}
