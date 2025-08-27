# 合并单元格功能 Bug 修复记录

## 🐛 问题描述

在实现表格合并单元格功能时，出现了 `ReferenceError: Cannot access 'mergeMode' before initialization` 错误。

## 🔍 错误分析

### 错误位置
```typescript
// 第167行 - 错误使用
const mergedCells = useMemo(() => calculateMergedCells(data.items, mergeMode), [data.items, mergeMode]);

// 第170行 - 变量定义
const [mergeMode, setMergeMode] = useState<'auto' | 'manual'>('auto');
```

### 根本原因
JavaScript 的变量提升（hoisting）规则：
- `useState` 返回的变量在声明之前无法访问
- `useMemo` 在组件渲染时立即执行
- 当 `useMemo` 尝试访问 `mergeMode` 时，该变量还未初始化

## ✅ 修复方案

### 修复前 ❌
```typescript
// 全局粘贴预设数据状态
const [importPreset, setImportPreset] = useState<{raw: string, parsed: ParseResult} | null>(null);

// 计算合并单元格信息 - 错误：使用了未初始化的变量
const mergedCells = useMemo(() => calculateMergedCells(data.items, mergeMode), [data.items, mergeMode]);

// 添加合并控制状态
const [mergeMode, setMergeMode] = useState<'auto' | 'manual'>('auto');
```

### 修复后 ✅
```typescript
// 全局粘贴预设数据状态
const [importPreset, setImportPreset] = useState<{raw: string, parsed: ParseResult} | null>(null);

// 添加合并控制状态 - 先定义状态
const [mergeMode, setMergeMode] = useState<'auto' | 'manual'>('auto');

// 计算合并单元格信息 - 正确：使用已初始化的变量
const mergedCells = useMemo(() => calculateMergedCells(data.items, mergeMode), [data.items, mergeMode]);
```

## 🎯 修复效果

### 修复前
- ❌ 页面无法加载
- ❌ 控制台报错：`Cannot access 'mergeMode' before initialization`
- ❌ React 错误边界被触发

### 修复后
- ✅ 页面正常加载
- ✅ 合并单元格功能正常工作
- ✅ 无控制台错误

## 📚 经验总结

### React Hooks 使用规则
1. **顺序很重要**：确保依赖的变量在使用前已定义
2. **useState 顺序**：按照依赖关系调整 useState 的顺序
3. **useMemo 依赖**：确保依赖数组中的所有变量都已初始化

### 调试技巧
1. **错误堆栈**：仔细查看错误堆栈中的行号
2. **变量检查**：确认变量定义和使用的位置
3. **依赖关系**：梳理变量之间的依赖关系

## 🧪 测试验证

### 测试步骤
1. 访问 `/quotation` 页面
2. 确保 remarks 列可见
3. 在多个相邻行输入相同内容
4. 验证自动合并功能
5. 测试手动合并模式切换

### 预期结果
- ✅ 页面正常加载
- ✅ 自动合并功能正常
- ✅ 手动合并模式切换正常
- ✅ 右键菜单功能正常
- ✅ 移动端兼容性正常

## 🔧 相关文件

- `src/components/quotation/ItemsTable.tsx` - 主要修复文件
- `TABLE_MERGE_FEATURE_TEST.md` - 功能测试文档

## 📋 检查清单

- [x] 修复变量初始化顺序
- [x] 验证页面正常加载
- [x] 测试合并单元格功能
- [x] 确认无控制台错误
- [x] 验证移动端兼容性
- [x] 更新文档记录
