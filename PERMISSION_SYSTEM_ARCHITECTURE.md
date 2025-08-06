# 权限系统架构说明文档

## 📋 系统概述

本权限系统采用基于角色的访问控制（RBAC）模式，支持细粒度的模块级权限管理。系统设计遵循"最小权限原则"，确保用户只能访问被明确授权的功能模块。

### 🎯 设计目标
- **统一权限检查**：管理员和普通用户使用相同的权限检查逻辑
- **实时权限更新**：支持权限刷新，确保权限变更立即生效
- **本地缓存优化**：减少服务器请求，提升用户体验
- **安全可靠**：多层权限验证，确保系统安全

## 🏗️ 系统架构

### 核心组件

#### 1. **权限存储层 (PermissionStore)**
- **位置**: `src/lib/permissions.ts`
- **技术栈**: Zustand + LocalStorage
- **功能**: 统一管理用户权限状态和缓存

#### 2. **认证中间件 (Middleware)**
- **位置**: `src/middleware.ts`
- **技术栈**: NextAuth + Next.js Middleware
- **功能**: 路由级权限验证，防止未授权访问

#### 3. **权限守卫组件 (PermissionGuard)**
- **位置**: `src/components/PermissionGuard.tsx`
- **功能**: 组件级权限控制，提供友好的加载状态

#### 4. **权限初始化钩子 (usePermissionInit)**
- **位置**: `src/hooks/usePermissionInit.ts`
- **功能**: 统一权限初始化逻辑，支持多种数据源

## 📊 数据流

### 登录流程
```
用户登录 → NextAuth验证 → 返回完整用户信息 → 初始化权限Store → 缓存到LocalStorage
```

### 权限检查流程
```
页面访问 → 中间件检查 → 组件级检查 → 功能级检查
```

### 权限刷新流程
```
用户触发刷新 → 清除本地缓存 → 从服务器获取最新权限 → 更新Store和缓存 → UI重新渲染
```

## 🔧 核心概念

### 用户角色
- **管理员 (Admin)**: 可以进入管理后台设置权限，但在模块访问上与普通用户相同
- **普通用户 (User)**: 只能访问被明确授权的模块

### 权限模型
```typescript
interface Permission {
  id: string;           // 权限唯一标识
  moduleId: string;     // 模块标识符
  canAccess: boolean;   // 访问权限
}

interface User {
  id: string;           // 用户ID
  username: string;     // 用户名
  email: string | null; // 邮箱
  status: boolean;      // 账户状态
  isAdmin: boolean;     // 管理员标识
  permissions: Permission[]; // 权限列表
}
```

### 模块映射
```typescript
const PATH_TO_MODULE_ID = {
  '/quotation': 'quotation',    // 报价单
  '/packing': 'packing',        // 装箱单
  '/invoice': 'invoice',        // 发票
  '/purchase': 'purchase',      // 采购单
  '/customer': 'customer',      // 客户管理
  '/history': 'history',        // 历史记录
  '/mail': 'ai-email',          // AI邮件
  '/admin': 'admin'             // 管理后台
};
```

## 🛠️ 技术实现

### 权限Store (Zustand)
```typescript
interface PermissionStore {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  lastFetchTime: number | null;
  
  // 核心方法
  hasPermission: (moduleId: string) => boolean;
  hasAnyPermission: (moduleIds: string[]) => boolean;
  fetchPermissions: (forceRefresh?: boolean) => Promise<void>;
  setUserFromSession: (sessionUser: any) => void;
  initializeUserFromStorage: () => boolean;
}
```

### 中间件权限检查
```typescript
// 模块权限检查（管理员和普通用户使用相同逻辑）
const moduleId = getModuleIdFromPath(pathname);
if (moduleId) {
  if (token.permissions && Array.isArray(token.permissions)) {
    const permission = token.permissions.find(p => p.moduleId === moduleId);
    if (permission && permission.canAccess) {
      return true;
    }
  }
  return false;
}
```

### 权限守卫组件
```typescript
interface PermissionGuardProps {
  moduleId: string;
  children: React.ReactNode;
  showLoading?: boolean;
  fallback?: React.ReactNode;
}
```

## 🔌 API接口

### 权限获取接口
- **路径**: `/api/auth/get-latest-permissions`
- **方法**: GET
- **功能**: 获取用户最新权限数据
- **缓存策略**: 支持强制刷新，跳过本地缓存

### 权限刷新接口
- **路径**: `/api/auth/refresh-permissions`
- **方法**: POST
- **功能**: 强制刷新用户权限

### 会话权限更新接口
- **路径**: `/api/auth/update-session-permissions`
- **方法**: POST
- **功能**: 更新会话中的权限数据

## 📝 使用指南

