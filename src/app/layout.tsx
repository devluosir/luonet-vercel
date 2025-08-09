import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { Providers } from './providers';
import ClientInitializer from '@/components/ClientInitializer';
import { createPreHydrationScript } from '@/utils/preHydrationCleanup';

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
        <Script id="pre-hydration-cleanup" strategy="beforeInteractive">
          {createPreHydrationScript()}
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
