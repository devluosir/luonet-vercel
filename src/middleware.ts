import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// 定义公开路由
const PUBLIC_ROUTES = [
  '/',
  '/api/auth',
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
    
    // 1. 静态资源直接通过
    if (STATIC_PATHS.some(path => pathname.startsWith(path)) || pathname.includes('.')) {
      return NextResponse.next();
    }

    // 2. 公开路由直接通过
    if (PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'))) {
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
      return NextResponse.next();
    }

    // 4. 已知路由需要认证 - 让 withAuth 处理权限检查
    return null;
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
        if (PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'))) {
          return true;
        }

        // 3. 没有token的情况 - 拒绝所有其他访问
        if (!token) {
          console.log('没有token，拒绝访问:', pathname);
          return false;
        }

        // 4. 管理员路由需要管理员权限验证
        if (ADMIN_PATHS.some(path => pathname.startsWith(path))) {
          console.log('管理员路由访问检查:', { pathname, isAdmin: token?.isAdmin, token: !!token });
          return token.isAdmin === true;
        }

        // 5. 业务路由需要对应的权限验证
        const moduleId = getModuleIdFromPath(pathname);
        if (moduleId) {
          // 特殊处理dashboard页面
          if (moduleId === 'dashboard') {
            console.log('Dashboard访问检查:', { token: !!token, isAdmin: token?.isAdmin, permissions: token?.permissions });
            return true; // dashboard页面只要有token就可以访问
          }
          
          // 管理员可以访问所有页面
          if (token.isAdmin === true) {
            return true;
          }
          
          // 非管理员必须有对应的模块权限
          if (!token.permissions || !Array.isArray(token.permissions)) {
            return false;
          }
          
          const hasPermission = token.permissions.some(perm => 
            perm.moduleId === moduleId && perm.canAccess === true
          );
          
          return hasPermission;
        }

        // 6. 其他情况，管理员可以访问，普通用户需要至少有一个模块权限
        if (token.isAdmin === true) {
          return true;
        }
        
        // 普通用户必须有至少一个模块权限
        if (!token.permissions || !Array.isArray(token.permissions)) {
          return false;
        }
        
        return token.permissions.some(perm => perm.canAccess === true);
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