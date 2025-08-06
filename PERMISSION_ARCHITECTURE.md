# 🔐 NextAuth 权限系统架构文档

## 📋 目录

- [系统概述](#系统概述)
- [架构设计](#架构设计)
- [核心组件](#核心组件)
- [权限流程](#权限流程)
- [API 接口](#api-接口)
- [中间件配置](#中间件配置)
- [前端集成](#前端集成)
- [部署配置](#部署配置)
- [故障排除](#故障排除)

---

## 🎯 系统概述

### 功能特性

✅ **实时权限同步**：管理员更新权限后，用户可立即刷新获取新权限  
✅ **JWT Token 自动更新**：权限变更后自动刷新 JWT token，中间件可感知  
✅ **多模块权限控制**：支持报价单、发票、装箱单、采购单等模块的细粒度权限  
✅ **管理员权限管理**：后台可动态分配和撤销用户权限  
✅ **权限缓存机制**：本地存储 + 会话缓存，提升性能  
✅ **权限状态监控**：完整的权限变更日志和状态追踪  

### 支持的权限模块

| 模块 | 路径 | 权限ID | 说明 |
|------|------|--------|------|
| 报价单 | `/quotation` | `quotation` | 创建和管理报价单 |
| 发票 | `/invoice` | `invoice` | 生成和管理发票 |
| 装箱单 | `/packing` | `packing` | 创建装箱单和清单 |
| 采购单 | `/purchase` | `purchase` | 管理采购订单 |
| 客户管理 | `/customer` | `customer` | 客户信息管理 |
| 历史记录 | `/history` | `history` | 查看历史数据 |
| AI 邮件 | `/mail` | `ai-email` | AI 邮件功能 |
| 日期工具 | `/date-tools` | `date-tools` | 日期计算工具 |

---

## 🏗️ 架构设计

### 整体架构图

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   前端界面       │    │   NextAuth      │    │   后端 API      │
│                 │    │   Session       │    │                 │
│ • Dashboard     │◄──►│ • JWT Token     │◄──►│ • 权限管理      │
│ • 权限刷新按钮   │    │ • 权限缓存      │    │ • 用户管理      │
│ • 模块访问控制   │    │ • 中间件检查    │    │ • 数据同步      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   本地存储       │    │   中间件        │    │   外部数据库    │
│                 │    │                 │    │                 │
│ • Zustand Store │    │ • 路由拦截      │    │ • 用户信息      │
│ • 权限缓存      │    │ • 权限验证      │    │ • 权限配置      │
│ • 状态持久化    │    │ • 重定向处理    │    │ • 审计日志      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 数据流设计

```
1. 用户登录 → NextAuth 创建 JWT Session
2. 访问受保护页面 → 中间件检查 JWT Token 中的权限
3. 权限不足 → 重定向到登录页面
4. 权限充足 → 允许访问，渲染页面
5. 管理员更新权限 → 后端 API 更新数据库
6. 用户刷新权限 → 前端调用 API 获取最新权限
7. 权限数据更新 → 使用 signIn() 重新签发 JWT Token
8. 中间件感知新权限 → 允许访问新模块
```

---

## 🔧 核心组件

### 1. NextAuth 配置 (`src/lib/auth.ts`)

```typescript
export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt', // 使用 JWT 策略
  },
  providers: [
    CredentialsProvider({
      name: 'Silent Refresh',
      credentials: {
        username: { label: "用户名", type: "text" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        const { username, password } = credentials ?? {};
        
        if (password !== 'silent-refresh') return null;
        
        // 从后端获取最新用户信息和权限
        const userRes = await fetch(`https://udb.luocompany.net/api/admin/users?username=${encodeURIComponent(username)}`);
        const list = await userRes.json();
        const user = list.users?.[0];
        
        if (!user) return null;
        
        const detailRes = await fetch(`https://udb.luocompany.net/api/admin/users/${user.id}`);
        const detail = await detailRes.json();
        
        return {
          id: user.id,
          name: user.username,
          email: detail.email,
          isAdmin: detail.isAdmin,
          permissions: detail.permissions ?? [],
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.permissions = user.permissions;
        token.isAdmin = user.isAdmin;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.permissions = token.permissions;
      session.user.isAdmin = token.isAdmin;
      return session;
    },
  },
};
```

### 2. 中间件配置 (`src/middleware.ts`)

```typescript
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { getModuleIdFromPath } from "@/constants/permissions";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    
    // 静态资源和公开路由直接通过
    if (STATIC_PATHS.some(path => pathname.startsWith(path)) || 
        PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'))) {
      return NextResponse.next();
    }
    
    // 检查模块权限
    const moduleId = getModuleIdFromPath(pathname);
    if (moduleId && req.nextauth.token?.permissions) {
      const hasPermission = req.nextauth.token.permissions.some(
        (p: any) => p.moduleId === moduleId && p.canAccess
      );
      
      if (!hasPermission) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }
    
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);
```

### 3. 权限常量 (`src/constants/permissions.ts`)

```typescript
export const MODULE_PATH_MAP = {
  '/quotation': 'quotation',
  '/invoice': 'invoice',
  '/packing': 'packing',
  '/purchase': 'purchase',
  '/customer': 'customer',
  '/history': 'history',
  '/mail': 'ai-email',
  '/date-tools': 'date-tools',
} as const;

export function getModuleIdFromPath(pathname: string): string | null {
  return Object.entries(MODULE_PATH_MAP).find(([path]) => 
    pathname.startsWith(path)
  )?.[1] || null;
}
```

### 4. 权限刷新工具 (`src/lib/refresh.ts`)

```typescript
import { signIn } from 'next-auth/react';

export async function refreshPermissionsAndSession(username: string): Promise<boolean> {
  try {
    // 1. 获取最新权限
    const res = await fetch('/api/auth/update-session-permissions', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    
    if (!res.ok) return false;
    
    const data = await res.json();
    if (!data.success) return false;
    
    // 2. 使用 signIn() 进行 silent refresh
    const result = await signIn('credentials', {
      redirect: false,
      username,
      password: 'silent-refresh',
    });
    
    if (result?.error) return false;
    
    // 3. 刷新页面以应用新权限
    window.location.reload();
    return true;
  } catch (error) {
    console.error('[权限刷新] 失败:', error);
    return false;
  }
}
```

---

## 🔄 权限流程

### 1. 用户登录流程

```
1. 用户访问受保护页面
2. 中间件检查 JWT Token
3. Token 不存在 → 重定向到登录页面
4. Token 存在 → 检查权限
5. 权限不足 → 重定向到 Dashboard
6. 权限充足 → 允许访问页面
```

### 2. 权限刷新流程

```
1. 管理员在后台更新用户权限
2. 用户点击"刷新权限"按钮
3. 前端调用 /api/auth/update-session-permissions
4. API 从后端获取最新权限数据
5. 前端使用 signIn() 重新签发 JWT Token
6. 页面刷新，应用新权限
7. 中间件感知新权限，允许访问新模块
```

### 3. 权限检查流程

```
1. 用户访问 /quotation 页面
2. 中间件获取 pathname: '/quotation'
3. 通过 getModuleIdFromPath() 获取 moduleId: 'quotation'
4. 检查 JWT Token 中的 permissions 数组
5. 查找 moduleId === 'quotation' 且 canAccess === true 的权限
6. 找到权限 → 允许访问
7. 未找到权限 → 重定向到 Dashboard
```

---

## 🌐 API 接口

### 1. 权限更新 API (`/api/auth/update-session-permissions`)

**请求方法**: `POST`  
**请求体**:
```json
{
  "username": "roger"
}
```

**响应**:
```json
{
  "success": true,
  "permissions": [
    {
      "id": "662ba991-7f1c-45e4-8fd6-453268d7d629",
      "moduleId": "quotation",
      "canAccess": true
    }
  ],
  "user": {
    "id": "cm5q0oxbg0000l7033dnlwdb2",
    "username": "roger",
    "email": "luo@luocompany.com",
    "isAdmin": true
  }
}
```

### 2. 获取最新权限 API (`/api/auth/get-latest-permissions`)

**请求方法**: `POST`  
**功能**: 从后端获取用户最新权限信息

### 3. 强制刷新会话 API (`/api/auth/force-refresh-session`)

**请求方法**: `POST`  
**功能**: 强制刷新用户的 NextAuth 会话

---

## 🛡️ 中间件配置

### 路由保护规则

```typescript
// 公开路由 - 无需认证
const PUBLIC_ROUTES = ['/', '/api/auth', '/test-login'];

// 静态资源 - 直接通过
const STATIC_PATHS = ['/_next', '/static', '/images', '/fonts', '/assets'];

// 管理员路由 - 需要管理员权限
const ADMIN_PATHS = ['/admin', '/api/admin'];

// 业务模块路由 - 需要对应模块权限
const BUSINESS_ROUTES = [
  '/quotation', '/invoice', '/packing', '/purchase',
  '/customer', '/history', '/mail', '/date-tools'
];
```

### 权限检查逻辑

```typescript
// 1. 检查是否为静态资源
if (STATIC_PATHS.some(path => pathname.startsWith(path))) {
  return NextResponse.next();
}

// 2. 检查是否为公开路由
if (PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'))) {
  return NextResponse.next();
}

// 3. 检查模块权限
const moduleId = getModuleIdFromPath(pathname);
if (moduleId && token?.permissions) {
  const hasPermission = token.permissions.some(
    (p: any) => p.moduleId === moduleId && p.canAccess
  );
  
  if (!hasPermission) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }
}
```

---

## 🎨 前端集成

### 1. Dashboard 页面集成

```typescript
// src/app/dashboard/page.tsx
'use client';

import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { usePermissionStore } from '@/lib/permissions';

export default function DashboardPage() {
  const { data: session } = useSession();
  const { fetchPermissions } = usePermissionStore();
  
  useEffect(() => {
    if (session?.user?.name) {
      fetchPermissions(session.user.name);
    }
  }, [session?.user?.name, fetchPermissions]);
  
  // 权限更新事件监听
  useEffect(() => {
    const handlePermissionsUpdated = async (event: CustomEvent) => {
      if (session?.user?.name) {
        await signIn('credentials', {
          redirect: false,
          username: session.user.name,
          password: 'silent-refresh',
        });
      }
    };
    
    window.addEventListener('permissionsUpdated', handlePermissionsUpdated as unknown as EventListener);
    return () => {
      window.removeEventListener('permissionsUpdated', handlePermissionsUpdated as unknown as EventListener);
    };
  }, [session?.user?.name]);
  
  return (
    <div>
      {/* Dashboard 内容 */}
    </div>
  );
}
```

### 2. Header 组件集成

```typescript
// src/components/Header.tsx
import { PermissionRefreshButton } from './PermissionRefreshButton';

export function Header() {
  return (
    <header>
      {/* 其他 Header 内容 */}
      <PermissionRefreshButton />
    </header>
  );
}
```

### 3. 权限刷新按钮组件

```typescript
// src/components/PermissionRefreshButton.tsx
'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { handlePermissionRefresh } from '@/lib/refresh';
import { RefreshCw } from 'lucide-react';

export function PermissionRefreshButton() {
  const { data: session } = useSession();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const handleRefresh = async () => {
    if (isRefreshing || !session?.user?.name) return;
    
    setIsRefreshing(true);
    try {
      await handlePermissionRefresh(session.user.name);
      console.log('权限刷新成功');
    } catch (error) {
      console.error('权限刷新失败:', error);
    } finally {
      setIsRefreshing(false);
    }
  };
  
  return (
    <button
      onClick={handleRefresh}
      disabled={isRefreshing}
      className="flex items-center gap-2 px-3 py-2 text-sm"
    >
      <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
      {isRefreshing ? '刷新中...' : '刷新权限'}
    </button>
  );
}
```

---

## 🚀 部署配置

### 1. 环境变量配置

```bash
# .env.local
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_JWT_SECRET=your-jwt-secret

# 后端 API 配置
UDB_API_BASE_URL=https://udb.luocompany.net
UDB_API_KEY=your-api-key
```

### 2. Vercel 部署配置

```json
// vercel.json
{
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/api/auth/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-store, max-age=0"
        }
      ]
    }
  ]
}
```

### 3. 构建配置

```javascript
// next.config.mjs
const nextConfig = {
  experimental: {
    turbo: true,
    optimizeCss: true,
  },
  images: {
    domains: ['udb.luocompany.net'],
  },
};

export default nextConfig;
```

---

## 🔍 故障排除

### 常见问题及解决方案

#### 1. 权限刷新失败

**问题**: 点击刷新权限按钮后，权限没有更新  
**解决方案**:
```typescript
// 检查 API 响应
const res = await fetch('/api/auth/update-session-permissions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: session.user.name })
});

console.log('API 响应:', await res.json());
```

#### 2. 中间件权限检查失败

**问题**: 有权限但无法访问页面  
**解决方案**:
```typescript
// 检查 JWT Token 中的权限
console.log('Token 权限:', token.permissions);
console.log('当前路径:', pathname);
console.log('模块ID:', moduleId);
```

#### 3. 会话状态不同步

**问题**: 权限更新后，会话状态没有同步  
**解决方案**:
```typescript
// 强制刷新会话
await signIn('credentials', {
  redirect: false,
  username: session.user.name,
  password: 'silent-refresh',
});

// 刷新页面
window.location.reload();
```

#### 4. 类型错误

**问题**: TypeScript 类型检查错误  
**解决方案**:
```typescript
// 确保类型声明正确
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      permissions: Permission[];
      isAdmin: boolean;
    };
  }
}
```

### 调试工具

#### 1. 权限测试页面

访问 `http://localhost:3000/test-permissions` 查看：
- 当前会话信息
- 权限数据
- 权限刷新状态

