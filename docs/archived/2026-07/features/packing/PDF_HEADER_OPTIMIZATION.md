# Packing模块PDF表头优化

## 功能概述

针对packing模块在显示marks列时使用横向页面模式，统一了PDF表头的大小和布局，确保横向和纵向模式的一致性。

## 主要优化

### 1. 字体大小统一
- **横向模式**: 表头字体统一为8pt
- **纵向模式**: 表头字体统一为8pt
- **表格内容**: 横向和纵向模式都使用8pt字体

### 2. 内边距统一
- **横向模式**: 上下内边距统一为1mm
- **纵向模式**: 上下内边距统一为1mm
- **左右内边距**: 保持1mm不变

### 3. 单元格高度统一
- **表头高度**: 横向和纵向模式都使用8mm
- **内容高度**: 横向和纵向模式都使用6mm
- **一致性**: 确保两种模式下的视觉效果一致

### 4. 表头文本统一
- **重量列**: 统一使用"N.W.(kg)"和"G.W.(kg)"
- **尺寸列**: 统一使用"Dimensions(mm)"
- **其他列**: 保持原有文本

## 实现细节

### 1. 表头样式统一
```typescript
// 表头样式
const headStyles = {
  fillColor: [255, 255, 255] as [number, number, number],
  textColor: [0, 0, 0] as [number, number, number],
  fontSize: 8, // 横向和纵向模式保持一致的表头字体大小
  fontStyle: 'bold' as const,
  halign: 'center' as const,
  font: 'NotoSansSC',
  valign: 'middle' as const,
  cellPadding: { top: 1, bottom: 1, left: 1, right: 1 }, // 横向和纵向模式保持一致的内边距
  minCellHeight: 8 // 横向和纵向模式保持一致的表头高度
};
```

### 2. 表格样式统一
```typescript
// 表格基础样式
const tableStyles = {
  fontSize: 8, // 横向和纵向模式保持一致的字体大小
  cellPadding: { top: 1, bottom: 1, left: 1, right: 1 }, // 横向和纵向模式保持一致的内边距
  lineColor: [0, 0, 0] as [number, number, number],
  lineWidth: 0.1,
  font: 'NotoSansSC',
  valign: 'middle' as const,
  minCellHeight: 6 // 横向和纵向模式保持一致的单元格最小高度
};
```

### 3. 表头文本统一
```typescript
// 准备表头
const headers: string[][] = [[]];
if (showMarks) headers[0].push('Marks');
headers[0].push('No.');
if (showDescription) headers[0].push('Description');
if (showHsCode) headers[0].push('HS Code');
if (showQuantity) headers[0].push('Qty');
if (showUnit) headers[0].push('Unit');
if (showUnitPrice) headers[0].push('U/Price');
if (showAmount) headers[0].push('Amount');
if (showNetWeight) headers[0].push('N.W.(kg)');
if (showGrossWeight) headers[0].push('G.W.(kg)');
if (showPackageQty) headers[0].push('Pkgs');
if (showDimensions) headers[0].push(`Dimensions(${data.dimensionUnit})`);
```

## 优化效果

### 1. 一致性
- **表头大小**: 横向和纵向模式保持一致的表头大小
- **字体统一**: 两种模式都使用8pt字体，确保可读性
- **布局统一**: 保持相同的视觉效果和用户体验

### 2. 可读性
- **字体大小**: 8pt字体在两种模式下都清晰可读
- **文本对齐**: 保持居中对齐，视觉效果良好
- **文本完整**: 保持完整的表头信息，不简化文本

### 3. 兼容性
- **模式一致**: 横向和纵向模式使用相同的样式配置
- **功能完整**: 所有功能保持不变
- **数据完整性**: 不影响数据内容的显示

## 使用场景

### 1. 横向模式统一
- 当显示marks列时，自动启用横向模式
- 表头使用与纵向模式相同的样式
- 确保两种模式下的视觉效果一致

### 2. 纵向模式统一
- 不显示marks列时，使用纵向模式
- 表头使用与横向模式相同的样式
- 确保两种模式下的视觉效果一致

## 技术实现

### 1. 统一样式
- 移除`isLandscape`条件判断
- 使用统一的字体大小和内边距
- 简化代码逻辑，提高可维护性

### 2. 性能优化
- 减少条件判断的计算
- 优化内存使用
- 提高PDF生成速度

### 3. 代码结构
- 清晰的样式定义
- 简化的逻辑结构
- 易于扩展和维护

## 更新日志

### 2025-01-08
- ✅ **PDF表头统一**: 确保横向和纵向模式下的表头大小一致
- ✅ **字体大小统一**: 横向和纵向模式都使用8pt字体
- ✅ **内边距统一**: 横向和纵向模式都使用1mm内边距
- ✅ **单元格高度统一**: 横向和纵向模式都使用相同的单元格高度
- ✅ **表头文本统一**: 横向和纵向模式使用相同的表头文本
- ✅ **代码简化**: 移除条件判断，使用统一的样式配置
