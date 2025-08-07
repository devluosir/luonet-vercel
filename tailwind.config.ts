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
    'caret-blue-600',
    'caret-blue-400',
    'dark:caret-blue-400',
    '-webkit-appearance-none',
    'touch-manipulation',
    // 模块背景颜色
    'bg-gradient-to-br',
    'from-blue-50', 'to-blue-100', 'hover:from-blue-100', 'hover:to-blue-200',
    'dark:from-blue-900/20', 'dark:to-blue-800/30', 'dark:hover:from-blue-800/30', 'dark:hover:to-blue-700/40',
    'from-green-50', 'to-green-100', 'hover:from-green-100', 'hover:to-green-200',
    'dark:from-green-900/20', 'dark:to-green-800/30', 'dark:hover:from-green-800/30', 'dark:hover:to-green-700/40',
    'from-teal-50', 'to-teal-100', 'hover:from-teal-100', 'hover:to-teal-200',
    'dark:from-teal-900/20', 'dark:to-teal-800/30', 'dark:hover:from-teal-800/30', 'dark:hover:to-teal-700/40',
    'from-purple-50', 'to-purple-100', 'hover:from-purple-100', 'hover:to-purple-200',
    'dark:from-purple-900/20', 'dark:to-purple-800/30', 'dark:hover:from-purple-800/30', 'dark:hover:to-purple-700/40',
    'from-orange-50', 'to-orange-100', 'hover:from-orange-100', 'hover:to-orange-200',
    'dark:from-orange-900/20', 'dark:to-orange-800/30', 'dark:hover:from-orange-800/30', 'dark:hover:to-orange-700/40',
    'from-indigo-50', 'to-indigo-100', 'hover:from-indigo-100', 'hover:to-indigo-200',
    'dark:from-indigo-900/20', 'dark:to-indigo-800/30', 'dark:hover:from-indigo-800/30', 'dark:hover:to-indigo-700/40',
    'from-pink-50', 'to-pink-100', 'hover:from-pink-100', 'hover:to-pink-200',
    'dark:from-pink-900/20', 'dark:to-pink-800/30', 'dark:hover:from-pink-800/30', 'dark:hover:to-pink-700/40',
    'from-violet-50', 'to-violet-100', 'hover:from-violet-100', 'hover:to-violet-200',
    'dark:from-violet-900/20', 'dark:to-violet-800/30', 'dark:hover:from-violet-800/30', 'dark:hover:to-violet-700/40',
    // 图标背景颜色
    'from-blue-500', 'to-blue-600',
    'from-green-500', 'to-green-600',
    'from-teal-500', 'to-teal-600',
    'from-purple-500', 'to-purple-600',
    'from-orange-500', 'to-orange-600',
    'from-indigo-500', 'to-indigo-600',
    'from-pink-500', 'to-pink-600',
    'from-violet-500', 'to-violet-600',
    // 文本颜色
    'text-blue-700', 'dark:text-blue-300',
    'text-green-700', 'dark:text-green-300',
    'text-teal-700', 'dark:text-teal-300',
    'text-purple-700', 'dark:text-purple-300',
    'text-orange-700', 'dark:text-orange-300',
    'text-indigo-700', 'dark:text-indigo-300',
    'text-pink-700', 'dark:text-pink-300',
    'text-violet-700', 'dark:text-violet-300',
    // 默认颜色（备用）
    'from-gray-50', 'to-gray-100', 'hover:from-gray-100', 'hover:to-gray-200',
    'dark:from-gray-800/50', 'dark:to-gray-700/40', 'dark:hover:from-gray-700/40', 'dark:hover:to-gray-600/50',
    'from-gray-500', 'to-gray-600',
    'text-gray-800', 'dark:text-gray-200',
    'text-gray-700', 'dark:text-gray-300',
    // 更多功能按钮颜色
    'bg-gray-100', 'hover:bg-gray-200', 'dark:bg-gray-800/50', 'dark:hover:bg-gray-700/60',
    'bg-gray-500'
  ],
  plugins: [],
} satisfies Config;
