# PDF表格渲染器使用指南

## 概述

PDF表格渲染器是一个独立的表格渲染解决方案，专门用于在PDF中渲染HTML表格。它支持完整的表格样式、合并单元格、跨页显示等功能。

## 功能特性

### 1. 完整的表格支持
- ✅ HTML表格解析和渲染
- ✅ 表头（thead）和表体（tbody）支持
- ✅ 合并单元格（colspan/rowspan）
- ✅ 表格边框和背景色
- ✅ 文本对齐（左对齐、居中、右对齐）
- ✅ 垂直对齐（顶部、居中、底部）

### 2. 样式支持
- ✅ 字体样式（粗体、斜体、下划线、删除线）
- ✅ 字体颜色和背景色
- ✅ 单元格内边距
- ✅ 边框宽度和颜色
- ✅ 自动文本换行

### 3. 布局功能
- ✅ 自动列宽计算
- ✅ 自适应行高
- ✅ 跨页分页支持
- ✅ 页面边距控制

## 使用方法

### 1. 基本使用

```typescript
import { renderTableInPDF } from '@/utils/tableRenderer';
import jsPDF from 'jspdf';

// 创建PDF文档
const doc = new jsPDF({
  orientation: 'portrait',
  unit: 'mm',
  format: 'a4'
});

// 创建HTML表格元素
const tableHTML = `
  <table border="1" cellpadding="3">
    <thead>
      <tr>
        <th>产品名称</th>
        <th>规格</th>
        <th>数量</th>
        <th>单价</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>测试产品</td>
        <td>规格A</td>
        <td>100</td>
        <td>10.00</td>
      </tr>
    </tbody>
  </table>
`;

const container = document.createElement('div');
container.innerHTML = tableHTML;
const tableElement = container.querySelector('table') as HTMLTableElement;

// 定义基础样式
const baseStyle = {
  fontName: 'NotoSansSC',
  fontSize: 9,
  color: [0, 0, 0] as [number, number, number],
  fontBold: false,
  fontItalic: false,
  underline: false,
  strike: false,
};

// 渲染表格
const pageBottomY = doc.internal.pageSize.getHeight() - 20;
const finalY = renderTableInPDF(
  doc,
  tableElement,
  20,    // startX
  40,    // startY
  170,   // maxWidth
  baseStyle,
  pageBottomY
);
```

### 2. 在富文本中使用

表格渲染器已集成到富文本渲染流程中。当富文本包含 `<table>` 标签时，会自动调用表格渲染器：

```typescript
// 富文本HTML中包含表格
const richTextHTML = `
  <p>这是表格前的文本。</p>
  <table border="1">
    <tr>
      <th>列1</th>
      <th>列2</th>
    </tr>
    <tr>
      <td>数据1</td>
      <td>数据2</td>
    </tr>
  </table>
  <p>这是表格后的文本。</p>
`;

// 调用富文本渲染函数，会自动处理表格
const baseStyle: PdfInlineStyle = {
  fontName: 'NotoSansSC',
  fontSize: 9,
  color: [0, 0, 160],
  fontBold: false,
  fontItalic: false,
  underline: false,
  strike: false,
};
renderRichTextInPDF(doc, richTextHTML, startX, startY, maxWidth, baseStyle);
```

### 3. 制表符文本转换

支持将制表符分隔的文本自动转换为HTML表格：

```typescript
// 制表符分隔的文本
const tabText = `
产品名称\t规格\t数量\t单价
测试产品1\t规格A\t100\t10.00
测试产品2\t规格B\t50\t20.00
`;

// 会自动转换为HTML表格并渲染
const baseStyle: PdfInlineStyle = {
  fontName: 'NotoSansSC',
  fontSize: 9,
  color: [0, 0, 160],
  fontBold: false,
  fontItalic: false,
  underline: false,
  strike: false,
};
renderRichTextInPDF(doc, tabText, startX, startY, maxWidth, baseStyle);
```

## 样式配置

### 基础样式配置

```typescript
interface PdfInlineStyle {
  fontName?: string;        // 字体名称
  fontBold?: boolean;       // 粗体
  fontItalic?: boolean;     // 斜体
  underline?: boolean;      // 下划线
  strike?: boolean;         // 删除线
  fontSize?: number;        // 字体大小
  color?: RGB;             // 字体颜色 [r,g,b]
}
```

### 单元格样式

表格渲染器会自动解析HTML表格的样式属性：

- `style="color: red"` - 文本颜色
- `style="background-color: yellow"` - 背景色
- `align="center"` - 水平对齐
- `valign="middle"` - 垂直对齐
- `<th>` 标签 - 自动应用粗体样式

## 高级功能

### 1. 合并单元格

```html
<table>
  <tr>
    <td colspan="2">跨两列的内容</td>
    <td>普通单元格</td>
  </tr>
  <tr>
    <td rowspan="2">跨两行的内容</td>
    <td>数据1</td>
    <td>数据2</td>
  </tr>
  <tr>
    <td>数据3</td>
    <td>数据4</td>
  </tr>
</table>
```

