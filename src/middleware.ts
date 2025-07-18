import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // 跳过静态资源和API路由的中间件处理
    const { pathname } = req.nextUrl;
    
    // 静态资源直接通过
    if (
      pathname.startsWith('/_next') ||
      pathname.startsWith('/static') ||
      pathname.startsWith('/images') ||
      pathname.startsWith('/fonts') ||
      pathname.startsWith('/icons') ||
      pathname.includes('.') // 文件扩展名
    ) {
      return NextResponse.next();
    }

    // API路由直接通过（除了需要认证的）
    if (pathname.startsWith('/api/') && !pathname.startsWith('/api/admin/')) {
      return NextResponse.next();
    }

    // 公开页面直接通过
    if (pathname === '/' || pathname === '/login') {
      return NextResponse.next();
    }

    // 其他页面需要认证
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        
        // 公开页面不需要认证
        if (pathname === '/' || pathname === '/login') {
          return true;
        }
        
        // API路由（除了admin）不需要认证
        if (pathname.startsWith('/api/') && !pathname.startsWith('/api/admin/')) {
          return true;
        }
        
        // 静态资源不需要认证
        if (
          pathname.startsWith('/_next') ||
          pathname.startsWith('/static') ||
          pathname.startsWith('/images') ||
          pathname.startsWith('/fonts') ||
          pathname.startsWith('/icons') ||
          pathname.includes('.')
        ) {
          return true;
        }
        
        // 其他页面需要有效token
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * 匹配所有请求路径，除了以下开头的路径：
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 