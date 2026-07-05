import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import ClientInitializer from '@/components/ClientInitializer';
import { SIDEBAR_COLLAPSE_BOOTSTRAP_SCRIPT } from '@/utils/sidebarCollapse';


export const metadata: Metadata = {
  title: 'Luo & Company - 管理系统',
  description: 'Luo & Company 提供专业的报价单、销售确认单和发票管理系统，帮助企业管理业务流程，提高工作效率。',
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
                var themeConfig = localStorage.getItem('theme-config') || localStorage.getItem('themeConfig');
                if (themeConfig) {
                  var config = JSON.parse(themeConfig);
                  if (config.mode === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                }
              } catch (e) {
                console.error('主题预置脚本错误:', e);
              }
              ${SIDEBAR_COLLAPSE_BOOTSTRAP_SCRIPT}
            `,
          }}
        />
      </head>
      <body className="min-h-screen" suppressHydrationWarning>
        <Providers>
          <ClientInitializer />
          {children}
        </Providers>
      </body>
    </html>
  );
}
