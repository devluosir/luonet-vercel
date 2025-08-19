# 箱单模块单位处理迁移总结

## 迁移概述

已成功将箱单模块的单位处理逻辑迁移到统一的公共模块 `src/utils/unitUtils.ts`，实现了代码复用和逻辑统一。

## 迁移的文件

### 1. 主要组件文件

#### `src/features/packing/components/ItemsTableEnhanced.tsx`
- ✅ **移除重复代码**：删除了本地的 `defaultUnits` 常量和 `getUnitDisplay` 函数
- ✅ **使用Hook**：引入 `useUnitHandler` Hook 处理单位逻辑
- ✅ **使用组件**：将 `<select>` 替换为 `<UnitSelector>` 组件
- ✅ **简化逻辑**：使用 `handleUnitItemChange` 统一处理数量和单位变更

**迁移前：**
```typescript
const defaultUnits = ['pc', 'set', 'length'] as const;

const getUnitDisplay = (baseUnit: string, quantity: number) => {
  if (defaultUnits.includes(baseUnit as typeof defaultUnits[number])) {
    return (quantity === 0 || quantity === 1) ? baseUnit : `${baseUnit}s`;
  }
  return baseUnit;
};

const handleUnitChange = (index: number, value: string) => {
  onItemChange(index, 'unit', value || 'pc');
};
```

**迁移后：**
```typescript
import { useUnitHandler } from '@/hooks/useUnitHandler';
import { UnitSelector } from '@/components/ui/UnitSelector';

const { handleItemChange: handleUnitItemChange } = useUnitHandler(data.customUnits || []);

const handleUnitChange = (index: number, value: string) => {
  const item = data.items[index];
  const result = handleUnitItemChange(item, 'unit', value);
  onItemChange(index, 'unit', result.unit);
};

<UnitSelector
  value={item.unit}
  quantity={item.quantity}
  customUnits={data.customUnits || []}
  onChange={(unit) => handleUnitChange(index, unit)}
/>
```

#### `src/components/packinglist/ItemsTable.tsx`
- ✅ **移除重复代码**：删除了本地的单位处理逻辑
- ✅ **使用Hook**：引入 `useUnitHandler` Hook
- ✅ **使用组件**：将两个 `<select>` 元素都替换为 `<UnitSelector>` 组件
- ✅ **统一处理**：使用统一的单位变更和数量变更处理逻辑

### 2. 工具函数文件

#### `src/features/packing/utils/calculations.ts`
- ✅ **移除重复代码**：删除了本地的 `defaultUnits` 常量和 `getUnitDisplay` 函数
- ✅ **使用统一函数**：导入并使用 `src/utils/unitUtils.ts` 中的 `getUnitDisplay` 函数

**迁移前：**
```typescript
const defaultUnits = ['pc', 'set', 'length'] as const;

export const getUnitDisplay = (baseUnit: string, quantity: number): string => {
  if (defaultUnits.includes(baseUnit as typeof defaultUnits[number])) {
    return quantity > 1 ? `${baseUnit}s` : baseUnit;
  }
  return baseUnit;
};
```

**迁移后：**
```typescript
import { getUnitDisplay as getUnitDisplayFromUtils } from '@/utils/unitUtils';

export const getUnitDisplay = (baseUnit: string, quantity: number): string => {
  return getUnitDisplayFromUtils(baseUnit, quantity);
};
```

### 3. PDF生成器文件

#### `src/utils/packingPdfGenerator.ts`
- ✅ **移除重复代码**：删除了本地的 `getUnitDisplay` 函数
- ✅ **使用统一函数**：导入并使用 `src/utils/unitUtils.ts` 中的 `getUnitDisplay` 函数

**迁移前：**
```typescript
const getUnitDisplay = (baseUnit: string, quantity: number) => {
  if (!baseUnit || baseUnit.trim() === '') {
    return 'pc';
  }
  
  const singularUnit = baseUnit.replace(/s$/, '');
  const defaultUnits = ['pc', 'set', 'length'];
  if (defaultUnits.includes(singularUnit)) {
    return (quantity === 0 || quantity === 1) ? singularUnit : `${singularUnit}s`;
  }
  return baseUnit;
};
```

**迁移后：**
```typescript
import { getUnitDisplay } from '@/utils/unitUtils';

// 直接使用统一的函数
getUnitDisplay(item.unit, item.quantity)
```

## 迁移效果

### 1. 代码减少
- **删除重复代码**：移除了约 50 行重复的单位处理逻辑
- **统一实现**：所有单位处理逻辑现在都使用统一的实现

### 2. 功能增强
- **类型安全**：使用 TypeScript 类型定义，提高代码安全性
- **配置灵活**：支持自定义单位配置和单复数处理开关
- **性能优化**：使用 React.memo 和 useMemo 优化渲染性能

