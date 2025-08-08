import type { Config } from "tailwindcss";

export default {
  darkMode: 'class', // ✅ 启用类控制的暗黑模式
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      screens: {
        'xs': '475px',  // 额外的小屏断点
      },
      fontFamily: {
        sans: ['Arial', 'Helvetica', 'sans-serif'],
      },
      colors: {
        // 删除CSS变量，避免干扰背景色
      },
      caretColor: {
        'blue-600': '#2563eb',
        'blue-400': '#60a5fa',
      }
    },
  },
  safelist: [
    // 基础类
    'caret-blue-600',
    'caret-blue-400',
    'dark:caret-blue-400',
    '-webkit-appearance-none',
    'touch-manipulation',
    '!text-white', // 确保图标颜色不被覆盖
    
    // 渐变基础类
    'bg-gradient-to-br',

    // 🌞 Apple 风格 - 淡雅默认渐变类名
    'from-blue-100', 'to-blue-200', 'from-emerald-100', 'to-emerald-200',
    'from-cyan-100', 'to-cyan-200', 'from-violet-100', 'to-violet-200',
    'from-orange-100', 'to-orange-200', 'from-indigo-100', 'to-indigo-200',
    'from-pink-100', 'to-pink-200', 'from-fuchsia-100', 'to-fuchsia-200',
    'from-gray-100', 'to-gray-200',

    // 🌞 Apple 风格 - 悬停增强渐变类名
    'hover:from-blue-200', 'hover:to-blue-300', 'hover:from-emerald-200', 'hover:to-emerald-300',
    'hover:from-cyan-200', 'hover:to-cyan-300', 'hover:from-violet-200', 'hover:to-violet-300',
    'hover:from-orange-200', 'hover:to-orange-300', 'hover:from-indigo-200', 'hover:to-indigo-300',
    'hover:from-pink-200', 'hover:to-pink-300', 'hover:from-fuchsia-200', 'hover:to-fuchsia-300',
    'hover:from-gray-200', 'hover:to-gray-300',

    // 🌙 Apple 风格 - 暗色默认渐变类名
    'dark:from-blue-300/70', 'dark:to-blue-500/70', 'dark:from-emerald-300/70', 'dark:to-emerald-500/70',
    'dark:from-cyan-300/70', 'dark:to-cyan-500/70', 'dark:from-violet-300/70', 'dark:to-violet-500/70',
    'dark:from-orange-300/70', 'dark:to-orange-500/70', 'dark:from-indigo-300/70', 'dark:to-indigo-500/70',
    'dark:from-pink-300/70', 'dark:to-pink-500/70', 'dark:from-fuchsia-300/70', 'dark:to-fuchsia-500/70',
    'dark:from-gray-300/70', 'dark:to-gray-500/70',

    // 🌙 Apple 风格 - 暗色悬停渐变类名
    'dark:hover:from-blue-400/80', 'dark:hover:to-blue-600/80', 'dark:hover:from-emerald-400/80', 'dark:hover:to-emerald-600/80',
    'dark:hover:from-cyan-400/80', 'dark:hover:to-cyan-600/80', 'dark:hover:from-violet-400/80', 'dark:hover:to-violet-600/80',
    'dark:hover:from-orange-400/80', 'dark:hover:to-orange-600/80', 'dark:hover:from-indigo-400/80', 'dark:hover:to-indigo-600/80',
    'dark:hover:from-pink-400/80', 'dark:hover:to-pink-600/80', 'dark:hover:from-fuchsia-400/80', 'dark:hover:to-fuchsia-600/80',
    'dark:hover:from-gray-400/80', 'dark:hover:to-gray-600/80',

    // 🎨 Apple 风格 - 玻璃态效果
    'bg-white/30', 'bg-white/20', 'bg-white/40',
    'border-white/40', 'backdrop-blur-md', 'backdrop-blur-sm',
    'text-gray-800', 'text-neutral-800',

    // 🎨 经典主题颜色
    'bg-gray-800/80', 'hover:from-blue-200', 'hover:to-blue-300', 'hover:from-emerald-200', 'hover:to-emerald-300',
    'hover:from-cyan-200', 'hover:to-cyan-300', 'hover:from-violet-200', 'hover:to-violet-300',
    'hover:from-orange-200', 'hover:to-orange-300', 'hover:from-indigo-200', 'hover:to-indigo-300',
    'hover:from-pink-200', 'hover:to-pink-300', 'hover:from-fuchsia-200', 'hover:to-fuchsia-300',
    'hover:from-gray-200', 'hover:to-gray-300',
    'dark:hover:from-blue-400/80', 'dark:hover:to-blue-600/80', 'dark:hover:from-emerald-400/80', 'dark:hover:to-emerald-600/80',
    'dark:hover:from-cyan-400/80', 'dark:hover:to-cyan-600/80', 'dark:hover:from-violet-400/80', 'dark:hover:to-violet-600/80',
    'dark:hover:from-orange-400/80', 'dark:hover:to-orange-600/80', 'dark:hover:from-indigo-400/80', 'dark:hover:to-indigo-600/80',
    'dark:hover:from-pink-400/80', 'dark:hover:to-pink-600/80', 'dark:hover:from-fuchsia-400/80', 'dark:hover:to-fuchsia-600/80',
    'dark:hover:from-gray-400/80', 'dark:hover:to-gray-600/80',

    // 强制包含所有渐变悬停类名
    'hover:from-blue-200', 'hover:to-blue-300', 'hover:from-emerald-200', 'hover:to-emerald-300',
    'hover:from-cyan-200', 'hover:to-cyan-300', 'hover:from-violet-200', 'hover:to-violet-300',
    'hover:from-orange-200', 'hover:to-orange-300', 'hover:from-indigo-200', 'hover:to-indigo-300',
    'hover:from-pink-200', 'hover:to-pink-300', 'hover:from-fuchsia-200', 'hover:to-fuchsia-300',
    'hover:from-gray-200', 'hover:to-gray-300',

    // 经典主题图标背景
    'group-hover:bg-blue-200/60', 'group-hover:bg-emerald-200/60', 'group-hover:bg-cyan-200/60',
    'group-hover:bg-violet-200/60', 'group-hover:bg-orange-200/60', 'group-hover:bg-indigo-200/60',
    'group-hover:bg-pink-200/60', 'group-hover:bg-fuchsia-200/60', 'group-hover:bg-gray-200/60',
    'dark:group-hover:bg-blue-900/40', 'dark:group-hover:bg-emerald-900/40', 'dark:group-hover:bg-cyan-900/40',
    'dark:group-hover:bg-violet-900/40', 'dark:group-hover:bg-orange-900/40', 'dark:group-hover:bg-indigo-900/40',
    'dark:group-hover:bg-pink-900/40', 'dark:group-hover:bg-fuchsia-900/40', 'dark:group-hover:bg-gray-900/40',

    // 🎨 徽章颜色
    'bg-blue-600', 'bg-emerald-600', 'bg-cyan-600', 'bg-violet-600', 
    'bg-orange-600', 'bg-indigo-600', 'bg-pink-600', 'bg-fuchsia-600', 'bg-gray-600',
    'dark:bg-blue-500', 'dark:bg-emerald-500', 'dark:bg-cyan-500', 'dark:bg-violet-500',
    'dark:bg-orange-500', 'dark:bg-indigo-500', 'dark:bg-pink-500', 'dark:bg-fuchsia-500', 'dark:bg-gray-500',
    
    // 经典主题徽章颜色
    'bg-gray-600', 'dark:bg-gray-500',

    // 🎨 玻璃态效果
    'bg-white/20', 'backdrop-blur-sm',
    'bg-white/10', 'backdrop-blur-md',
    'bg-white/30', 'backdrop-blur-lg',
    
    // 🎨 图标背景色 - 白天模式
    'from-blue-600', 'to-blue-700',
    'from-green-600', 'to-green-700',
    'from-orange-600', 'to-orange-700',
    'from-purple-600', 'to-purple-700',
    'from-indigo-600', 'to-indigo-700',
    'from-pink-600', 'to-pink-700',
    'from-cyan-600', 'to-cyan-700',
    'from-fuchsia-600', 'to-fuchsia-700',

    // 🎨 图标背景色 - 黑夜模式
    'dark:from-blue-500', 'dark:to-blue-600',
    'dark:from-green-500', 'dark:to-green-600',
    'dark:from-orange-500', 'dark:to-orange-600',
    'dark:from-purple-500', 'dark:to-purple-600',
    'dark:from-indigo-500', 'dark:to-indigo-600',
    'dark:from-pink-500', 'dark:to-pink-600',
    'dark:from-cyan-500', 'dark:to-cyan-600',
    'dark:from-fuchsia-500', 'dark:to-fuchsia-600',

    // 📝 文本颜色 - 完整类名
    'text-white', 'dark:text-white',
    'text-gray-800', 'dark:text-gray-200',
    'text-gray-700', 'dark:text-gray-300',
    'text-gray-600', 'dark:text-gray-400',
    'text-gray-500', 'dark:text-gray-500',
    'text-gray-400', 'dark:text-gray-400',
    'text-gray-300', 'dark:text-gray-300',
    'text-gray-200', 'dark:text-gray-200',
    'text-gray-100', 'dark:text-gray-100',
    'text-gray-50', 'dark:text-gray-50',

    // 📝 文本颜色 - 模块主色（用于彩色主题图标）
    'text-blue-600', 'dark:text-blue-500',
    'text-emerald-600', 'dark:text-emerald-500',
    'text-cyan-600', 'dark:text-cyan-500',
    'text-violet-600', 'dark:text-violet-500',
    'text-orange-600', 'dark:text-orange-500',
    'text-indigo-600', 'dark:text-indigo-500',
    'text-pink-600', 'dark:text-pink-500',
    'text-fuchsia-600', 'dark:text-fuchsia-500',

    // 🎨 筛选器按钮颜色 - 动态生成
    {
      pattern: /(bg|text)-(blue|green|teal|purple|orange)-(100|700|900\/30)/,
      variants: ['dark', 'hover'],
    },
    // 🎨 文档卡片悬停背景色 - 动态生成
    {
      pattern: /(bg)-(blue|green|teal|purple|orange|gray)-(50|900\/20)/,
      variants: ['dark', 'hover'],
    },

    // 🔲 边框颜色
    'border-gray-200/30', 'dark:border-gray-800/30',
    'border-gray-300/50', 'dark:border-gray-700/50',
    'border-white/30', 'border-white/50',

    // 🌟 阴影
    'shadow-lg', 'hover:shadow-xl', 'active:shadow-md',
    
    // 🎯 隔离和层级
    'isolation', 'isolate',
    'z-0', 'z-10', 'z-20', 'z-30', 'z-50',
    'pointer-events-none',
    'relative', 'absolute', 'inset-0',
  ],
  plugins: [],
} satisfies Config;
