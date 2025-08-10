# 主题管理系统使用指南

## 概述

MLUONET 项目现在包含一个完整的主题管理系统，支持多种主题模式、深色模式切换和动态样式管理。

## 核心特性

### 🎨 多主题支持
- **Colorful 主题**: 彩色渐变背景，现代化的视觉效果
- **Classic 主题**: 简洁的白色/灰色背景，经典商务风格

### 🌙 深色模式
- 完整的深色模式支持
- 自动适配系统偏好
- 平滑的主题切换动画

### 🔧 动态配置
- 实时主题切换，无需刷新页面
- 主题设置自动持久化
- 响应式设计，完美适配各种设备

## 快速开始

### 1. 基本使用

```tsx
import { useThemeManager } from '@/hooks/useThemeManager';

function MyComponent() {
  const { 
    mode, 
    buttonTheme, 
    toggleMode, 
    toggleButtonTheme,
    isDark,
    isColorful 
  } = useThemeManager();

  return (
    <div>
      <p>当前模式: {mode}</p>
      <p>按钮主题: {buttonTheme}</p>
      <button onClick={toggleMode}>切换模式</button>
      <button onClick={toggleButtonTheme}>切换按钮主题</button>
    </div>
  );
}
```

### 2. 主题切换组件

```tsx
import { ThemeToggle, ThemeModeToggle, ThemeDropdown } from '@/components/ThemeToggle';

function Header() {
  return (
    <header>
      {/* 简单的模式切换按钮 */}
      <ThemeModeToggle />
      
      {/* 紧凑的双按钮切换 */}
      <ThemeCompactToggle />
      
      {/* 完整的下拉菜单 */}
      <ThemeDropdown />
      
      {/* 自定义变体 */}
      <ThemeToggle variant="button" className="custom-class" />
    </header>
  );
}
```

### 3. 获取模块颜色

```tsx
import { useThemeManager } from '@/hooks/useThemeManager';

function ModuleButton({ moduleId }: { moduleId: string }) {
  const { getModuleColors, buttonTheme } = useThemeManager();
  
  const colors = getModuleColors(moduleId, buttonTheme);
  
  return (
    <button
      className={`
        bg-gradient-to-br
        ${colors.bgFrom} ${colors.bgTo}
        ${colors.hoverFrom} ${colors.hoverTo}
        ${colors.darkBgFrom} ${colors.darkBgTo}
        ${colors.darkHoverFrom} ${colors.darkHoverTo}
        ${colors.textColor}
      `}
    >
      <div className={`${colors.iconBg}`}>
        <Icon className={colors.iconColor} />
      </div>
      <span>{moduleName}</span>
    </button>
  );
}
```

## 高级用法

### 1. 主题管理器

```tsx
import { themeManager } from '@/utils/themeUtils';

// 获取当前配置
const config = themeManager.getConfig();

// 更新配置
themeManager.updateConfig({
  mode: 'dark',
  buttonTheme: 'classic',
  primaryColor: '#ff6b6b'
});

// 添加监听器
const unsubscribe = themeManager.addListener((newConfig) => {
  console.log('主题配置已更新:', newConfig);
});

// 清理监听器
unsubscribe();
```

### 2. 样式工具类

```tsx
import { 
  createModuleButtonClass, 
  createCardClass,
  combineStyles,
  conditionalStyles 
} from '@/utils/themeStyles';

function MyComponent() {
  const { mode, buttonTheme } = useThemeManager();
  
  // 创建模块按钮样式
  const buttonClass = createModuleButtonClass('quotation', buttonTheme, mode);
  
  // 创建卡片样式
  const cardClass = createCardClass(mode);
  
  // 组合样式
  const combinedClass = combineStyles(
    'p-4',
    conditionalStyles(isDark, 'bg-gray-800', 'bg-white'),
    'rounded-lg'
  );
  
  return (
    <div className={cardClass}>
      <button className={buttonClass}>
        点击我
      </button>
    </div>
  );
}
```

### 3. CSS变量使用

```css
/* 在CSS中使用变量 */
.my-component {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--border-primary);
  box-shadow: var(--shadow-md);
  transition: all var(--transition-normal);
}

.my-button {
  background-color: var(--primary-blue);
  color: white;
  padding: var(--spacing-4);
  border-radius: var(--radius-lg);
}
```

## 主题配置

### 默认配置

```tsx
const DEFAULT_THEME = {
  mode: 'light',           // 'light' | 'dark'
  buttonTheme: 'colorful', // 'colorful' | 'classic'
  primaryColor: '#2563eb', // 可选
  accentColor: '#059669'   // 可选
};
```

### 自定义主题颜色

