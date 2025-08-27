# 工程守则 - Hydration & Store 最佳实践

## 🎯 核心原则

### 1. SSR首屏稳定值
- ✅ **使用占位值**：首屏渲染使用稳定的默认值，避免 `undefined` 导致的 hydration 不匹配
- ✅ **受控输入安全**：所有输入组件使用 `value={x ?? ''}` 防止受控/非受控切换警告
- ❌ **避免**：直接使用可能为 `undefined` 的动态值作为初始state

```typescript
// ✅ 正确
const [value, setValue] = useState(''); // 稳定默认值
<input value={data?.name ?? ''} />

// ❌ 错误  
const [value, setValue] = useState(data?.name); // 可能undefined
<input value={data?.name} />
```

### 2. 仅用户交互触发写回
- ✅ **用户主导**：只有用户的直接操作（点击、输入、选择）才触发状态更新
- ✅ **相同值拦截**：输入处理函数先检查值是否变化，相同值直接返回
- ❌ **避免**：在 `useEffect` 中自动调用 `onChange` 或写入 store

```typescript
// ✅ 正确
const handleInputChange = (newValue: string) => {
  if (newValue === currentValue) return; // 相同值拦截
  onChange(newValue);
};

// ❌ 错误
useEffect(() => {
  onChange(someComputedValue); // 自动写回
}, [someComputedValue]);
```

### 3. Selector 原子化
- ✅ **拆分选择器**：使用原子字段选择器而不是大对象聚合
- ✅ **统一工具带**：通过 `sel.*` 统一选择器，避免匿名函数
- ❌ **避免**：返回新对象的选择器导致 `useSyncExternalStore` 警告

```typescript
// ✅ 正确
const tab = useQuotationStore(sel.tab);
const currency = useQuotationStore(sel.currency);

// ❌ 错误
const { tab, currency } = useQuotationStore(s => ({ 
  tab: s.tab, 
  currency: s.currency 
})); // 每次新对象引用
```

### 4. 无变化不设置
- ✅ **浅比较保护**：Store actions 在设置前进行浅比较，无变化跳过更新
- ✅ **批处理更新**：密集更新使用 `batch()` 包裹，减少渲染次数
- ❌ **避免**：每次都无条件设置状态，即使值没有变化

```typescript
// ✅ 正确 - Store action
updateData: (updates) => set((state) => {
  const next = { ...state.data, ...updates };
  if (shallowEqual(next, state.data)) return {}; // 无变化跳过
  return { data: next };
});

// ✅ 正确 - 批处理
batch(() => {
  updateFrom(newFrom);
  updateCurrency(newCurrency);
});
```

## 🔧 开发调试工具

### 性能监控
- 开发模式启用事件采样日志追踪频繁更新
- 可选开启 `why-did-you-render` 定位不必要重渲染
- Store 初始化日志确认单例创建

### 断言保护
- 开发期检测并警告 UI 直接修改 `notes` 等业务逻辑字段
- 输入规范化工具确保数据一致性
- 类型安全的选择器工具带

## 📋 验收检查清单

部署前确认：
- [ ] 所有输入组件使用安全的受控值写法
- [ ] Store actions 包含无变化检测
- [ ] 选择器使用 `sel.*` 工具带，无匿名函数
- [ ] 无 `useEffect` 自动写回状态
- [ ] 批处理包裹密集更新操作
- [ ] 开发模式无 `useSyncExternalStore` 警告
- [ ] 性能基线测试通过

## 🚨 常见陷阱

1. **选择器返回新对象**：导致无限重渲染
2. **Effect 自动写回**：形成状态更新循环  
3. **受控组件值变化**：`undefined` → `''` 的切换警告
4. **Store 重复创建**：在组件内创建 store 实例
5. **密集更新未批处理**：频繁触发重渲染

遵循这些守则，确保系统稳定、性能优异且易于维护。
