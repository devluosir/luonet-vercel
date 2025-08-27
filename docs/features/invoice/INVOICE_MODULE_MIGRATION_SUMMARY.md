# 发票模块单位逻辑迁移总结

## 📋 迁移概述

本次迁移将发票模块的单位处理逻辑从本地实现改为使用统一的单位处理模块，确保与其他模块（报价、箱单）保持一致的单位处理逻辑。

## 🔧 修改内容

### 1. 导入统一模块

**文件**: `src/features/invoice/components/ItemsTable.tsx`

**修改前**:
```typescript
// 默认单位列表
const DEFAULT_UNITS = ['pc', 'set', 'length'];

// 获取所有可用单位
const getAllUnits = () => {
  return [...DEFAULT_UNITS, ...(data.customUnits || [])];
};

// 获取单位显示文本
const getUnitDisplay = (baseUnit: string, quantity: number) => {
  if (DEFAULT_UNITS.includes(baseUnit)) return quantity === 1 ? baseUnit : `${baseUnit}s`;
  return baseUnit;
};
```

**修改后**:
```typescript
// 导入单位处理模块
import { useUnitHandler } from '@/hooks/useUnitHandler';
import { UnitSelector } from '@/components/ui/UnitSelector';

// 使用单位处理Hook
const { 
  handleItemChange: handleUnitItemChange, 
  getDisplayUnit, 
  allUnits 
} = useUnitHandler(data.customUnits || []);
```

### 2. 更新数量变更处理逻辑

**修改前**:
```typescript
// 处理数量变化
const handleQuantityChange = (index: number, value: string) => {
  const numValue = parseFloat(value) || 0;
  updateLineItem(index, 'quantity', numValue);
};
```

**修改后**:
```typescript
// 处理数量变化
const handleQuantityChange = (index: number, value: string) => {
  const numValue = parseFloat(value) || 0;
  const item = data.items[index];
  const result = handleUnitItemChange(item, 'quantity', numValue);
  
  updateLineItem(index, 'quantity', result.quantity);
  // 如果单位发生变化，同时更新单位
  if (result.unit !== item.unit) {
    updateLineItem(index, 'unit', result.unit);
  }
};
```

### 3. 更新单位变更处理逻辑

**修改前**:
```typescript
// 处理单位变化
const handleUnitChange = (index: number, value: string) => {
  updateLineItem(index, 'unit', value);
};
```

**修改后**:
```typescript
// 处理单位变化
const handleUnitChange = (index: number, value: string) => {
  const item = data.items[index];
  const result = handleUnitItemChange(item, 'unit', value);
  updateLineItem(index, 'unit', result.unit);
};
```

### 4. 更新导入数据处理逻辑

**修改前**:
```typescript
// 处理导入数据
const handleImport = (newItems: LineItem[]) => {
  const processed = newItems.map((item, index) => {
    const baseUnit = (item.unit || 'pc').replace(/s$/, '');
    return {
      ...item,
      lineNo: data.items.length + index + 1,
      unit: DEFAULT_UNITS.includes(baseUnit) ? getUnitDisplay(baseUnit, item.quantity) : item.unit,
      amount: item.quantity * item.unitPrice,
    };
  });
  
  // 更新数据
  updateData({ items: [...data.items, ...processed] });
};
```

**修改后**:
```typescript
// 处理导入数据
const handleImport = (newItems: LineItem[]) => {
  const processed = newItems.map((item, index) => {
    const result = handleUnitItemChange(item, 'quantity', item.quantity);
    return {
      ...item,
      lineNo: data.items.length + index + 1,
      unit: result.unit,
      amount: item.quantity * item.unitPrice,
    };
  });
  
  // 更新数据
  updateData({ items: [...data.items, ...processed] });
};
```

### 5. 替换单位选择器组件