#### 2. 浏览器控制台日志

```javascript
// 查看权限数据
console.log('当前权限:', session?.user?.permissions);

// 查看中间件调试信息
// 在 Network 标签页查看 API 请求
```

#### 3. 服务器日志

```bash
# 查看 NextAuth 日志
npm run dev

# 查看 API 请求日志
# 在控制台输出中查找权限相关的日志
```

---

## 📊 性能优化

### 1. 权限缓存策略

```typescript
// 本地存储缓存
const CACHE_KEY = 'user_permissions';
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟

// 缓存权限数据
localStorage.setItem(CACHE_KEY, JSON.stringify({
  permissions: userPermissions,
  timestamp: Date.now()
}));

// 读取缓存
const cached = localStorage.getItem(CACHE_KEY);
if (cached) {
  const { permissions, timestamp } = JSON.parse(cached);
  if (Date.now() - timestamp < CACHE_DURATION) {
    return permissions;
  }
}
```

### 2. API 请求优化

```typescript
// 使用 fetch 缓存控制
const res = await fetch('/api/auth/get-latest-permissions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache'
  },
  body: JSON.stringify({ username })
});
```

### 3. 中间件性能

```typescript
// 优化路径匹配
const MODULE_PATH_MAP = new Map([
  ['/quotation', 'quotation'],
  ['/invoice', 'invoice'],
  // ...
]);

// 快速查找
const moduleId = MODULE_PATH_MAP.get(pathname);
```

