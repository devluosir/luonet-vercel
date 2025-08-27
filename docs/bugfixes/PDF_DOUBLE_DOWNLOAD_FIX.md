# PDF双重下载问题修复总结

## 问题描述
用户反馈PDF生成按钮点击后会生成两个PDF文件：一个是正确的，一个是空的。经过分析发现这是由于PDF生成函数中存在双重下载机制导致的。

## 问题根源
PDF生成函数中存在两种下载方式：
1. **`doc.save()` 方法**：直接触发浏览器下载
2. **返回的 Blob 对象**：在调用方通过 `URL.createObjectURL()` 和 `link.click()` 再次触发下载

这导致了两个PDF文件被下载：一个是正确的（通过Blob下载），一个是空的（通过`doc.save()`下载）。

## 修复方案
统一所有PDF生成函数，移除 `doc.save()` 调用，只返回 Blob 对象，让调用方统一处理下载。

## 修复的文件

### 1. PDF生成器函数
- `src/utils/quotationPdfGenerator.ts` - 报价单PDF生成器
- `src/utils/orderConfirmationPdfGenerator.ts` - 订单确认PDF生成器  
- `src/utils/invoicePdfGenerator.ts` - 发票PDF生成器
- `src/utils/packingPdfGenerator.ts` - 装箱单PDF生成器
- `src/utils/shippingMarksPdfGenerator.ts` - 运输标记PDF生成器

### 2. 页面组件
- `src/app/quotation/page.tsx` - 报价单页面（已正确）
- `src/app/purchase/page.tsx` - 采购单页面（已正确）
- `src/app/invoice/page.tsx` - 发票页面（已修复）
- `src/app/packing/page.tsx` - 装箱单页面（已修复）

### 3. 预览组件
- `src/components/history/PDFPreviewModal.tsx` - 历史记录预览模态框（已修复）
- `src/components/PDFPreviewComponent.tsx` - PDF预览组件（已修复）
- `src/components/packinglist/ShippingMarksModal.tsx` - 运输标记模态框（已修复）

## 修复内容

### PDF生成器函数修改
```typescript
// 修改前
doc.save(`filename.pdf`);
return new Blob(); // 或 return doc.output('bloburl').toString()

// 修改后
return doc.output('blob');
```

### 页面组件修改
```typescript
// 修改前
await generateInvoicePDF(data);

// 修改后
const pdfBlob = await generateInvoicePDF(data);
const url = URL.createObjectURL(pdfBlob);
const link = document.createElement('a');
link.href = url;
link.download = `filename.pdf`;
document.body.appendChild(link);
link.click();
document.body.removeChild(link);
URL.revokeObjectURL(url);
```

## 修复效果
- ✅ 消除了双重下载问题
- ✅ 统一了PDF下载处理方式
- ✅ 保持了所有现有功能
- ✅ 提高了代码一致性

## 测试建议
1. 测试所有PDF生成功能，确保只下载一个正确的PDF文件
2. 验证预览功能正常工作
3. 确认历史记录中的PDF下载功能正常
4. 测试运输标记PDF生成功能

## 注意事项
- 所有PDF生成函数现在统一返回 Blob 对象
- 调用方需要正确处理返回的 Blob 对象
- 预览模式下返回 Blob，非预览模式下也返回 Blob，由调用方决定如何处理
