# PDF询价号码显示位置修复

## 🐛 问题描述

用户反馈报价页生成的PDF中没有了询价号码（Inquiry No.）。经过检查发现，询价号码在PDF中的显示位置不正确。

## 🔍 问题分析

### 根本原因
1. **显示位置错误**：询价号码被错误地放置在右上角信息区域
2. **正确位置缺失**：询价号码应该显示在客户信息区域的下方，而不是右上角
3. **布局不一致**：与标准商业文档格式不符

### 标准布局要求
- **右上角信息区域**：应包含 Quotation No./Contract No.、Date、From、Currency
- **客户信息区域**：应包含 To 和 Inquiry No.
- **询价号码位置**：应显示在客户信息（To）的下方

## ✅ 修复方案

### 1. 修改报价单PDF生成器
**文件**: `src/utils/quotationPdfGenerator.ts`

**修改内容**：
- 从右上角信息区域移除 Inquiry No.
- 在客户信息区域（To 下方）添加 Inquiry No. 显示
- 调整右上角信息区域的布局

**修改前**：
```typescript
// 右上角信息区域
// Quotation No.
// Inquiry No.  ← 错误位置
// Date
// From
// Currency
```

**修改后**：
```typescript
// 右上角信息区域
// Quotation No.
// Date
// From
// Currency

// 客户信息区域
// To: [客户信息]
// Inquiry No.: [询价号码]  ← 正确位置
```

### 2. 修改订单确认PDF生成器
**文件**: `src/utils/orderConfirmationPdfGenerator.ts`

**修改内容**：
- 从右上角信息区域移除 Inquiry No.
- 在客户信息区域（To 下方）添加 Inquiry No. 显示
- 保持与报价单PDF一致的布局

**修改前**：
```typescript
// 右上角信息区域
// Contract No.
// Inquiry No.  ← 错误位置
// Date
// From
// Currency
```

**修改后**：
```typescript
// 右上角信息区域
// Contract No.
// Date
// From
// Currency

// 客户信息区域
// To: [客户信息]
// Inquiry No.: [询价号码]  ← 正确位置
```

## 🧪 测试验证

### 测试步骤
1. 创建或编辑一个报价单，填写询价号码
2. 生成报价单PDF
3. 检查询价号码是否显示在正确位置
4. 创建订单确认PDF
5. 检查询价号码是否显示在正确位置

### 预期结果
- ✅ 询价号码显示在客户信息区域下方
- ✅ 右上角信息区域布局正确
- ✅ 报价单和订单确认PDF布局一致
- ✅ 询价号码内容正确显示

## 📋 影响范围

### 修复的功能
- ✅ 报价单PDF生成
- ✅ 订单确认PDF生成
- ✅ 历史记录预览功能（通过新的生成服务）

### 布局改进
- ✅ 符合标准商业文档格式
- ✅ 信息层次更清晰
- ✅ 用户体验更佳

## 🔧 技术细节

### 布局调整
```typescript
// 客户信息区域布局
doc.text('To:', leftMargin, currentY);
// ... 处理To字段的多行文本 ...

// Inquiry No. 区域 - 增加更多间距避免重叠
currentY += 8; // 增加与To字段的间距
const inquiryLabelWidth = doc.getTextWidth('Inquiry No.: ');
doc.text('Inquiry No.:', leftMargin, currentY);
doc.setTextColor(0, 0, 255); // 设置文字颜色为蓝色
doc.text(data.inquiryNo || '', leftMargin + inquiryLabelWidth, currentY);
doc.setTextColor(0, 0, 0); // 恢复文字颜色为黑色
currentY += 8; // 增加与后续内容的间距

currentY = Math.max(currentY + 8, startY + 25); // 增加最小起始位置
```

### 间距和样式优化
- 在To字段和Inquiry No.之间添加8mm间距，避免重叠
- 在Inquiry No.和后续内容之间添加8mm间距，确保清晰分离
- 增加最小起始位置从20mm到25mm，确保有足够空间
- 使用正确的标签宽度计算，避免标题与内容重叠
- 将询价号码内容设置为蓝色，增强视觉区分
- 确保整体布局美观且信息层次清晰

## 📝 后续建议

1. **验证**：在不同设备和浏览器上测试PDF生成
2. **文档**：更新相关技术文档，说明PDF布局规范
3. **一致性**：确保其他文档类型的布局也符合标准
4. **用户体验**：收集用户反馈，进一步优化布局

## 🎯 总结

通过将询价号码从右上角信息区域移动到客户信息区域下方，成功修复了PDF布局问题。这个修复确保了：

1. **标准合规**：符合商业文档的标准格式
2. **信息清晰**：询价号码与客户信息关联更紧密
3. **布局一致**：报价单和订单确认PDF使用相同的布局逻辑
4. **用户体验**：文档结构更清晰，信息层次更合理

修复完成后，用户应该能够在生成的PDF中看到正确位置的询价号码。
