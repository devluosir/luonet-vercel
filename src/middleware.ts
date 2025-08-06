import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { getModuleIdFromPath } from "@/constants/permissions";

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
          console.log('[中间件] 没有token，拒绝访问:', pathname);
          return false;
        }

        // 4. 检查token是否包含必要的用户信息（简化检查）
        if (!token.username) {
          console.log('[中间件] token中没有用户名，拒绝访问:', pathname);
          return false;
        }

        // 5. 管理员路径检查
        if (ADMIN_PATHS.some(path => pathname.startsWith(path))) {
          if (token.isAdmin === true) {
            console.log('[中间件] 管理员访问管理路径:', pathname);
            return true;
          } else {
            console.log('[中间件] 非管理员访问管理路径被拒绝:', pathname);
            return false;
          }
        }

        // 6. 模块权限检查
        const moduleId = getModuleIdFromPath(pathname);
        if (moduleId && moduleId !== 'dashboard') { // dashboard不需要权限检查
          // 添加详细的调试日志
          console.log('[中间件] 权限检查详情:', {
            pathname,
            moduleId,
            tokenUsername: token.username,
            tokenIsAdmin: token.isAdmin,
            tokenPermissions: token.permissions,
            tokenPermissionsCount: token.permissions?.length || 0,
            tokenPermissionsType: typeof token.permissions,
            tokenKeys: Object.keys(token || {})
          });

          // 检查具体模块权限（管理员和普通用户使用相同的权限检查逻辑）
          if (token.permissions && Array.isArray(token.permissions)) {
            const permission = token.permissions.find((p: any) => p.moduleId === moduleId);
            console.log('[中间件] 找到的权限:', permission);
            
            if (permission && permission.canAccess) {
              console.log('[中间件] 权限检查通过:', { moduleId, permission });
              return true;
            } else {
              console.log('[中间件] 权限检查失败 - 权限不存在或不可访问:', { 
                moduleId, 
                permission, 
                allPermissions: token.permissions 
              });
            }
          } else {
            console.log('[中间件] token中没有有效的权限数组:', {
              moduleId,
              permissions: token.permissions,
              permissionsType: typeof token.permissions
            });
          }

          // 没有权限，重定向到登录页
          console.log('[中间件] 权限检查失败，拒绝访问:', { 
            pathname, 
            moduleId, 
            tokenPermissions: token.permissions 
          });
          return false;
        }
        
        // 7. 对于dashboard等没有明确模块映射的路径，只要有token就允许访问
        console.log('[中间件] 允许访问非模块路径:', pathname);
        return true;
      },
    },
    pages: {
      signIn: '/',
    },
  }
);

// 使用统一的权限模块映射函数
// 从 @/constants/permissions 导入的 getModuleIdFromPath 函数

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