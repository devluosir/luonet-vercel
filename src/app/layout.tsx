import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { Providers } from './providers';
import ClientInitializer from '@/components/ClientInitializer';

const inter = Inter({ subsets: ['latin'] });

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
    <html lang="zh-CN">
      <head>
        <Script id="fix-extension-attrs" strategy="beforeInteractive">
          {`
            // 在 React 水合前移除浏览器扩展注入的属性，避免 hydration 警告
            (function(){
              const clearExtensionAttrs = () => {
                const body = document.body;
                if (body) {
                  // 移除 ColorZilla 扩展的属性
                  if (body.hasAttribute('cz-shortcut-listen')) {
                    body.removeAttribute('cz-shortcut-listen');
                  }
                  // 移除其他常见扩展属性
                  const extensionAttrs = [
                    'data-new-gr-c-s-check-loaded',  // Grammarly
                    'data-gr-ext-installed',         // Grammarly
                    'spellcheck',                    // 各种拼写检查扩展
                    'data-lt-installed',             // LanguageTool
                  ];
                  extensionAttrs.forEach(attr => {
                    if (body.hasAttribute(attr)) {
                      body.removeAttribute(attr);
                    }
                  });
                }
              };
              
              // 立即执行一次
              clearExtensionAttrs();
              
              // 在 DOMContentLoaded 时再执行一次，确保清理完整
              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', clearExtensionAttrs, { once: true });
              }
            })();
          `}
        </Script>
      </head>
      <body className={inter.className}>
        <Providers>
          <ClientInitializer />
          {children}
        </Providers>
      </body>
    </html>
  );
}
