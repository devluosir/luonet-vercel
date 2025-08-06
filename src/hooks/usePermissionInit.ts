import { useEffect } from 'react';
import { usePermissionStore } from '@/lib/permissions';

/**
 * 权限初始化Hook
 * 统一管理权限初始化逻辑，避免重复代码
 */
export const usePermissionInit = () => {
  const { initializeUserFromStorage, fetchPermissions, clearExpiredCache } = usePermissionStore();
  
  useEffect(() => {
    // 清理过期缓存
    clearExpiredCache();
    
    // 尝试从本地存储初始化
    const initialized = initializeUserFromStorage();
    
    // 如果没有成功初始化，则获取权限
    if (!initialized) {
      fetchPermissions(false); // 非强制刷新
    }
  }, []); // 只在组件挂载时执行一次
}; 