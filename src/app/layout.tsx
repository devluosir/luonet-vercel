import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { preloadFonts } from '@/utils/fontLoader';
import { preloadImages } from '@/utils/imageLoader';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MLUONET - 企业管理系统',
  description: '现代化的企业管理系统，提供完整的业务管理解决方案',
};

// 在应用初始化时预热PDF资源
if (typeof window !== 'undefined') {
  // 预热字体资源
  preloadFonts();
  
  // 预热图片资源
  preloadImages();
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
