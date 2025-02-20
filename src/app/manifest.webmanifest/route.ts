import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      name: "报价系统",
      short_name: "报价",
      description: "专业的报价和订单确认系统",
      start_url: "/",
      display: "standalone",
      background_color: "#1C1C1E",
      theme_color: "#007AFF",
      orientation: "any",
      categories: ["business", "productivity"],
      lang: "zh-CN",
      dir: "ltr",
      prefer_related_applications: false,
      scope: "/",
      display_override: ["standalone", "browser"],
      id: "/",
      icons: [
        {
          src: "/icons/icon-192x192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any maskable"
        },
        {
          src: "/icons/icon-512x512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable"
        }
      ]
    },
    {
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=3600'
      }
    }
  );
} 