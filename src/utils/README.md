# 单位处理工具模块

## 概述

`src/utils/unitUtils.ts` 是一个统一的单位处理工具模块，为整个应用提供一致的单位处理逻辑。该模块解决了各模块中单位处理代码重复、逻辑不一致的问题。

## 核心功能

### 1. 单复数处理
- 自动根据数量处理默认单位的单复数形式
- 支持自定义单位（不进行单复数变化）
- 可配置是否启用单复数处理

### 2. 单位管理
- 统一的默认单位定义：`['pc', 'set', 'length']`
- 支持自定义单位扩展
- 单位验证和标准化

### 3. React集成
- 提供 `useUnitHandler` Hook 简化组件逻辑
- 提供 `UnitSelector` 通用组件
- 支持键盘导航和事件处理

## 快速开始

### 基础使用

```typescript
import { getUnitDisplay, getAllUnits } from '@/utils/unitUtils';

// 获取单位显示文本
const display = getUnitDisplay('pc', 2); // 返回 'pcs'

// 获取所有可用单位
const units = getAllUnits(); // 返回 ['pc', 'set', 'length']
```

### 使用Hook

```typescript
import { useUnitHandler } from '@/hooks/useUnitHandler';

function MyComponent() {
  const { handleItemChange, getDisplayUnit } = useUnitHandler(['kg', 'm']);

  const handleQuantityChange = (item, newQuantity) => {
    const result = handleItemChange(item, 'quantity', newQuantity);
    // result.unit 会自动更新为正确的单复数形式
  };
}
```

### 使用组件

```typescript
import { UnitSelector } from '@/components/ui/UnitSelector';

<UnitSelector
  value={item.unit}
  quantity={item.quantity}
  customUnits={['kg', 'm']}
  onChange={(unit) => handleUnitChange(unit)}
/>
```

## API 参考

### 核心函数

#### `getUnitDisplay(baseUnit, quantity, config?)`
获取单位的显示文本，自动处理单复数。

```typescript
getUnitDisplay('pc', 1) // 'pc'
getUnitDisplay('pc', 2) // 'pcs'
getUnitDisplay('kg', 2) // 'kg' (自定义单位不变化)
```

#### `getAllUnits(config?)`
获取所有可用的单位列表。

```typescript
getAllUnits() // ['pc', 'set', 'length']
getAllUnits({ customUnits: ['kg'] }) // ['pc', 'set', 'length', 'kg']
```

#### `processUnitChange(newUnit, quantity, config?)`
处理单位变更，自动处理单复数。

```typescript
processUnitChange('set', 1) // 'set'
processUnitChange('set', 2) // 'sets'
```

#### `updateUnitForQuantityChange(currentUnit, newQuantity, config?)`
根据数量变化更新单位。

```typescript
updateUnitForQuantityChange('pc', 1) // 'pc'
updateUnitForQuantityChange('pc', 2) // 'pcs'
```

### 配置选项

#### `UnitConfig` 接口

```typescript
interface UnitConfig {
  defaultUnits: readonly DefaultUnit[]; // 默认单位列表
  customUnits: CustomUnit[];           // 自定义单位列表
  enablePluralization: boolean;        // 是否启用单复数处理
}
```

#### 配置构建器

```typescript
import { UnitConfigBuilder } from '@/utils/unitUtils';

const config = new UnitConfigBuilder()
  .withCustomUnits(['kg', 'm'])
  .withPluralization(false)
  .build();
```

### React Hooks

#### `useUnitHandler(customUnits?)`
主要的单位处理Hook。

```typescript
const {
  getDisplayUnit,
  handleUnitChange,
  handleQuantityChange,
  handleItemChange,
  getUnitSelectOptions
} = useUnitHandler(['kg', 'm']);
```

#### `useUnitSelector(currentUnit, currentQuantity, customUnits?, onUnitChange?)`
专门用于单位选择器的Hook。

```typescript
const {
  displayUnit,
  unitOptions,
  handleSelectChange
} = useUnitSelector('pc', 2, ['kg'], handleChange);
```

#### `useUnitValidator(customUnits?)`
提供单位验证功能。

```typescript
const {
  validateUnit,
  getUnitError
} = useUnitValidator(['kg']);
```

### 组件

#### `UnitSelector`
通用的单位选择器组件。

