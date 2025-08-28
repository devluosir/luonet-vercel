# 历史记录预览列显示同步修复报告

## 🐛 问题描述

用户发现在单据中心模块中，预览功能里的列显示存在问题：
**不同的单据，它在保存时的列显示，在预览其他单据时，它会乱**

## 🔍 根因分析

### 问题根源
历史记录预览时，PDF生成使用的是**当前页面的列显示设置**，而不是**保存时的列显示设置**。

### 技术细节
1. **保存时**：单据的列显示设置保存在 `localStorage` 中（如 `qt.visibleCols`、`pk.visibleCols`）
2. **预览时**：PDF生成器读取的是**当前页面**的 `localStorage` 设置，而不是**保存时**的设置
3. **结果**：如果用户在预览其他单据时，当前页面的列设置与保存时不同，就会导致列显示混乱

### 问题位置
- `src/utils/quotationPdfGenerator.ts` 第47-51行
- `src/utils/orderConfirmationPdfGenerator.ts` 第114行
- `src/utils/packingPdfGenerator.ts` 第150行

```typescript
// 问题代码：读取当前页面的列显示设置
let visibleCols: string[] | undefined;
if (typeof window !== 'undefined') {
  visibleCols = getLocalStorageJSON('qt.visibleCols', []);
}
```

## ✅ 解决方案

### 修改思路
让历史记录预览功能使用**保存时的列显示设置**，而不是当前的页面设置。

### 技术实现

#### 1. 修改历史记录保存逻辑
**文件**: `src/utils/quotationHistory.ts`、`src/utils/packingHistory.ts`

**修改内容**：
- 在保存历史记录时，将当前的列显示设置也保存到历史记录中
- 使用 `savedVisibleCols` 字段存储保存时的列显示设置

```typescript
// 🆕 获取当前的列显示设置
let savedVisibleCols: string[] | null = null;
if (typeof window !== 'undefined') {
  try {
    savedVisibleCols = getLocalStorageJSON('qt.visibleCols', null);
  } catch (e) {
    console.warn('Failed to read table column preferences:', e);
  }
}

// 🆕 将列显示设置添加到数据中
const dataWithVisibleCols = {
  ...data,
  savedVisibleCols
};
```

#### 2. 修改PDF生成器
**文件**: 
- `src/utils/quotationPdfGenerator.ts`
- `src/utils/orderConfirmationPdfGenerator.ts`
- `src/utils/packingPdfGenerator.ts`

**修改内容**：
- 添加 `savedVisibleCols` 参数
- 优先使用保存时的列显示设置，如果没有则回退到当前的localStorage设置

```typescript
export const generateQuotationPDF = async (
  // ... 其他参数
  savedVisibleCols?: string[] // 🆕 新增：保存时的列显示设置
): Promise<Blob> => {
  // 🆕 优先使用保存时的列显示设置，如果没有则使用当前的localStorage设置
  if (savedVisibleCols) {
    visibleCols = savedVisibleCols;
  } else if (typeof window !== 'undefined') {
    visibleCols = getLocalStorageJSON('qt.visibleCols', []);
  }
}
```

#### 3. 修改PDF生成服务
**文件**: `src/features/quotation/services/generate.service.ts`

**修改内容**：
- 添加 `savedVisibleCols` 参数支持
- 将保存时的列显示设置传递给PDF生成器

```typescript
export const generatePdf = async (
  // ... 其他参数
  opts?: { 
    // ... 其他选项
    savedVisibleCols?: string[]; // 🆕 新增：保存时的列显示设置
  }
): Promise<Blob> => {
  // 传递列偏好到表格配置
  return await generateQuotationPDF(
    dataWithConfiguredNotes, 
    opts?.mode === 'preview' ? 'preview' : 'export', 
    opts?.descriptionMergeMode,
    opts?.remarksMergeMode,
    opts?.manualMergedCells,
    opts?.savedVisibleCols // 🆕 传递保存时的列显示设置
  );
}
```

#### 4. 修改历史记录预览功能
**文件**: `src/components/history/PDFPreviewModal.tsx`

