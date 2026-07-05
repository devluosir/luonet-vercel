import type { Config } from "tailwindcss";

export default {
  darkMode: 'class', // ✅ 启用类控制的暗黑模式
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/utils/**/*.{js,ts,jsx,tsx,mdx}",
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
        app: {
          dark: {
            base: '#1c1c1e',
            surface: '#2c2c2e',
          },
        },
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
    '!text-white',
    'bg-white/10',
    'bg-white/20',
    'bg-white/30',
    'border-white/40',
    'backdrop-blur-sm',
    'backdrop-blur-md',
    'backdrop-blur-lg',
    'text-pink-500',
    'text-yellow-500',
    {
      pattern: /(bg|text)-(blue|green|teal|purple|orange)-(100|700|900\/30)/,
      variants: ['dark', 'hover'],
    },
    {
      pattern: /(bg)-(blue|green|teal|purple|orange|gray)-(50|900\/20)/,
      variants: ['dark', 'hover'],
    },
    'border-gray-200/30', 'dark:border-gray-800/30',
    'border-gray-300/50', 'dark:border-gray-700/50',
    'border-white/30', 'border-white/50',
    'border-blue-500', 'dark:border-blue-400',
    'border-green-500', 'dark:border-green-400',
    'border-teal-500', 'dark:border-teal-400',
    'border-purple-500', 'dark:border-purple-400',
    'border-orange-500', 'dark:border-orange-400',
    'border-gray-300', 'dark:border-gray-500',
    'hover:border-blue-400', 'dark:hover:border-blue-400',
    'hover:border-green-400', 'dark:hover:border-green-400',
    'hover:border-teal-400', 'dark:hover:border-teal-400',
    'hover:border-purple-400', 'dark:hover:border-purple-400',
    'hover:border-orange-400', 'dark:hover:border-orange-400',
    'shadow-lg', 'hover:shadow-xl', 'active:shadow-md',
    'isolation', 'isolate',
    'z-0', 'z-10', 'z-20', 'z-30', 'z-50',
    'pointer-events-none',
    'relative', 'absolute', 'inset-0',
  ],
  plugins: [],
} satisfies Config;
