export interface PurchaseSupplierPermissionLike {
  moduleId?: string;
  canAccess?: boolean;
}

export interface PurchaseSupplierAccess {
  canRead: boolean;
  canWrite: boolean;
}

const READ_MODULE_IDS = new Set(['purchaseSupplier', 'purchaseRegistration', 'purchase']);

export function getPurchaseSupplierAccess(
  permissions: readonly PurchaseSupplierPermissionLike[] | undefined
): PurchaseSupplierAccess {
  let canRead = false;
  let canWrite = false;

  for (const permission of permissions ?? []) {
    if (permission.canAccess !== true || typeof permission.moduleId !== 'string') continue;
    if (permission.moduleId === 'purchaseSupplier') canWrite = true;
    if (READ_MODULE_IDS.has(permission.moduleId)) canRead = true;
  }

  return { canRead, canWrite };
}