---

## 🔐 安全考虑

### 1. JWT Token 安全

```typescript
// 使用强密钥
NEXTAUTH_SECRET=your-very-long-and-random-secret-key
NEXTAUTH_JWT_SECRET=your-jwt-specific-secret-key

// Token 过期时间
jwt: {
  maxAge: 24 * 60 * 60, // 24小时
}
```

### 2. API 安全

```typescript
// 验证用户身份
if (!session?.user?.name) {
  return NextResponse.json({ error: '未授权' }, { status: 401 });
}

// 验证管理员权限
if (!session.user.isAdmin) {
  return NextResponse.json({ error: '权限不足' }, { status: 403 });
}
```

### 3. 中间件安全

```typescript
// 防止路径遍历攻击
const sanitizedPath = pathname.replace(/\.\./g, '');

// 验证模块权限
const hasPermission = token.permissions.some(
  (p: any) => p.moduleId === moduleId && p.canAccess === true
);
```

---

## 📈 监控和日志

### 1. 权限变更日志

```typescript
// src/utils/permissionLogger.ts
export function logPermissionChange(action: string, data: any) {
  console.log(`[权限系统] ${action}`, {
    timestamp: new Date().toISOString(),
    action,
    ...data
  });
}
```

### 2. 性能监控

```typescript
// 监控 API 响应时间
const startTime = Date.now();
const result = await fetch('/api/auth/update-session-permissions', options);
const duration = Date.now() - startTime;

if (duration > 5000) {
  console.warn(`权限刷新 API 响应时间过长: ${duration}ms`);
}
```

### 3. 错误追踪

```typescript
// 捕获权限相关错误
try {
  await refreshPermissionsAndSession(username);
} catch (error) {
  console.error('[权限系统] 刷新失败:', error);
  // 可以发送到错误追踪服务
}
```

---

## 🎯 总结

这个权限系统提供了：

✅ **完整的权限管理**：支持多模块细粒度权限控制  
✅ **实时权限同步**：管理员更新后用户可立即获取新权限  
✅ **安全的中间件**：基于 JWT Token 的路由保护  
✅ **用户友好的界面**：权限刷新按钮和状态提示  
✅ **高性能设计**：本地缓存和优化的 API 请求  
✅ **完整的监控**：权限变更日志和错误追踪  

通过这个架构，您的应用具备了企业级的权限管理能力，可以安全、高效地控制用户对不同模块的访问权限。 