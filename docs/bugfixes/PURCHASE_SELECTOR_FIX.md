# Purchase Selector 无限循环修复

## 问题描述

在 Purchase 模块中出现了 `Maximum update depth exceeded` 错误，控制台显示警告：
```
purchase.selectors.ts:5 Warning: The result of getSnapshot should be cached to avoid an infinite loop
```

## 根本原因

这是典型的 **useSyncExternalStore（Zustand 内部）+ 选择器返回"新对象"** 导致的回环问题：

1. Zustand 内部使用 `useSyncExternalStore` 来订阅状态变化
2. 当选择器返回新对象时（如 `{ subtotal, count }`），React 认为状态发生了变化
3. 触发重新渲染 → 再次调用选择器 → 再次返回新对象 → 无限循环

## 修复方案

将所有在 selector 内计算并返回对象的选择器改为 **"分片订阅 + useMemo 合成"** 的方式：

### 修复前（问题代码）
```ts
// ❌ 在 selector 内直接返回新对象
export const useTotals = () => usePurchaseStore(s => {
  const subtotal = s.draft.items.reduce((acc, it) => acc + it.qty * it.price, 0);
  const count = s.draft.items.length;
  return { subtotal, count }; // 每次都返回新对象！
});
```

### 修复后（安全代码）
```ts
// ✅ 分片订阅 + useMemo 合成
export const useTotals = () => {
  const items = usePurchaseStore(s => s.draft.items); // 只订阅原始数据
  
  return useMemo(() => {
    const subtotal = items.reduce((acc, it) => acc + it.qty * it.price, 0);
    const count = items.length;
    const qtyTotal = items.reduce((acc, it) => acc + it.qty, 0);
    return { subtotal, count, qtyTotal }; // 在 useMemo 中合成，不会触发无限循环
  }, [items]);
};
```

## 修复的选择器

1. **useTotals** - 计算合计信息
2. **useCanGeneratePdf** - 检查是否可以生成PDF
3. **useValidationState** - 获取表单验证状态
4. **usePdfPayload** - PDF负载选择器

## 关键原则

**Zustand 的 selector 只能返回 store 上已有的引用或原始值**；任何 `({ ... })` 或 `[].map()` 这种"新对象/新数组"合成都放到 `useMemo` 里完成。

## 验证步骤

1. ✅ 保存文件后刷新页面
2. ✅ 控制台不再出现 `getSnapshot should be cached` 警告
3. ✅ 不再抛出 `Maximum update depth exceeded` 错误
4. ✅ 修改明细行数/数量/价格，Totals 正常更新
5. ✅ 生成 PDF 功能正常

## 预防措施

1. 避免在 Zustand selector 中返回新对象
2. 使用分片订阅 + useMemo 合成的方式
3. 定期检查选择器是否返回新引用
4. 使用 React DevTools 监控组件重渲染

## 相关文件

- `src/features/purchase/state/purchase.selectors.ts` - 主要修复文件
- `src/features/purchase/app/PurchasePage.tsx` - 使用选择器的组件
- `src/features/purchase/components/sections/TotalsSection.tsx` - 展示组件

修复完成时间：2025-01-08
