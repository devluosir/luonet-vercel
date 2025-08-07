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

    // 🌞 Apple 风格 - 浅色渐变类名
    'from-blue-300/80', 'to-blue-500/80',
    'from-emerald-300/80', 'to-emerald-500/80',
    'from-orange-300/80', 'to-orange-500/80',
    'from-violet-300/80', 'to-violet-500/80',
    'from-indigo-300/80', 'to-indigo-500/80',
    'from-pink-300/80', 'to-pink-500/80',
    'from-cyan-300/80', 'to-cyan-500/80',
    'from-fuchsia-300/80', 'to-fuchsia-500/80',

    // 🌙 Apple 风格 - 深色渐变类名
    'dark:from-blue-600/80', 'dark:to-blue-800/80',
    'dark:from-emerald-600/80', 'dark:to-emerald-800/80',
    'dark:from-orange-600/80', 'dark:to-orange-800/80',
    'dark:from-violet-600/80', 'dark:to-violet-800/80',
    'dark:from-indigo-600/80', 'dark:to-indigo-800/80',
    'dark:from-pink-600/80', 'dark:to-pink-800/80',
    'dark:from-cyan-600/80', 'dark:to-cyan-800/80',
    'dark:from-fuchsia-600/80', 'dark:to-fuchsia-800/80',

    // 🎨 Apple 风格 - 玻璃态效果
    'bg-white/30', 'bg-white/20', 'bg-white/40',
    'border-white/40', 'backdrop-blur-md',
    'bg-gray-800/80', 'text-gray-800',

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

    // 🎨 筛选器按钮颜色 - 动态生成
    {
      pattern: /(bg|text)-(blue|green|teal|purple|orange)-(100|700|900\/30)/,
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
