# 权限系统快速参考指南

## 🚀 快速开始

### 1. 在页面中使用权限

```typescript
import { usePermissionInit } from '@/hooks/usePermissionInit';
import { usePermissionStore } from '@/lib/permissions';

export default function MyPage() {
  // 自动初始化权限
  usePermissionInit();
  
  // 获取用户权限
  const { user } = usePermissionStore();
  
  // 检查权限
  const canAccessInvoice = user?.permissions?.some(p => 
    p.moduleId === 'invoice' && p.canAccess
  );
  
  return (
    <div>
      {canAccessInvoice && <InvoiceModule />}
    </div>
  );
}
```

### 2. 权限刷新

```typescript
import { usePermissionRefresh } from '@/hooks/usePermissionRefresh';

export default function Header() {
  const { refresh, isRefreshing } = usePermissionRefresh();
  
  const handleRefresh = async () => {
    await refresh(username);
  };
  
  return (
    <button onClick={handleRefresh} disabled={isRefreshing}>
      {isRefreshing ? '刷新中...' : '刷新权限'}
    </button>
  );
}
```

## 📋 权限模块列表

| 模块ID | 模块名称 | 说明 |
|--------|----------|------|
| `quotation` | 报价单 | 创建和管理报价单 |
| `packing` | 装箱单 | 创建和管理装箱单 |
| `invoice` | 财务发票 | 创建和管理发票 |
| `purchase` | 采购订单 | 创建和管理采购单 |
| `history` | 单据管理 | 查看所有历史单据 |
| `customer` | 客户管理 | 管理客户信息 |
| `ai-email` | AI邮件助手 | AI邮件功能 |

## 🔧 核心API

### 权限Store方法

```typescript
// 获取用户信息
const { user } = usePermissionStore();

// 检查权限
const hasPermission = (moduleId: string) => {
  return user?.permissions?.some(p => 
    p.moduleId === moduleId && p.canAccess
  );
};

// 清除用户数据
usePermissionStore.getState().clearUser();
```

### 权限初始化Hook

```typescript
// 自动初始化权限
usePermissionInit();
```

### 权限刷新Hook

```typescript
// 权限刷新
const { refresh, isRefreshing, error } = usePermissionRefresh();
```

## 🛡️ 安全检查

### 1. 路由级权限检查

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  
  if (!token?.permissions) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  const moduleId = getModuleIdFromPath(request.nextUrl.pathname);
  if (moduleId) {
    const hasAccess = token.permissions.some(p => 
      p.moduleId === moduleId && p.canAccess
    );
    
    if (!hasAccess) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }
}
```

### 2. 组件级权限检查

```typescript
import { PermissionGuard } from '@/components/PermissionGuard';

export default function InvoicePage() {
  return (
    <PermissionGuard moduleId="invoice">
      <InvoiceContent />
    </PermissionGuard>
  );
}
```

## 📊 权限数据结构

```typescript
interface Permission {
  id: string;           // 权限ID
  moduleId: string;     // 模块ID
  canAccess: boolean;   // 是否有权限
}

interface User {
  id: string;           // 用户ID
  username: string;     // 用户名
  email: string | null; // 邮箱
  status: boolean;      // 账户状态
  isAdmin: boolean;     // 是否管理员
  permissions: Permission[]; // 权限列表
}
```

## 🔄 权限刷新流程

1. **用户点击刷新** → `usePermissionRefresh.refresh()`
2. **调用API** → `/api/auth/force-refresh-session`
3. **获取最新权限** → 从后端API获取
4. **比较权限变化** → 检查是否需要更新
5. **Silent-Refresh** → 更新JWT token
6. **刷新页面** → 应用新权限

## 💾 缓存机制

### 本地存储键

- `userCache`: 用户信息和权限
- `user_permissions`: 权限数据
- `latestPermissions`: 最新权限
- `permissionsTimestamp`: 权限时间戳

### 缓存策略

- **有效期**: 24小时
- **自动清理**: 过期数据自动删除
- **强制刷新**: 权限变化时立即更新

## 🐛 常见问题

### 1. 权限不显示

**检查项**:
- 用户是否已登录
- 权限数据是否正确加载
- 权限映射是否正确

**解决方案**:
```typescript
// 检查权限数据
console.log('用户权限:', user?.permissions);

// 强制刷新权限
await refresh(username);
```

### 2. 权限刷新失败

**检查项**:
- 网络连接是否正常
- 用户身份是否有效
- API接口是否正常

**解决方案**:
```typescript
// 检查刷新状态
console.log('刷新状态:', { isRefreshing, error });

// 手动清除缓存后重试
localStorage.removeItem('userCache');
await refresh(username);
```

### 3. 权限数据不一致

**检查项**:
- Session与Store数据是否同步
- 缓存数据是否过期
- 权限初始化是否正确

**解决方案**:
```typescript
// 强制同步权限
usePermissionStore.getState().setUserFromSession(session);

// 清除缓存重新初始化
usePermissionStore.getState().clearUser();
usePermissionInit();
```

## 📝 调试工具

### 权限日志

```typescript
// 启用权限调试
import { logPermission } from '@/utils/permissionLogger';

logPermission('权限检查', {
  moduleId: 'invoice',
  userId: user.id,
  hasAccess: true
});
```

### 控制台调试

```typescript
// 查看权限状态
console.log('权限Store:', usePermissionStore.getState());

// 查看Session权限
console.log('Session权限:', session?.user?.permissions);

// 查看本地缓存
console.log('本地缓存:', localStorage.getItem('userCache'));
```

## 🎯 最佳实践

### 1. 权限检查时机

- **页面加载时**: 使用`usePermissionInit`
- **功能执行时**: 在具体功能中检查
- **数据访问时**: 在API中验证

### 2. 性能优化

- **缓存策略**: 合理使用本地缓存
- **按需加载**: 权限数据按需获取
- **批量检查**: 避免频繁权限检查

### 3. 用户体验

- **加载状态**: 提供友好提示
- **错误处理**: 优雅处理权限错误
- **权限提示**: 明确告知权限不足原因

---

*最后更新: 2024年8月*
*版本: 1.0*