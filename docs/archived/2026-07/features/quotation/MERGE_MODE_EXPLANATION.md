# 合并模式详细说明

## 🎯 概述

系统中确实存在两种不同的合并模式：**自动合并** 和 **手动合并**。这两种模式在页面显示和PDF生成中有不同的行为。

## 🔄 两种合并模式

### 1. 自动合并模式 (Auto Merge)
- **默认模式**: 系统启动时默认使用此模式
- **合并逻辑**: 相同内容的相邻行自动合并
- **触发条件**: 当相邻行的 `remarks` 字段内容完全相同时
- **用户操作**: 用户只需输入相同内容，系统自动检测并合并

### 2. 手动合并模式 (Manual Merge)
- **切换模式**: 用户可以通过按钮切换到手动模式
- **合并逻辑**: 每个单元格独立，不自动合并
- **触发条件**: 用户通过右键菜单手动选择合并范围
- **用户操作**: 用户需要主动选择要合并的行

## 📊 模式对比

| 特性 | 自动合并 | 手动合并 |
|------|----------|----------|
| **默认状态** | ✅ 默认启用 | ❌ 需要手动切换 |
| **合并触发** | 自动检测相同内容 | 手动选择范围 |
| **右键菜单** | 显示智能合并选项 | 显示智能合并选项 |
| **页面显示** | 自动显示合并状态 | 手动控制合并状态 |
| **PDF生成** | 使用自动合并逻辑 | 使用自动合并逻辑 |

## 🔧 技术实现

### 页面表格中的合并计算
```typescript
// 在 ItemsTable.tsx 中
const [mergeMode, setMergeMode] = useState<'auto' | 'manual'>('auto');

const mergedCells = useMemo(() => {
  const result = calculateMergedCells(data.items, mergeMode);
  return result;
}, [data.items, mergeMode]);

const calculateMergedCells = (items: LineItem[], mode: 'auto' | 'manual' = 'auto'): MergedCellInfo[] => {
  if (mode === 'manual') {
    // 手动模式：每个单元格独立
    items.forEach((item, index) => {
      mergedCells.push({
        startRow: index,
        endRow: index,
        content: item.remarks || '',
        isMerged: false
      });
    });
    return mergedCells;
  }
  
  // 自动模式：相同内容的相邻行自动合并
  // ... 自动合并逻辑
};
```

### PDF生成中的合并计算
```typescript
// 在 pdfTableGenerator.ts 中
const calculateMergedCells = (items: LineItem[]): MergedCellInfo[] => {
  // 注意：PDF生成器只使用自动合并逻辑
  // 没有 mode 参数，始终使用自动合并
  
  // 自动模式：相同内容的相邻行自动合并
  let currentStart = 0;
  let currentContent = items[0]?.remarks || '';
  
  // ... 自动合并逻辑
};
```

## 🎨 用户界面

### 模式切换按钮
```typescript
<button onClick={toggleMergeMode}>
  {mergeMode === 'auto' ? '自动合并' : '手动合并'}
</button>
```

### 合并状态指示器
```typescript
<div>
  {mergedCells.filter(cell => cell.isMerged).length}
</div>
```

## 📋 重要发现

### PDF生成的特殊性
**关键发现**: PDF生成器**始终使用自动合并逻辑**，不管页面当前是什么模式！

```typescript
// PDF生成器中的合并计算
const calculateMergedCells = (items: LineItem[]): MergedCellInfo[] => {
  // 没有 mode 参数，始终使用自动合并
  // 这意味着即使页面是手动模式，PDF仍然会按自动合并逻辑生成
};
```

### 实际行为
1. **页面显示**: 根据当前模式（自动/手动）显示合并状态
2. **PDF生成**: 始终使用自动合并逻辑，忽略页面模式
3. **用户体验**: 可能造成页面和PDF的合并状态不一致

## ⚠️ 潜在问题

### 不一致性问题
- **场景**: 用户在手动模式下手动合并了某些行
- **页面显示**: 显示手动合并的结果
- **PDF生成**: 仍然按自动合并逻辑生成，可能显示不同的合并状态
- **结果**: 页面和PDF的合并状态不一致

### 解决方案建议

#### 方案1: 统一PDF逻辑
```typescript
// 修改PDF生成器，接受mergeMode参数
const calculateMergedCells = (items: LineItem[], mode: 'auto' | 'manual' = 'auto'): MergedCellInfo[] => {
  if (mode === 'manual') {
    // 手动模式逻辑
  }
  // 自动模式逻辑
};
```

#### 方案2: 传递页面合并状态
```typescript
// 将页面的合并状态传递给PDF生成器
export const generateTableConfig = (
  data: QuotationData,
  doc: ExtendedJsPDF,
  currentY: number,
  margin: number,
  pageWidth: number,
  mode: 'preview' | 'export' = 'export',
  visibleCols?: string[],
  mergeMode?: 'auto' | 'manual' // 新增参数
): UserOptions => {
  // 使用传入的mergeMode
};
```

## 🚀 建议

### 当前状态
- **页面**: 支持自动和手动两种模式
- **PDF**: 只支持自动合并逻辑
- **一致性**: 存在不一致的风险

### 推荐改进
1. **统一逻辑**: 让PDF生成器也支持手动合并模式
2. **状态传递**: 将页面的合并模式传递给PDF生成器
3. **用户提示**: 在手动模式下生成PDF时给出提示

### 临时解决方案
- 在手动模式下生成PDF前，提示用户切换到自动模式
- 或者在PDF预览中显示"基于自动合并逻辑生成"的提示

## 📝 总结

1. **两种模式确实存在**: 自动合并和手动合并
2. **PDF生成有特殊性**: 始终使用自动合并逻辑
3. **存在一致性问题**: 页面和PDF可能显示不同的合并状态
4. **需要改进**: 建议统一PDF生成逻辑，支持手动合并模式

