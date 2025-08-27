# 单位处理模块迁移指南

## 概述

本文档介绍如何将现有的单位处理逻辑迁移到统一的公共模块 `src/utils/unitUtils.ts`，以提高代码复用性和维护性。

## 新模块特性

### 1. 核心功能
- ✅ 统一的单复数处理逻辑
- ✅ 自定义单位支持
- ✅ 类型安全的API
- ✅ 灵活的配置选项
- ✅ React Hook支持
- ✅ 通用组件支持

### 2. 主要优势
- **代码复用**：消除重复的单位处理代码
- **一致性**：确保所有模块的单位处理逻辑一致
- **可维护性**：集中管理单位相关逻辑
- **类型安全**：完整的TypeScript类型支持
- **扩展性**：易于添加新的单位类型和功能

## 迁移步骤

### 步骤1：更新导入

#### 旧代码示例
```typescript
// 在各个模块中重复定义
const defaultUnits = ['pc', 'set', 'length'] as const;

const getUnitDisplay = (baseUnit: string, quantity: number) => {
  if (defaultUnits.includes(baseUnit)) return quantity === 1 ? baseUnit : `${baseUnit}s`;
  return baseUnit;
};
```

#### 新代码示例
```typescript
// 统一导入
import { 
  getUnitDisplay, 
  getAllUnits, 
  processUnitChange,
  DEFAULT_UNITS 
} from '@/utils/unitUtils';

// 或者使用Hook
import { useUnitHandler } from '@/hooks/useUnitHandler';
```

### 步骤2：使用Hook简化逻辑

#### 旧代码示例
```typescript
// 在组件中手动处理单位逻辑
const handleUnitChange = (index: number, value: string) => {
  const baseUnit = value.replace(/s$/, '');
  const quantity = data.items[index].quantity;
  const newUnit = defaultUnits.includes(baseUnit) 
    ? getUnitDisplay(baseUnit, quantity) 
    : value;
  onItemChange(index, 'unit', newUnit);
};

const handleQuantityChange = (index: number, value: string) => {
  const quantity = parseInt(value) || 0;
  const baseUnit = data.items[index].unit.replace(/s$/, '');
  const newUnit = defaultUnits.includes(baseUnit) 
    ? getUnitDisplay(baseUnit, quantity) 
    : data.items[index].unit;
  
  onItemChange(index, 'quantity', quantity);
  if (newUnit !== data.items[index].unit) {
    onItemChange(index, 'unit', newUnit);
  }
};
```

#### 新代码示例
```typescript
// 使用Hook简化逻辑
const { handleItemChange } = useUnitHandler(data.customUnits || []);

const handleUnitChange = (index: number, value: string) => {
  const item = data.items[index];
  const updatedItem = handleItemChange(item, 'unit', value);
  onItemChange(index, 'unit', updatedItem.unit);
};

const handleQuantityChange = (index: number, value: string) => {
  const item = data.items[index];
  const updatedItem = handleItemChange(item, 'quantity', parseInt(value) || 0);
  onItemChange(index, 'quantity', updatedItem.quantity);
  onItemChange(index, 'unit', updatedItem.unit);
};
```

### 步骤3：使用通用组件

#### 旧代码示例
```typescript
// 手动实现单位选择器
<select
  value={item.unit}
  onChange={(e) => handleUnitChange(index, e.target.value)}
  className="w-full px-3 py-2 bg-transparent border border-transparent..."
>
  {availableUnits.map((unit) => {
    const display = defaultUnits.includes(unit) 
      ? getUnitDisplay(unit, item.quantity) 
      : unit;
    return (
      <option key={unit} value={display}>
        {display}
      </option>
    );
  })}
</select>
```

#### 新代码示例
```typescript
// 使用通用组件
import { UnitSelector } from '@/components/ui/UnitSelector';

<UnitSelector
  value={item.unit}
  quantity={item.quantity}
  customUnits={data.customUnits || []}
  onChange={(unit) => handleUnitChange(index, unit)}
  onDoubleClick={() => handleDoubleClick(index, 'unit')}
  onFocus={onFocusIOS}
/>
```

## 具体模块迁移示例

