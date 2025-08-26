# Description列合并单元格功能完全取消记录

## 修改概述

根据用户需求，完全取消了报价模块中表格Description列的合并单元格功能。

## 修改内容

### 1. ItemsTable.tsx 核心修改

#### 1.1 修改shouldRenderDescriptionCell函数
```typescript
// 修改前
const shouldRenderDescriptionCell = (rowIndex: number, merged: MergedCellInfo[]) => {
  // 如果没有合并信息，直接返回true（显示所有单元格）
  if (merged.length === 0) return true;
  return merged.some((cell) => cell.startRow === rowIndex);
};

// 修改后
const shouldRenderDescriptionCell = (rowIndex: number, merged: MergedCellInfo[]) => {
  // Description列取消合并单元格功能，始终显示所有单元格
  return true;
};
```

#### 1.2 修改getMergedDescriptionCellInfo函数
```typescript
// 修改前
const getMergedDescriptionCellInfo = (rowIndex: number, merged: MergedCellInfo[]) => {
  // 如果没有合并信息，直接返回null
  if (merged.length === 0) return null;
  return merged.find((cell) => cell.startRow === rowIndex) || null;
};

// 修改后
const getMergedDescriptionCellInfo = (rowIndex: number, merged: MergedCellInfo[]) => {
  // Description列取消合并单元格功能，始终返回null
  return null;
};
```

#### 1.3 修改桌面端表格渲染
```typescript
// 修改前
{effectiveVisibleCols.includes('description') && shouldRenderDescriptionCell(index, mergedDescriptionCells) && (
  <td
    data-probe={`desc@row${index}`}
    className={`px-2 py-2 transition-all duration-300 ease-in-out ${
      descIsMerged ? 'bg-blue-50/50 dark:bg-blue-900/20 shadow-sm border-l-2 border-l-blue-200 dark:border-l-blue-300' : ''
    }`}
    rowSpan={descIsMerged ? descRowSpan : undefined}
    onContextMenu={(e) => handleContextMenu(e, index, 'description')}
  >
    <AutoGrowTextarea
      value={descIsMerged ? (descMergedInfo?.content || '') : getDesc(item)}
      onChange={(e) => handleTextareaChange(e, index, descIsMerged, descMergedInfo, 'description')}
      onDoubleClick={() => handleDoubleClick(index, 'description')}
      isDarkMode={isDarkMode}
      onFocusIOS={onFocusIOS}
      className={`${item.highlight?.description ? highlightClass : ''} ${descIsMerged ? 'border-blue-200 dark:border-blue-700' : ''}`}
      title=""
    />
  </td>
)}

// 修改后
{effectiveVisibleCols.includes('description') && (
  <td
    data-probe={`desc@row${index}`}
    className="px-2 py-2 transition-all duration-300 ease-in-out"
  >
    <AutoGrowTextarea
      value={getDesc(item)}
      onChange={(e) => handleTextareaChange(e, index, false, null, 'description')}
      onDoubleClick={() => handleDoubleClick(index, 'description')}
      isDarkMode={isDarkMode}
      onFocusIOS={onFocusIOS}
      className={`${item.highlight?.description ? highlightClass : ''}`}
      title=""
    />
  </td>
)}
```

#### 1.4 修改移动端卡片渲染
```typescript
// 修改前
{effectiveVisibleCols.includes('description') && shouldRenderDescriptionCell(index, mergedDescriptionCells) && (
  <div data-probe={`desc@row${index}`}>
    <label className="block text-xs font-medium text-[#86868B] dark:text-[#86868B] mb-1">Description</label>
    <AutoGrowTextarea
      value={descIsMerged ? (descMergedInfo?.content || '') : getDesc(item)}
      onChange={(e) => handleTextareaChange(e, index, descIsMerged, descMergedInfo, 'description')}
      onDoubleClick={() => handleDoubleClick(index, 'description')}
      isDarkMode={isDarkMode}
      onFocusIOS={onFocusIOS}
      className={`${item.highlight?.description ? highlightClass : ''} ${descIsMerged ? 'border-blue-200 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/20' : ''} border rounded-lg py-2`}
      placeholder="Enter description..."
    />
  </div>
)}

// 修改后
{effectiveVisibleCols.includes('description') && (
  <div data-probe={`desc@row${index}`}>
    <label className="block text-xs font-medium text-[#86868B] dark:text-[#86868B] mb-1">Description</label>
    <AutoGrowTextarea
      value={getDesc(item)}
      onChange={(e) => handleTextareaChange(e, index, false, null, 'description')}
      onDoubleClick={() => handleDoubleClick(index, 'description')}
      isDarkMode={isDarkMode}
      onFocusIOS={onFocusIOS}
      className={`${item.highlight?.description ? highlightClass : ''} border rounded-lg py-2`}
      placeholder="Enter description..."
    />
  </div>
)}
```

