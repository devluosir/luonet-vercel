# 采购页面性能优化总结

## 优化概述

参考报价单页面的优化实践，对采购页面进行了全面的性能优化，提升了用户体验和页面响应速度。

## 主要优化内容

### 1. React Hooks 优化

#### useCallback 优化事件处理函数
- `handleSettingsToggle`: 设置面板切换
- `handlePreviewToggle`: 预览切换
- `handleGenerate`: PDF生成函数
- `handlePreview`: PDF预览函数
- `handleAmountBlur`: 金额处理函数
- `handleSave`: 保存函数
- `handleCurrencyChange`: 货币切换函数
- `handleBankToggle`: 银行信息切换函数

#### useMemo 优化计算属性
- `currencySymbol`: 货币符号计算
- `contractAmountNumber`: 合同金额数值计算

### 2. 数据更新优化

#### 统一的数据更新函数
```typescript
const updateData = useCallback((updates: Partial<PurchaseOrderData>) => {
  setData(prev => ({ ...prev, ...updates }));
}, []);
```

- 替换了所有直接调用 `setData` 的地方
- 使用局部更新，避免不必要的重新渲染
- 提高了数据更新的性能和一致性

### 3. 自动保存功能

#### 集成 useAutoSave Hook
```typescript
const { clearSaved } = useAutoSave({
  data,
  key: 'draftPurchase',
  delay: 2000, // 2秒后自动保存
  enabled: !editId // 只在新建模式下启用自动保存
});
```

- 自动保存草稿数据到 localStorage
- 在新建模式下启用，编辑模式下禁用
- 保存成功后自动清除草稿

### 4. PDF 生成优化

#### 统一的 PDF 生成 Hook
```typescript
const { generate: generatePdf } = usePurchasePdfGenerator();
```

- 动态导入 PDF 生成函数，减少初始包大小
- 统一的错误处理和进度管理
- 并行执行保存和 PDF 生成操作

### 5. Toast 通知系统

#### 集成 Toast 组件
```typescript
const { showToast } = useToast();
```

- 替换了原有的 `alert` 和 `setSaveMessage`
- 提供更好的用户体验
- 支持成功、错误、信息等多种通知类型

### 6. 类型安全优化

#### 添加 CustomWindow 接口
```typescript
interface CustomWindow extends Window {
  __PURCHASE_DATA__?: PurchaseOrderData;
  __EDIT_MODE__?: boolean;
  __EDIT_ID__?: string;
}
```

- 提供类型安全的全局变量访问
- 避免 `any` 类型的使用

### 7. 动态导入优化

#### PDF 预览组件动态导入
```typescript
const PDFPreviewModal = dynamic(() => import('@/components/history/PDFPreviewModal'), { 
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-64"></div>
});
```

- 添加加载状态指示器
- 减少初始包大小

## 性能提升效果

### 1. 渲染性能
- 使用 `useCallback` 减少不必要的重新渲染
- 使用 `useMemo` 缓存计算结果
- 统一的数据更新减少状态变化

### 2. 用户体验
- 自动保存功能防止数据丢失
- Toast 通知提供即时反馈
- 进度条显示 PDF 生成进度

### 3. 代码质量
- 类型安全提升代码可靠性
- 统一的错误处理机制
- 更好的代码组织和可维护性

### 4. 包大小优化
- 动态导入减少初始包大小
- 按需加载 PDF 生成功能

## 与报价单页面的对比

### 相似优化
- 使用相同的 `useAutoSave` Hook（支持泛型）
- 使用相同的 Toast 通知系统
- 使用相同的动态导入策略
- 使用相同的 `useCallback` 和 `useMemo` 优化

### 采购页面特有优化
- 专门的 `usePurchasePdfGenerator` Hook
- 采购订单特定的数据结构和验证
- 银行信息切换的优化处理

## 后续优化建议

1. **数据验证**: 可以添加采购订单的专门验证逻辑
2. **缓存优化**: 可以考虑添加更多的缓存策略
3. **错误边界**: 可以添加错误边界组件
4. **性能监控**: 可以添加性能监控和指标收集

## 最新优化补充

### 8. textarea 自动高度优化

#### 创建通用 Hook
```typescript
export function useAutoResizeTextareas(
  refs: React.RefObject<HTMLTextAreaElement>[],
  deps: any[]
) {
  useEffect(() => {
    refs.forEach(ref => {
      if (ref.current) {
        ref.current.style.height = 'auto';
        ref.current.style.height = `${ref.current.scrollHeight}px`;
      }
    });
  }, deps);
}
```

#### 应用优化
```typescript
// 替换4个独立的useEffect
useAutoResizeTextareas(
  [projectSpecificationRef, deliveryInfoRef, orderNumbersRef, paymentTermsRef],
  [data.projectSpecification, data.deliveryInfo, data.orderNumbers, data.paymentTerms]
);
```

### 9. 清理重复的 useEffect

#### 合并数据初始化逻辑
- 将两个重复的 `useEffect` 合并为一个统一的初始化逻辑
- 优先处理全局数据（编辑模式）
- 其次处理草稿数据（新建模式）
- 最后使用默认数据
- 自动清理全局变量

#### 优化效果
- 减少了代码重复
- 提高了逻辑清晰度
- 统一了数据初始化流程

## 总结

通过参考报价单页面的优化实践，采购页面实现了全面的性能优化，包括：

- React Hooks 优化（useCallback, useMemo）
- 自动保存功能
- 统一的 PDF 生成机制
- Toast 通知系统
- 类型安全改进
- 动态导入优化

这些优化显著提升了页面的响应速度、用户体验和代码质量，使采购页面达到了与报价单页面相同的性能水平。 