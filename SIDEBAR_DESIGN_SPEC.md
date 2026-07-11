# Sidebar 设计规范

企业级 SaaS 中性风格（参考 Microsoft 365 / Linear / Notion / Stripe Dashboard）。
落地实现见 TASK-114（`CODEX_TASKS.md`）。代码位置：`src/components/layout/AppSidebar.tsx`、`src/components/layout/AppUserMenu.tsx`。
分组标题带图标见 TASK-148（2026-07-11 追加修正 3：应用户要求撤销了可折叠交互，分组标题恢复为纯展示、不可点击，只保留图标）。

设计原则：80% 中性色 + 15% 品牌色 + 5% 功能色；图标默认统一灰色，仅激活菜单用品牌蓝；充足留白，不用彩虹式配色。

---

## 1. Figma 风格规范

### Sidebar 容器

| 属性 | 值 |
|---|---|
| Background | `#FAFBFC`（Light）/ `#1C1C1E`（Dark，即 `--app-dark-base`） |
| Border Right | `#E5E7EB`（Light）/ `rgba(255,255,255,0.08)`（Dark） |
| Width | 桌面展开态 240px；桌面收缩态 3.5rem / 56px；移动端侧滑菜单 260px |
| Padding | 16px（导航区四周内边距） |

### Section Title（组标签，如"新单据""登记表"）

TASK-148 起，组标签左侧加了一个小图标（**不可点击、不可折叠**，2026-07-11 追加修正 3 撤销了最初的折叠交互）：

| 属性 | 值 |
|---|---|
| Font Size | 12px |
| Weight | 600 |
| Color | `#9CA3AF`（Light）/ `#71717A`（Dark） |
| Text Transform | Uppercase |
| Spacing | 与上一组间距 24px（`mt-6`），与本组第一个菜单项间距 4px（`mb-1`，收紧过一次，让下方引导线看起来紧接着图标） |
| 分组图标 | 13px（`h-[13px] w-[13px]`），`strokeWidth 1.75`，颜色跟随标题文字（不单独上色），明显小于菜单项的 20px 图标（首版 14px+粗描边比例太近，收到 12px 又被反馈太小，最终定在 13px） |
| 分组图标映射 | 新单据 `FilePlus2` / 登记表 `ClipboardList` / 管理 `Settings2` / 工具 `Wrench`；`home`（首页）分组无标题、无图标 |
| 子项缩进引导线 | 展开态子项外层加 `ml-3 border-l border-sidebar-border pl-2`——`ml-3`（12px）跟组标题的 `px-3` 对齐，引导线左边缘正好落在图标左边缘正下方，视觉上像从图标延伸下来；收缩图标态（56px）不显示分组标题和引导线 |

### Menu Item（菜单项）

| 属性 | 值 |
|---|---|
| Height | 40px |
| Border Radius | 10px |
| Horizontal Padding | 12px |
| Icon Size | 20px |
| Icon Stroke Width | 1.75px |
| Icon / Text Gap | 10px |
| Font Size | 12px（原 14px，2026-07-11 应用户要求调小一号） |
| Font Weight | 500 |

#### 交互状态

| 状态 | Background | Text | Icon | 其他 |
|---|---|---|---|---|
| Normal | Transparent | `#4B5563` | `#64748B` | — |
| Hover | `#F3F4F6` | `#4B5563` | `#64748B` | — |
| Active | `#EEF4FF` | `#2563EB` | `#2563EB` | 左侧 3px 圆角品牌蓝指示条 |

Dark 模式下 Normal 文字 `#D1D5DB`、图标 `#94A3B8`；Hover 背景 `rgba(255,255,255,0.06)`；Active 背景 `rgba(37,99,235,0.16)`、文字/图标 `#60A5FA`（blue-400，暗底下比 `#2563EB` 更易读）。

### 颜色体系

| 用途 | 值 |
|---|---|
| Primary Blue | `#2563EB` |
| Success | `#10B981` |
| Warning | `#F59E0B` |
| Danger | `#EF4444` |

---

## 2. CSS Variables

已写入 `src/app/globals.css`。

```css
:root {
  --sidebar-bg: #FAFBFC;
  --sidebar-border: #E5E7EB;
  --sidebar-section-title: #9CA3AF;
  --sidebar-item-text: #4B5563;
  --sidebar-item-icon: #64748B;
  --sidebar-item-hover-bg: #F3F4F6;
  --sidebar-item-active-bg: #EEF4FF;
  --sidebar-item-active-text: #2563EB;
  --sidebar-item-active-icon: #2563EB;
  --sidebar-item-active-indicator: #2563EB;

  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-danger: #EF4444;

  --sidebar-width: 240px;
  --sidebar-margin: 240px;
}

html.dark {
  --sidebar-bg: var(--app-dark-base);
  --sidebar-border: rgba(255, 255, 255, 0.08);
  --sidebar-section-title: #71717A;
  --sidebar-item-text: #D1D5DB;
  --sidebar-item-icon: #94A3B8;
  --sidebar-item-hover-bg: rgba(255, 255, 255, 0.06);
  --sidebar-item-active-bg: rgba(37, 99, 235, 0.16);
  --sidebar-item-active-text: #60A5FA;
  --sidebar-item-active-icon: #60A5FA;
  --sidebar-item-active-indicator: #60A5FA;
}
```

