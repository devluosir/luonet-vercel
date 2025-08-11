import { useState, useCallback } from 'react';
import { User, Permission } from '../types';
import { API_ENDPOINTS, apiRequestWithError } from '@/lib/api-config';

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 获取用户列表
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await apiRequestWithError(API_ENDPOINTS.USERS.LIST);
      
      if (data.users && Array.isArray(data.users)) {
        setUsers(data.users);
      } else {
        setError('加载用户列表失败');
      }
    } catch (error) {
      setError('加载用户列表失败');
      console.error('获取用户列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 更新用户权限
  const updateUserPermissions = useCallback(async (userId: string, permissions: Permission[]) => {
    try {
      await apiRequestWithError(API_ENDPOINTS.USERS.PERMISSIONS(userId), {
        method: 'PUT',
        body: JSON.stringify({ permissions })
      });
      
      // 刷新用户列表
      await fetchUsers();
    } catch (error) {
      console.error('更新权限失败:', error);
      throw new Error('更新权限失败');
    }
  }, [fetchUsers]);

  // 清除错误
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    users,
    loading,
    error,
    fetchUsers,
    updateUserPermissions,
    clearError
  };
}
