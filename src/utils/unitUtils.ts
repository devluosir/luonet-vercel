/**
 * 统一单位处理工具模块
 * 提供所有模块共用的单位处理逻辑
 */

// 默认单位列表（需要单复数变化的单位）
export const DEFAULT_UNITS = ['pc', 'set', 'length'] as const;

// 单位类型定义
export type DefaultUnit = typeof DEFAULT_UNITS[number];
export type CustomUnit = string;
export type Unit = DefaultUnit | CustomUnit;

// 单位配置接口
export interface UnitConfig {
  /** 默认单位列表 */
  defaultUnits: readonly DefaultUnit[];
  /** 自定义单位列表 */
  customUnits: CustomUnit[];
  /** 是否启用单复数处理 */
  enablePluralization: boolean;
}

// 默认单位配置
export const DEFAULT_UNIT_CONFIG: UnitConfig = {
  defaultUnits: DEFAULT_UNITS,
  customUnits: [],
  enablePluralization: true,
};

/**
 * 获取单位显示文本（处理单复数）
 * @param baseUnit 基础单位
 * @param quantity 数量
 * @param config 单位配置
 * @returns 处理后的单位显示文本
 */
export function getUnitDisplay(
  baseUnit: string, 
  quantity: number, 
  config: Partial<UnitConfig> = {}
): string {
  const { defaultUnits, enablePluralization } = { ...DEFAULT_UNIT_CONFIG, ...config };
  
  // 移除可能存在的复数后缀
  const singularUnit = baseUnit.replace(/s$/, '');
  
  // 检查是否是默认单位
  const isDefaultUnit = defaultUnits.includes(singularUnit as DefaultUnit);
  
  // 如果启用单复数处理且是默认单位，则根据数量变化
  if (enablePluralization && isDefaultUnit) {
    return (quantity === 0 || quantity === 1) ? singularUnit : `${singularUnit}s`;
  }
  
  // 其他情况保持原样
  return baseUnit;
}

/**
 * 获取所有可用单位列表
 * @param config 单位配置
 * @returns 所有可用单位的数组
 */
export function getAllUnits(config: Partial<UnitConfig> = {}): string[] {
  const { defaultUnits, customUnits } = { ...DEFAULT_UNIT_CONFIG, ...config };
  return [...defaultUnits, ...customUnits];
}

/**
 * 检查单位是否为默认单位
 * @param unit 单位
 * @param config 单位配置
 * @returns 是否为默认单位
 */
export function isDefaultUnit(unit: string, config: Partial<UnitConfig> = {}): boolean {
  const { defaultUnits } = { ...DEFAULT_UNIT_CONFIG, ...config };
  const singularUnit = unit.replace(/s$/, '');
  return defaultUnits.includes(singularUnit as DefaultUnit);
}

/**
 * 检查单位是否为自定义单位
 * @param unit 单位
 * @param config 单位配置
 * @returns 是否为自定义单位
 */
export function isCustomUnit(unit: string, config: Partial<UnitConfig> = {}): boolean {
  const { customUnits } = { ...DEFAULT_UNIT_CONFIG, ...config };
  return customUnits.includes(unit);
}

/**
 * 处理单位变更（自动处理单复数）
 * @param newUnit 新单位
 * @param quantity 数量
 * @param config 单位配置
 * @returns 处理后的单位
 */
export function processUnitChange(
  newUnit: string, 
  quantity: number, 
  config: Partial<UnitConfig> = {}
): string {
  const { defaultUnits, enablePluralization } = { ...DEFAULT_UNIT_CONFIG, ...config };
  const baseUnit = newUnit.replace(/s$/, '');
  
  // 如果是默认单位且启用单复数处理
  if (enablePluralization && defaultUnits.includes(baseUnit as DefaultUnit)) {
    return getUnitDisplay(baseUnit, quantity, config);
  }
  
  // 其他情况保持原样
  return newUnit;
}

/**
 * 处理数量变更时的单位更新
 * @param currentUnit 当前单位
 * @param newQuantity 新数量
 * @param config 单位配置
 * @returns 更新后的单位
 */