### 1. 页面级权限控制
```typescript
// 在页面组件中使用
import { PermissionGuard } from '@/components/PermissionGuard';

export default function QuotationPage() {
  return (
    <PermissionGuard moduleId="quotation">
      <div>报价单页面内容</div>
    </PermissionGuard>
  );
}
```

### 2. 组件级权限检查
```typescript
// 在组件中使用权限检查
import { hasPermission } from '@/lib/permissions';

function SomeComponent() {
  const canAccessQuotation = hasPermission('quotation');
  
  return (
    <div>
      {canAccessQuotation && <QuotationButton />}
    </div>
  );
}
```

### 3. 权限初始化
```typescript
// 在应用根组件中初始化权限
import { usePermissionInit } from '@/hooks/usePermissionInit';

export default function App() {
  usePermissionInit();
  
  return <div>应用内容</div>;
}
```

### 4. 权限刷新
```typescript
// 手动刷新权限
import { refreshPermissions } from '@/lib/permissions';

async function handleRefreshPermissions() {
  try {
    await refreshPermissions();
    console.log('权限刷新成功');
  } catch (error) {
    console.error('权限刷新失败:', error);
  }
}
```

## 🔄 权限刷新机制

### 自动刷新
- **登录时**: 自动从Session初始化权限
- **页面加载时**: 从本地缓存恢复权限
- **缓存过期时**: 自动从服务器获取最新权限

### 手动刷新
- **触发方式**: 用户点击"刷新权限"按钮
- **执行流程**: 
  1. 清除本地缓存
  2. 从服务器获取最新权限
  3. 更新Store状态
  4. 保存到本地缓存
  5. 触发UI重新渲染

### 缓存策略
- **本地缓存**: 24小时有效期
- **请求节流**: 60秒内不重复请求
- **强制刷新**: 跳过所有缓存检查

## 🛡️ 安全机制

### 多层权限验证
1. **路由级验证**: 中间件拦截未授权访问
2. **组件级验证**: PermissionGuard组件控制渲染
3. **功能级验证**: 具体功能中的权限检查

### 数据安全
- **权限数据加密**: 敏感数据在传输和存储时加密
- **会话管理**: 使用NextAuth进行安全的会话管理
- **错误处理**: 完善的错误处理和日志记录

## 📊 监控和日志

### 权限日志
```typescript
// 权限操作日志
logPermission('权限检查', {
  moduleId: 'quotation',
  userId: user.id,
  username: user.username,
  isAdmin: user.isAdmin,
  hasAccess: true
});
```

### 性能监控
- **权限检查性能**: 监控权限检查的响应时间
- **缓存命中率**: 监控本地缓存的命中率
- **API调用频率**: 监控权限API的调用频率

## 🔧 配置和部署

### 环境变量
```env
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000
```

### 权限配置
```typescript
// 权限模块配置
export const PERMISSION_MODULES = {
  QUOTATION: 'quotation',
  PACKING: 'packing',
  INVOICE: 'invoice',
  PURCHASE: 'purchase',
  CUSTOMER: 'customer',
  HISTORY: 'history',
  AI_EMAIL: 'ai-email',
  ADMIN: 'admin'
};
```

## 🚀 最佳实践

### 1. 权限检查时机
- **页面加载时**: 使用PermissionGuard组件
- **功能执行时**: 在具体功能中检查权限
- **数据访问时**: 在API接口中验证权限

### 2. 用户体验
- **加载状态**: 提供友好的加载提示
- **错误处理**: 优雅处理权限错误
- **权限提示**: 明确告知用户权限不足的原因

### 3. 性能优化
- **缓存策略**: 合理使用本地缓存
- **按需加载**: 权限数据按需获取
- **批量检查**: 避免频繁的权限检查

## 🔍 故障排除

### 常见问题

#### 1. 权限刷新不生效
**原因**: 本地缓存未正确清除
**解决**: 检查强制刷新逻辑，确保清除本地缓存

#### 2. 权限检查失败
**原因**: 权限数据格式不正确
**解决**: 检查权限数据的格式和完整性

#### 3. 页面访问被拒绝
**原因**: 用户没有对应模块的权限
**解决**: 在管理后台为用户分配相应权限

### 调试工具
```typescript
// 启用权限调试日志
console.log('权限检查详情:', {
  moduleId,
  userId: user.id,
  permissions: user.permissions
});
```

## 📈 扩展和优化

### 未来规划
1. **权限组管理**: 支持权限组，简化权限分配
2. **动态权限**: 支持运行时权限变更
3. **权限审计**: 完整的权限操作审计日志
4. **权限分析**: 权限使用情况分析和报告

### 性能优化
1. **权限预加载**: 在应用启动时预加载常用权限
2. **智能缓存**: 基于使用模式的智能缓存策略
3. **权限压缩**: 优化权限数据的存储和传输

---

*最后更新: 2024年8月*
*版本: 2.0* 