### 1. 报价模块迁移

#### 文件：`src/components/quotation/ItemsTable.tsx`

**迁移前：**
```typescript
const defaultUnits = ['pc', 'set', 'length'] as const;
const availableUnits = [...defaultUnits, ...(data.customUnits || [])] as const;

const getUnitDisplay = (baseUnit: string, quantity: number) => {
  if ((defaultUnits as readonly string[]).includes(baseUnit)) 
    return quantity === 1 ? baseUnit : `${baseUnit}s`;
  return baseUnit;
};

const handleItemChange = (index: number, field: keyof LineItem, value: string | number) => {
  // ... 复杂的单位处理逻辑
  if (field === 'quantity' && typeof updated.unit === 'string') {
    const baseUnit = updated.unit.replace(/s$/, '');
    updated.unit = getUnitDisplay(baseUnit, num);
  }
  // ...
};
```

**迁移后：**
```typescript
import { useUnitHandler } from '@/hooks/useUnitHandler';

export const ItemsTable: React.FC<ItemsTableProps> = ({ data, onItemsChange }) => {
  const { handleItemChange } = useUnitHandler(data.customUnits || []);

  const handleItemChange = (index: number, field: keyof LineItem, value: string | number) => {
    const items = data.items || [];
    const newItems = [...items];
    const updated = { ...newItems[index] };

    if (field === 'quantity' || field === 'unit') {
      const result = handleItemChange(
        { unit: updated.unit, quantity: updated.quantity },
        field,
        value
      );
      updated.unit = result.unit;
      updated.quantity = result.quantity;
      updated.amount = updated.quantity * updated.unitPrice;
    } else {
      (updated as any)[field] = value;
    }

    newItems[index] = updated;
    onItemsChange(newItems);
  };

  // 在JSX中使用UnitSelector组件
  return (
    <UnitSelector
      value={item.unit}
      quantity={item.quantity}
      customUnits={data.customUnits || []}
      onChange={(unit) => handleItemChange(index, 'unit', unit)}
    />
  );
};
```

### 2. 发票模块迁移

#### 文件：`src/features/invoice/components/ItemsTable.tsx`

**迁移前：**
```typescript
const DEFAULT_UNITS = ['pc', 'set', 'length'];

const getUnitDisplay = (baseUnit: string, quantity: number) => {
  if (DEFAULT_UNITS.includes(baseUnit)) return quantity === 1 ? baseUnit : `${baseUnit}s`;
  return baseUnit;
};

const getAllUnits = () => {
  return [...DEFAULT_UNITS, ...(data.customUnits || [])];
};
```

**迁移后：**
```typescript
import { useUnitHandler } from '@/hooks/useUnitHandler';

export const ItemsTable = React.memo(() => {
  const { data } = useInvoiceStore();
  const { handleItemChange, getAllUnits } = useUnitHandler(data.customUnits || []);

  const handleUnitChange = (index: number, value: string) => {
    const item = data.items[index];
    const result = handleItemChange(item, 'unit', value);
    updateLineItem(index, 'unit', result.unit);
  };

  const handleQuantityChange = (index: number, value: string) => {
    const item = data.items[index];
    const result = handleItemChange(item, 'quantity', parseInt(value) || 0);
    updateLineItem(index, 'quantity', result.quantity);
    updateLineItem(index, 'unit', result.unit);
  };

  // 在JSX中使用UnitSelector组件
  return (
    <UnitSelector
      value={item.unit}
      quantity={item.quantity}
      customUnits={data.customUnits || []}
      onChange={(unit) => handleUnitChange(index, unit)}
    />
  );
});
```

### 3. 装箱单模块迁移

#### 文件：`src/features/packing/components/ItemsTableEnhanced.tsx`

**迁移前：**
```typescript
const defaultUnits = ['pc', 'set', 'length'] as const;

const getUnitDisplay = (baseUnit: string, quantity: number) => {
  if (defaultUnits.includes(baseUnit as typeof defaultUnits[number])) {
    return quantity > 1 ? `${baseUnit}s` : baseUnit;
  }
  return baseUnit;
};
```

