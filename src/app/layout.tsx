import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import ClientInitializer from '@/components/ClientInitializer';
import { ThemeProvider, ThemeInitializer } from '@/components/ThemeProvider';


const inter = Inter({ subsets: ['latin'] });

// 强制动态渲染，确保 cookie 读取正确
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'MLUONET - 企业管理系统',
  description: '现代化的企业管理系统，提供完整的业务管理解决方案',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="h-full" suppressHydrationWarning>
      <head>
        {/* 预置脚本：在水合前确保 class 一致，避免闪烁与不一致 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                // 从localStorage读取主题配置
                var themeConfig = localStorage.getItem('themeConfig');
                if (themeConfig) {
                  var config = JSON.parse(themeConfig);
                  // 应用深色模式类
                  if (config.mode === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                  // 应用按钮主题类
                  if (config.buttonTheme === 'classic') {
                    document.documentElement.classList.add('classic-theme');
                  } else {
                    document.documentElement.classList.remove('classic-theme');
                  }
                }
              } catch (e) {
                console.error('主题预置脚本错误:', e);
              }
            `,
          }}
        />
      </head>
      <body className={`${inter.className} min-h-screen`}>
        <Providers>
          <ThemeProvider>
            <ThemeInitializer />
            <ClientInitializer />
            {children}
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