```tsx
// 在 themeUtils.ts 中扩展颜色
export const THEME_COLORS = {
  // ... 现有颜色
  custom: {
    light: '#your-color',
    dark: '#your-dark-color',
    bg: {
      light: 'from-custom-100 to-custom-200',
      dark: 'from-custom-300/70 to-custom-500/70'
    },
    hover: {
      light: 'hover:from-custom-200 hover:to-custom-300',
      dark: 'dark:hover:from-custom-400/80 dark:hover:to-custom-600/80'
    }
  }
};
```

## 最佳实践

### 1. 组件设计

```tsx
// ✅ 好的做法：使用主题Hook
function MyComponent() {
  const { mode, isDark } = useThemeManager();
  
  return (
    <div className={`
      ${isDark ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}
      transition-colors duration-300
    `}>
      内容
    </div>
  );
}

// ❌ 避免：硬编码颜色
function MyComponent() {
  return (
    <div className="bg-white text-black">
      内容
    </div>
  );
}
```

### 2. 样式组织

```tsx
// ✅ 好的做法：使用样式工具类
import { baseStyles, transitionStyles } from '@/utils/themeStyles';

const buttonClass = combineStyles(
  baseStyles.button.primary.light,
  baseStyles.button.primary.dark,
  transitionStyles.normal
);

// ❌ 避免：内联样式字符串
const buttonClass = 'bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600 transition-all duration-300';
```

### 3. 性能优化

```tsx
// ✅ 好的做法：使用useCallback缓存函数
function MyComponent() {
  const { getModuleColors } = useThemeManager();
  
  const getColors = useCallback((moduleId: string) => {
    return getModuleColors(moduleId);
  }, [getModuleColors]);
  
  return <ModuleButton getColors={getColors} />;
}
```

## 故障排除

### 1. 主题不生效

```tsx
// 检查是否正确包装了ThemeProvider
function App() {
  return (
    <ThemeProvider>
      <ThemeInitializer />
      <YourApp />
    </ThemeProvider>
  );
}
```

### 2. 样式闪烁

```tsx
// 确保在layout.tsx中正确设置初始主题
export default function RootLayout({ children }) {
  const theme = cookies().get('theme')?.value ?? 'light';
  const htmlClass = `${theme === 'dark' ? 'dark ' : ''}h-full`;

  return (
    <html lang="zh-CN" className={htmlClass} suppressHydrationWarning>
      {/* ... */}
    </html>
  );
}
```

### 3. 颜色不匹配

```tsx
// 检查Tailwind safelist是否包含所需类名
// 在 tailwind.config.ts 中添加
safelist: [
  'from-blue-100', 'to-blue-200',
  'dark:from-blue-300/70', 'dark:to-blue-500/70',
  // ... 其他需要的类名
]
```

## 扩展指南

### 1. 添加新的主题模式

```tsx
// 1. 扩展类型定义
export type ThemeMode = 'light' | 'dark' | 'auto';

// 2. 更新主题管理器
class ThemeManager {
  setMode(mode: ThemeMode) {
    if (mode === 'auto') {
      // 检测系统偏好
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.updateConfig({ mode: prefersDark ? 'dark' : 'light' });
    } else {
      this.updateConfig({ mode });
    }
  }
}
```

### 2. 添加新的颜色主题

```tsx
// 1. 在 THEME_COLORS 中添加新颜色
export const THEME_COLORS = {
  // ... 现有颜色
  sunset: {
    light: '#f97316',
    dark: '#ea580c',
    bg: {
      light: 'from-orange-100 to-red-200',
      dark: 'from-orange-300/70 to-red-500/70'
    },
    hover: {
      light: 'hover:from-orange-200 hover:to-red-300',
      dark: 'dark:hover:from-orange-400/80 dark:hover:to-red-600/80'
    }
  }
};

// 2. 更新模块颜色映射
const colorMap = {
  // ... 现有映射
  sunset: 'sunset'
};
```

### 3. 创建自定义主题组件

```tsx
import { useThemeManager } from '@/hooks/useThemeManager';

export const CustomThemeToggle: React.FC = () => {
  const { mode, toggleMode } = useThemeManager();
  
  return (
    <button
      onClick={toggleMode}
      className={`
        p-3 rounded-full
        ${mode === 'dark' 
          ? 'bg-yellow-400 text-yellow-900' 
          : 'bg-gray-800 text-white'
        }
        transition-all duration-300
      `}
    >
      {mode === 'dark' ? '☀️' : '🌙'}
    </button>
  );
};
```

## 总结

主题管理系统提供了：

1. **完整的主题支持**: 多种主题模式和深色模式
2. **易用的API**: 简单的Hook和组件接口
3. **高性能**: 优化的渲染和状态管理
4. **可扩展性**: 模块化设计，易于扩展
5. **类型安全**: 完整的TypeScript支持

通过遵循本指南，你可以轻松地在项目中使用和扩展主题系统，为用户提供更好的视觉体验。
