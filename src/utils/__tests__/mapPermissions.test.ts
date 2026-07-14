import { buildPermissionMap } from '../mapPermissions';

describe('buildPermissionMap purchaseSupplier', () => {
  it('maps the independent management permission', () => {
    const result = buildPermissionMap([{ id: 'p1', moduleId: 'purchaseSupplier', canAccess: true }]);
    expect(result.permissions.purchaseSupplier).toBe(true);
    expect(result.permissions.customer).toBe(false);
  });

  it('defaults to denied', () => {
    expect(buildPermissionMap().permissions.purchaseSupplier).toBe(false);
  });
});
