# 站点权限系统架构说明

## 概述

本系统采用基于角色的权限控制（RBAC）架构，通过NextAuth.js进行身份认证，Zustand进行状态管理，实现了完整的权限控制体系。

## 核心组件

### 1. 权限存储层 (Zustand Store)

**文件**: `src/lib/permissions.ts`

```typescript
interface Permission {
  id: string;
  moduleId: string;
  canAccess: boolean;
}

interface User {
  id: string;
  username: string;
  email: string | null;
  status: boolean;
  isAdmin: boolean;
  permissions: Permission[];
}
```

**主要功能**:
- 全局权限状态管理
- 用户信息缓存
- 权限数据同步
- 本地存储管理

**核心方法**:
- `setUserFromSession()`: 从Session初始化用户权限
- `fetchPermissions()`: 从后端API获取最新权限
- `clearUser()`: 清除用户数据和缓存

### 2. 权限初始化Hook

**文件**: `src/hooks/usePermissionInit.ts`

**功能**:
- 页面加载时自动初始化权限
- 处理Session与Store的权限同步
- 检测权限数据不一致并强制更新

**工作流程**:
1. 检查Session状态
2. 从Session初始化用户信息
3. 如果Session无权限数据，从本地缓存恢复
4. 更新Zustand Store

### 3. 权限刷新Hook

**文件**: `src/hooks/usePermissionRefresh.ts`

**功能**:
- 提供权限刷新功能
- 管理刷新状态（loading、error、success）
- 触发silent-refresh机制

**核心流程**:
1. 调用`/api/auth/force-refresh-session`获取最新权限
2. 清除本地缓存
3. 如果权限有变化，触发silent-refresh
4. 刷新页面应用新权限

### 4. 权限刷新API

**文件**: `src/app/api/auth/force-refresh-session/route.ts`

**功能**:
- 从后端获取最新权限数据
- 比较权限变化
- 返回是否需要刷新token的标志

**安全机制**:
- 验证用户身份
- 检查管理员权限
- 防止越权操作

## 权限数据流

### 1. 初始化流程

```
页面加载 → usePermissionInit → 检查Session → 初始化Store → 显示权限
```

### 2. 权限刷新流程

```
用户点击刷新 → usePermissionRefresh → force-refresh-session API → 
获取最新权限 → 比较变化 → silent-refresh → 更新JWT → 刷新页面
```

### 3. Silent-Refresh机制

**目的**: 解决NextAuth JWT更新限制

**实现**:
- 使用特殊密码`'silent-refresh'`
- 从localStorage获取最新权限数据
- 更新JWT token
- 无需重新登录

## 权限映射系统

### 1. 模块权限映射

**文件**: `src/app/dashboard/page.tsx`

```typescript
const permissionMap = {
  quotation: false,    // 报价单
  packing: false,      // 装箱单
  invoice: false,      // 财务发票
  purchase: false,     // 采购订单
  history: false,      // 单据管理
  customer: false,     // 客户管理
  'ai-email': false    // AI邮件助手
};
```

### 2. 文档类型权限映射

```typescript
const documentTypePermissions = {
  quotation: false,    // 报价单
  confirmation: false, // 销售确认
  packing: false,      // 装箱单
  invoice: false,      // 财务发票
  purchase: false      // 采购订单
};
```

### 3. 权限优先级

1. **Zustand Store权限** (最新)
2. **Session权限数据** (备用)
3. **本地缓存权限** (快速恢复)

## 缓存策略

### 1. 本地存储

**缓存键**:
- `userCache`: 用户信息和权限
- `user_permissions`: 权限数据
- `latestPermissions`: 最新权限
- `permissionsTimestamp`: 权限时间戳

**缓存策略**:
- 有效期: 24小时
- 自动清理过期数据
- 权限变化时立即更新

### 2. 缓存恢复机制

当Session中权限数据为空时：
1. 检查本地缓存
2. 验证缓存时效性
3. 恢复有效权限数据
4. 更新Store状态

## 安全机制

### 1. 身份验证

- 基于NextAuth.js的JWT认证
- Session状态检查
- 用户身份验证

### 2. 权限验证

- 管理员权限检查
- 用户自身权限验证
- 防止越权操作

### 3. 数据安全

- API请求身份验证
- 权限数据加密存储
- 缓存数据时效性检查

## 性能优化

### 1. 权限预加载

- 页面加载时异步获取权限
- 本地缓存快速恢复
- 权限数据懒加载

### 2. 状态管理优化

- Zustand Store订阅优化
- 权限映射缓存
- 减少不必要的重新渲染

### 3. 用户体验

- 权限刷新状态提示
- 错误处理和重试机制
- 加载状态显示

## 错误处理

### 1. 网络错误

- API请求失败重试
- 降级到本地缓存
- 用户友好的错误提示

### 2. 权限错误

- 权限数据不一致检测
- 自动权限同步
- 手动刷新机制

### 3. 缓存错误

- 缓存数据验证
- 自动清理损坏数据
- 降级到默认权限

## 调试和监控

### 1. 权限日志

**文件**: `src/utils/permissionLogger.ts`

- 权限操作记录
- 错误日志记录
- 性能监控

### 2. 调试信息

- 权限映射状态
- 缓存数据状态
- API响应数据

## 使用指南

### 1. 权限检查

```typescript
// 在组件中使用权限
const { user } = usePermissionStore();

if (user?.permissions?.some(p => p.moduleId === 'invoice' && p.canAccess)) {
  // 显示发票模块
}
```

### 2. 权限刷新

```typescript
// 使用权限刷新Hook
const { refresh, isRefreshing } = usePermissionRefresh();

const handleRefresh = async () => {
  await refresh(username);
};
```

### 3. 权限初始化

```typescript
// 在页面组件中使用
import { usePermissionInit } from '@/hooks/usePermissionInit';

export default function MyPage() {
  usePermissionInit(); // 自动初始化权限
  // ...
}
```

## 最佳实践

### 1. 权限设计原则

- 最小权限原则
- 权限粒度适中
- 权限继承合理

### 2. 性能考虑

- 权限数据缓存
- 异步权限加载
- 状态管理优化

### 3. 用户体验

- 权限状态清晰
- 错误提示友好
- 加载状态明确

## 扩展性

### 1. 新增权限模块

1. 在权限映射中添加新模块
2. 更新权限检查逻辑
3. 添加相应的UI组件

### 2. 权限级别扩展

- 支持更细粒度的权限控制
- 支持权限组合和继承
- 支持动态权限配置

### 3. 多租户支持

- 租户级别的权限隔离
- 租户特定的权限配置
- 跨租户权限管理

## 总结

本权限系统通过以下特点实现了完整的权限控制：

1. **完整性**: 覆盖认证、授权、缓存、同步等各个环节
2. **安全性**: 多重验证机制，防止越权操作
3. **性能**: 缓存策略和异步加载，提升用户体验
4. **可维护性**: 模块化设计，便于扩展和维护
5. **用户体验**: 友好的错误处理和状态提示

该系统为站点提供了可靠、高效、安全的权限控制基础。 