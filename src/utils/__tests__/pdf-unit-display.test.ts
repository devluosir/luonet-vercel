import { getUnitDisplay } from '../unitUtils';

describe('PDF Unit Display', () => {
  test('should handle empty unit with default value', () => {
    // 当单位为空时，应该返回空字符串（由调用方处理默认值）
    expect(getUnitDisplay('', 1)).toBe('');
    expect(getUnitDisplay('', 2)).toBe('');
    expect(getUnitDisplay('', 0)).toBe('');
  });

  test('should handle undefined unit with default value', () => {
    // 当单位未定义时，应该抛出错误或返回空字符串
    expect(() => getUnitDisplay(undefined as any, 1)).toThrow();
  });

  test('should handle null unit with default value', () => {
    // 当单位为null时，应该抛出错误
    expect(() => getUnitDisplay(null as any, 1)).toThrow();
  });

  test('should display correct pluralization for default units', () => {
    // 默认单位的单复数处理
    expect(getUnitDisplay('pc', 0)).toBe('pc');
    expect(getUnitDisplay('pc', 1)).toBe('pc');
    expect(getUnitDisplay('pc', 2)).toBe('pcs');
    
    expect(getUnitDisplay('set', 0)).toBe('set');
    expect(getUnitDisplay('set', 1)).toBe('set');
    expect(getUnitDisplay('set', 2)).toBe('sets');
    
    expect(getUnitDisplay('length', 0)).toBe('length');
    expect(getUnitDisplay('length', 1)).toBe('length');
    expect(getUnitDisplay('length', 2)).toBe('lengths');
  });

  test('should not change custom units', () => {
    // 自定义单位不进行单复数变化
    expect(getUnitDisplay('kg', 0)).toBe('kg');
    expect(getUnitDisplay('kg', 1)).toBe('kg');
    expect(getUnitDisplay('kg', 2)).toBe('kg');
    
    expect(getUnitDisplay('m', 0)).toBe('m');
    expect(getUnitDisplay('m', 1)).toBe('m');
    expect(getUnitDisplay('m', 2)).toBe('m');
  });

  test('should handle units with existing plural suffix', () => {
    // 处理已有复数后缀的单位
    expect(getUnitDisplay('pcs', 0)).toBe('pc');
    expect(getUnitDisplay('pcs', 1)).toBe('pc');
    expect(getUnitDisplay('pcs', 2)).toBe('pcs');
    
    expect(getUnitDisplay('sets', 0)).toBe('set');
    expect(getUnitDisplay('sets', 1)).toBe('set');
    expect(getUnitDisplay('sets', 2)).toBe('sets');
  });

  test('should work with custom configuration', () => {
    // 使用自定义配置
    const config = { customUnits: ['kg', 'm'] };
    
    // 默认单位仍然进行单复数处理
    expect(getUnitDisplay('pc', 2, config)).toBe('pcs');
    expect(getUnitDisplay('set', 2, config)).toBe('sets');
    
    // 自定义单位不变化
    expect(getUnitDisplay('kg', 2, config)).toBe('kg');
    expect(getUnitDisplay('m', 2, config)).toBe('m');
  });

  test('should handle disabled pluralization', () => {
    // 禁用单复数处理
    const config = { enablePluralization: false };
    
    expect(getUnitDisplay('pc', 2, config)).toBe('pc');
    expect(getUnitDisplay('set', 2, config)).toBe('set');
    expect(getUnitDisplay('length', 2, config)).toBe('length');
  });
});
