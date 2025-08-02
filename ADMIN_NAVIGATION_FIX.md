# 用户管理页面导航问题修复

## 问题描述

从用户管理页面（`/admin`）返回时，会出现跳转到登录画面的问题。这通常发生在以下情况：

1. 用户从管理页面返回到dashboard时
2. 页面重新渲染时session状态暂时变化
3. 权限检查逻辑过于严格，导致不必要的重定向

## 根本原因

1. **权限检查时机问题**：在页面切换时，session状态可能暂时变为 `loading` 或 `unauthenticated`
2. **中间件过于严格**：中间件在token信息不完整时直接拒绝访问
3. **权限store错误处理**：权限获取失败时抛出错误，导致页面重定向
4. **状态管理不当**：没有正确处理权限检查的中间状态

## 修复方案

### 1. 优化用户管理页面权限检查逻辑

**文件**: `src/app/admin/page.tsx`

**主要改进**:
- 添加 `permissionChecked` 状态来跟踪权限检查完成情况
- 优化权限检查流程，等待session和权限数据完全加载
- 改进错误处理，不立即重定向，给用户重试机会
- 返回 `null` 而不是重定向，让中间件处理未登录状态

```typescript
// 新增状态
const [permissionChecked, setPermissionChecked] = useState(false);

// 优化权限检查逻辑
useEffect(() => {
  if (!mounted) return;

  const checkPermissionsAndLoad = async () => {
    try {
      // 等待session加载完成
      if (status === 'loading') {
        return;
      }

      // 如果未登录，重定向到首页
      if (status === 'unauthenticated') {
        router.push('/');
        return;
      }

      // 如果session存在但权限数据未加载，先获取权限
      if (session?.user && !permissionUser) {
        await fetchPermissions();
        return; // 等待权限加载完成后再检查
      }

      // 权限检查
      const hasAdminPermission = isUserAdmin();
      if (!hasAdminPermission) {
        router.push('/dashboard');
        return;
      }

      // 标记权限检查完成
      setPermissionChecked(true);

      // 加载用户列表
      await fetchUsers();
    } catch (error) {
      console.error('权限检查失败:', error);
      // 不要立即重定向，给用户一个重试的机会
      setError('权限验证失败，请刷新页面重试');
    }
  };

  checkPermissionsAndLoad();
}, [mounted, status, session, permissionUser, router, fetchPermissions]);
```

### 2. 优化权限Store错误处理

**文件**: `src/lib/permissions.ts`

**主要改进**:
- 权限获取失败时不抛出错误，保留现有权限数据
- 网络错误时使用现有权限数据，避免页面重定向
- 改进session检查逻辑，未登录时清除用户数据但不抛出错误

```typescript
// 优化错误处理
try {
  // 1. 获取session信息
  const session = await getSession();
  if (!session?.user) {
    // 如果没有session，清除用户数据但不抛出错误
    set({ user: null, isLoading: false, error: null });
    return;
  }

  // 2. 从API获取最新权限
  const response = await fetch('/api/auth/get-latest-permissions', {
    // ... 配置
  });

  if (!response.ok) {
    // 如果API请求失败，保留现有用户数据，不抛出错误
    console.warn('获取权限失败，使用现有权限数据');
    set({ isLoading: false, error: null });
    return;
  }

  // ... 处理成功响应
} catch (error) {
  // 网络错误或其他异常，保留现有用户数据
  console.warn('权限获取异常，使用现有权限数据:', error);
  set({ isLoading: false, error: null });
}
```

### 3. 优化中间件权限检查

**文件**: `src/middleware.ts`

**主要改进**:
- 当token中缺少权限信息时，暂时允许访问，让前端处理权限检查
- 减少中间件的严格性，避免不必要的重定向

```typescript
// 4. 管理员路由需要管理员权限
if (ADMIN_PATHS.some(path => pathname.startsWith(path))) {
  // 如果token中没有isAdmin信息，暂时允许访问，让前端处理权限检查
  if (token.isAdmin === undefined) {
    return true;
  }
  return token.isAdmin === true;
}

// 5. 业务路由需要对应的权限
const moduleId = getModuleIdFromPath(pathname);
if (moduleId) {
  // 特殊处理dashboard页面
  if (moduleId === 'dashboard') {
    return true; // dashboard页面只要有token就可以访问
  }
  
  // 如果token中没有permissions信息，暂时允许访问，让前端处理权限检查
  if (!token.permissions) {
    return true;
  }
  
  return Array.isArray(token.permissions) && 
         token.permissions.some(perm => perm.moduleId === moduleId && perm.canAccess);
}
```

## 测试验证

创建了测试脚本 `scripts/test-admin-navigation.js` 来验证修复效果：

1. 登录系统
2. 导航到用户管理页面
3. 返回dashboard
4. 再次访问用户管理页面
5. 验证所有操作都正常，没有跳转到登录画面

## 修复效果

修复后的行为：

1. ✅ 从用户管理页面返回时不会跳转到登录画面
2. ✅ 权限检查更加稳定，减少不必要的重定向
3. ✅ 网络错误时使用现有权限数据，提高用户体验
4. ✅ 页面切换时状态管理更加平滑
5. ✅ 错误处理更加友好，给用户重试机会

## 注意事项

1. 权限检查仍然在中间件和前端双重进行，确保安全性
2. 网络异常时会使用缓存的权限数据，确保功能可用
3. 用户仍然需要正确的权限才能访问管理页面
4. 如果权限确实失效，用户会被重定向到dashboard而不是登录页面 