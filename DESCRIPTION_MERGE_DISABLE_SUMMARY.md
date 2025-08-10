# Description列合并单元格功能禁用记录

## 问题背景

### 原始问题
用户反馈description列被错误地识别了单位值，导致description字段为空，而单位值被错误地显示在description列中。

### 问题分析
从日志和代码分析发现，问题出现在解析阶段：
1. **解析逻辑错误**：在`quickSmartParse.ts`的特殊匹配逻辑中，description字段被设置为空字符串
2. **列映射错误**：`colMap.description`和`colMap.partName`都指向了同一列（索引0）
3. **字段设置逻辑错误**：当有序号列时，name和description都从同一列获取数据

### 用户决策
用户决定先移除description列的合并单元格需求，后续再根据明确的需求来推进。

## 禁用过程

### 1. ItemsTable.tsx 修改

#### 1.1 禁用mergedDescriptionCells自动合并逻辑
```typescript
// 修改前
const mergedDescriptionCells = useMemo(() => {
  if (mergedDescriptions.length > 0) {
    if (process.env.NODE_ENV === 'development') console.log('[ItemsTable] 使用解析器描述合并:', mergedDescriptions);
    return mergedDescriptions.map((m) => ({ startRow: m.startRow, endRow: m.endRow, content: m.content, isMerged: true }));
  }
  if (process.env.NODE_ENV === 'development') console.log('[ItemsTable] 描述列严格模式：解析器未提供合并，不进行自动合并');
  return [];
}, [mergedDescriptions]);

// 修改后
const mergedDescriptionCells = useMemo(() => {
  // 暂时禁用description列的合并单元格功能
  if (process.env.NODE_ENV === 'development') console.log('[ItemsTable] Description合并单元格功能已禁用');
  return [];
}, [mergedDescriptions]);
```

#### 1.2 禁用右键菜单合并功能
```typescript
// 修改前
const handleContextMenu = (e: React.MouseEvent, rowIndex: number, column?: 'description' | 'remarks') => {
  e.preventDefault();
  setContextMenu({ visible: true, x: e.clientX, y: e.clientY, rowIndex, column });
};

// 修改后
const handleContextMenu = (e: React.MouseEvent, rowIndex: number, column?: 'description' | 'remarks') => {
  // 暂时禁用description列的右键菜单合并功能
  if (column === 'description') {
    return;
  }
  e.preventDefault();
  setContextMenu({ visible: true, x: e.clientX, y: e.clientY, rowIndex, column });
};
```

#### 1.3 禁用合并模式切换功能
```typescript
// 修改前
useEffect(() => onDescriptionMergeModeChange?.(descriptionMergeMode), [descriptionMergeMode, onDescriptionMergeModeChange]);

// 修改后
// 暂时禁用description列的合并模式切换功能
// useEffect(() => onDescriptionMergeModeChange?.(descriptionMergeMode), [descriptionMergeMode, onDescriptionMergeModeChange]);
```

#### 1.4 禁用合并相关的useEffect
```typescript
// 修改前
useEffectOncePerChange(`${descKey}|${descriptionMergeMode}`, () => {
  if (process.env.NODE_ENV === 'development') {
    if (descriptionMergeMode === 'auto' && mergedDescriptions.length === 0) {
      console.log('[ItemsTable] Description自动合并单元格:', mergedDescriptionCells);
    } else if (manualMergedCells.description.length > 0) {
      console.log('[ItemsTable] Description手动合并单元格:', mergedDescriptionCells);
    }
  }
});

// 修改后
// 暂时禁用description列合并相关的useEffect
// useEffectOncePerChange(`${descKey}|${descriptionMergeMode}`, () => {
//   if (process.env.NODE_ENV === 'development') {
//     if (descriptionMergeMode === 'auto' && mergedDescriptions.length === 0) {
//       console.log('[ItemsTable] Description自动合并单元格:', mergedDescriptionCells);
//     } else if (manualMergedCells.description.length > 0) {
//       console.log('[ItemsTable] Description手动合并单元格:', mergedDescriptionCells);
//     }
//   }
// });
```

