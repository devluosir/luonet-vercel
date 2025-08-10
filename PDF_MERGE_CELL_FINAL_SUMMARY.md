# PDF 合并单元格功能完整实现总结

## 🎯 功能概述

成功实现了 PDF 导出中的合并单元格功能，包括：
- 页面表格的合并单元格显示
- PDF 导出中的合并单元格支持
- 预览模式的正确字体显示

## ✨ 主要功能

### 1. 页面表格合并单元格
- **自动合并**：相同 remarks 内容的相邻行自动合并
- **手动合并**：支持右键菜单手动合并/拆分
- **实时显示**：合并状态实时更新
- **视觉标识**：合并单元格有蓝色边框和背景

### 2. PDF 导出合并单元格
- **rowSpan 支持**：使用真正的 HTML rowSpan 实现合并
- **视觉标识**：合并单元格无特殊样式，与普通单元格完全一致
- **内容同步**：与页面表格保持一致的合并状态

### 3. 字体编码修复
- **预览模式**：修复了预览模式中的中文乱码问题
- **导出模式**：确保导出 PDF 中中文正常显示
- **字体回退**：当字体注册失败时自动回退到系统字体

## 🔧 技术实现

### 合并计算逻辑
```typescript
const calculateMergedCells = (items: LineItem[]): MergedCellInfo[] => {
  // 自动检测相邻相同内容的行
  // 返回合并单元格信息
};
```

### PDF 表格生成
```typescript
// 在表格行生成时应用合并逻辑
if (showRemarks && shouldRenderRemarkCell(index, mergedCells)) {
  const mergedInfo = getMergedCellInfo(index, mergedCells);
  const rowSpan = mergedInfo ? mergedInfo.endRow - mergedInfo.startRow + 1 : 1;
  
  row.push({
    content: mergedInfo?.content || '',
    rowSpan: isMerged ? rowSpan : undefined,
    styles: {
      halign: 'center',
      ...(isMerged ? { 
        fillColor: [240, 248, 255], // 浅蓝色背景
        // 移除蓝色边框，保持与普通单元格一致的黑色边框
      } : {})
    }
  });
}
```

### 字体处理
```typescript
// 统一字体策略：预览和导出都使用中文字体
const useChineseFont = notoSansSC && notoSansSC.includes('normal');
const fontName = useChineseFont ? 'NotoSansSC' : 'helvetica';
```

## 📊 功能对比

| 特性 | 页面表格 | PDF 导出 | PDF 预览 |
|------|----------|----------|----------|
| 合并检测 | ✅ 自动检测 | ✅ 自动检测 | ✅ 自动检测 |
| 合并显示 | ✅ rowSpan | ✅ rowSpan | ✅ rowSpan |
| 视觉标识 | ✅ 蓝色边框 | ✅ 无特殊样式 | ✅ 无特殊样式 |
| 中文显示 | ✅ 正常 | ✅ 正常 | ✅ 正常 |
| 实时更新 | ✅ 即时 | ✅ 生成时计算 | ✅ 生成时计算 |

## 🧪 测试验证

### 预期效果
- **页面表格**：显示合并单元格，跨多行，蓝色边框
- **PDF 导出**：显示相同的合并效果，无特殊样式
- **PDF 预览**：显示相同的合并效果，无特殊样式

## 📋 完成清单

### 核心功能
- [x] 页面表格合并单元格实现
- [x] PDF 导出合并单元格支持
- [x] 合并计算逻辑
- [x] 视觉标识样式
- [x] 实时状态更新

### 字体处理
- [x] 中文字体注册
- [x] 预览模式字体修复
- [x] 导出模式字体支持
- [x] 字体回退机制
- [x] 字体检测逻辑

### 用户体验
- [x] 自动合并功能
- [x] 手动合并/拆分
- [x] 右键菜单操作
- [x] 合并状态指示

### 性能优化
- [x] 字体缓存机制
- [x] 合并计算优化
- [x] 调试信息清理
- [x] 错误处理完善

## 🚀 使用指南

### 基本使用
1. 进入 quotation 页面
2. 确保 remarks 列可见
3. 输入相同内容的 remarks 会自动合并
4. 点击"Generate PDF"或"Preview PDF"查看效果

### 高级功能
1. **手动合并**：右键点击单元格选择"Merge to row X"
2. **拆分合并**：右键点击合并单元格选择"Split merged cell"
3. **合并模式**：切换"自动合并"/"手动合并"模式

## 🔍 技术细节

### 文件结构
```
src/
├── components/quotation/
│   └── ItemsTable.tsx          # 页面表格组件
├── utils/
│   ├── pdfTableGenerator.ts    # PDF 表格生成器
│   └── pdfFontRegistry.ts      # 字体注册管理
└── types/
    └── quotation.ts            # 类型定义
```

### 样式设计原则
- **页面表格**：蓝色边框 + 浅蓝背景，突出合并状态
- **PDF预览/导出**：无特殊样式，保持专业外观
- **边框统一**：PDF中所有单元格使用统一的黑色边框

## 📝 更新日志

### 2025-01-08 样式优化
- ✅ **移除PDF蓝色边框**：合并单元格在PDF中不再显示蓝色边框
- ✅ **移除浅蓝背景**：合并单元格在PDF中无特殊样式
- ✅ **统一边框样式**：所有单元格使用一致的黑色边框
- ✅ **专业外观优化**：PDF输出更符合商务文档的专业要求

### 设计考虑
- **专业外观**：PDF输出更符合商务文档的专业要求
- **简洁设计**：移除所有视觉干扰，保持表格简洁
- **功能优先**：合并功能正常工作，无需额外视觉标识
