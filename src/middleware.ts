import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 跳过静态资源和API路由的中间件处理
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/fonts') ||
    pathname.startsWith('/logo') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/manifest') ||
    pathname.includes('.') // 静态文件
  ) {
    return NextResponse.next()
  }

  // 只对需要认证的页面进行token验证
  const token = await getToken({ req: request })

  // 如果用户未登录且访问需要认证的页面
  if (!token && pathname !== '/') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // 如果用户已登录且访问登录页
  if (token && pathname === '/') {
    return NextResponse.redirect(new URL('/tools', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * 匹配所有路径，除了：
     * - api 路由
     * - 静态文件
     * - Next.js 内部图片路由
     * - manifest 文件
     * - 特定的图标文件（精确匹配）
     */
    "/((?!api|_next/static|_next/image|manifest.ts|logo|favicon.ico|icon.png|icon-512x512.png|apple-icon.png|fonts|images|doc).*)",
    "/"
  ]
} 