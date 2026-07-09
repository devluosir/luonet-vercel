# 订单确认转装箱单 - 合并单元格处理说明

## 功能概述

在将订单确认转换为装箱单时，系统会自动处理合并的单元格信息，特别是描述列的合并。这个功能确保了从订单确认到装箱单的数据转换过程中不会丢失任何合并单元格的信息。

## 合并单元格处理机制

### 1. 描述列合并处理

```typescript
// 1. 首先创建合并描述的映射
const mergedDescriptions = new Map<number, string>();

// 2. 遍历所有合并信息
for (const merge of confirmationData.mergedDescriptions) {
  // 3. 为每个受影响的行设置合并内容
  for (let i = merge.startRow; i <= merge.endRow; i++) {
    mergedDescriptions.set(i, merge.content);
  }
}

// 4. 在转换商品项时使用合并内容
const mergedDescription = mergedDescriptions.get(index);
description: mergedDescription || item.description || '',
```

### 2. 自动合并模式

```typescript
autoMergedCells: {
  marks: confirmationData.mergedDescriptions?.map(merge => ({
    startRow: merge.startRow,
    endRow: merge.endRow,
    content: merge.content,
    isMerged: true
  })) || []
}
```

### 3. 高亮状态处理

```typescript
highlight: {
  description: item.highlight?.description || (mergedDescription ? true : false)
}
```

## 数据流转示例

### 订单确认中的合并单元格

```typescript
// 订单确认数据
{
  items: [
    { description: "Item 1" },
    { description: "Item 2" },
    { description: "Item 3" }
  ],
  mergedDescriptions: [
    {
      startRow: 0,
      endRow: 1,
      content: "Merged Description 1-2"
    }
  ]
}
```

### 转换后的装箱单数据

```typescript
// 装箱单数据
{
  items: [
    { description: "Merged Description 1-2" },  // 行 0
    { description: "Merged Description 1-2" },  // 行 1
    { description: "Item 3" }                   // 行 2
  ],
  autoMergedCells: {
    marks: [
      {
        startRow: 0,
        endRow: 1,
        content: "Merged Description 1-2",
        isMerged: true
      }
    ]
  }
}
```

## 使用场景

### 1. 简单合并

- **订单确认**：两行使用相同的描述
- **装箱单**：自动保持相同的合并状态

### 2. 多段合并

- **订单确认**：多个不同的合并区域
- **装箱单**：每个合并区域都被正确保留

### 3. 混合内容

- **订单确认**：同时包含合并和未合并的单元格
- **装箱单**：保持原有的合并状态，未合并的单元格保持独立

## 注意事项

### 1. 优先级

1. 合并的描述内容优先
2. 原始描述内容其次
3. 空字符串作为默认值

### 2. 高亮处理

- 保留原有的高亮状态
- 合并单元格自动添加高亮
- 可以在装箱单中修改高亮状态

### 3. 限制

- 不支持跨列合并
- 合并区域必须连续
- 起始行号必须小于结束行号

## 最佳实践

### 1. 数据准备

```typescript
// 推荐的合并格式
const mergedDescription = {
  startRow: 0,
  endRow: 2,
  content: "Detailed description for multiple items"
};
```

### 2. 验证步骤

1. 检查合并区域是否有效
2. 确认内容不为空
3. 验证行号范围合理

### 3. 错误处理

```typescript
// 处理异常情况
if (endRow < startRow) {
  throw new Error("Invalid merge range");
}

if (!content.trim()) {
  throw new Error("Merge content cannot be empty");
}
```

## 调试信息

### 1. 控制台输出

```typescript
console.log('合并信息:', {
  totalMerges: mergedDescriptions.size,
  mergeRanges: confirmationData.mergedDescriptions,
  affectedRows: Array.from(mergedDescriptions.keys())
});
```

### 2. 验证检查点

- [ ] 合并区域正确映射
- [ ] 高亮状态正确设置
- [ ] 自动合并模式生效
- [ ] 原始数据完整保留

## 常见问题

### Q1: 为什么某些合并没有生效？

**A**: 检查以下几点：
1. 合并区域是否有效
2. 行号是否在范围内
3. 内容是否不为空

### Q2: 高亮状态不正确？

**A**: 确认：
1. 原始高亮是否正确
2. 合并是否成功
3. 是否有冲突的高亮设置

### Q3: 如何修改合并的内容？

**A**: 在装箱单编辑页面：
1. 直接编辑合并单元格
2. 系统会自动更新所有相关单元格
3. 保存时会更新合并信息

## 未来改进

### 1. 短期计划

- [ ] 支持部分合并的编辑
- [ ] 添加合并预览功能
- [ ] 优化高亮处理

### 2. 中期计划

- [ ] 支持跨列合并
- [ ] 添加合并模板
- [ ] 批量合并工具

### 3. 长期计划

- [ ] AI辅助合并建议
- [ ] 高级合并规则
- [ ] 自动合并优化

## 相关文档

- [订单确认转装箱单功能](./CONFIRMATION_TO_PACKING_CONVERSION.md)
- [装箱单数据结构](../core/PACKING_DATA_STRUCTURE.md)
- [合并单元格最佳实践](../core/MERGE_CELLS_BEST_PRACTICES.md)

## 变更记录

### [1.1.0] - 2025-10-25

- 添加了合并单元格的自动处理
- 优化了高亮状态的处理
- 改进了合并内容的映射逻辑

### [1.0.0] - 2025-10-25

- 初始实现合并单元格的基本处理
