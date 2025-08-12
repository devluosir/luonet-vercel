# 历史记录预览Notes内容缺失问题修复

## 🐛 问题描述

在单据中心的报价tab中，历史记录的预览功能缺少notes内容。用户反馈预览时发现notes部分为空。

## 🔍 问题分析

### 根本原因
1. **新旧PDF生成服务不一致**：
   - 新的报价单编辑页面使用 `generatePdf` 服务，该服务会根据 `notesConfig` 来过滤和排序notes
   - 历史记录的预览功能使用旧的PDF生成函数（`generateQuotationPDF` 和 `generateOrderConfirmationPDF`），这些函数直接使用 `data.notes` 数组，不考虑 `notesConfig`

2. **数据流不一致**：
   - 保存时：`notesConfig` 被正确保存到历史记录中
   - 预览时：旧的PDF生成函数忽略 `notesConfig`，只使用可能为空的 `data.notes`

### 技术细节
```typescript
// 新的生成服务（正确）
const visibleNotes = notesConfig
  .filter(note => note.visible)
  .sort((a, b) => a.order - b.order)
  .map(note => note.content || defaultContent);

// 旧的生成函数（问题所在）
// 直接使用 data.notes，忽略 notesConfig
```

## ✅ 修复方案

### 1. 修改PDFPreviewModal组件
**文件**: `src/components/history/PDFPreviewModal.tsx`

**修改内容**：
- 将报价单和订单确认的预览从使用旧的PDF生成函数改为使用新的 `generatePdf` 服务
- 从历史记录数据中提取 `notesConfig` 并传递给生成服务
- 同时修复预览和下载功能

**关键代码**：
```typescript
if (itemType === 'quotation' || itemType === 'confirmation') {
  // 使用新的generatePdf服务来处理报价单和订单确认
  const { generatePdf } = await import('@/features/quotation/services/generate.service');
  
  // 从历史记录数据中提取notesConfig
  const quotationData = item.data as any;
  const notesConfig = quotationData.notesConfig || [];
  
  // 使用新的生成服务，传入notesConfig
  const pdfBlob = await generatePdf(
    itemType, 
    quotationData, 
    notesConfig, 
    (progress) => console.log(`PDF生成进度: ${progress}%`), 
    { mode: 'preview' }
  );
  pdfUrl = URL.createObjectURL(pdfBlob);
}
```

### 2. 确保数据完整性
**验证点**：
- 保存服务正确将 `notesConfig` 合并到历史记录数据中
- 历史记录数据结构包含 `notesConfig` 字段
- 预览时正确提取和使用 `notesConfig`

## 🧪 测试验证

### 测试步骤
1. 创建或编辑一个报价单，配置Notes内容
2. 保存报价单到历史记录
3. 在单据中心的历史记录中预览该报价单
4. 验证Notes内容是否正确显示

### 预期结果
- ✅ Notes内容在预览中正确显示
- ✅ Notes的显示/隐藏状态正确
- ✅ Notes的排序顺序正确
- ✅ 下载的PDF也包含正确的Notes内容

## 📋 影响范围

### 修复的功能
- ✅ 报价单历史记录预览
- ✅ 订单确认历史记录预览
- ✅ 报价单历史记录下载
- ✅ 订单确认历史记录下载

### 不受影响的功能
- ✅ 发票历史记录预览（使用不同的生成服务）
- ✅ 采购单历史记录预览（使用不同的生成服务）
- ✅ 装箱单历史记录预览（使用不同的生成服务）
- ✅ 报价单编辑页面的预览功能（已使用新的生成服务）

## 🔧 技术改进

### 1. 统一PDF生成服务
- 历史记录预览现在使用与编辑页面相同的PDF生成服务
- 确保预览和最终PDF的一致性

### 2. 数据流优化
- 明确 `notesConfig` 在数据流中的作用
- 确保所有PDF生成都考虑Notes配置

### 3. 代码维护性
- 减少重复的PDF生成逻辑
- 统一使用新的生成服务

## 📝 后续建议

1. **监控**：观察修复后的预览功能是否正常工作
2. **测试**：在不同设备和浏览器上测试预览功能
3. **优化**：考虑将其他文档类型的预览也统一到新的生成服务
4. **文档**：更新相关技术文档，说明Notes配置的使用方式

## 🎯 总结

通过将历史记录预览功能从旧的PDF生成函数迁移到新的 `generatePdf` 服务，成功解决了Notes内容缺失的问题。这个修复确保了：

1. **数据一致性**：预览和最终PDF使用相同的数据处理逻辑
2. **功能完整性**：Notes的自定义配置在预览中正确应用
3. **用户体验**：用户可以在历史记录中看到完整的文档内容

修复完成后，用户应该能够在单据中心的历史记录预览中看到正确的Notes内容。
