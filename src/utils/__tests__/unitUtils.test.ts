import {
  getUnitDisplay,
  getAllUnits,
  processUnitChange,
  updateUnitForQuantityChange,
  normalizeUnit,
  isValidUnit,
  getUnitOptions,
  processImportedUnits,
  createUnitConfig,
  UnitConfigBuilder,
  DEFAULT_UNITS,
  DEFAULT_UNIT_CONFIG
} from '../unitUtils';

describe('Unit Utils', () => {
  describe('getUnitDisplay', () => {
    test('should handle default units with pluralization', () => {
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
      expect(getUnitDisplay('kg', 1)).toBe('kg');
      expect(getUnitDisplay('kg', 2)).toBe('kg');
      expect(getUnitDisplay('m', 1)).toBe('m');
      expect(getUnitDisplay('m', 2)).toBe('m');
    });

    test('should handle units with existing plural suffix', () => {
      expect(getUnitDisplay('pcs', 1)).toBe('pc');
      expect(getUnitDisplay('pcs', 2)).toBe('pcs');
      expect(getUnitDisplay('sets', 1)).toBe('set');
      expect(getUnitDisplay('sets', 2)).toBe('sets');
    });

    test('should work with custom configuration', () => {
      const config = { customUnits: ['kg'], enablePluralization: false };
      expect(getUnitDisplay('pc', 2, config)).toBe('pc'); // 禁用单复数处理
      expect(getUnitDisplay('kg', 2, config)).toBe('kg'); // 自定义单位
    });
  });

  describe('getAllUnits', () => {
    test('should return default units when no custom units', () => {
      const units = getAllUnits();
      expect(units).toEqual(['pc', 'set', 'length']);
    });

    test('should include custom units', () => {
      const config = { customUnits: ['kg', 'm'] };
      const units = getAllUnits(config);
      expect(units).toEqual(['pc', 'set', 'length', 'kg', 'm']);
    });
  });

  describe('processUnitChange', () => {
    test('should process default units with pluralization', () => {
      expect(processUnitChange('pc', 1)).toBe('pc');
      expect(processUnitChange('pc', 2)).toBe('pcs');
      expect(processUnitChange('set', 1)).toBe('set');
      expect(processUnitChange('set', 2)).toBe('sets');
    });

    test('should not change custom units', () => {
      expect(processUnitChange('kg', 1)).toBe('kg');
      expect(processUnitChange('kg', 2)).toBe('kg');
    });

    test('should handle units with existing plural suffix', () => {
      expect(processUnitChange('pcs', 1)).toBe('pc');
      expect(processUnitChange('pcs', 2)).toBe('pcs');
    });
  });

  describe('updateUnitForQuantityChange', () => {
    test('should update default units based on quantity', () => {
      expect(updateUnitForQuantityChange('pc', 1)).toBe('pc');
      expect(updateUnitForQuantityChange('pc', 2)).toBe('pcs');
      expect(updateUnitForQuantityChange('set', 1)).toBe('set');
      expect(updateUnitForQuantityChange('set', 2)).toBe('sets');
    });

    test('should not change custom units', () => {
      expect(updateUnitForQuantityChange('kg', 1)).toBe('kg');
      expect(updateUnitForQuantityChange('kg', 2)).toBe('kg');
    });
  });

  describe('normalizeUnit', () => {
    test('should normalize default units to singular form', () => {
      expect(normalizeUnit('pc')).toBe('pc');
      expect(normalizeUnit('pcs')).toBe('pc');
      expect(normalizeUnit('set')).toBe('set');
      expect(normalizeUnit('sets')).toBe('set');
    });

    test('should not change custom units', () => {
      expect(normalizeUnit('kg')).toBe('kg');
      expect(normalizeUnit('m')).toBe('m');
    });
  });

  describe('isValidUnit', () => {
    test('should validate default units', () => {
      expect(isValidUnit('pc')).toBe(true);
      expect(isValidUnit('set')).toBe(true);
      expect(isValidUnit('length')).toBe(true);
      expect(isValidUnit('pcs')).toBe(true);
      expect(isValidUnit('sets')).toBe(true);
    });

    test('should validate custom units', () => {
      const config = { customUnits: ['kg', 'm'] };
      expect(isValidUnit('kg', config)).toBe(true);
      expect(isValidUnit('m', config)).toBe(true);
    });

    test('should reject invalid units', () => {
      expect(isValidUnit('invalid')).toBe(false);
      expect(isValidUnit('')).toBe(false);
      expect(isValidUnit(null as any)).toBe(false);
      expect(isValidUnit(undefined as any)).toBe(false);
    });
  });

  describe('getUnitOptions', () => {
    test('should return options for default units', () => {
      const options = getUnitOptions({}, 1);
      expect(options).toEqual([
        { value: 'pc', label: 'pc' },
        { value: 'set', label: 'set' },
        { value: 'length', label: 'length' }
      ]);
    });

    test('should include custom units', () => {
      const config = { customUnits: ['kg'] };
      const options = getUnitOptions(config, 1);
      expect(options).toEqual([
        { value: 'pc', label: 'pc' },
        { value: 'set', label: 'set' },
        { value: 'length', label: 'length' },
        { value: 'kg', label: 'kg' }
      ]);
    });

    test('should handle pluralization in options', () => {
      const options = getUnitOptions({}, 2);
      expect(options).toEqual([
        { value: 'pcs', label: 'pcs' },
        { value: 'sets', label: 'sets' },
        { value: 'lengths', label: 'lengths' }
      ]);
    });
  });

  describe('processImportedUnits', () => {
    test('should process imported items with units', () => {
      const items = [
        { unit: 'pc', quantity: 1 },
        { unit: 'pc', quantity: 2 },
        { unit: 'kg', quantity: 1 }
      ];

      const processed = processImportedUnits(items);
      expect(processed).toEqual([
        { unit: 'pc', quantity: 1 },
        { unit: 'pcs', quantity: 2 },
        { unit: 'kg', quantity: 1 }
      ]);
    });

    test('should handle items without units', () => {
      const items = [
        { quantity: 1 },
        { quantity: 2 }
      ];

      const processed = processImportedUnits(items);
      expect(processed).toEqual([
        { unit: 'pc', quantity: 1 },
        { unit: 'pcs', quantity: 2 }
      ]);
    });
  });

  describe('UnitConfigBuilder', () => {
    test('should build configuration with custom units', () => {
      const config = new UnitConfigBuilder()
        .withCustomUnits(['kg', 'm'])
        .build();

      expect(config.customUnits).toEqual(['kg', 'm']);
      expect(config.defaultUnits).toEqual(DEFAULT_UNITS);
      expect(config.enablePluralization).toBe(true);
    });

    test('should add custom units', () => {
      const config = new UnitConfigBuilder()
        .addCustomUnit('kg')
        .addCustomUnit('m')
        .build();

      expect(config.customUnits).toEqual(['kg', 'm']);
    });

    test('should remove custom units', () => {
      const config = new UnitConfigBuilder()
        .withCustomUnits(['kg', 'm', 'box'])
        .removeCustomUnit('m')
        .build();

      expect(config.customUnits).toEqual(['kg', 'box']);
    });

    test('should disable pluralization', () => {
      const config = new UnitConfigBuilder()
        .withPluralization(false)
        .build();

      expect(config.enablePluralization).toBe(false);
    });
  });

  describe('createUnitConfig', () => {
    test('should create configuration with custom units', () => {
      const config = createUnitConfig(['kg', 'm']);
      expect(config.customUnits).toEqual(['kg', 'm']);
      expect(config.defaultUnits).toEqual(DEFAULT_UNITS);
      expect(config.enablePluralization).toBe(true);
    });

    test('should create default configuration when no custom units', () => {
      const config = createUnitConfig();
      expect(config).toEqual({
        defaultUnits: DEFAULT_UNITS,
        customUnits: [],
        enablePluralization: true,
      });
    });
  });

  describe('Constants', () => {
    test('should export default units', () => {
      expect(DEFAULT_UNITS).toEqual(['pc', 'set', 'length']);
    });

    test('should export default config', () => {
      // 检查默认配置的基本结构，不依赖具体的 customUnits 内容
      expect(DEFAULT_UNIT_CONFIG).toMatchObject({
        defaultUnits: DEFAULT_UNITS,
        enablePluralization: true
      });
      expect(Array.isArray(DEFAULT_UNIT_CONFIG.customUnits)).toBe(true);
    });
  });
});