### 2. 复杂样式

```html
<table border="1" cellpadding="5">
  <thead>
    <tr>
      <th style="background-color: #f0f0f0; color: #333;">表头1</th>
      <th style="background-color: #f0f0f0; color: #333;">表头2</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td align="center" valign="middle">居中对齐</td>
      <td style="color: red;">红色文本</td>
    </tr>
  </tbody>
</table>
```

## 测试

使用提供的测试工具验证表格渲染功能：

```typescript
import { 
  testTableRenderer, 
  testRichTextWithTable, 
  testMergedCells,
  testTextWithTable,
  testLineBreakAndAlignment
} from '@/utils/testTableRenderer';

// 测试基本表格渲染
testTableRenderer();

// 测试富文本中的表格
testRichTextWithTable();

// 测试合并单元格
testMergedCells();

// 测试"文本+表格"场景（验证修复效果）
testTextWithTable();

// 测试换行和垂直对齐（验证v1.5.0修复效果）
testLineBreakAndAlignment();
```

## 修复说明

### v1.4.0 修复内容

#### 1. 修复表格被"吞掉"的问题

**问题描述**: 当表格前面有文本时，表格在PDF中不显示。

**原因分析**: 原来的富文本渲染器使用简单的节点遍历，当遇到包含文本和表格的父块（如`<div>`/`<p>`）时，会将其整体当作"纯文本段落"处理，内部的`<table>`标签被忽略。

**解决方案**: 实现递归DOM遍历器，在任何层级遇到`<table>`节点时立即交给表格渲染器处理，确保表格不会被富文本渲染器"吞掉"。

#### 2. 优化表格紧凑度

**问题描述**: 表格在PDF中显示过于松散，单元格太高、内边距太大。

**优化内容**:
- 减小默认内边距：`padding: 3 → 1.5`
- 调整行高系数：`1.4 → 1.25`（更紧凑）
- 使用`baseline: 'top'`：避免alphabetic基线的额外下移偏差，垂直对齐更直观

**效果**: 表格显示更加紧凑协调，单元格不再显得"格子大、内容稀"。

#### 3. 修复换行和垂直对齐问题 (v1.5.0)

**问题描述**: 
- 单元格内的`<br>`标签换行不生效
- 内容总是显示在左上角，单元格显得偏高
- 超长无空格字符串（如SKU/URL）不会自动换行

**解决方案**:
- **换行支持**: 将`<br>`标签转换为`\n`，支持显式换行和自动软换行
- **垂直对齐**: 默认使用居中对齐，支持`valign`属性指定top/middle/bottom
- **超长字符串处理**: 实现硬切功能，按字符切分超长无空格字符串
- **中文测宽优化**: 添加1%的测宽缓冲，避免"刚超一点点"的换行抖动

**关键改进**:
```typescript
// 统一的分行器，支持硬换行和软换行
function layoutLines(doc: jsPDF, text: string, innerWidth: number, fontStyle: PdfInlineStyle, lineHeight: number): string[] {
  // 先按 \n 做硬换行，再对每一段做软换行
  const paragraphs = text.split('\n');
  // ... 软换行逻辑
  // ... 超长字符串硬切逻辑
}

// 默认垂直居中对齐
const s: CellStyle = {
  ...base,
  valign: 'middle',       // 默认"中"更协调
  padding: 1.5,           // 紧凑的内边距
};

// 使用 top baseline 渲染
doc.text(line, tx, baseY + i * lh, { baseline: 'top' });
```

**效果**: 
- `<br>`标签和编辑器回车都能在单元格内真实换行
- 内容垂直居中显示，视觉更协调
- 超长字符串自动换行，不会溢出单元格
- 表格整体更紧凑，没有多余空白
```

## 注意事项

1. **字体支持**: 确保PDF文档中已注册所需字体（如NotoSansSC）
2. **页面边距**: 合理设置页面边距，避免表格内容溢出
3. **表格大小**: 大型表格会自动分页，确保内容完整显示
4. **样式兼容**: 某些复杂的CSS样式可能不完全支持，建议使用基础HTML属性

## 故障排除

### 常见问题

1. **表格不显示**: 检查HTML表格结构是否正确
2. **样式不生效**: 确认样式属性格式正确
3. **分页异常**: 检查页面边距设置
4. **字体问题**: 确保字体已正确注册

### 调试技巧

1. 使用浏览器开发者工具检查HTML表格结构
2. 查看控制台日志了解渲染过程
3. 使用测试工具验证功能
4. 检查PDF文档的字体注册状态

## 更新日志

- **v1.0.0**: 初始版本，支持基本表格渲染
- **v1.1.0**: 添加合并单元格支持
- **v1.2.0**: 集成富文本渲染流程
- **v1.3.0**: 添加制表符文本转换功能
- **v1.4.0**: 修复表格被富文本渲染器"吞掉"的问题，优化表格紧凑度
- **v1.5.0**: 修复换行不生效和垂直对齐问题，支持`<br>`标签和自动换行
