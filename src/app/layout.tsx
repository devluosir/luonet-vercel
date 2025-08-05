import './globals.css'
import { Providers } from './providers'
import type { Metadata } from 'next'
import { getLayoutIcons } from '@/lib/logo-config'

export const metadata: Metadata = {
  title: 'Luo & Company',
  description: '专业的报价和订单确认系统',
  manifest: '/static/manifest.json',
  icons: getLayoutIcons()
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Luo & Company" />
        <meta httpEquiv="Content-Language" content="zh-CN" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body className="font-sans" suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
