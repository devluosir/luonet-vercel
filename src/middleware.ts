import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// 定义公开路由
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/api/auth',
];

// 定义静态资源路径
const STATIC_PATHS = [
  '/_next',
  '/static',
  '/images',
  '/fonts',
  '/icons',
];

// 定义需要管理员权限的路径
const ADMIN_PATHS = [
  '/admin',
  '/api/admin',
];

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    
    // 1. 静态资源直接通过
    if (STATIC_PATHS.some(path => pathname.startsWith(path)) || pathname.includes('.')) {
      return NextResponse.next();
    }

    // 2. 公开路由直接通过
    if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
      return NextResponse.next();
    }

    // 3. 其他路由需要认证
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        
        // 1. 静态资源不需要认证
        if (STATIC_PATHS.some(path => pathname.startsWith(path)) || pathname.includes('.')) {
          return true;
        }
        
        // 2. 公开路由不需要认证
        if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
          return true;
        }

        // 3. 没有token的情况
        if (!token) {
          return false;
        }

        // 4. 管理员路由需要管理员权限
        if (ADMIN_PATHS.some(path => pathname.startsWith(path))) {
          return token.isAdmin === true;
        }

        // 5. 业务路由需要对应的权限
        const moduleId = getModuleIdFromPath(pathname);
        if (moduleId) {
          return Array.isArray(token.permissions) && 
                 token.permissions.includes(moduleId);
        }

        // 6. 其他情况只要有token就可以
        return true;
      },
    },
  }
);

// 从路径获取模块ID
function getModuleIdFromPath(pathname: string): string | null {
  // 移除开头的斜杠和结尾的斜杠
  const path = pathname.replace(/^\/+|\/+$/g, '');
  
  // 如果是API路由，取第二段
  if (path.startsWith('api/')) {
    const parts = path.split('/');
    return parts[1] || null;
  }
  
  // 否则取第一段
  return path.split('/')[0] || null;
}

export const config = {
  matcher: [
    /*
     * 匹配所有请求路径，除了以下开头的路径：
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 