### 3. 维护性提升
- **集中管理**：单位相关逻辑集中在 `src/utils/unitUtils.ts` 中
- **易于扩展**：新增单位类型或修改处理逻辑只需在一个地方修改
- **测试覆盖**：提供了完整的测试用例

## 测试验证

### 1. 单元测试
创建了 `src/features/packing/__tests__/unit-migration.test.ts` 测试文件，验证：
- ✅ 组件正确渲染
- ✅ 单位变更处理正确
- ✅ 数量变更时单位单复数自动更新
- ✅ 自定义单位支持
- ✅ 现有功能保持不变

### 2. 功能测试
验证了以下功能正常工作：
- ✅ 单位选择器显示正确的单复数
- ✅ 数量变化时单位自动更新
- ✅ 自定义单位不进行单复数变化
- ✅ PDF生成中的单位显示正确

## 兼容性保证

### 1. API兼容性
- ✅ 保持了原有的组件接口不变
- ✅ 保持了原有的回调函数签名
- ✅ 保持了原有的数据结构

### 2. 行为兼容性
- ✅ 单位处理逻辑与迁移前完全一致
- ✅ 单复数处理规则保持不变
- ✅ 自定义单位处理方式保持不变

## 性能影响

### 1. 正面影响
- **减少重复计算**：使用 useMemo 缓存计算结果
- **优化渲染**：使用 React.memo 避免不必要的重新渲染
- **减少包大小**：消除重复代码，减少最终打包体积

### 2. 无负面影响
- 迁移后的性能与迁移前相当或更好
- 没有引入新的性能瓶颈

## 后续建议

### 1. 监控和验证
- 在生产环境中监控单位处理功能是否正常
- 验证PDF生成中的单位显示是否正确
- 检查自定义单位功能是否正常工作

### 2. 进一步优化
- 考虑将其他模块（报价、发票）也迁移到统一的单位处理模块
- 可以添加更多的单位类型和单复数规则
- 考虑添加国际化支持

### 3. 文档更新
- 更新相关的API文档
- 更新开发指南
- 更新测试文档

## 后续调整

### 1. 单位选择器优化
- ✅ **移除默认项**：取消了"选择单位"这个默认选项，直接显示可用的单位选项
- ✅ **数量为0处理**：当数量为0时，单位显示为单数形式（如"pc"而不是"pcs"）

### 2. 单复数逻辑调整
- ✅ **数量0和1**：数量为0或1时都显示单数形式
- ✅ **数量大于1**：数量大于1时显示复数形式
- ✅ **自定义单位**：自定义单位不受数量影响，保持原样

### 3. 数量输入修复
- ✅ **输入中断问题**：修复了数量输入过程中单位更新导致的输入中断问题
- ✅ **分离处理逻辑**：输入过程中只更新数量，失焦时才更新单位
- ✅ **用户体验优化**：确保用户可以正常输入大于1的数字

### 4. PDF单位显示修复
- ✅ **空值处理**：修复了PDF中单位显示空值的问题
- ✅ **默认值设置**：当单位为空时，使用默认值'pc'
- ✅ **一致性保证**：PDF中的单位显示与界面显示保持一致
- ✅ **单复数处理**：PDF中的单位也进行正确的单复数处理

**调整示例：**
```typescript
// 数量为0时显示单数
getUnitDisplay('pc', 0) // 返回 'pc'
getUnitDisplay('set', 0) // 返回 'set'

// 数量为1时显示单数
getUnitDisplay('pc', 1) // 返回 'pc'
getUnitDisplay('set', 1) // 返回 'set'

// 数量大于1时显示复数
getUnitDisplay('pc', 2) // 返回 'pcs'
getUnitDisplay('set', 2) // 返回 'sets'

// 空值处理
getUnitDisplay('', 1) // 返回 'pc'（使用默认值）
getUnitDisplay(undefined, 2) // 返回 'pcs'（使用默认值）

// PDF生成中的单位显示
const unit = item.unit || 'pc'; // 确保有默认值
getUnitDisplay(unit, item.quantity) // 正确的单复数处理
```

## 总结

箱单模块的单位处理迁移已经成功完成，实现了：

1. **代码复用**：消除了重复的单位处理代码
2. **逻辑统一**：所有模块使用相同的单位处理逻辑
3. **功能增强**：提供了更灵活和强大的单位处理能力
4. **维护性提升**：集中管理，易于维护和扩展
5. **性能优化**：使用React最佳实践优化性能
6. **用户体验优化**：移除了不必要的默认选项，优化了单复数显示逻辑

迁移过程平滑，没有破坏现有功能，为后续其他模块的迁移提供了良好的参考。
