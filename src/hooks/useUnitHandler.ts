import { useMemo, useCallback } from 'react';
import { 
  UnitConfig, 
  getUnitDisplay, 
  getAllUnits, 
  processUnitChange, 
  updateUnitForQuantityChange,
  getUnitOptions,
  createUnitConfig,
  DEFAULT_UNIT_CONFIG
} from '@/utils/unitUtils';

/**
 * 单位处理Hook
 * 提供统一的单位处理逻辑
 */
export function useUnitHandler(customUnits: string[] = []) {
  // 创建单位配置
  const unitConfig = useMemo(() => {
    return createUnitConfig(customUnits);
  }, [customUnits]);

  // 获取所有可用单位
  const allUnits = useMemo(() => {
    return getAllUnits(unitConfig);
  }, [unitConfig]);

  // 获取单位显示文本
  const getDisplayUnit = useCallback((
    baseUnit: string, 
    quantity: number
  ): string => {
    return getUnitDisplay(baseUnit, quantity, unitConfig);
  }, [unitConfig]);

  // 处理单位变更
  const handleUnitChange = useCallback((
    newUnit: string, 
    quantity: number
  ): string => {
    return processUnitChange(newUnit, quantity, unitConfig);
  }, [unitConfig]);

  // 处理数量变更时的单位更新
  const handleQuantityChange = useCallback((
    currentUnit: string, 
    newQuantity: number
  ): string => {
    return updateUnitForQuantityChange(currentUnit, newQuantity, unitConfig);
  }, [unitConfig]);

  // 获取单位选项（用于下拉选择器）
  const getUnitSelectOptions = useCallback((
    quantity: number = 1
  ): Array<{ value: string; label: string }> => {
    return getUnitOptions(unitConfig, quantity);
  }, [unitConfig]);

  // 处理商品项变更（同时处理数量和单位）
  const handleItemChange = useCallback((
    item: { unit: string; quantity: number },
    field: 'quantity' | 'unit',
    value: string | number
  ): { unit: string; quantity: number } => {
    const updatedItem = { ...item };

    if (field === 'quantity') {
      const newQuantity = Number(value) || 0;
      updatedItem.quantity = newQuantity;
      // 自动更新单位的单复数
      updatedItem.unit = handleQuantityChange(item.unit, newQuantity);
    } else if (field === 'unit') {
      const newUnit = String(value);
      updatedItem.unit = handleUnitChange(newUnit, item.quantity);
    }

    return updatedItem;
  }, [handleUnitChange, handleQuantityChange]);

  return {
    // 配置
    unitConfig,
    allUnits,
    
    // 核心函数
    getDisplayUnit,
    handleUnitChange,
    handleQuantityChange,
    handleItemChange,
    
    // 选项
    getUnitSelectOptions,
    
    // 便捷方法
    getUnitDisplay: getDisplayUnit,
    processUnitChange: handleUnitChange,
    updateUnitForQuantityChange: handleQuantityChange,
  };
}

/**
 * 单位选择器Hook
 * 专门用于单位下拉选择器的逻辑
 */
export function useUnitSelector(
  currentUnit: string,
  currentQuantity: number,
  customUnits: string[] = [],
  onUnitChange?: (unit: string) => void
) {
  const { getDisplayUnit, handleUnitChange, getUnitSelectOptions } = useUnitHandler(customUnits);

  // 当前显示的单位
  const displayUnit = useMemo(() => {
    return getDisplayUnit(currentUnit, currentQuantity);
  }, [currentUnit, currentQuantity, getDisplayUnit]);

  // 单位选项
  const unitOptions = useMemo(() => {
    return getUnitSelectOptions(currentQuantity);
  }, [getUnitSelectOptions, currentQuantity]);

  // 处理单位选择
  const handleSelectChange = useCallback((newUnit: string) => {
    const processedUnit = handleUnitChange(newUnit, currentQuantity);
    onUnitChange?.(processedUnit);
  }, [handleUnitChange, currentQuantity, onUnitChange]);

  return {
    displayUnit,
    unitOptions,
    handleSelectChange,
  };
}

/**
 * 单位验证Hook
 * 提供单位验证功能
 */
export function useUnitValidator(customUnits: string[] = []) {
  const { unitConfig } = useUnitHandler(customUnits);

  const validateUnit = useCallback((unit: string): boolean => {
    if (!unit || typeof unit !== 'string') {
      return false;
    }
    
    const { defaultUnits, customUnits } = unitConfig;
    const singularUnit = unit.replace(/s$/, '');
    
    return defaultUnits.includes(singularUnit as any) || customUnits.includes(unit);
  }, [unitConfig]);

  const getUnitError = useCallback((unit: string): string | null => {
    if (!unit) {
      return '单位不能为空';
    }
    
    if (!validateUnit(unit)) {
      return '无效的单位';
    }
    
    return null;
  }, [validateUnit]);

  return {
    validateUnit,
    getUnitError,
  };
}