#### 1.5 禁用手动合并功能
```typescript
// 修改前
const manualMergeRows = (startRow: number, endRow: number, column: 'remarks' | 'description' = 'remarks') => {
  if (startRow === endRow) return;
  const field = column;
  const contents: string[] = [];
  for (let i = startRow; i <= endRow; i++) {
    const content = ((data.items[i] as any)?.[field] || '').trim();
    if (content) contents.push(content);
  }
  const mergedContent = contents.length > 1 ? contents.join('\n') : (contents[0] || '');

  const cell: MergedCellInfo = { startRow, endRow, content: mergedContent, isMerged: true };
  setManualMergedCells((prev) => ({ ...prev, [column]: [...prev[column], cell].sort((a, b) => a.startRow - b.startRow) }));
};

// 修改后
const manualMergeRows = (startRow: number, endRow: number, column: 'remarks' | 'description' = 'remarks') => {
  // 暂时禁用description列的手动合并功能
  if (column === 'description') {
    return;
  }
  
  if (startRow === endRow) return;
  const field = column;
  const contents: string[] = [];
  for (let i = startRow; i <= endRow; i++) {
    const content = ((data.items[i] as any)?.[field] || '').trim();
    if (content) contents.push(content);
  }
  const mergedContent = contents.length > 1 ? contents.join('\n') : (contents[0] || '');

  const cell: MergedCellInfo = { startRow, endRow, content: mergedContent, isMerged: true };
  setManualMergedCells((prev) => ({ ...prev, [column]: [...prev[column], cell].sort((a, b) => a.startRow - b.startRow) }));
};
```

#### 1.6 禁用拆分功能
```typescript
// 修改前
const splitMergedCell = (rowIndex: number) => {
  const column = contextMenu?.column || 'remarks';
  const mergedInfo =
    column === 'description'
      ? getMergedDescriptionCellInfo(rowIndex, mergedDescriptionCells)
      : getMergedCellInfo(rowIndex, mergedRemarksCells);
  if (!mergedInfo || !mergedInfo.isMerged) return;

  setManualMergedCells((prev) => ({
    ...prev,
    [column]: prev[column].filter((c) => !(c.startRow === mergedInfo.startRow && c.endRow === mergedInfo.endRow)),
  }));
  if (process.env.NODE_ENV === 'development') console.log(`拆分合并单元格，行 ${rowIndex}，列 ${column}`);
};

// 修改后
const splitMergedCell = (rowIndex: number) => {
  const column = contextMenu?.column || 'remarks';
  
  // 暂时禁用description列的拆分功能
  if (column === 'description') {
    return;
  }
  
  // 由于description列已禁用，这里只处理remarks列
  const mergedInfo = getMergedCellInfo(rowIndex, mergedRemarksCells);
  if (!mergedInfo || !mergedInfo.isMerged) return;

  setManualMergedCells((prev) => ({
    ...prev,
    [column]: prev[column].filter((c) => !(c.startRow === mergedInfo.startRow && c.endRow === mergedInfo.endRow)),
  }));
  if (process.env.NODE_ENV === 'development') console.log(`拆分合并单元格，行 ${rowIndex}，列 ${column}`);
};
```

#### 1.7 禁用mergeToRow功能
```typescript
// 修改前
const mergeToRow = (startRow: number, endRow: number) => {
  const column = contextMenu?.column || 'remarks';
  const rowIndex = contextMenu?.rowIndex ?? 0;
  const existing = findContainingMergedCell(rowIndex, column);
  if (existing) {
    const newStart = Math.min(existing.startRow, startRow);
    const newEnd = Math.max(existing.endRow, endRow);
    setManualMergedCells((prev) => ({
      ...prev,
      [column]: prev[column].filter((c) => !(c.startRow === existing.startRow && c.endRow === existing.endRow)),
    }));
    manualMergeRows(newStart, newEnd, column);
  } else {
    manualMergeRows(startRow, endRow, column);
  }
};

// 修改后
const mergeToRow = (startRow: number, endRow: number) => {
  const column = contextMenu?.column || 'remarks';
  
  // 暂时禁用description列的合并功能
  if (column === 'description') {
    return;
  }
  
  const rowIndex = contextMenu?.rowIndex ?? 0;
  const existing = findContainingMergedCell(rowIndex, column);
  if (existing) {
    const newStart = Math.min(existing.startRow, startRow);
    const newEnd = Math.max(existing.endRow, endRow);
    setManualMergedCells((prev) => ({
      ...prev,
      [column]: prev[column].filter((c) => !(c.startRow === existing.startRow && c.endRow === existing.endRow)),
    }));
    manualMergeRows(newStart, newEnd, column);
  } else {
    manualMergeRows(startRow, endRow, column);
  }
};
```

