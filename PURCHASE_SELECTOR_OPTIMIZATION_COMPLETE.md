# Purchase 选择器优化完成

## 优化目标

按照您提供的精准方案，彻底解决 selector 返回新对象导致的无限循环问题，建立原子订阅 + useMemo 合成的统一范式。

## 核心修复方案

### 1. 原子选择器模式

**原则**: selector 只做"取值"，绝不在 selector 里拼对象/数组

```tsx
// ✅ 原子选择器 - 只返回原始切片/原始值
const useContractAmount = () => usePurchaseStore(s => s.data.contractAmount);
const useCurrency = () => usePurchaseStore(s => s.data.currency);
const useAttn = () => usePurchaseStore(s => s.data.attn);
const useYourRef = () => usePurchaseStore(s => s.data.yourRef);
// ... 更多原子选择器
```

### 2. 派生 Hook 模式

**原则**: 派生对象统一在 Hook 内 `useMemo` 合成，依赖不变则返回引用不变

```tsx
// ✅ 派生 Hook - 在 hook 内用 useMemo 合成对象
export const useSupplierInfo = () => {
  const attn = useAttn();
  const yourRef = useYourRef();
  const supplierQuoteDate = useSupplierQuoteDate();
  
  return useMemo(() => ({
    attn,
    yourRef,
    supplierQuoteDate,
  }), [attn, yourRef, supplierQuoteDate]);
};
```

### 3. 工具函数模式

**原则**: 纯函数，不依赖外部状态

```tsx
// ✅ 工具函数 - 纯函数，不依赖外部状态
function calcContractAmountNumber(contractAmount: string): number {
  return parseFloat(contractAmount) || 0;
}
```

## 优化后的选择器架构

### 📁 文件结构
```
src/features/purchase/state/purchase.selectors.ts
├── 原子选择器 (私有)
│   ├── useContractAmount()
│   ├── useCurrency()
│   ├── useAttn()
│   └── ... (更多原子选择器)
├── 工具函数 (私有)
│   └── calcContractAmountNumber()
└── 派生 Hook (导出)
    ├── useContractAmountNumber()
    ├── useSupplierInfo()
    ├── useOrderInfo()
    ├── useContractInfo()
    ├── useCanGeneratePdf()
    ├── usePdfPayload()
    └── useValidationState()
```

### 🔧 核心优化点

#### 1. 原子订阅
```tsx
// 每个字段独立订阅，避免订阅整个对象
const useAttn = () => usePurchaseStore(s => s.data.attn);
const useYourRef = () => usePurchaseStore(s => s.data.yourRef);
```

#### 2. useMemo 合成
```tsx
// 使用 useMemo 确保引用稳定
return useMemo(() => ({
  attn,
  yourRef,
  supplierQuoteDate,
}), [attn, yourRef, supplierQuoteDate]);
```

#### 3. 依赖优化
```tsx
// 依赖数组只包含原子值，确保精确更新
}, [attn, yourRef, supplierQuoteDate]);
```

## 新增功能

### 1. PDF 相关选择器
```tsx
// 检查是否可以生成PDF
export const useCanGeneratePdf = () => {
  const attn = useAttn();
  const contractAmount = useContractAmount();
  
  return useMemo(() => {
    const hasSupplier = attn.trim().length > 0;
    const hasAmount = parseFloat(contractAmount) > 0;
    return hasSupplier && hasAmount;
  }, [attn, contractAmount]);
};

// 获取PDF负载数据
export const usePdfPayload = () => {
  const data = usePurchaseData();
  const contractAmountNumber = useContractAmountNumber();
  
  return useMemo(() => {
    return {
      ...data,
      contractAmountNumber,
      generatedAt: new Date().toISOString(),
    };
  }, [data, contractAmountNumber]);
};
```

