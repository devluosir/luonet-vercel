import type { Permission } from '@/types/permissions';
import type { HistoryType } from '../types';

export const HISTORY_TYPE_ORDER: readonly HistoryType[] = [
  'quotation',
  'confirmation',
  'domestic',
  'domestic-contract',
  'packing',
  'invoice',
  'purchase',
];

export const HISTORY_TYPE_PERMISSION_MODULE: Record<HistoryType, string> = {
  quotation: 'quotation',
  confirmation: 'quotation',
  domestic: 'domesticQuotation',
  'domestic-contract': 'domesticQuotation',
  packing: 'packing',
  invoice: 'invoice',
  purchase: 'purchase',
};

export function getPermittedHistoryTypes(
  permissions: readonly Permission[],
  isAdmin: boolean,
): HistoryType[] {
  const permissionsByModule = new Map(
    permissions.map((permission) => [permission.moduleId, permission.canAccess]),
  );

  return HISTORY_TYPE_ORDER.filter((type) => {
    const configuredAccess = permissionsByModule.get(HISTORY_TYPE_PERMISSION_MODULE[type]);
    return configuredAccess ?? isAdmin;
  });
}

export function isPermittedHistoryType(
  type: HistoryType,
  permittedTypes: readonly HistoryType[],
): boolean {
  return permittedTypes.includes(type);
}

export function resolvePermittedHistoryType(
  currentType: HistoryType,
  requestedType: HistoryType | null,
  permittedTypes: readonly HistoryType[],
): HistoryType | null {
  if (requestedType && isPermittedHistoryType(requestedType, permittedTypes)) {
    return requestedType;
  }
  if (isPermittedHistoryType(currentType, permittedTypes)) return currentType;
  return permittedTypes[0] ?? null;
}
