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
        background: "var(--background)",
        foreground: "var(--foreground)",
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

    // 🌞 白天模式
    'from-blue-50', 'to-blue-100',
    'from-emerald-50', 'to-emerald-100',
    'from-cyan-50', 'to-cyan-100',
    'from-violet-50', 'to-violet-100',
    'from-orange-50', 'to-orange-100',
    'from-indigo-50', 'to-indigo-100',
    'from-rose-50', 'to-rose-100',
    'from-fuchsia-50', 'to-fuchsia-100',

    // 🌙 黑夜模式
    'dark:from-blue-900/20', 'dark:to-blue-800/30',
    'dark:from-emerald-900/20', 'dark:to-emerald-800/30',
    'dark:from-cyan-900/20', 'dark:to-cyan-800/30',
    'dark:from-violet-900/20', 'dark:to-violet-800/30',
    'dark:from-orange-900/20', 'dark:to-orange-800/30',
    'dark:from-indigo-900/20', 'dark:to-indigo-800/30',
    'dark:from-rose-900/20', 'dark:to-rose-800/30',
    'dark:from-fuchsia-900/20', 'dark:to-fuchsia-800/30',

    // 🎨 图标背景色
    'from-blue-500', 'to-blue-600',
    'from-emerald-500', 'to-emerald-600',
    'from-cyan-500', 'to-cyan-600',
    'from-violet-500', 'to-violet-600',
    'from-orange-500', 'to-orange-600',
    'from-indigo-500', 'to-indigo-600',
    'from-rose-500', 'to-rose-600',
    'from-fuchsia-500', 'to-fuchsia-600',

    // 🌙 夜间图标色
    'dark:from-blue-600', 'dark:to-blue-700',
    'dark:from-emerald-600', 'dark:to-emerald-700',
    'dark:from-cyan-600', 'dark:to-cyan-700',
    'dark:from-violet-600', 'dark:to-violet-700',
    'dark:from-orange-600', 'dark:to-orange-700',
    'dark:from-indigo-600', 'dark:to-indigo-700',
    'dark:from-rose-600', 'dark:to-rose-700',
    'dark:from-fuchsia-600', 'dark:to-fuchsia-700',

    // 🎯 悬停状态
    'hover:from-blue-100', 'hover:to-blue-200',
    'hover:from-emerald-100', 'hover:to-emerald-200',
    'hover:from-cyan-100', 'hover:to-cyan-200',
    'hover:from-violet-100', 'hover:to-violet-200',
    'hover:from-orange-100', 'hover:to-orange-200',
    'hover:from-indigo-100', 'hover:to-indigo-200',
    'hover:from-rose-100', 'hover:to-rose-200',
    'hover:from-fuchsia-100', 'hover:to-fuchsia-200',

    // 🌙 夜间悬停状态
    'dark:hover:from-blue-800/30', 'dark:hover:to-blue-700/40',
    'dark:hover:from-emerald-800/30', 'dark:hover:to-emerald-700/40',
    'dark:hover:from-cyan-800/30', 'dark:hover:to-cyan-700/40',
    'dark:hover:from-violet-800/30', 'dark:hover:to-violet-700/40',
    'dark:hover:from-orange-800/30', 'dark:hover:to-orange-700/40',
    'dark:hover:from-indigo-800/30', 'dark:hover:to-indigo-700/40',
    'dark:hover:from-rose-800/30', 'dark:hover:to-rose-700/40',
    'dark:hover:from-fuchsia-800/30', 'dark:hover:to-fuchsia-700/40',

    // 🌙 透明背景和悬停效果
    'bg-transparent',
    'hover:bg-blue-50/50', 'dark:hover:bg-blue-900/10',
    'hover:bg-emerald-50/50', 'dark:hover:bg-emerald-900/10',
    'hover:bg-cyan-50/50', 'dark:hover:bg-cyan-900/10',
    'hover:bg-violet-50/50', 'dark:hover:bg-violet-900/10',
    'hover:bg-orange-50/50', 'dark:hover:bg-orange-900/10',
    'hover:bg-indigo-50/50', 'dark:hover:bg-indigo-900/10',
    'hover:bg-rose-50/50', 'dark:hover:bg-rose-900/10',
    'hover:bg-fuchsia-50/50', 'dark:hover:bg-fuchsia-900/10',
    'hover:bg-gray-50/50', 'dark:hover:bg-gray-900/10',

    // 📝 文本颜色
    'text-gray-800', 'dark:text-gray-200',
    'text-gray-700', 'dark:text-gray-300',
    'text-gray-600', 'dark:text-gray-400',
    'text-gray-500', 'dark:text-gray-500',
    'text-gray-400', 'dark:text-gray-400',
    'text-gray-300', 'dark:text-gray-300',
    'text-gray-200', 'dark:text-gray-200',
    'text-gray-100', 'dark:text-gray-100',
    'text-gray-50', 'dark:text-gray-50',

    // 🔲 边框颜色
    'border-gray-200/30', 'dark:border-gray-800/30',
    'border-gray-300/50', 'dark:border-gray-700/50',
    'border-white/30', 'border-white/50',

    // 🌟 阴影
    'shadow-lg', 'hover:shadow-xl', 'active:shadow-md',
  ],
  plugins: [],
} satisfies Config;
