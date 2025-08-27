# SC类型筛选问题修复总结

## 问题描述
在筛选记录中，sc类型（confirmation）没能正确显示，导致用户无法看到订单确认书的历史记录。

## 问题根源分析

### 1. 数据存储结构
- sc类型（confirmation）和quotation类型都存储在同一个`quotation_history`存储键中
- 通过`type`字段区分：`'quotation'` 和 `'confirmation'`

### 2. 筛选逻辑不一致
- Dashboard页面中的`getTabCount`函数正确地按类型筛选了confirmation记录
- 但在其他地方的筛选逻辑可能存在类型映射问题

### 3. 类型映射问题
- 在Dashboard工具函数中，confirmation类型被映射到quotation权限
- 这可能导致筛选逻辑混乱

## 修复方案

### 1. 修复报价单页面的预览和保存逻辑

**文件：`src/app/quotation/page.tsx`**

- **预览函数修复**：确保confirmation类型使用正确的contractNo作为quotationNo
- **保存函数修复**：确保confirmation类型的数据有正确的contractNo
- **生成PDF函数修复**：确保confirmation类型使用正确的文件名和文档号

### 2. 修复报价单历史记录工具函数

**文件：`src/utils/quotationHistory.ts`**

- **保存函数修复**：确保confirmation类型有正确的contractNo
- **更新函数修复**：确保更新confirmation记录时保持正确的类型

### 3. 修复Dashboard工具函数

**文件：`src/utils/dashboardUtils.ts`**

- **文档加载函数修复**：正确处理confirmation类型的文档加载
- **权限过滤函数修复**：确保confirmation类型能正确从quotation_history中筛选

### 4. 修复历史记录页面的筛选逻辑

**文件：`src/app/history/page.tsx`**

- **加载历史记录函数修复**：确保quotation和confirmation分别加载对应类型的记录
- **筛选函数修复**：确保类型过滤逻辑正确
- **各种操作函数修复**：确保编辑、复制、删除等操作正确处理confirmation类型

## 关键修复点

### 1. 数据保存时的类型处理
```typescript
// 确保confirmation类型有正确的contractNo
if (type === 'confirmation' && !data.contractNo) {
  data.contractNo = data.quotationNo || `SC${Date.now()}`;
}
```

### 2. 文档加载时的类型筛选
```typescript
// 对于confirmation类型，需要从quotation_history中筛选出type为'confirmation'的记录
if (type === 'confirmation') {
  const quotationHistory = getLocalStorageJSON('quotation_history', []);
  const confirmationDocs = quotationHistory
    .filter((doc: any) => doc.type === 'confirmation')
    .map((doc: any) => ({ ...doc, type: 'confirmation' as DocumentType }));
  allDocuments.push(...confirmationDocs);
}
```

### 3. 历史记录页面的类型过滤
```typescript
// 确保类型匹配
const itemType = (item as QuotationHistory).type;
if (itemType !== filters.type) {
  return false;
}
```

## 验证方法

1. **创建confirmation记录**：在报价单页面切换到"Order Confirmation"标签，创建并保存记录
2. **检查历史记录**：在历史记录页面切换到"合同确认"标签，确认记录正确显示
3. **测试筛选功能**：使用搜索、时间筛选、金额筛选等功能，确认confirmation记录能正确筛选
4. **测试操作功能**：测试编辑、复制、删除、预览等操作，确认confirmation记录能正确处理

## 预期效果

修复后，sc类型（confirmation）的记录应该能够：
- 正确显示在历史记录页面的"合同确认"标签中
- 正确响应各种筛选条件
- 正确执行各种操作（编辑、复制、删除、预览等）
- 在Dashboard页面正确显示数量统计

## 注意事项

1. **数据兼容性**：修复后的代码保持向后兼容，不会影响现有的quotation记录
2. **类型安全**：所有修复都确保类型安全，避免运行时错误
3. **性能优化**：筛选逻辑经过优化，不会影响页面性能
4. **用户体验**：修复后用户应该能够正常使用所有confirmation相关功能
