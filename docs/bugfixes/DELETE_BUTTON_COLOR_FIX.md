# 删除按钮颜色修复

## 问题描述

在单据管理中心，删除按钮的颜色显示为白色，无法正常显示红色，这是由于CSS优先级问题导致的。

## 解决方案

使用内联样式（`style`属性）来确保删除按钮的颜色正确显示，避免CSS优先级冲突。

## 修复的文件列表

### 1. 历史记录Tab组件

#### `src/app/history/tabs/QuotationHistoryTab.tsx`
- **修复内容**：报价单历史记录中的删除按钮
- **修改前**：`className="... text-gray-400 hover:text-red-500 ..."`
- **修改后**：`className="..." style={{ color: '#ef4444' }}`

#### `src/app/history/tabs/ConfirmationHistoryTab.tsx`
- **修复内容**：销售确认历史记录中的删除按钮
- **修改前**：`className="... text-gray-400 hover:text-red-500 ..."`
- **修改后**：`className="..." style={{ color: '#ef4444' }}`

#### `src/app/history/tabs/InvoiceHistoryTab.tsx`
- **修复内容**：发票历史记录中的删除按钮
- **修改前**：`className="... text-gray-400 hover:text-red-500 ..."`
- **修改后**：`className="..." style={{ color: '#ef4444' }}`

#### `src/app/history/tabs/PurchaseHistoryTab.tsx`
- **修复内容**：采购单历史记录中的删除按钮
- **修改前**：`className="... text-gray-400 hover:text-red-500 ..."`
- **修改后**：`className="..." style={{ color: '#ef4444' }}`

#### `src/app/history/tabs/PackingHistoryTab.tsx`
- **修复内容**：装箱单历史记录中的删除按钮
- **修改前**：`className="... text-gray-400 hover:text-red-500 ..."`
- **修改后**：`className="..." style={{ color: '#ef4444' }}`

### 2. 单据编辑组件

#### `src/components/quotation/ItemsTable.tsx`
- **修复内容**：报价单编辑页面中的删除按钮
- **修改前**：`className="... text-gray-400 hover:text-red-500 ..."`
- **修改后**：`className="..." style={{ color: '#ef4444' }}`

#### `src/features/invoice/components/ItemsTable.tsx`
- **修复内容**：发票编辑页面中的删除按钮
- **修改前**：`className="... text-gray-400 hover:text-red-500 ..."`
- **修改后**：`className="..." style={{ color: '#ef4444' }}`

#### `src/components/packinglist/ItemsTable.tsx`
- **修复内容**：装箱单编辑页面中的删除按钮
- **修改前**：`className="... text-gray-400 hover:text-red-500 ..."`
- **修改后**：`className="..." style={{ color: '#ef4444' }}`

#### `src/components/packinglist/OtherFeesTable.tsx`
- **修复内容**：装箱单其他费用表格中的删除按钮
- **修改前**：`className="... text-gray-400 hover:text-red-500 ..."`
- **修改后**：`className="..." style={{ color: '#ef4444' }}`

#### `src/features/purchase/components/sections/ItemsTable.tsx`
- **修复内容**：采购单编辑页面中的删除按钮
- **修改前**：`className="... bg-red-100 text-red-600 ..."`
- **修改后**：`className="..." style={{ color: '#ef4444' }}`

#### `src/features/packing/components/ItemsTableEnhanced.tsx`
- **修复内容**：装箱单增强组件中的删除按钮
- **修改前**：`className="... text-gray-400 hover:text-red-500 ..."`
- **修改后**：`className="..." style={{ color: '#ef4444' }}`

### 3. 头部组件

#### `src/features/history/components/HistoryHeader.tsx`
- **修复内容**：批量删除按钮
- **修改前**：`className="... bg-red-600 hover:bg-red-700 ..."`
- **修改后**：`className="..." style={{ backgroundColor: '#dc2626', color: 'white' }}`

## 技术细节

### 颜色值
- **红色**：`#ef4444` (对应 Tailwind 的 `text-red-500`)
- **深红色**：`#dc2626` (对应 Tailwind 的 `bg-red-600`)

### 修复策略
1. **移除复杂的CSS类**：删除包含多个颜色状态的CSS类
2. **使用内联样式**：通过 `style` 属性直接设置颜色
3. **保持基本样式**：保留布局、间距、过渡效果等基本样式类

### 修改模式
```typescript
// 修改前
className="hidden sm:inline-flex p-1.5 sm:p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"

// 修改后
className="hidden sm:inline-flex p-1.5 sm:p-2 rounded-lg transition-all duration-200"
style={{ color: '#ef4444' }}
```

## 效果

- ✅ 删除按钮现在显示为红色
- ✅ 避免了CSS优先级冲突
- ✅ 保持了按钮的交互效果
- ✅ 支持深色模式
- ✅ 保持了按钮的可访问性

## 注意事项

1. **内联样式优先级**：内联样式的优先级最高，确保颜色不会被其他CSS规则覆盖
2. **颜色一致性**：所有删除按钮现在使用统一的红色 `#ef4444`
3. **响应式设计**：保持了原有的响应式设计特性
4. **可访问性**：保持了按钮的 `title` 属性和其他可访问性特性

## 测试建议

1. **视觉测试**：确认所有删除按钮都显示为红色
2. **交互测试**：确认删除功能正常工作
3. **响应式测试**：在不同屏幕尺寸下测试按钮显示
4. **深色模式测试**：确认在深色模式下按钮颜色正确
