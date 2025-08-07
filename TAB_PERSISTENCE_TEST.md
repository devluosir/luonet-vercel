# Tab 持久化功能测试指南

## 🎯 功能说明

现在 Quotation 页面支持通过 URL 参数持久化 tab 状态，确保刷新页面后仍保持在当前 tab。

## ✅ 实现的功能

### 1. **URL 参数支持**
- 支持 `?tab=quotation` 和 `?tab=confirmation` 参数
- 优先级：URL 参数 > 全局变量 > 默认值

### 2. **自动 URL 更新**
- 切换 tab 时自动更新 URL 参数
- 使用 `history.replaceState` 不产生新的历史记录

### 3. **链接状态保持**
- 返回按钮和历史记录按钮都会保持当前 tab 状态

## 🧪 测试步骤

### 测试 1：基本功能测试
1. 访问 `/quotation` - 应该显示默认的 quotation tab
2. 点击 "Order Confirmation" tab
3. 检查 URL 是否变为 `/quotation?tab=confirmation`
4. 刷新页面 - 应该仍保持在 Order Confirmation tab

### 测试 2：URL 参数优先级测试
1. 直接访问 `/quotation?tab=confirmation`
2. 页面应该直接显示 Order Confirmation tab
3. 切换回 quotation tab
4. URL 应该变为 `/quotation?tab=quotation`

### 测试 3：链接状态保持测试
1. 在 Order Confirmation tab 下点击历史记录按钮
2. 应该跳转到 `/history?tab=confirmation`
3. 返回 quotation 页面
4. 应该仍保持在 Order Confirmation tab

### 测试 4：编辑模式测试
1. 在 Order Confirmation tab 下编辑一个记录
2. URL 应该类似 `/quotation/edit/123?tab=confirmation`
3. 刷新页面 - 应该仍保持在 Order Confirmation tab

## 📋 预期行为

| 操作 | 预期结果 |
|------|----------|
| 访问 `/quotation` | 显示 quotation tab |
| 访问 `/quotation?tab=confirmation` | 显示 confirmation tab |
| 切换 tab | URL 自动更新 |
| 刷新页面 | 保持当前 tab |
| 点击历史记录 | 保持 tab 状态 |

## 🔧 技术实现

### URL 参数解析
```typescript
const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
const tabFromUrl = searchParams?.get('tab') as 'quotation' | 'confirmation' | null;
```

### Tab 状态初始化
```typescript
const [activeTab, setActiveTab] = useState<'quotation' | 'confirmation'>(
  tabFromUrl || initialType || 'quotation'
);
```

### URL 更新
```typescript
const handleTabChange = useCallback((tab: 'quotation' | 'confirmation') => {
  setActiveTab(tab);
  
  if (typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState(null, '', url.toString());
  }
}, []);
```

## ✅ 优势

1. **用户体验**: 刷新页面后保持用户选择
2. **链接分享**: 可以分享特定 tab 的链接
3. **SEO 友好**: URL 参数不影响 SEO
4. **历史记录**: 不影响浏览器前进后退功能
5. **兼容性**: 向后兼容，不影响现有功能

## 🎉 总结

这个实现解决了用户反馈的核心问题：**切换 tab 后刷新页面会重置为默认值**。现在用户可以：

- 在任意 tab 下刷新页面，都会保持在当前 tab
- 分享特定 tab 的链接给他人
- 享受一致的用户体验 