### 2. ColumnToggle.tsx 修改

#### 2.1 禁用合并模式切换按钮
```typescript
// 修改前
{/* 合并模式切换按钮 - 紧贴Description按钮 */}
{visibleCols.includes('description') && (
  <button
    type="button"
    onClick={toggleDescriptionMergeMode}
    className={`px-1.5 py-1 text-xs font-medium rounded-r-lg transition-all duration-200 active:scale-95 flex items-center gap-1 border-l border-current/20 ${
      descriptionMergeMode === 'auto'
        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 shadow-sm'
        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 shadow-sm'
    }`}
    title={descriptionMergeMode === 'auto' ? '切换到手动合并模式' : '切换到自动合并模式'}
  >
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M8 6l4-2 4 2M8 18l4 2 4-2M12 4v16"
      />
    </svg>
    {descriptionMergeMode === 'auto' ? '自动' : '手动'}
  </button>
)}

// 修改后
{/* 合并模式切换按钮 - 紧贴Description按钮 - 暂时禁用 */}
{/* {visibleCols.includes('description') && (
  <button
    type="button"
    onClick={toggleDescriptionMergeMode}
    className={`px-1.5 py-1 text-xs font-medium rounded-r-lg transition-all duration-200 active:scale-95 flex items-center gap-1 border-l border-current/20 ${
      descriptionMergeMode === 'auto'
        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 shadow-sm'
        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 shadow-sm'
    }`}
    title={descriptionMergeMode === 'auto' ? '切换到手动合并模式' : '切换到自动合并模式'}
  >
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M8 6l4-2 4 2M8 18l4 2 4-2M12 4v16"
      />
    </svg>
    {descriptionMergeMode === 'auto' ? '自动' : '手动'}
  </button>
)} */}
```

#### 2.2 禁用toggleDescriptionMergeMode函数
```typescript
// 修改前
const toggleDescriptionMergeMode = () => {
  const newMode = descriptionMergeMode === 'auto' ? 'manual' : 'auto';
  onDescriptionMergeModeChange?.(newMode);
};

// 修改后
// 暂时禁用description列的合并模式切换功能
// const toggleDescriptionMergeMode = () => {
//   const newMode = descriptionMergeMode === 'auto' ? 'manual' : 'auto';
//   onDescriptionMergeModeChange?.(newMode);
// };
```

### 3. quickSmartParse.ts 修改

#### 3.1 禁用mergedDescriptions生成
```typescript
// 修改前
// 分离备注和描述的合并信息
const mergedRemarks = mergedCells.filter(cell => cell.column === 'remarks');
const mergedDescriptions = mergedCells.filter(cell => cell.column === 'description');

// 修改后
// 分离备注和描述的合并信息
const mergedRemarks = mergedCells.filter(cell => cell.column === 'remarks');
// 暂时禁用description列的合并单元格检测
const mergedDescriptions: MergedCell[] = [];
```

#### 3.2 禁用description列合并检测
```typescript
// 修改前
// 检测描述列合并
i = 0;
while (i < n) {
  const desc = processed[i]?.[descCol]?.trim() ?? '';
  if (!desc) { 
    i++; 
    continue; 
  }

  const baseRawLen = rawCellCounts?.[i] ?? 0;
  let j = i + 1;

  while (j < n) {
    const nextDesc = processed[j]?.[descCol]?.trim() ?? '';

    if (nextDesc) break; // 新锚点，停止吞并

    // 检查当前行的其他列是否有服务/费用标识
    const currentRowDesc = processed[j]?.[descCol] ?? '';
    const currentRowName = processed[j]?.[0] ?? ''; // 检查名称列
    if (isServiceLike(currentRowName)) break; // 服务/费用行，视为分隔

    const rawLen = rawCellCounts?.[j] ?? baseRawLen;
    if (rawLen + 2 <= baseRawLen) break; // 结构突降，谨慎停

    j++;
  }

  if (j - i >= 2) {
    merged.push({ 
      column: 'description', 
      startRow: i, 
      endRow: j - 1, 
      content: desc 
    });
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[QuickSmartParse] 检测到描述合并块: ${i}-${j-1}, 内容: "${desc.substring(0, 50)}..."`);
    }
  }
  i = j;
}

// 修改后
// 检测描述列合并 - 暂时禁用
// i = 0;
// while (i < n) {
//   const desc = processed[i]?.[descCol]?.trim() ?? '';
//   if (!desc) { 
//     i++; 
//     continue; 
//   }

