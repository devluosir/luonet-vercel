import type { Config } from "tailwindcss";

export default {
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
    
    // 背景渐变颜色 - 基础版本
    'from-blue-50', 'to-blue-100',
    'from-emerald-50', 'to-emerald-100',
    'from-cyan-50', 'to-cyan-100',
    'from-violet-50', 'to-violet-100',
    'from-amber-50', 'to-amber-100',
    'from-indigo-50', 'to-indigo-100',
    'from-rose-50', 'to-rose-100',
    'from-purple-50', 'to-purple-100',
    'from-fuchsia-50', 'to-fuchsia-100',
    
    // 图标背景渐变
    'from-blue-500', 'to-blue-600',
    'from-emerald-500', 'to-emerald-600',
    'from-cyan-500', 'to-cyan-600',
    'from-violet-500', 'to-violet-600',
    'from-amber-500', 'to-amber-600',
    'from-indigo-500', 'to-indigo-600',
    'from-rose-500', 'to-rose-600',
    'from-purple-500', 'to-purple-600',
    'from-fuchsia-500', 'to-fuchsia-600',
    
    // 后台管理页面模块颜色
    'text-blue-600', 'dark:text-blue-400',
    'text-cyan-600', 'dark:text-cyan-400',
    'text-violet-600', 'dark:text-violet-400',
    'text-amber-600', 'dark:text-amber-400',
    'text-rose-600', 'dark:text-rose-400',
    'text-fuchsia-600', 'dark:text-fuchsia-400',
    'text-indigo-600', 'dark:text-indigo-400',
    'bg-blue-100', 'dark:bg-blue-900/20',
    'bg-cyan-100', 'dark:bg-cyan-900/20',
    'bg-violet-100', 'dark:bg-violet-900/20',
    'bg-amber-100', 'dark:bg-amber-900/20',
    'bg-rose-100', 'dark:bg-rose-900/20',
    'bg-fuchsia-100', 'dark:bg-fuchsia-900/20',
    'bg-indigo-100', 'dark:bg-indigo-900/20',
    
    // 文本颜色
    'text-gray-800', 'dark:text-gray-200',
    
    // 灰色系（备用颜色）
    'from-gray-50', 'to-gray-100',
    'text-gray-700', 'dark:text-gray-300',
    'from-gray-500', 'to-gray-600',
    
    // 边框和阴影
    'border-gray-200/30', 'dark:border-gray-800/30',
    'hover:border-gray-300/50', 'dark:hover:border-gray-700/50',
    'shadow-lg', 'hover:shadow-xl', 'active:shadow-md',
    
    // 动画和过渡
    'transition-all', 'duration-300', 'ease-in-out',
    'hover:-translate-y-1', 'active:translate-y-0',
    'group-hover:scale-110', 'group-hover:shadow-2xl',
    'group-hover:scale-105', 'group-hover:drop-shadow-sm',
    'group-hover:drop-shadow-lg', 'group-hover:rotate-6', 'group-hover:animate-pulse',
    
    // 背景效果
    'backdrop-blur-sm', 'overflow-hidden', 'rounded-xl',
    
    // 图标相关
    'dashboard-module-icon', 'relative', 'z-10',
    'absolute', 'inset-0', 'flex-shrink-0',
    
    // 文本相关
    'text-base', 'font-bold', 'leading-tight', 'line-clamp-1',
    'text-left', 'flex-1', 'min-w-0',
    
    // 布局
    'flex', 'items-center', 'space-x-3', 'w-full', 'p-4', 'h-20',
    'p-2.5', 'rounded-xl', 'text-white', 'text-xs', 'font-bold',
    'min-w-[20px]', 'h-5', 'px-1.5', 'w-6', 'h-6',
    'flex', 'items-center', 'justify-center',
    
    // 特殊效果
    'opacity-0', 'group-hover:opacity-100', 'pointer-events-none',
    'bg-gradient-to-r', 'from-transparent', 'via-white/15', 'to-transparent',
    'bg-gradient-to-br', 'from-white/40', 'via-white/20', 'to-transparent',
    'group-hover:from-white/50', 'group-hover:via-white/30',
    'from-white/30', 'border-2', 'border-transparent', 'group-hover:border-white/30',
  ],
  plugins: [],
} satisfies Config;