export function updateUnitForQuantityChange(
  currentUnit: string, 
  newQuantity: number, 
  config: Partial<UnitConfig> = {}
): string {
  const { defaultUnits, enablePluralization } = { ...DEFAULT_UNIT_CONFIG, ...config };
  const baseUnit = currentUnit.replace(/s$/, '');
  
  // 如果是默认单位且启用单复数处理
  if (enablePluralization && defaultUnits.includes(baseUnit as DefaultUnit)) {
    return getUnitDisplay(baseUnit, newQuantity, config);
  }
  
  // 其他情况保持原样
  return currentUnit;
}

/**
 * 标准化单位（移除复数后缀，返回基础单位）
 * @param unit 单位
 * @param config 单位配置
 * @returns 标准化后的单位
 */
export function normalizeUnit(unit: string, config: Partial<UnitConfig> = {}): string {
  const { defaultUnits } = { ...DEFAULT_UNIT_CONFIG, ...config };
  const singularUnit = unit.replace(/s$/, '');
  
  // 如果是默认单位，返回单数形式
  if (defaultUnits.includes(singularUnit as DefaultUnit)) {
    return singularUnit;
  }
  
  // 其他情况保持原样
  return unit;
}

/**
 * 验证单位是否有效
 * @param unit 单位
 * @param config 单位配置
 * @returns 是否有效
 */
export function isValidUnit(unit: string, config: Partial<UnitConfig> = {}): boolean {
  if (!unit || typeof unit !== 'string') {
    return false;
  }
  
  const { defaultUnits, customUnits } = { ...DEFAULT_UNIT_CONFIG, ...config };
  const normalizedUnit = normalizeUnit(unit, config);
  
  return defaultUnits.includes(normalizedUnit as DefaultUnit) || customUnits.includes(unit);
}

/**
 * 获取单位选项列表（用于下拉选择器）
 * @param config 单位配置
 * @param quantity 当前数量（用于显示正确的单复数）
 * @returns 单位选项数组
 */
export function getUnitOptions(
  config: Partial<UnitConfig> = {}, 
  quantity: number = 1
): Array<{ value: string; label: string }> {
  const allUnits = getAllUnits(config);
  
  return allUnits.map(unit => {
    const display = getUnitDisplay(unit, quantity, config);
    return {
      value: display,
      label: display
    };
  });
}

/**
 * 处理导入数据中的单位
 * @param items 导入的商品项
 * @param config 单位配置
 * @returns 处理后的商品项
 */
export function processImportedUnits<T extends { unit?: string; quantity?: number }>(
  items: T[], 
  config: Partial<UnitConfig> = {}
): T[] {
  return items.map(item => {
    const unit = item.unit || 'pc';
    const quantity = item.quantity || 0;
    const processedUnit = processUnitChange(unit, quantity, config);
    
    return {
      ...item,
      unit: processedUnit
    };
  });
}

/**
 * 创建单位配置构建器
 */
export class UnitConfigBuilder {
  private config: UnitConfig = { ...DEFAULT_UNIT_CONFIG };

  /**
   * 设置自定义单位
   */
  withCustomUnits(customUnits: CustomUnit[]): this {
    this.config.customUnits = [...customUnits];
    return this;
  }

  /**
   * 添加自定义单位
   */
  addCustomUnit(unit: CustomUnit): this {
    if (!this.config.customUnits.includes(unit)) {
      this.config.customUnits.push(unit);
    }
    return this;
  }

  /**
   * 移除自定义单位
   */
  removeCustomUnit(unit: CustomUnit): this {
    this.config.customUnits = this.config.customUnits.filter(u => u !== unit);
    return this;
  }

  /**
   * 设置是否启用单复数处理
   */
  withPluralization(enabled: boolean): this {
    this.config.enablePluralization = enabled;
    return this;
  }

  /**
   * 构建配置
   */
  build(): UnitConfig {
    return { ...this.config };
  }
}

/**
 * 创建单位配置的便捷方法
 */
export function createUnitConfig(customUnits: CustomUnit[] = []): UnitConfig {
  return new UnitConfigBuilder()
    .withCustomUnits(customUnits)
    .build();
}
