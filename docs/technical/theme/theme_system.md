# 主题系统现状

最后更新：2026-07-06

## 当前结论

主题系统现在只负责明暗模式。旧的 `classic` / `colorful` 按钮主题、调色盘入口、`buttonTheme` API 和运行时模块卡片 CSS 变量已经退休。

## 入口文件

- `src/utils/themeUtils.ts`：`ThemeManager` 单例，负责读取、保存和应用主题模式。
- `src/contexts/ThemeContext.tsx`：React Context，给组件提供 `mode`、`isDark`、`toggleTheme()`。
- `src/components/ThemeToggle.tsx`：明暗切换 UI，支持 `button`、`dropdown`、`compact` 三种展示。
- `src/app/layout.tsx`：首屏脚本在 hydration 前读取本地配置并给 `html` 设置 `dark` class。
- `tailwind.config.ts`：提供 `app.dark.base`、`app.dark.surface` 语义色。

## 存储与兼容

当前主 key 是 `theme-config`，兼容读取旧 key `themeConfig`。配置只保留：

```json
{
  "mode": "light" | "dark"
}
```

不再写入 `buttonTheme`，也不再使用 `theme-settings`。

## 深色层级

- Level 1 / 应用背景：`#1c1c1e`，Tailwind：`dark:bg-app-dark-base`。
- Level 2 / 弹层和用户菜单表面：`#2c2c2e`，Tailwind：`dark:bg-app-dark-surface`。
- `globals.css` 中的 `--bg-primary`、`--bg-secondary` 和 `--app-dark-*` 与上述层级保持一致。

侧边栏、顶栏、主内容区、底部栏和用户菜单使用同一套深色层级，避免局部出现不同黑色拼接。

## Dashboard 模块卡片

模块卡片在 `src/components/dashboard/ModuleButton.tsx` 中使用静态 Tailwind 类：

- 浅色：`bg-*-50`、`border-*-200`。
- 深色：`dark:bg-*-500/10`、`dark:border-*-500/20`。

不再使用运行时 JS 拼接 CSS 变量，也不再依赖 `.module-button` / `.dashboard-module-button` 的 `!important` 覆盖。

## 图标语义

`ThemeToggle` 图标始终代表当前状态：

- 浅色模式显示太阳。
- 深色模式显示月亮。

按钮点击行为仍是切换到另一种模式，但不再用“下一步动作”图标表达。

## 已移除实现

- `src/components/ThemeDebugger.tsx`
- `src/constants/colorMap.ts`
- `src/constants/colorThemeGuide.md`
- `src/hooks/useThemeManager.ts`
- `src/utils/themeStyles.ts`
- `classic-theme` / `buttonTheme` / `THEME_COLORS` 相关 CSS 与 API
