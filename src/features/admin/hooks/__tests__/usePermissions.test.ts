import { act, renderHook } from '@testing-library/react';
import { DOCUMENT_TYPE_MODULE_IDS, PERMISSION_MODULES } from '@/constants/permissionModules';
import { deriveHistoryPermission, usePermissions } from '../usePermissions';
import type { Permission } from '../../types';

const permission = (moduleId: string, canAccess: boolean): Permission => ({
  id: `${moduleId}-id`,
  moduleId,
  canAccess,
});

const historyEnabled = (permissions: Permission[]) =>
  permissions.find((item) => item.moduleId === 'history')?.canAccess;

describe('history permission derivation', () => {
  it('enables history when any document permission is enabled', () => {
    const permissions = [
      permission('quotation', false),
      permission('packing', true),
      permission('history', false),
    ];

    expect(historyEnabled(deriveHistoryPermission(permissions))).toBe(true);
  });

  it('disables history when all document permissions are disabled or missing', () => {
    const permissions = [
      ...DOCUMENT_TYPE_MODULE_IDS.map((moduleId) => permission(moduleId, false)),
      permission('history', true),
    ];

    expect(historyEnabled(deriveHistoryPermission(permissions))).toBe(false);
  });

  it('initializes, toggles, and resets history from document permissions', () => {
    const { result } = renderHook(() => usePermissions());

    act(() => {
      result.current.initializePermissions([permission('history', true)], false, true);
    });
    expect(historyEnabled(result.current.permissions)).toBe(false);

    act(() => result.current.togglePermission('quotation'));
    expect(historyEnabled(result.current.permissions)).toBe(true);

    act(() => result.current.togglePermission('history'));
    expect(historyEnabled(result.current.permissions)).toBe(true);

    act(() => result.current.togglePermission('quotation'));
    expect(historyEnabled(result.current.permissions)).toBe(false);
  });

  it('does not grant missing module permissions by default for admins', () => {
    const { result } = renderHook(() => usePermissions());

    act(() => {
      result.current.initializePermissions([], true, true);
    });

    expect(result.current.isAdmin).toBe(true);
    expect(result.current.permissions.every((item) => item.canAccess === false)).toBe(true);
  });

  it('disables purchase order amount permission when purchase registration is turned off', () => {
    const { result } = renderHook(() => usePermissions());

    act(() => {
      result.current.initializePermissions([
        permission('purchaseRegistration', true),
        permission('purchaseRegistration.financials', true),
      ], false, true);
    });

    act(() => result.current.togglePermission('purchaseRegistration'));

    expect(result.current.permissions.find((item) => item.moduleId === 'purchaseRegistration')?.canAccess)
      .toBe(false);
    expect(result.current.permissions.find((item) => item.moduleId === 'purchaseRegistration.financials')?.canAccess)
      .toBe(false);
  });

  it('places history in the document category', () => {
    expect(PERMISSION_MODULES.find((module) => module.moduleId === 'history')?.category)
      .toBe('document');
  });
});
