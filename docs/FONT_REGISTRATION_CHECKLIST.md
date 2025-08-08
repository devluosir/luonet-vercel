# 字体注册检查清单

## 核心原则

### ✅ 已实现
- [x] `addFileToVFS` → `addFont` → `setFont` 顺序严格遵守，且同一个 `doc` 实例
- [x] **仅**用 `'normal'` / `'bold'` 两种 `fontStyle`，文档/表格里保持一致
- [x] `getFontList()` 打印一次确认有 `NotoSansSC: ['normal','bold']`
- [x] Base64 必须是**纯字节串**（没有 `data:` 前缀）
- [x] 并发生成：`getFontBytesOnce()` 返回**单例 Promise**，注册时用 `WeakMap(doc)` 防重
- [x] 升级字体：改 `FONT_VERSION`，避免老缓存"复活"

## 硬化注册器特性

### 1. 版本控制
```typescript
const FONT_VERSION = '1.0.0'; // 升级字体时改它，自动失效旧缓存
```

### 2. 严格校验
```typescript
// 立即校验（最关键）
const list = doc.getFontList(); // { [fontName]: string[] of styles }
const styles = list[FONT_NAME] || [];

if (!styles.includes('normal') || !styles.includes('bold')) {
  throw new Error(`字体 ${FONT_NAME} 注册不完整: ${styles.join(', ')}`);
}
```

### 3. 性能监控
```typescript
// 性能阈值配置
const thresholds = {
  loading: 50,      // 加载阶段 > 50ms 警告
  registration: 15,  // 注册阶段 > 15ms 警告
  generation: 200    // 生成阶段 > 200ms 警告
};
```

### 4. 预热机制
```typescript
// 预热字体注册（包含TTF解析和Freetype初始化）
await warmupFontRegistration();
```

## 使用方式

### 在PDF生成器中
```typescript
// 创建PDF文档后立即注册字体
const doc = new jsPDF() as ExtendedJsPDF;
await addChineseFontsToPDF(doc); // 使用硬化注册器

// 之后统一这样用：
doc.setFont('NotoSansSC', 'normal'); // ✅
doc.setFont('NotoSansSC', 'bold');   // ✅
```

### 在AutoTable中
```typescript
autoTable(doc, {
  styles: { 
    font: 'NotoSansSC', 
    fontStyle: 'normal', // 明确指定
    fontSize: 10 
  },
  headStyles: { 
    font: 'NotoSansSC', 
    fontStyle: 'bold'    // 明确指定
  },
  // ...
});
```

## 调试指南

### 1. 检查字体注册状态
```typescript
import { getFontRegistrationStatus } from '@/utils/pdfFontRegistry';

console.log('字体注册状态:', getFontRegistrationStatus());
```

### 2. 查看可用字体列表
```typescript
const list = doc.getFontList();
console.log('可用字体列表:', list);
```

### 3. 性能监控报告
```typescript
import { performanceMonitor } from '@/utils/performance';

performanceMonitor.printReport();
```

## 常见问题解决

### 问题1: "Unable to look up font label"
**原因**: 字体注册不完整或顺序错误
**解决**: 使用硬化注册器，它会自动校验并报错

### 问题2: 字体样式不一致
**原因**: 使用了 `'regular'` 而不是 `'normal'`
**解决**: 统一使用 `'normal'` / `'bold'`

### 问题3: 性能回退
**原因**: 字体缓存失效或TTF解析慢
**解决**: 检查预热是否成功，查看性能监控报告

## 升级字体流程

1. 更新字体文件
2. 修改 `FONT_VERSION` 常量
3. 清除浏览器缓存
4. 测试字体注册是否成功

## 监控指标

- **加载阶段**: 字体字节串获取时间
- **注册阶段**: VFS注入 + 字体注册时间
- **生成阶段**: PDF生成总时间

所有阶段都有阈值监控，超阈值会发出警告。