**移动端修改前**:
```typescript
<select
  value={item.unit}
  onChange={(e) => handleUnitChange(index, e.target.value)}
  onDoubleClick={() => handleDoubleClick(index, 'unit')}
  onFocus={onFocusIOS}
  className={`w-full px-3 py-2 bg-transparent border border-transparent focus:outline-none focus:ring-[3px]
    focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30 hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50
    text-[13px] text-center cursor-pointer appearance-none ios-optimized-input ${item.highlight?.unit ? HIGHLIGHT_CLASS : ''}`}
  style={isDarkMode ? { caretColor: '#0A84FF' } : { caretColor: '#007AFF' }}
>
  {getAllUnits().map((unit) => {
    const display = DEFAULT_UNITS.includes(unit)
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

**移动端修改后**:
```typescript
<UnitSelector
  value={item.unit}
  quantity={item.quantity}
  customUnits={data.customUnits || []}
  onChange={(unit) => handleUnitChange(index, unit)}
  onDoubleClick={() => handleDoubleClick(index, 'unit')}
  className={`w-full px-3 py-2 bg-transparent border border-transparent focus:outline-none focus:ring-[3px]
    focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30 hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50
    text-[13px] text-center cursor-pointer appearance-none ios-optimized-input ${item.highlight?.unit ? HIGHLIGHT_CLASS : ''}`}
/>
```

**桌面端修改前**:
```typescript
<select
  value={item.unit}
  onChange={(e) => handleUnitChange(index, e.target.value)}
  onDoubleClick={() => handleDoubleClick(index, 'unit')}
  onFocus={onFocusIOS}
  className={`w-full px-3 py-1.5 bg-transparent border border-transparent focus:outline-none focus:ring-[3px]
    focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30 hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50
    text-[13px] text-center cursor-pointer appearance-none ios-optimized-input ${item.highlight?.unit ? HIGHLIGHT_CLASS : ''}`}
  style={isDarkMode ? { caretColor: '#0A84FF' } : { caretColor: '#007AFF' }}
>
  {getAllUnits().map((unit) => {
    const display = DEFAULT_UNITS.includes(unit)
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

**桌面端修改后**:
```typescript
<UnitSelector
  value={item.unit}
  quantity={item.quantity}
  customUnits={data.customUnits || []}
  onChange={(unit) => handleUnitChange(index, unit)}
  onDoubleClick={() => handleDoubleClick(index, 'unit')}
  className={`w-full px-3 py-1.5 bg-transparent border border-transparent focus:outline-none focus:ring-[3px]
    focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30 hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50
    text-[13px] text-center cursor-pointer appearance-none ios-optimized-input ${item.highlight?.unit ? HIGHLIGHT_CLASS : ''}`}
/>
```

### 6. 更新数量输入框逻辑

**修改前**:
```typescript
onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
  const v = e.target.value;
  if (/^\d*$/.test(v)) {
    setEditingQtyAmount(v);
    handleQuantityChange(index, v === '' ? '0' : v);
  }
},
```

**修改后**:
```typescript
onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
  const v = e.target.value;
  if (/^\d*$/.test(v)) {
    setEditingQtyAmount(v);
    // 只在输入过程中更新数量，不触发单位更新
    const quantity = v === '' ? 0 : parseInt(v);
    updateLineItem(index, 'quantity', quantity);
  }
},
```

**添加失焦时的单位更新逻辑**:
```typescript
onBlur: () => {
  setEditingQtyIndex(null);
  setEditingQtyAmount('');
  // 失焦时更新单位（如果需要）
  const item = data.items[index];
  const result = handleUnitItemChange(item, 'quantity', item.quantity);
  if (result.unit !== item.unit) {
    updateLineItem(index, 'unit', result.unit);
  }
},
```

## 🎯 迁移效果

### ✅ 统一性
- 所有模块（报价、箱单、发票）现在使用相同的单位处理逻辑
- 单位显示规则完全一致
- 自定义单位支持统一

### ✅ 功能完整性
- 数量变更时自动更新单位单复数
- 单位选择时正确处理单复数
- 导入数据时正确处理单位
- 数量为0时正确显示

### ✅ 用户体验
- 移动端和桌面端都使用统一的 `UnitSelector` 组件
- 输入体验保持一致
- 单位选择界面统一

### ✅ 代码质量
- 消除了重复的单位处理逻辑
- 提高了代码的可维护性
- 统一了错误处理

## 🔍 验证结果

- ✅ 项目构建成功
- ✅ TypeScript 类型检查通过
- ✅ 所有模块的单位逻辑统一
- ✅ 功能完整性保持

## 📝 总结

发票模块的单位逻辑迁移已成功完成，现在所有模块都使用统一的单位处理模块，确保了：

1. **代码一致性**: 消除了重复的单位处理逻辑
2. **功能统一性**: 所有模块的单位行为完全一致
3. **维护便利性**: 单位逻辑的修改只需要在一个地方进行
4. **用户体验**: 所有模块的单位交互体验统一

迁移已完成，发票模块现在与其他模块保持完全一致的单位处理逻辑。