---

## 3. Tailwind CSS Design Token

已写入 `tailwind.config.ts`（`theme.extend.colors`）。所有 `sidebar.*` token 直接映射到上面的 CSS 变量，深浅色自动切换，组件里不需要额外写 `dark:` 变体：

```ts
colors: {
  sidebar: {
    bg: 'var(--sidebar-bg)',
    border: 'var(--sidebar-border)',
    'section-title': 'var(--sidebar-section-title)',
    'item-text': 'var(--sidebar-item-text)',
    'item-icon': 'var(--sidebar-item-icon)',
    'item-hover-bg': 'var(--sidebar-item-hover-bg)',
    'item-active-bg': 'var(--sidebar-item-active-bg)',
    'item-active-text': 'var(--sidebar-item-active-text)',
    'item-active-icon': 'var(--sidebar-item-active-icon)',
    'item-active-indicator': 'var(--sidebar-item-active-indicator)',
  },
  status: {
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
  },
},
```

用法示例：`bg-sidebar-bg`、`text-sidebar-item-text`、`border-sidebar-border`、`bg-sidebar-item-active-bg`。

---

## 4. shadcn/ui 风格组件样式（可直接复用的 JSX 片段）

```tsx
// 菜单项
const navItemClassName = `flex h-10 items-center rounded-[10px] text-sm font-medium transition-colors ${
  isCollapsed ? 'justify-center px-0 mx-1' : 'gap-2.5 px-3'
} ${
  active
    ? 'bg-sidebar-item-active-bg text-sidebar-item-active-text'
    : 'text-sidebar-item-text hover:bg-sidebar-item-hover-bg'
}`;

const iconClassName = `h-5 w-5 shrink-0 ${
  active ? 'text-sidebar-item-active-icon' : 'text-sidebar-item-icon'
}`;

// 激活态左侧指示条（挂在菜单项外层 relative 容器内）
{active && !isCollapsed && (
  <span className="pointer-events-none absolute -left-4 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-sidebar-item-active-indicator" />
)}

// 组标签
<div className="mb-2 mt-6 px-3 text-xs font-semibold uppercase tracking-wide text-sidebar-section-title first:mt-0">
  {group.label}
</div>

// 容器
<aside className="border-r border-sidebar-border bg-sidebar-bg" style={{ width: 'var(--sidebar-width)' }}>
```

---

## 5. Light / Dark 配色对照表

| Token | Light | Dark |
|---|---|---|
| `sidebar-bg` | `#FAFBFC` | `#1C1C1E` |
| `sidebar-border` | `#E5E7EB` | `rgba(255,255,255,0.08)` |
| `sidebar-section-title` | `#9CA3AF` | `#71717A` |
| `sidebar-item-text` | `#4B5563` | `#D1D5DB` |
| `sidebar-item-icon` | `#64748B` | `#94A3B8` |
| `sidebar-item-hover-bg` | `#F3F4F6` | `rgba(255,255,255,0.06)` |
| `sidebar-item-active-bg` | `#EEF4FF` | `rgba(37,99,235,0.16)` |
| `sidebar-item-active-text` | `#2563EB` | `#60A5FA` |
| `sidebar-item-active-icon` | `#2563EB` | `#60A5FA` |
| `sidebar-item-active-indicator` | `#2563EB` | `#60A5FA` |
| `status-success` | `#10B981` | `#10B981` |
| `status-warning` | `#F59E0B` | `#F59E0B` |
| `status-danger` | `#EF4444` | `#EF4444` |

Dark 模式数值为本次新设计（用户仅给出 Light 规范），沿用项目既有 `--app-dark-base`/`--app-dark-surface` 暗色基调，激活态改用更亮的 blue-400 保证对比度。

---

## 6. 范围说明

本规范已应用于全部菜单入口：桌面端左侧 Sidebar（`AppSidebar.tsx`）、其内嵌的用户菜单（`AppUserMenu.tsx`），以及移动端底部导航（`MobileBottomTab.tsx`，含最多六个顶层入口和各分类下拉子菜单）。此前 Phase 6 的逐项彩色图标方案已全面停用，原 `src/constants/menuIconColors.ts` 已删除。

尺寸规格中，240px 展开宽度和 40px / 14px 菜单项仅用于桌面端 Sidebar；移动端侧滑菜单为保证触控和内容容纳能力，继续保持 260px 宽度。
