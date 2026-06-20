# Codex 任务：修复询报价弹窗布局

## 目标文件

```
src/features/inquiry/components/InquiryFormModal.tsx
```

只改这一个文件，不要动其他文件。

---

## 问题描述

当前弹窗存在以下布局问题：

1. **弹窗过宽**：`max-w-2xl`（约 672px），输入框被无意义地拉长
2. **输入框边框太淡**：`border-gray-200` 在白色背景上几乎不可见，像是只有底部线条
3. **底部空白过大**：`min-h-[96px]` 的 textarea 加上 `space-y-5` 的自动间距，导致按钮区域前有大片空白
4. **聚焦反馈缺失**：输入框聚焦时只有边框颜色变化，没有光晕效果
5. **标题字号偏大**：`text-lg` 在小弹窗里显得头重脚轻

---

## 修改要求

### 1. 弹窗容器

```diff
- <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl dark:bg-[#2C2C2E]">
+ <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-[#2C2C2E]">
```

- 宽度从 `max-w-2xl` 改为 `max-w-md`（448px），弹窗内容不再被撑宽
- 阴影从 `shadow-xl` 改为 `shadow-2xl`，层次感更强

---

### 2. 标题栏

```diff
- <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
-   <h2 className="text-lg font-semibold ...">
-   <p className="mt-1 text-sm text-gray-500 ...">询价编号可自动生成，也可以手动覆盖。</p>
+ <div className="flex items-start justify-between px-6 pb-4 pt-5">
+   <h2 className="text-base font-semibold ...">
+   <p className="mt-0.5 text-xs text-gray-400 ...">编号可自动生成，修改日期会同步更新编号</p>
```

- 移除标题栏自带的 `border-b`，改为下方单独放一条 `<div className="h-px bg-gray-100 dark:bg-gray-700" />`
- 标题字号从 `text-lg` 改为 `text-base`
- 副标题从 `text-sm text-gray-500` 改为 `text-xs text-gray-400`，降低视觉权重
- 关闭按钮从 `p-2` 改为 `p-1.5`，图标从 `h-5 w-5` 改为 `h-4 w-4`，与缩小后的标题更协调

---

### 3. 所有输入框统一样式

将所有 `<input>` 和 `<textarea>` 的 className 中：

| 原来 | 改为 |
|------|------|
| `border border-gray-200` | `border border-gray-300` |
| `bg-white` | `bg-gray-50` |
| `h-10` | `h-9` |
| `px-3` | `px-2.5` |
| `outline-none focus:border-blue-400` | `outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500/20` |
| `dark:border-gray-700 dark:bg-gray-900` | `dark:border-gray-600 dark:bg-gray-800 dark:focus:border-blue-400 dark:focus:bg-gray-900` |

说明：
- `border-gray-300` 在白色背景上清晰可辨
- `bg-gray-50` 给输入框淡灰背景，聚焦时变白，形成视觉反馈
- `focus:ring-1 focus:ring-blue-500/20` 添加淡蓝光晕，聚焦状态更明确
- 询价编号输入框额外加 `font-mono`，与编号格式（C260620F）风格匹配

---

### 4. form 布局结构

移除 form 上的 `space-y-5`，改为每个区块手动设置底部间距（`mb-4` / `mb-5`），避免最后一个元素到按钮之间出现多余空白。

```diff
- <form onSubmit={handleSubmit} className="space-y-5 px-5 py-5">
+ <form onSubmit={handleSubmit} className="px-6 py-5">
```

---

### 5. 日期格式提示

```diff
- <span className="block text-xs text-gray-400">
-   保存格式：{formatShortDate(dateInputToDate(dateInput))}
- </span>
+ <span className="block text-[11px] text-gray-400">
+   → {formatShortDate(dateInputToDate(dateInput))}
+ </span>
```

缩短提示文字，节省纵向空间。

---

### 6. textarea

```diff
- <textarea
-   className="min-h-[96px] w-full rounded-lg border ... "
-   placeholder="登记产品、规格、数量或客户需求摘要"
+ <textarea
+   rows={3}
+   className="w-full resize-none rounded-lg border ..."
+   placeholder="产品名称、规格、数量或客户需求摘要"
```

- 用 `rows={3}` 代替 `min-h-[96px]`，高度固定不随内容撑开
- 加 `resize-none`，禁止用户手动拖拽调整大小（弹窗内不适合）

---

### 7. 按钮区域

```diff
- <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
+ <div className="flex items-center justify-end gap-2">
```

- 移除顶部分割线和 `pt-4`，让按钮紧接在 textarea 下方，消除大片空白
- 提交按钮加 `active:bg-blue-800`，点击有反馈

---

## 验收标准

完成后对照截图自检：

1. [ ] 弹窗宽度明显比之前窄，大约是屏幕宽度的 40%~50%（桌面端）
2. [ ] 输入框有清晰可见的灰色边框（不是隐约的浅灰线）
3. [ ] 点击输入框后出现蓝色边框 + 淡蓝光晕，背景变白
4. [ ] textarea 高度固定约 3 行，不会因为空内容留出大段空白
5. [ ] 取消/新增按钮紧跟在 textarea 下方，中间没有大段留白
6. [ ] 标题"新增询价"字号适中，不压过输入内容
7. [ ] 日期下方的格式提示为 `→ [6.20]` 小字，不占用过多空间

---

## 注意

- **只改 `InquiryFormModal.tsx`**，不要触碰其他文件
- 不要引入新依赖
- 保持现有的所有 state 逻辑、表单验证和 `useEffect` 不变，只改 JSX 结构和 className
