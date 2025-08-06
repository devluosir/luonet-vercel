# 权限系统快速参考

## 🚀 快速开始

### 1. 页面权限控制
```typescript
import { PermissionGuard } from '@/components/PermissionGuard';

export default function QuotationPage() {
  return (
    <PermissionGuard moduleId="quotation">
      <div>报价单页面内容</div>
    </PermissionGuard>
  );
}
```

### 2. 组件权限检查
```typescript
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
import { usePermissionInit } from '@/hooks/usePermissionInit';

export default function App() {
  usePermissionInit();
  return <div>应用内容</div>;
}
```

## 📋 权限模块列表

| 模块ID | 页面路径 | 功能描述 |
|--------|----------|----------|
| `quotation` | `/quotation` | 报价单管理 |
| `packing` | `/packing` | 装箱单管理 |
| `invoice` | `/invoice` | 发票管理 |
| `purchase` | `/purchase` | 采购单管理 |
| `customer` | `/customer` | 客户管理 |
| `history` | `/history` | 历史记录 |
| `ai-email` | `/mail` | AI邮件助手 |
| `admin` | `/admin` | 管理后台 |

## 🔧 常用API

### 权限检查
```typescript
import { hasPermission, hasAnyPermission } from '@/lib/permissions';

// 检查单个权限
const canAccess = hasPermission('quotation');

// 检查多个权限（任一即可）
const canAccessAny = hasAnyPermission(['quotation', 'invoice']);
```

### 权限刷新
```typescript
import { refreshPermissions } from '@/lib/permissions';

async function handleRefresh() {
  try {
    await refreshPermissions();
    console.log('权限刷新成功');
  } catch (error) {
    console.error('权限刷新失败:', error);
  }
}
```

### 权限状态
```typescript
import { usePermissionStore } from '@/lib/permissions';

function MyComponent() {
  const { user, isLoading, error } = usePermissionStore();
  
  if (isLoading) return <div>加载中...</div>;
  if (error) return <div>错误: {error}</div>;
  
  return <div>用户: {user?.username}</div>;
}
```

## 🛠️ 权限守卫组件

### 基础用法
```typescript
<PermissionGuard moduleId="quotation">
  <QuotationPage />
</PermissionGuard>
```

### 自定义加载状态
```typescript
<PermissionGuard 
  moduleId="quotation" 
  showLoading={true}
  fallback={<NoPermissionPage />}
>
  <QuotationPage />
</PermissionGuard>
```

## 🔍 调试和监控

### 启用调试日志
```typescript
// 在浏览器控制台查看权限检查详情
console.log('权限检查详情:', {
  moduleId: 'quotation',
  userId: user.id,
  permissions: user.permissions
});
```

### 权限状态检查
```typescript
import { usePermissionStore } from '@/lib/permissions';

function DebugComponent() {
  const { user, isLoading, error } = usePermissionStore();
  
  console.log('权限状态:', {
    user,
    isLoading,
    error,
    permissions: user?.permissions
  });
  
  return null;
}
```

## 🚨 故障排除

### 问题1: 权限刷新不生效
**症状**: 权限更新后页面仍显示旧权限
**解决**:
```typescript
// 强制刷新权限
await usePermissionStore.getState().fetchPermissions(true);

// 清理本地缓存
localStorage.removeItem('userCache');
```

### 问题2: 页面访问被拒绝
**症状**: 用户无法访问有权限的页面
**解决**:
1. 检查用户是否有对应模块的权限
2. 在管理后台为用户分配权限
3. 手动刷新权限

### 问题3: 权限检查失败
**症状**: 权限检查返回错误
**解决**:
```typescript
// 检查权限数据格式
const { user } = usePermissionStore();
console.log('权限数据:', user?.permissions);

// 重新初始化权限
usePermissionInit();
```

## 📊 权限数据结构

### 用户数据结构
```typescript
interface User {
  id: string;           // 用户ID
  username: string;     // 用户名
  email: string | null; // 邮箱
  status: boolean;      // 账户状态
  isAdmin: boolean;     // 管理员标识
  permissions: Permission[]; // 权限列表
}
```

### 权限数据结构
```typescript
interface Permission {
  id: string;           // 权限唯一标识
  moduleId: string;     // 模块标识符
  canAccess: boolean;   // 访问权限
}
```

## 🔄 权限刷新流程

### 自动刷新
1. **登录时**: 从Session初始化权限
2. **页面加载时**: 从本地缓存恢复权限
3. **缓存过期时**: 自动从服务器获取最新权限

### 手动刷新
1. 用户点击"刷新权限"按钮
2. 清除本地缓存
3. 从服务器获取最新权限
4. 更新Store状态
5. 保存到本地缓存
6. 触发UI重新渲染

## ⚡ 性能优化

### 缓存策略
- **本地缓存**: 24小时有效期
- **请求节流**: 60秒内不重复请求
- **强制刷新**: 跳过所有缓存检查

### 最佳实践
1. **按需加载**: 只在需要时检查权限
2. **批量检查**: 避免频繁的权限检查
3. **缓存优先**: 优先使用缓存数据
4. **错误降级**: 权限检查失败时的降级策略

## 🔐 安全注意事项

### 权限验证层级
1. **路由级验证**: 中间件拦截未授权访问
2. **组件级验证**: PermissionGuard组件验证
3. **功能级验证**: 具体功能权限检查

### 数据安全
- **本地存储**: 敏感数据不存储到LocalStorage
- **权限时效**: 权限数据24小时过期
- **错误处理**: 权限错误不影响系统稳定性

## 📞 技术支持

### 常见问题
1. **权限不生效**: 检查权限数据格式和缓存状态
2. **页面无法访问**: 确认用户有对应模块权限
3. **权限刷新失败**: 检查网络连接和API状态

### 调试工具
```typescript
// 权限调试工具
const debugPermissions = () => {
  const { user, isLoading, error } = usePermissionStore();
  console.log('权限状态:', { user, isLoading, error });
  
  const cached = localStorage.getItem('userCache');
  console.log('缓存权限:', cached);
};
```

---

*最后更新: 2024年8月*
*版本: 2.0*