**修改内容**：
- 从历史记录数据中提取保存时的列显示设置
- 将保存时的列显示设置传递给PDF生成服务

```typescript
// 🆕 从历史记录数据中提取保存时的列显示设置
const savedVisibleCols = quotationData.savedVisibleCols || null;

// 使用新的生成服务，传入notesConfig和保存时的列显示设置
const pdfBlob = await generatePdf(
  itemType, 
  quotationData, 
  notesConfig, 
  (progress) => {
    console.log(`PDF生成进度: ${progress}%`);
  }, 
  { 
    mode: 'preview',
    savedVisibleCols // 🆕 传递保存时的列显示设置
  }
);
```

## ✅ 修复效果

### 修复前 ❌
```
用户操作流程：
1. 创建单据A，设置列显示为 [partName, quantity, unit]
2. 保存单据A
3. 创建单据B，设置列显示为 [partName, description, quantity, unit]
4. 预览单据A
结果：单据A的PDF显示 [partName, description, quantity, unit] ❌
```

### 修复后 ✅
```
用户操作流程：
1. 创建单据A，设置列显示为 [partName, quantity, unit]
2. 保存单据A（同时保存列显示设置）
3. 创建单据B，设置列显示为 [partName, description, quantity, unit]
4. 预览单据A
结果：单据A的PDF显示 [partName, quantity, unit] ✅
```

## 🎯 影响范围

### 支持的模块
- ✅ **报价单**: 完全支持保存时的列显示设置
- ✅ **订单确认**: 完全支持保存时的列显示设置
- ✅ **装箱单**: 完全支持保存时的列显示设置

### 功能覆盖
- ✅ **预览功能**: 使用保存时的列显示设置
- ✅ **下载功能**: 使用保存时的列显示设置
- ✅ **历史记录**: 自动保存和恢复列显示设置

## 🔄 兼容性保障

- ✅ **向后兼容**: 旧的历史记录没有 `savedVisibleCols` 字段时，使用当前的localStorage设置
- ✅ **渐进增强**: 新的历史记录自动包含列显示设置
- ✅ **错误容错**: localStorage读取失败时优雅降级
- ✅ **数据完整性**: 保存时的列显示设置与单据数据一起保存

## 🧪 测试场景

### 1. 基本功能测试
1. 创建报价单，设置特定的列显示
2. 保存报价单
3. 修改当前页面的列显示设置
4. 预览保存的报价单
5. 验证PDF显示的列与保存时一致

### 2. 多单据测试
1. 创建多个不同列显示设置的单据
2. 保存所有单据
3. 在不同列显示设置下预览各个单据
4. 验证每个单据的PDF都显示保存时的列设置

### 3. 兼容性测试
1. 预览没有 `savedVisibleCols` 字段的旧历史记录
2. 验证使用当前的localStorage设置
3. 保存新的历史记录
4. 验证包含 `savedVisibleCols` 字段

## 🎉 用户体验提升

1. **真正的历史记录**: 预览时看到的是保存时的状态，而不是当前页面的状态
2. **操作一致性**: 保存时的设置与预览时的显示完全一致
3. **消除困惑**: 不再有"预览结果与保存时不一致"的问题
4. **数据完整性**: 历史记录包含完整的显示设置信息

## 📋 修改文件清单

### 核心修改
- `src/utils/quotationHistory.ts` - 保存时包含列显示设置
- `src/utils/packingHistory.ts` - 保存时包含列显示设置
- `src/utils/quotationPdfGenerator.ts` - 支持保存时的列显示设置
- `src/utils/orderConfirmationPdfGenerator.ts` - 支持保存时的列显示设置
- `src/utils/packingPdfGenerator.ts` - 支持保存时的列显示设置
- `src/features/quotation/services/generate.service.ts` - 传递保存时的列显示设置
- `src/components/history/PDFPreviewModal.tsx` - 使用保存时的列显示设置
- `src/features/packing/components/PackingForm.tsx` - 移除全局列显示设置修改

这个修复彻底解决了历史记录预览中列显示混乱的问题，确保用户看到的PDF与保存时的状态完全一致！🎯