//   const baseRawLen = rawCellCounts?.[i] ?? 0;
//   let j = i + 1;

//   while (j < n) {
//     const nextDesc = processed[j]?.[descCol]?.trim() ?? '';

//     if (nextDesc) break; // 新锚点，停止吞并

//     // 检查当前行的其他列是否有服务/费用标识
//     const currentRowDesc = processed[j]?.[descCol] ?? '';
//     const currentRowName = processed[j]?.[0] ?? ''; // 检查名称列
//     if (isServiceLike(currentRowName)) break; // 服务/费用行，视为分隔

//     const rawLen = rawCellCounts?.[j] ?? baseRawLen;
//     if (rawLen + 2 <= baseRawLen) break; // 结构突降，谨慎停

//     j++;
//   }

//   if (j - i >= 2) {
//     merged.push({ 
//       column: 'description', 
//       startRow: i, 
//       endRow: j - 1, 
//       content: desc 
//     });
    
//     if (process.env.NODE_ENV === 'development') {
//       console.log(`[QuickSmartParse] 检测到描述合并块: ${i}-${j-1}, 内容: "${desc.substring(0, 50)}..."`);
//     }
//   }
//   i = j;
// }
```

## 功能状态总结

### Description列状态
- ❌ 自动合并功能：已禁用
- ❌ 手动合并功能：已禁用
- ❌ 右键菜单合并：已禁用
- ❌ 合并模式切换：已禁用
- ❌ 合并单元格检测：已禁用
- ✅ 正常显示功能：保持正常
- ✅ 正常编辑功能：保持正常

### Remarks列状态
Remarks列的合并功能保持完全正常：
- ✅ 自动合并功能：正常
- ✅ 手动合并功能：正常
- ✅ 右键菜单合并：正常
- ✅ 合并模式切换：正常

## 影响范围

### 受影响的文件
1. `src/components/quotation/ItemsTable.tsx`
2. `src/components/quotation/ColumnToggle.tsx`
3. `src/features/quotation/utils/quickSmartParse.ts`

### 受影响的组件
1. ItemsTable组件
2. ColumnToggle组件
3. 解析器相关功能

### 不受影响的功能
1. Description列的正常显示和编辑
2. Remarks列的所有合并功能
3. 其他列的正常功能

## 后续计划

1. **问题解决**：等待用户明确description列合并单元格的具体需求
2. **功能恢复**：根据明确需求重新设计和实现description列合并功能
3. **测试验证**：确保修复后的功能正常工作
4. **文档更新**：更新相关文档和注释

## 备注

- 所有禁用都是通过注释代码实现，便于后续快速恢复
- 保留了原有的代码结构，便于理解原始逻辑
- 添加了详细的注释说明禁用原因
- 确保不影响其他功能的正常使用

## 后续问题解决

### Description列显示调试信息问题

#### 问题描述
用户反馈Description列显示 `[desc=][qty=X][unit=Y]` 这种格式的内容，而不是正常的描述文本。

#### 问题分析
通过代码分析发现，问题出现在ItemsTable.tsx中的两处开发环境调试代码：

1. **第838行**：移动端视图中的调试信息
2. **第1133行**：桌面端视图中的调试信息

这些代码在开发环境下会显示调试信息，格式为 `[desc=${getDesc(item)}][qty=${item.quantity}][unit=${item.unit}]`。

#### 解决方案
移除两处调试代码：

```typescript
// 移除前（移动端视图）
{process.env.NODE_ENV === 'development' && (
  <div style={{ fontSize: 10, opacity: 0.6 }}>{`[desc=${getDesc(item)}][qty=${item.quantity}][unit=${item.unit}]`}</div>
)}

// 移除后
// 调试代码已移除
```

```typescript
// 移除前（桌面端视图）
{process.env.NODE_ENV === 'development' && (
  <div style={{ fontSize: 10, opacity: 0.6 }}>{`[desc=${getDesc(item)}][qty=${item.quantity}][unit=${item.unit}]`}</div>
)}

// 移除后
// 调试代码已移除
```

#### 修复效果
- ✅ Description列不再显示调试信息
- ✅ Description列正常显示描述内容
- ✅ 不影响其他功能

---
**记录时间**: 2025-01-08  
**记录人**: AI Assistant  
**状态**: 已完成禁用，等待后续需求明确