```typescript
<UnitSelector
  value={unit}
  quantity={quantity}
  customUnits={customUnits}
  onChange={onChange}
  disabled={disabled}
  placeholder="选择单位"
  showQuantityHint={true}
  onDoubleClick={handleDoubleClick}
  onFocus={handleFocus}
  onBlur={handleBlur}
/>
```

## 迁移指南

### 从旧代码迁移

#### 旧代码
```typescript
const defaultUnits = ['pc', 'set', 'length'] as const;

const getUnitDisplay = (baseUnit: string, quantity: number) => {
  if (defaultUnits.includes(baseUnit)) 
    return quantity === 1 ? baseUnit : `${baseUnit}s`;
  return baseUnit;
};
```

#### 新代码
```typescript
import { getUnitDisplay } from '@/utils/unitUtils';

// 直接使用
const display = getUnitDisplay('pc', 2); // 'pcs'

// 或者使用Hook
const { getDisplayUnit } = useUnitHandler();
const display = getDisplayUnit('pc', 2); // 'pcs'
```

### 组件迁移

#### 旧代码
```typescript
<select
  value={item.unit}
  onChange={(e) => handleUnitChange(index, e.target.value)}
>
  {availableUnits.map((unit) => (
    <option key={unit} value={unit}>
      {getUnitDisplay(unit, item.quantity)}
    </option>
  ))}
</select>
```

#### 新代码
```typescript
import { UnitSelector } from '@/components/ui/UnitSelector';

<UnitSelector
  value={item.unit}
  quantity={item.quantity}
  customUnits={data.customUnits || []}
  onChange={(unit) => handleUnitChange(index, unit)}
/>
```

## 测试

运行测试：

```bash
npm test src/utils/__tests__/unitUtils.test.ts
```

测试覆盖了以下功能：
- 单复数处理逻辑
- 自定义单位支持
- 配置选项
- 边界情况处理
- React Hook功能

## 性能优化

### 1. 缓存计算结果
```typescript
const unitOptions = useMemo(() => {
  return getUnitOptions(unitConfig, quantity);
}, [unitConfig, quantity]);
```

### 2. 使用React.memo
```typescript
const UnitSelector = React.memo(({ value, quantity, onChange }) => {
  // 组件实现
});
```

### 3. 避免重复计算
```typescript
const { handleItemChange } = useUnitHandler(customUnits);
// 使用缓存的函数，避免每次渲染都重新创建
```

## 最佳实践

### 1. 类型安全
```typescript
// 使用类型定义
import { DefaultUnit, CustomUnit, Unit } from '@/utils/unitUtils';

const defaultUnit: DefaultUnit = 'pc';
const customUnit: CustomUnit = 'kg';
const unit: Unit = 'set';
```

### 2. 错误处理
```typescript
import { isValidUnit } from '@/utils/unitUtils';

if (!isValidUnit(unit)) {
  console.warn(`Invalid unit: ${unit}`);
  return 'pc'; // 使用默认单位
}
```

### 3. 配置管理
```typescript
// 集中管理单位配置
const UNIT_CONFIG = createUnitConfig(['kg', 'm', 'box']);

// 在组件中使用
const { getDisplayUnit } = useUnitHandler(UNIT_CONFIG.customUnits);
```

### 4. 性能考虑
```typescript
// 避免在渲染函数中创建新对象
const unitConfig = useMemo(() => createUnitConfig(customUnits), [customUnits]);

// 使用useCallback缓存事件处理函数
const handleUnitChange = useCallback((unit: string) => {
  // 处理逻辑
}, [dependencies]);
```

## 常见问题

### Q: 如何禁用单复数处理？
A: 使用配置选项：
```typescript
const config = { enablePluralization: false };
const display = getUnitDisplay('pc', 2, config); // 返回 'pc'
```

### Q: 如何添加新的默认单位？
A: 修改 `DEFAULT_UNITS` 常量：
```typescript
export const DEFAULT_UNITS = ['pc', 'set', 'length', 'newUnit'] as const;
```

### Q: 如何处理特殊的单复数规则？
A: 可以扩展 `getUnitDisplay` 函数或创建自定义配置：
```typescript
const customConfig = {
  customUnits: ['foot'],
  enablePluralization: true,
  // 可以添加自定义的单复数规则
};
```

## 贡献指南

1. 添加新功能时，请同时添加测试用例
2. 保持向后兼容性
3. 更新文档和类型定义
4. 遵循现有的代码风格

## 更新日志

### v1.0.0
- 初始版本
- 基础单位处理功能
- React Hook支持
- 通用组件
- 完整的测试覆盖
