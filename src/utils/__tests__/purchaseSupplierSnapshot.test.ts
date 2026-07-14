import { getPurchaseSupplierSearchText, resolvePurchaseSupplierSnapshotName } from '../purchaseSupplierSnapshot';

describe('purchase supplier snapshot compatibility', () => {
  it.each([
    ['explicit standard name', { supplierName: '  标准公司  ', attn: '旧公司\n地址' }, '标准公司'],
    ['CRLF and leading blank lines', { attn: '\r\n  \r\n公司甲\r\n地址' }, '公司甲'],
    ['LF', { attn: '\n公司乙\n地址' }, '公司乙'],
    ['single line', { attn: '公司丙 地址电话' }, '公司丙 地址电话'],
    ['empty', { attn: ' \r\n ' }, ''],
  ])('%s', (_label, data, expected) => {
    expect(resolvePurchaseSupplierSnapshotName(data, '')).toBe(expected);
  });

  it('searches standard, legacy top-level and full attn together', () => {
    const text = getPurchaseSupplierSearchText({ supplierName: '标准公司', attn: '旧抬头\n上海地址' }, '历史公司');
    expect(text).toContain('标准公司');
    expect(text).toContain('历史公司');
    expect(text).toContain('上海地址');
  });
});
