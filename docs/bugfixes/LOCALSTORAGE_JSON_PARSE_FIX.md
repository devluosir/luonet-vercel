# localStorage JSON 解析错误修复总结

## 问题描述

在项目中发现了一个严重的 localStorage JSON 解析错误：

```
Failed to parse localStorage key: username SyntaxError: Unexpected token 'R', "Roger" is not valid JSON
```

## 根本原因

代码中多处使用了不安全的 `JSON.parse(localStorage.getItem(...))` 模式，当 localStorage 中存储的是普通字符串（如 "Roger"）而不是 JSON 格式时，会导致解析错误。

## 修复方案

### 1. 创建安全的 localStorage 工具函数

创建了 `src/utils/safeLocalStorage.ts` 文件，提供以下安全函数：

- `getLocalStorageJSON<T>(key: string, defaultValue: T): T` - 安全地获取 JSON 数据
- `getLocalStorageString(key: string, defaultValue: string): string` - 安全地获取字符串数据
- `setLocalStorage(key: string, value: unknown): void` - 安全地设置数据
- `removeLocalStorage(key: string): void` - 安全地移除数据

### 2. 修复的文件列表

#### 核心工具文件
- `src/utils/quotationInitialData.ts` - 修复 username 获取逻辑
- `src/utils/documentCounts.ts` - 修复历史记录获取
- `src/utils/quotationHistory.ts` - 修复报价单历史记录
- `src/utils/packingHistory.ts` - 修复装箱单历史记录
- `src/utils/purchaseHistory.ts` - 修复采购单历史记录

#### 组件文件
- `src/components/invoice/CustomerSection.tsx` - 修复客户信息获取
- `src/components/packinglist/ConsigneeSection.tsx` - 修复收货人信息获取

#### PDF 生成器
- `src/utils/quotationPdfGenerator.ts` - 修复表格列偏好设置获取
- `src/utils/orderConfirmationPdfGenerator.ts` - 修复表格列偏好设置获取

#### 状态管理
- `src/features/quotation/state/useTablePrefs.ts` - 修复表格偏好设置

### 3. 修复的具体问题

#### 主要问题：username 解析错误
```typescript
// 修复前（错误）
const name = getCachedLocalStorage('username'); // 尝试解析 "Roger" 为 JSON

// 修复后（正确）
const name = getLocalStorageString('username'); // 直接获取字符串
```

#### 历史记录获取错误
```typescript
// 修复前（不安全）
const history = JSON.parse(localStorage.getItem('quotation_history') || '[]');

// 修复后（安全）
const history = getLocalStorageJSON('quotation_history', []);
```

#### 表格偏好设置错误
```typescript
// 修复前（不安全）
visibleCols = JSON.parse(localStorage.getItem('qt.visibleCols') || 'null');

// 修复后（安全）
visibleCols = getLocalStorageJSON('qt.visibleCols', null);
```

## 修复效果

1. **消除 JSON 解析错误** - 不再出现 "Unexpected token" 错误
2. **提高代码健壮性** - 所有 localStorage 操作都有错误处理
3. **统一错误处理** - 使用统一的工具函数处理 localStorage 操作
4. **保持向后兼容** - 修复不影响现有数据格式

## 测试建议

1. 清除浏览器 localStorage 中的 `username` 键
2. 重新设置用户名为 "Roger"
3. 验证不再出现 JSON 解析错误
4. 测试所有历史记录功能正常工作
5. 测试表格列偏好设置功能

## 预防措施

1. 所有新的 localStorage 操作都应使用 `safeLocalStorage.ts` 中的工具函数
2. 避免直接使用 `JSON.parse(localStorage.getItem(...))` 模式
3. 在代码审查中检查 localStorage 使用方式
4. 添加 ESLint 规则防止不安全的 JSON.parse 使用