#### 1.5 移除合并相关的变量和逻辑
```typescript
// 移除合并信息计算
// const descMergedInfo = getMergedDescriptionCellInfo(index, mergedDescriptionCells);
// const descRowSpan = descMergedInfo ? descMergedInfo.endRow - descMergedInfo.startRow + 1 : 1;
// const descIsMerged = !!descMergedInfo?.isMerged;

// 简化为
const descIsMerged = false;
```

### 2. PDF生成器修改

#### 2.1 修改pdfTableGenerator.ts
```typescript
// 修改shouldRenderDescriptionCell函数
const shouldRenderDescriptionCell = (rowIndex: number, mergedCells: MergedCellInfo[]): boolean => {
  // Description列取消合并单元格功能，始终显示所有单元格
  return true;
};

// 修改getMergedDescriptionCellInfo函数
const getMergedDescriptionCellInfo = (rowIndex: number, mergedCells: MergedCellInfo[]): MergedCellInfo | null => {
  // Description列取消合并单元格功能，始终返回null
  return null;
};

// 修改Description列渲染逻辑
// 修改前
if (showDescription && shouldRenderDescriptionCell(index, mergedDescriptionCells)) {
  const mergedInfo = getMergedDescriptionCellInfo(index, mergedDescriptionCells);
  const rowSpan = mergedInfo ? mergedInfo.endRow - mergedInfo.startRow + 1 : 1;
  const isMerged = mergedInfo?.isMerged || false;
  
  row.splice(2, 0, {
    content: mergedInfo?.content || '',
    rowSpan: isMerged ? rowSpan : undefined,
    styles: {
      halign: 'center' as const,
      ...(item.highlight?.description ? { textColor: [255, 0, 0] } : {})
    }
  });
}

// 修改后
if (showDescription) {
  row.splice(2, 0, {
    content: item.description || '',
    styles: {
      halign: 'center' as const,
      ...(item.highlight?.description ? { textColor: [255, 0, 0] } : {})
    }
  });
}
```

### 3. 已存在的禁用功能

以下功能在之前的修改中已经被禁用，本次修改保持禁用状态：

#### 3.1 右键菜单合并功能
```typescript
const handleContextMenu = (e: React.MouseEvent, rowIndex: number, column?: 'description' | 'remarks') => {
  // 暂时禁用description列的右键菜单合并功能
  if (column === 'description') {
    return;
  }
  e.preventDefault();
  setContextMenu({ visible: true, x: e.clientX, y: e.clientY, rowIndex, column });
};
```

#### 3.2 合并模式切换功能
```typescript
// 暂时禁用description列的合并模式切换功能
// useEffect(() => onDescriptionMergeModeChange?.(descriptionMergeMode), [descriptionMergeMode, onDescriptionMergeModeChange]);
```

#### 3.3 列切换组件中的合并按钮
```typescript
// 合并模式切换按钮 - 紧贴Description按钮 - 暂时禁用
// {visibleCols.includes('description') && (
//   <button
//     type="button"
//     onClick={toggleDescriptionMergeMode}
//     ...
//   >
//     ...
//   </button>
// )}
```

## 修改效果

### 1. 功能变化
- **Description列不再支持合并单元格**：每行都显示独立的Description内容
- **移除合并相关的视觉样式**：不再显示蓝色背景、边框等合并单元格的特殊样式
- **移除右键菜单合并选项**：Description列不再支持右键菜单的合并操作
- **移除合并模式切换**：Description列不再支持自动/手动合并模式切换

### 2. 用户体验
- **更简单的操作**：Description列现在就像普通的文本输入框一样简单
- **更清晰的数据展示**：每行的Description内容独立显示，不会因为合并而隐藏
- **更一致的界面**：Description列与其他列（如Part Name）的交互方式保持一致

### 3. 技术实现
- **代码简化**：移除了大量合并单元格相关的复杂逻辑
- **性能提升**：减少了合并计算的开销
- **维护性提升**：代码结构更清晰，更容易维护

## 验证结果

- ✅ **构建成功**：`npm run build` 通过，无TypeScript错误
- ✅ **功能完整**：Description列正常显示和编辑
- ✅ **界面一致**：桌面端和移动端都正常工作
- ✅ **PDF导出**：Description列在PDF中正常显示

## 总结

本次修改完全取消了报价模块中Description列的合并单元格功能，使Description列回归到简单的文本输入模式。修改涉及了表格渲染、PDF生成、移动端布局等多个方面，确保了功能的一致性和完整性。用户现在可以像编辑其他列一样简单地编辑Description列，无需考虑复杂的合并逻辑。
