import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// 定义公开路由
const PUBLIC_ROUTES = [
  '/',
  '/api/auth',
  '/test-login',
];

// 定义静态资源路径
const STATIC_PATHS = [
  '/_next',
  '/static',
  '/images',
  '/fonts',
  '/assets',
];

// 定义需要管理员权限的路径
const ADMIN_PATHS = [
  '/admin',
  '/api/admin',
];

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    
    console.log('中间件处理请求:', { pathname, url: req.url });
    
    // 1. 静态资源直接通过
    if (STATIC_PATHS.some(path => pathname.startsWith(path)) || pathname.includes('.')) {
      console.log('静态资源，直接通过');
      return NextResponse.next();
    }

    // 2. 公开路由直接通过
    if (PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'))) {
      console.log('公开路由，直接通过');
      return NextResponse.next();
    }

    // 3. 检查是否是已知的业务路由
    const knownRoutes = [
      '/dashboard',
      '/admin',
      '/quotation',
      '/packing',
      '/invoice',
      '/purchase',
      '/history',
      '/customer',
      '/date-tools',
      '/mail',
      '/tools',
      '/create-user',
      '/api'
    ];
    
    const isKnownRoute = knownRoutes.some(route => 
      pathname === route || pathname.startsWith(route + '/')
    );
    
    // 如果不是已知路由，直接通过让Next.js处理404
    if (!isKnownRoute) {
      console.log('未知路由，直接通过');
      return NextResponse.next();
    }

    console.log('已知路由，需要认证检查');
    // 4. 已知路由需要认证 - 让 withAuth 处理权限检查
    return null;
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        
        console.log('权限检查:', { pathname, hasToken: !!token, isAdmin: token?.isAdmin });
        
        // 1. 静态资源不需要认证
        if (STATIC_PATHS.some(path => pathname.startsWith(path)) || pathname.includes('.')) {
          return true;
        }
        
        // 2. 公开路由不需要认证
        if (PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'))) {
          return true;
        }

        // 3. 没有token的情况 - 拒绝所有其他访问
        if (!token) {
          console.log('没有token，拒绝访问:', pathname);
          return false;
        }

        // 4. 检查token是否包含必要的用户信息（简化检查）
        if (!token.username) {
          console.log('Token信息不完整，拒绝访问:', pathname);
          return false;
        }

        // 5. 管理员路径检查
        if (ADMIN_PATHS.some(path => pathname.startsWith(path))) {
          console.log('管理员路径检查:', { pathname, isAdmin: token?.isAdmin });
          if (token.isAdmin === true) {
            console.log('管理员访问管理后台:', pathname);
            return true;
          } else {
            console.log('非管理员尝试访问管理后台:', pathname);
            return false;
          }
        }

        // 6. 其他情况，只要有token就允许访问
        console.log('通用访问检查:', { pathname, hasToken: !!token });
        return true;
      },
    },
    pages: {
      signIn: '/',
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
  
  // 路径到模块ID的映射
  const pathToModuleId: { [key: string]: string } = {
    'mail': 'ai-email',
    'date-tools': 'date-tools',
    'quotation': 'quotation',
    'packing': 'packing',
    'invoice': 'invoice',
    'purchase': 'purchase',
    'history': 'history',
    'customer': 'customer',
    'admin': 'admin'
  };
  
  // 取第一段作为路径
  const pathSegment = path.split('/')[0] || null;
  
  // 如果有映射，返回映射的模块ID，否则返回原路径
  return pathSegment ? (pathToModuleId[pathSegment] || pathSegment) : null;
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