**迁移后：**
```typescript
import { useUnitHandler } from '@/hooks/useUnitHandler';

export const ItemsTableEnhanced: React.FC<ItemsTableEnhancedProps> = ({ data }) => {
  const { handleItemChange } = useUnitHandler(data.customUnits || []);

  const handleUnitChange = (index: number, value: string) => {
    const item = data.items[index];
    const result = handleItemChange(item, 'unit', value);
    onItemChange(index, 'unit', result.unit);
  };

  // 在JSX中使用UnitSelector组件
  return (
    <UnitSelector
      value={item.unit}
      quantity={item.quantity}
      customUnits={data.customUnits || []}
      onChange={(unit) => handleUnitChange(index, unit)}
    />
  );
};
```

## 配置选项

### 自定义单位配置

```typescript
import { createUnitConfig, UnitConfigBuilder } from '@/utils/unitUtils';

// 方式1：使用便捷方法
const config = createUnitConfig(['kg', 'm', 'box']);

// 方式2：使用构建器
const config = new UnitConfigBuilder()
  .withCustomUnits(['kg', 'm', 'box'])
  .withPluralization(false) // 禁用单复数处理
  .build();
```

### Hook配置

```typescript
import { useUnitHandler } from '@/hooks/useUnitHandler';

function MyComponent() {
  const { 
    getDisplayUnit, 
    handleUnitChange, 
    handleQuantityChange,
    getUnitSelectOptions 
  } = useUnitHandler(['kg', 'm', 'box']);

  // 使用配置的函数
  const displayUnit = getDisplayUnit('pc', 5); // 返回 'pcs'
  const newUnit = handleUnitChange('set', 1); // 返回 'set'
}
```

## 测试用例

### 单元测试示例

```typescript
import { getUnitDisplay, processUnitChange, isValidUnit } from '@/utils/unitUtils';

describe('Unit Utils', () => {
  test('getUnitDisplay should handle pluralization correctly', () => {
    expect(getUnitDisplay('pc', 1)).toBe('pc');
    expect(getUnitDisplay('pc', 2)).toBe('pcs');
    expect(getUnitDisplay('kg', 1)).toBe('kg'); // 自定义单位不变化
  });

  test('processUnitChange should handle unit changes', () => {
    expect(processUnitChange('set', 1)).toBe('set');
    expect(processUnitChange('set', 2)).toBe('sets');
  });

  test('isValidUnit should validate units', () => {
    expect(isValidUnit('pc')).toBe(true);
    expect(isValidUnit('invalid')).toBe(false);
  });
});
```

## 性能优化

### 1. 使用React.memo
```typescript
const UnitSelector = React.memo(({ value, quantity, onChange }) => {
  // 组件实现
});
```

### 2. 使用useMemo缓存计算结果
```typescript
const unitOptions = useMemo(() => {
  return getUnitOptions(unitConfig, quantity);
}, [unitConfig, quantity]);
```

### 3. 使用useCallback缓存函数
```typescript
const handleUnitChange = useCallback((newUnit: string) => {
  // 处理逻辑
}, [dependencies]);
```

## 注意事项

### 1. 向后兼容性
- 保持现有API的兼容性
- 逐步迁移，不强制一次性替换
- 提供迁移指南和示例

### 2. 类型安全
- 使用TypeScript确保类型安全
- 提供完整的类型定义
- 避免any类型的使用

### 3. 错误处理
- 提供合理的默认值
- 处理边界情况
- 添加错误日志

### 4. 性能考虑
- 避免不必要的重新计算
- 使用适当的缓存策略
- 优化渲染性能

## 总结

通过迁移到统一的单位处理模块，我们可以：

1. **减少代码重复**：消除各模块中的重复逻辑
2. **提高一致性**：确保所有模块的单位处理行为一致
3. **简化维护**：集中管理单位相关逻辑
4. **增强功能**：提供更多配置选项和功能
5. **改善开发体验**：提供类型安全的API和React Hook

建议按照以下顺序进行迁移：
1. 先在新功能中使用新模块
2. 逐步迁移现有模块
3. 最终移除旧的重复代码
4. 添加测试用例确保功能正确性
