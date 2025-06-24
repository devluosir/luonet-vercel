'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';

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
  lastLoginAt: string | null;
  createdAt: string;
  permissions: Permission[];
}

// 定义所有可用的模块
const MODULES = [
  { id: 'ai-email', name: 'AI邮件助手', description: '智能生成商务邮件' },
  { id: 'quotation', name: '报价及确认', description: '生成报价单和销售确认单' },
  { id: 'invoice', name: '发票管理', description: '生成和管理发票' },
  { id: 'purchase', name: '采购订单', description: '生成给供应商的采购订单' },
  { id: 'history', name: '单据管理中心', description: '统一管理报价单、发票、采购订单历史' },
  { id: 'date-tools', name: '日期计算', description: '计算日期和天数' },
  { id: 'feature3', name: '功能3', description: '待开发功能' },
  { id: 'feature4', name: '功能4', description: '待开发功能' },
  { id: 'feature5', name: '功能5', description: '待开发功能' },
  { id: 'feature6', name: '功能6', description: '待开发功能' },
  { id: 'feature7', name: '功能7', description: '待开发功能' },
  { id: 'feature8', name: '功能8', description: '待开发功能' },
  { id: 'feature9', name: '功能9', description: '待开发功能' },
];

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingPermissions, setPendingPermissions] = useState<Map<string, boolean>>(new Map());
  const [hasChanges, setHasChanges] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      if (!params?.id) return;
      
      try {
        setLoading(true);
        const response = await fetch(`/api/admin/users/${params.id}`);
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || '获取用户信息失败');
        }
        const data = await response.json();
        setUser(data);
        // 初始化权限状态
        const initialPermissions = new Map();
        data.permissions.forEach((permission: Permission) => {
          initialPermissions.set(permission.moduleId, permission.canAccess);
        });
        setPendingPermissions(initialPermissions);
      } catch (error) {
        console.error('Error fetching user:', error);
        setError(error instanceof Error ? error.message : '获取用户信息失败');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [params?.id]);

  const handleTogglePermission = (moduleId: string, currentAccess: boolean) => {
    const newPermissions = new Map(pendingPermissions);
    newPermissions.set(moduleId, !currentAccess);
    setPendingPermissions(newPermissions);
    setHasChanges(true);
  };

  const handleSavePermissions = async () => {
    if (!user || !hasChanges) return;
    try {
      setSaving(true);
      
      // 构建权限数据
      const updatedPermissions = MODULES.map(module => ({
        moduleId: module.id,
        canAccess: pendingPermissions.get(module.id) ?? false
      }));

      console.log('Sending permissions:', updatedPermissions); // 调试日志

      const response = await fetch(`/api/admin/users/${user.id}/permissions/batch`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ permissions: updatedPermissions })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '更新模块权限失败');
      }

      const data = await response.json();
      setUser(data);
      setHasChanges(false);
      alert('权限更新成功');
    } catch (error) {
      console.error('Error updating permissions:', error);
      alert(error instanceof Error ? error.message : '更新模块权限失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!user) return;
    
    try {
      setIsDeleting(true);
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        let errorMessage = '删除用户失败';
        try {
          const data = await response.json();
          errorMessage = data.error || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      router.push('/admin');
      alert('用户已成功删除');
    } catch (error) {
      console.error('Error deleting user:', error);
      alert(error instanceof Error ? error.message : '删除用户失败');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-500">{error}</div>
      </div>
    );
  }

  if (!session?.user?.isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#1c1c1e] rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">确认删除</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              确定要删除该用户吗？此操作不可恢复。
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 
                         bg-gray-100 dark:bg-gray-800 rounded-md 
                         hover:bg-gray-200 dark:hover:bg-gray-700 
                         focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 
                         dark:focus:ring-offset-gray-800"
                disabled={isDeleting}
              >
                取消
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white 
                         bg-red-600 dark:bg-red-500 rounded-md 
                         hover:bg-red-700 dark:hover:bg-red-600 
                         focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 
                         dark:focus:ring-offset-gray-800
                         disabled:bg-red-400 dark:disabled:bg-red-400 disabled:cursor-not-allowed"
              >
                {isDeleting ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center">
            <Image
              src="/logo/logo.png"
              alt="Logo"
              width={40}
              height={40}
              className="mr-2"
            />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">编辑用户</h1>
          </div>
          <button
            onClick={() => router.push('/admin')}
            className="bg-gray-500 dark:bg-gray-600 text-white px-4 py-2 rounded-lg 
                     hover:bg-gray-600 dark:hover:bg-gray-700 transition-colors"
          >
            返回
          </button>
        </div>

        {user && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-[#1c1c1e] shadow-sm rounded-lg border border-gray-200 dark:border-gray-800">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">基本信息</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">用户名</label>
                    <div className="mt-1 text-sm text-gray-900 dark:text-white">
                      {user.username}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">邮箱</label>
                    <div className="mt-1 text-sm text-gray-900 dark:text-white">
                      {user.email || '-'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">状态</label>
                    <div className="mt-1">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        user.status
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
                      }`}>
                        {user.status ? '启用' : '禁用'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">管理员权限</label>
                    <div className="mt-1">
                      <span className={`px-3 py-1 text-xs rounded-full ${
                        user.isAdmin
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                      }`}>
                        {user.isAdmin ? '是' : '否'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">最后登录时间</label>
                    <div className="mt-1 text-sm text-gray-900 dark:text-white">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '-'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">创建时间</label>
                    <div className="mt-1 text-sm text-gray-900 dark:text-white">
                      {new Date(user.createdAt).toLocaleString()}
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={isDeleting}
                      className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:bg-red-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {isDeleting ? '删除中...' : '删除用户'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#1c1c1e] shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium">模块权限</h2>
                  <button
                    onClick={handleSavePermissions}
                    disabled={!hasChanges || saving}
                    className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                      hasChanges && !saving
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {saving ? '保存中...' : '保存更改'}
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {MODULES.map((module) => {
                    const hasAccess = pendingPermissions.get(module.id) ?? false;
                    return (
                      <div
                        key={module.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {module.name}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {module.description}
                          </span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={hasAccess}
                            onChange={() => handleTogglePermission(module.id, hasAccess)}
                            disabled={saving}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 