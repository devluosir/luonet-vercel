# 稳定性防回归指南

## 概述

本文档定义了"稳定引用 + 原子订阅"模式的防回归机制，确保代码质量和性能稳定性。

## A) 6个"复发点"检查清单

### 1. Selector中的时间戳生成 ❌
```ts
// 错误示例
const useTimestamp = () => useStore(s => Date.now());

// 正确做法 - 传参或在触发时生成
const useTimestamp = (timestamp: number) => useStore(s => timestamp);
```

### 2. Selector中的map/filter返回新数组 ❌
```ts
// 错误示例
const useFilteredItems = () => useStore(s => s.items.filter(item => item.active));

// 正确做法 - 使用派生Hook + useMemo
const useFilteredItems = () => {
  const items = useStore(s => s.items);
  return useMemo(() => items.filter(item => item.active), [items]);
};
```

### 3. useEffect依赖中的现拼对象 ❌
```ts
// 错误示例
useEffect(() => {
  // 副作用逻辑
}, [{ id: 1, name: 'test' }]);

// 正确做法 - 先稳定化
const deps = useMemo(() => ({ id: 1, name: 'test' }), []);
useEffect(() => {
  // 副作用逻辑
}, [deps]);
```

### 4. 对象返回selector未使用shallow ❌
```ts
// 错误示例
const { a, b } = useStore(s => ({ a: s.data.a, b: s.data.b }));

// 正确做法 - 使用shallow
import { shallow } from 'zustand/shallow';
const { a, b } = useStore(s => ({ a: s.data.a, b: s.data.b }), shallow);
```

### 5. PDF相关selector中的易变数据 ❌
```ts
// 错误示例
const usePdfData = () => useStore(s => ({
  ...s.data,
  generatedAt: new Date().toISOString()
}));

// 正确做法 - 在触发动作时生成
const generatePdf = () => {
  const data = useStore.getState().data;
  const pdfData = {
    ...data,
    generatedAt: new Date().toISOString()
  };
  // 生成PDF
};
```

### 6. Selector中的字符串拼接 ❌
```ts
// 错误示例
const useFormattedAmount = () => useStore(s => `$${s.amount.toFixed(2)}`);

// 正确做法 - 在展示层格式化
const useAmount = () => useStore(s => s.amount);
// 在组件中: <span>${amount.toFixed(2)}</span>
```

## B) 循环哨兵使用

在容易高频渲染的容器组件中使用：

```tsx
import { useRenderLoopGuard } from '@/debug/useRenderLoopGuard';

function PurchasePage() {
  useRenderLoopGuard('PurchasePage', 80);
  
  // 组件逻辑
}
```

## C) 稳定性测试

关键派生Hook必须有"两次渲染引用相等"测试：

```ts
test('useTotals returns stable reference across re-renders', () => {
  const { result, rerender } = renderHook(() => useTotals());
  const first = result.current;
  rerender();
  expect(result.current).toBe(first); // 引用稳定
});
```

## D) ESLint规则

已在`.eslintrc.json`中配置：

```json
{
  "overrides": [
    {
      "files": ["src/features/**/state/*.selectors.ts"],
      "rules": {
        "no-new-object": "error",
        "no-array-constructor": "error",
        "@typescript-eslint/no-object-literal-type-assertion": "error"
      }
    }
  ]
}
```

## E) 发版前自检

运行自检脚本：

```bash
node scripts/pre-release-check.js
```

检查项目：
- [ ] 无selector中的时间戳生成
- [ ] 无useEffect依赖中的现拼对象  
- [ ] 对象返回selector使用了shallow
- [ ] 无useEffect依赖中的匿名函数
- [ ] 无selector中的Math.random
- [ ] 稳定性测试通过

## F) 最佳实践

### 1. 原子订阅原则
```ts
// ✅ 原子订阅
const items = useStore(s => s.items);
const currency = useStore(s => s.currency);

// ❌ 复合订阅
const { items, currency } = useStore(s => ({ 
  items: s.items, 
  currency: s.currency 
}));
```

### 2. 派生数据使用useMemo
```ts
const useTotals = () => {
  const items = useStore(s => s.items);
  return useMemo(() => {
    return items.reduce((sum, item) => sum + item.price * item.qty, 0);
  }, [items]);
};
```

### 3. 复杂对象使用shallow
```ts
const { buyer, seller } = useStore(s => ({
  buyer: s.buyer,
  seller: s.seller
}), shallow);
```

### 4. 时间戳在动作中生成
```ts
const generatePdf = () => {
  const data = useStore.getState().data;
  const timestamp = new Date().toISOString();
  // 使用data和timestamp生成PDF
};
```

## G) 故障排除

### 常见问题

1. **组件频繁重渲染**
   - 检查selector是否返回新对象
   - 确认使用了原子订阅
   - 验证useMemo依赖数组

2. **测试失败**
   - 确保测试环境重置状态
   - 检查异步操作处理
   - 验证mock数据一致性

3. **ESLint报错**
   - 检查selector文件路径
   - 确认规则配置正确
   - 验证代码符合规范

### 调试工具

1. **React DevTools Profiler**
   - 分析组件渲染频率
   - 识别不必要的重渲染

2. **Zustand DevTools**
   - 监控状态变化
   - 追踪selector调用

3. **循环哨兵**
   - 开发环境监控渲染次数
   - 及时发现问题

## 总结

遵循"稳定引用 + 原子订阅"模式，配合完善的防回归机制，可以确保代码的稳定性和可维护性。定期运行自检脚本，及时发现问题并修复。
