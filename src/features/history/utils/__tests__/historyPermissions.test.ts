import {
  getPermittedHistoryTypes,
  isPermittedHistoryType,
  resolvePermittedHistoryType,
} from '../historyPermissions';
import type { Permission } from '@/types/permissions';

const permission = (moduleId: string, canAccess = true): Permission => ({
  id: `permission-${moduleId}`,
  moduleId,
  canAccess,
});

describe('historyPermissions', () => {
  it('按单据 moduleId 返回对应的历史 tab', () => {
    expect(getPermittedHistoryTypes([
      permission('quotation'),
      permission('domesticQuotation'),
      permission('invoice'),
      permission('packing', false),
    ], false)).toEqual([
      'quotation',
      'confirmation',
      'domestic',
      'domestic-contract',
      'invoice',
    ]);
  });

  it('管理员没有模块配置记录时不默认显示历史 tab', () => {
    expect(getPermittedHistoryTypes([], true)).toEqual([]);
  });

  it('管理员存在模块配置时严格采用对应的 canAccess', () => {
    expect(getPermittedHistoryTypes([
      permission('quotation', false),
      permission('domesticQuotation', false),
      permission('packing'),
      permission('invoice', false),
      permission('purchase'),
    ], true)).toEqual(['packing', 'purchase']);
  });

  it('普通用户没有单据权限时不返回 tab', () => {
    expect(getPermittedHistoryTypes([
      permission('history'),
      permission('purchase', false),
    ], false)).toEqual([]);
  });

  it('拒绝不在可访问列表中的 URL 或当前 tab', () => {
    const permittedTypes = getPermittedHistoryTypes([permission('purchase')], false);

    expect(isPermittedHistoryType('purchase', permittedTypes)).toBe(true);
    expect(isPermittedHistoryType('quotation', permittedTypes)).toBe(false);
  });

  it('优先使用有权限的 URL tab', () => {
    expect(resolvePermittedHistoryType(
      'quotation',
      'invoice',
      ['purchase', 'invoice'],
    )).toBe('invoice');
  });

  it('URL 和当前 tab 均无权限时回退到第一个可访问 tab', () => {
    expect(resolvePermittedHistoryType(
      'quotation',
      'domestic',
      ['purchase', 'invoice'],
    )).toBe('purchase');
    expect(resolvePermittedHistoryType('quotation', null, [])).toBeNull();
  });
});
