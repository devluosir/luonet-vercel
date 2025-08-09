import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import ClientInitializer from '@/components/ClientInitializer';
import { cookies } from 'next/headers';

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
  // 从 cookie 读取主题，确保 SSR 和客户端一致
  const theme = cookies().get('theme')?.value ?? 'light';
  const htmlClass = `${theme === 'dark' ? 'dark ' : ''}h-full`;

  return (
    <html lang="zh-CN" className={htmlClass} suppressHydrationWarning>
      <head>
        {/* 预置脚本：在水合前确保 class 一致，避免闪烁与不一致 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var t = localStorage.getItem('theme');
                if (t) document.documentElement.classList.toggle('dark', t === 'dark');
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className={`${inter.className} min-h-screen`}>
        <Providers>
          <ClientInitializer />
          {children}
        </Providers>
      </body>
    </html>
  );
}
