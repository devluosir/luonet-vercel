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
    
    // 渐变基础类
    {
      pattern: /bg-gradient-to-br/,
    },
    
    // 背景渐变颜色 - 使用正则确保覆盖所有颜色和变体
    {
      pattern: /from-(blue|green|teal|purple|orange|indigo|pink|violet)-(50|100|500|600|900)/,
      variants: ['hover', 'dark', 'dark:hover'],
    },
    {
      pattern: /to-(blue|green|teal|purple|orange|indigo|pink|violet)-(100|200|300|600|700|800)/,
      variants: ['hover', 'dark', 'dark:hover'],
    },
    
    // 文本颜色
    {
      pattern: /text-(blue|green|teal|purple|orange|indigo|pink|violet)-(300|700|800)/,
      variants: ['dark'],
    },
    
    // 背景颜色
    {
      pattern: /bg-(blue|green|teal|purple|orange|indigo|pink|violet)-(100|500|600)/,
      variants: ['hover', 'dark'],
    },
    
    // 边框颜色
    {
      pattern: /border-(blue|green|teal|purple|orange|indigo|pink|violet)-(200|800)/,
      variants: ['dark'],
    },
    
    // 灰色系（备用颜色）
    {
      pattern: /from-gray-(50|100|800|900)/,
      variants: ['hover', 'dark', 'dark:hover'],
    },
    {
      pattern: /to-gray-(100|200|700|800)/,
      variants: ['hover', 'dark', 'dark:hover'],
    },
    {
      pattern: /text-gray-(200|300|700|800)/,
      variants: ['dark'],
    },
    {
      pattern: /bg-gray-(100|500|800)/,
      variants: ['hover', 'dark'],
    },
    {
      pattern: /border-gray-(200|800)/,
      variants: ['dark'],
    },
    
    // 透明度变体
    {
      pattern: /(from|to)-(blue|green|teal|purple|orange|indigo|pink|violet)-(900)\/20/,
      variants: ['dark'],
    },
    {
      pattern: /(from|to)-(blue|green|teal|purple|orange|indigo|pink|violet)-(800)\/30/,
      variants: ['dark'],
    },
    {
      pattern: /(from|to)-(blue|green|teal|purple|orange|indigo|pink|violet)-(700)\/40/,
      variants: ['dark', 'dark:hover'],
    },
    
    // 特殊组合类
    'dark:from-blue-900/20',
    'dark:to-blue-800/30',
    'dark:hover:from-blue-800/30',
    'dark:hover:to-blue-700/40',
    'dark:from-green-900/20',
    'dark:to-green-800/30',
    'dark:hover:from-green-800/30',
    'dark:hover:to-green-700/40',
    'dark:from-teal-900/20',
    'dark:to-teal-800/30',
    'dark:hover:from-teal-800/30',
    'dark:hover:to-teal-700/40',
    'dark:from-purple-900/20',
    'dark:to-purple-800/30',
    'dark:hover:from-purple-800/30',
    'dark:hover:to-purple-700/40',
    'dark:from-orange-900/20',
    'dark:to-orange-800/30',
    'dark:hover:from-orange-800/30',
    'dark:hover:to-orange-700/40',
    'dark:from-indigo-900/20',
    'dark:to-indigo-800/30',
    'dark:hover:from-indigo-800/30',
    'dark:hover:to-indigo-700/40',
    'dark:from-pink-900/20',
    'dark:to-pink-800/30',
    'dark:hover:from-pink-800/30',
    'dark:hover:to-pink-700/40',
    'dark:from-violet-900/20',
    'dark:to-violet-800/30',
    'dark:hover:from-violet-800/30',
    'dark:hover:to-violet-700/40',
    
    // 悬停变体
    'hover:from-blue-100',
    'hover:to-blue-200',
    'hover:from-green-100',
    'hover:to-green-200',
    'hover:from-teal-100',
    'hover:to-teal-200',
    'hover:from-purple-100',
    'hover:to-purple-200',
    'hover:from-orange-100',
    'hover:to-orange-200',
    'hover:from-indigo-100',
    'hover:to-indigo-200',
    'hover:from-pink-100',
    'hover:to-pink-200',
    'hover:from-violet-100',
    'hover:to-violet-200',
  ],
  plugins: [],
} satisfies Config;
