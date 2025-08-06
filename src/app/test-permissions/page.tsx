'use client';

import { usePermissionStore } from '@/lib/permissions';
import { usePermissionInit } from '@/hooks/usePermissionInit';
import { preloadManager } from '@/utils/preloadUtils';
import { useState } from 'react';
import { useSession } from 'next-auth/react';

export default function TestPermissionsPage() {
  const { user, isLoading, error, hasPermission, isAdmin } = usePermissionStore();
  const { resetInitState } = usePermissionInit();
  const [preloadStatus, setPreloadStatus] = useState<any>(null);

  const handleResetPermissions = () => {
    usePermissionStore.getState().resetPermissionState();
    resetInitState();
    preloadManager.resetPreloadState();
    console.log('权限系统状态已重置');
  };

  const handleClearPermissionCache = () => {
    usePermissionStore.getState().clearPermissionCache();
    console.log('权限检查缓存已清理');
  };

  const handleCheckPreloadStatus = () => {
    const status = preloadManager.getPreloadStatus();
    setPreloadStatus(status);
    console.log('预加载状态:', status);
  };

  // ✅ 新增：调试权限系统状态
  const handleDebugPermissions = () => {
    const store = usePermissionStore.getState();
    const session = useSession();
    
    console.log('=== 权限系统调试信息 ===');
    console.log('Store状态:', {
      user: store.user ? {
        id: store.user.id,
        username: store.user.username,
        isAdmin: store.user.isAdmin,
        permissionsCount: store.user.permissions?.length || 0,
        permissions: store.user.permissions?.map((p: any) => ({ moduleId: p.moduleId, canAccess: p.canAccess }))
      } : null,
      isLoading: store.isLoading,
      error: store.error,
      permissionCacheSize: store.permissionCache.size
    });
    
    console.log('Session状态:', {
      status: session.status,
      user: session.data?.user ? {
        id: session.data.user.id,
        username: session.data.user.username,
        isAdmin: session.data.user.isAdmin,
        permissionsCount: session.data.user.permissions?.length || 0,
        permissions: session.data.user.permissions?.map((p: any) => ({ moduleId: p.moduleId, canAccess: p.canAccess }))
      } : null
    });
    
    console.log('本地缓存:', (() => {
      try {
        const userCache = localStorage.getItem('userCache');
        if (userCache) {
          const cacheData = JSON.parse(userCache);
          return {
            timestamp: cacheData.timestamp,
            isRecent: cacheData.timestamp && (Date.now() - cacheData.timestamp) < 24 * 60 * 60 * 1000,
            user: {
              id: cacheData.id,
              username: cacheData.username,
              isAdmin: cacheData.isAdmin,
              permissionsCount: cacheData.permissions?.length || 0,
              permissions: cacheData.permissions?.map((p: any) => ({ moduleId: p.moduleId, canAccess: p.canAccess }))
            }
          };
        }
        return null;
      } catch (error) {
        return { error: error instanceof Error ? error.message : '未知错误' };
      }
    })());
    
    console.log('权限检查缓存:', {
      cacheSize: store.permissionCache.size,
      cacheEntries: Array.from(store.permissionCache.entries())
    });
    
    console.log('=== 调试信息结束 ===');
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">权限系统测试页面</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 用户信息 */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">用户信息</h2>
          {isLoading ? (
            <p>加载中...</p>
          ) : user ? (
            <div className="space-y-2">
              <p><strong>ID:</strong> {user.id}</p>
              <p><strong>用户名:</strong> {user.username}</p>
              <p><strong>邮箱:</strong> {user.email || '无'}</p>
              <p><strong>管理员:</strong> {isAdmin() ? '是' : '否'}</p>
              <p><strong>权限数量:</strong> {user.permissions.length}</p>
              <p><strong>状态:</strong> {user.status ? '正常' : '禁用'}</p>
            </div>
          ) : (
            <p className="text-red-500">未登录</p>
          )}
        </div>

        {/* 权限列表 */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">权限列表</h2>
          {user?.permissions ? (
            <div className="space-y-2">
              {user.permissions.map((permission) => (
                <div key={permission.id} className="flex items-center space-x-2">
                  <span className={`w-3 h-3 rounded-full ${permission.canAccess ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span>{permission.moduleId}</span>
                  <span className="text-sm text-gray-500">({permission.canAccess ? '有权限' : '无权限'})</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">无权限数据</p>
          )}
        </div>

        {/* 权限检查 */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">权限检查</h2>
          <div className="space-y-2">
            <p><strong>quotation:</strong> {hasPermission('quotation') ? '✅' : '❌'}</p>
            <p><strong>packing:</strong> {hasPermission('packing') ? '✅' : '❌'}</p>
            <p><strong>invoice:</strong> {hasPermission('invoice') ? '✅' : '❌'}</p>
            <p><strong>purchase:</strong> {hasPermission('purchase') ? '✅' : '❌'}</p>
            <p><strong>history:</strong> {hasPermission('history') ? '✅' : '❌'}</p>
          </div>
        </div>

        {/* 预加载状态 */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">预加载状态</h2>
          {preloadStatus ? (
            <div className="space-y-2">
              <p><strong>正在预加载:</strong> {preloadStatus.isPreloading ? '是' : '否'}</p>
              <p><strong>已预加载:</strong> {preloadStatus.hasPreloaded ? '是' : '否'}</p>
              <p><strong>需要预加载:</strong> {preloadStatus.shouldPreload ? '是' : '否'}</p>
              <p><strong>基于权限检查:</strong> {preloadStatus.shouldPreloadBasedOnPermissions ? '是' : '否'}</p>
              <p><strong>已触发:</strong> {preloadStatus.preloadTriggered ? '是' : '否'}</p>
              <p><strong>进度:</strong> {preloadStatus.progress}%</p>
              <p><strong>权限哈希:</strong> {preloadStatus.lastPermissionsHash ? preloadStatus.lastPermissionsHash.substring(0, 20) + '...' : '无'}</p>
            </div>
          ) : (
            <p className="text-gray-500">未检查</p>
          )}
          <button 
            onClick={handleCheckPreloadStatus}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            检查预加载状态
          </button>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="mt-6 space-x-4">
        <button 
          onClick={handleResetPermissions}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          重置权限系统
        </button>
        <button 
          onClick={handleClearPermissionCache}
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
        >
          清理权限缓存
        </button>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          刷新页面
        </button>
        <button 
          onClick={handleDebugPermissions}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          调试权限系统
        </button>
      </div>

      {/* 错误信息 */}
      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <strong>错误:</strong> {error}
        </div>
      )}
    </div>
  );
} 