### 2. 验证状态选择器
```tsx
// 获取表单验证状态
export const useValidationState = () => {
  const attn = useAttn();
  const contractAmount = useContractAmount();
  const orderNo = useOrderNo();
  
  return useMemo(() => {
    const errors: string[] = [];
    
    if (!attn.trim()) {
      errors.push('供应商名称不能为空');
    }
    
    if (!contractAmount || parseFloat(contractAmount) <= 0) {
      errors.push('合同金额必须大于0');
    }
    
    if (!orderNo.trim()) {
      errors.push('订单号不能为空');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }, [attn, contractAmount, orderNo]);
};
```

## 开发期保护措施

### 1. 渲染循环哨兵
```tsx
// src/features/purchase/hooks/useRenderLoopGuard.ts
export function useRenderLoopGuard(tag: string, threshold = 100) {
  const n = useRef(0);
  
  useEffect(() => {
    n.current += 1;
    if (n.current > threshold) {
      console.warn(`[LoopGuard] ${tag} excessive renders:`, n.current);
    }
  });
}

// 在主页面组件中使用
useRenderLoopGuard('PurchasePage');
```

### 2. 组件使用示例
```tsx
// 正确的使用方式
import { useSupplierInfo } from '../../state/purchase.selectors';

export function SupplierSection() {
  const { attn, yourRef, supplierQuoteDate } = useSupplierInfo();
  // 纯展示，不回写状态 ✅
  // ...
}
```

## 验收清单

### ✅ 已完成的优化
- [x] 控制台无 `Maximum update depth exceeded`
- [x] 无 `getSnapshot should be cached` 警告
- [x] Purchase 页面可正常编辑、合计实时更新
- [x] PDF 正常生成与预览
- [x] Autosave 按预期工作（2s debounce）
- [x] 所有 selector 采用原子订阅 + useMemo 合成模式
- [x] 添加渲染循环哨兵保护
- [x] 新增 PDF 相关选择器
- [x] 新增验证状态选择器

### 🔧 技术优势

#### 1. 性能优化
- **原子订阅**: 只订阅需要的字段，避免不必要的重渲染
- **引用稳定**: useMemo 确保依赖不变时引用稳定
- **精确更新**: 只有真正变化的字段才会触发更新

#### 2. 代码质量
- **职责分离**: 原子选择器、工具函数、派生 Hook 各司其职
- **类型安全**: 完整的 TypeScript 支持
- **可维护性**: 清晰的代码结构和命名规范

#### 3. 开发体验
- **调试友好**: 渲染循环哨兵帮助快速发现问题
- **扩展性强**: 新增选择器遵循统一模式
- **错误预防**: 从源头避免无限循环问题

## 后续建议

### 1. 组件侧使用规范
```tsx
// ✅ 推荐：使用多个原子取值 + useMemo 合成
const { a, b } = useSomeSelector();

// ⚠️ 万不得已：在 selector 返回对象时加 shallow
import { shallow } from 'zustand/shallow';
const { a, b } = usePurchaseStore(s => ({ a: s.data.a, b: s.data.b }), shallow);
```

### 2. Effect 依赖优化
```tsx
// ✅ 只放稳定值
useEffect(() => {
  // 业务逻辑
}, [stableValue, memoizedObject]);

// ❌ 避免直接放 store 里的"现拼对象"
}, [unstableObject]);
```

### 3. 监控和维护
- 定期检查是否有新的 selector 返回对象
- 使用渲染循环哨兵监控组件渲染次数
- 保持原子订阅 + useMemo 合成的统一模式

## 文件变更总结

### 修改文件
- `src/features/purchase/state/purchase.selectors.ts` - 完全重构
- `src/features/purchase/hooks/useRenderLoopGuard.ts` - 新增
- `src/features/purchase/app/PurchasePage.tsx` - 添加循环哨兵

### 优化效果
- **无限循环问题彻底解决**
- **性能显著提升**
- **代码结构更加清晰**
- **开发体验大幅改善**

优化完成时间：2025-01-08
