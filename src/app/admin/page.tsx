'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { CreateUserModal } from '@/components/admin/CreateUserModal';
import { UserPlus, Users, Shield, ShieldCheck, Clock, Mail, User } from 'lucide-react';
import { Footer } from '@/components/Footer'; 

interface User {
  id: string;
  username: string;
  email: string | null;
  status: boolean;
  isAdmin: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;

    if (!session?.user?.isAdmin) {
      router.push('/tools');
      return;
    }

    fetchUsers();
  }, [session, status, router]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/admin/users');
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '获取用户列表失败');
      }
      const data = await response.json();
      console.log('Fetched users:', data);
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError(error instanceof Error ? error.message : '获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/signout', {
        method: 'POST',
      });
      if (response.ok) {
        router.push('/auth/signin');
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: !currentStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '更新用户状态失败');
      }

      await fetchUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
      alert(error instanceof Error ? error.message : '更新用户状态失败');
    }
  };

  const handleToggleAdmin = async (userId: string, currentIsAdmin: boolean) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAdmin: !currentIsAdmin }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '更新管理员权限失败');
      }

      await fetchUsers();
    } catch (error) {
      console.error('Error updating admin status:', error);
      alert(error instanceof Error ? error.message : '更新管理员权限失败');
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-lg text-gray-600 dark:text-gray-400">加载中...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black">
        <div className="text-center p-8 bg-white dark:bg-gray-900 rounded-xl shadow-lg">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L5.08 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="text-lg font-medium text-red-600 dark:text-red-400 mb-2">加载失败</div>
          <div className="text-gray-600 dark:text-gray-400">{error}</div>
          <button 
            onClick={fetchUsers}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  if (!session?.user?.isAdmin) {
    return null;
  }

  // 计算统计数据
  const totalUsers = users.length;
  const activeUsers = users.filter(user => user.status).length;
  const adminUsers = users.filter(user => user.isAdmin).length;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-black">
      <div className="flex-1">
        <AdminHeader 
          username={session.user.name || 'Admin'}
          onLogout={handleLogout}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 统计卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-[#1c1c1e] rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                  <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalUsers}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">总用户数</div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#1c1c1e] rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/20">
                  <ShieldCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{activeUsers}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">活跃用户</div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#1c1c1e] rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/20">
                  <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{adminUsers}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">管理员</div>
                </div>
              </div>
            </div>
          </div>

          {/* 用户列表 */}
          <div className="bg-white dark:bg-[#1c1c1e] shadow-sm rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                    <Users className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                    用户管理
                  </h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    管理系统用户账户和权限
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center justify-center px-4 py-2.5 text-sm font-medium text-white 
                           bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg 
                           hover:from-blue-700 hover:to-purple-700 
                           shadow-lg hover:shadow-xl transform hover:-translate-y-0.5
                           transition-all duration-200"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  添加用户
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-[#2c2c2e]">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <div className="flex items-center">
                        <User className="w-4 h-4 mr-2" />
                        用户信息
                      </div>
                    </th>
                    <th className="hidden lg:table-cell px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <div className="flex items-center">
                        <Mail className="w-4 h-4 mr-2" />
                        邮箱
                      </div>
                    </th>
                    <th className="hidden sm:table-cell px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      状态
                    </th>
                    <th className="hidden sm:table-cell px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <div className="flex items-center">
                        <Shield className="w-4 h-4 mr-2" />
                        管理员
                      </div>
                    </th>
                    <th className="hidden md:table-cell px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-2" />
                        最后登录
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-[#1c1c1e] divide-y divide-gray-200 dark:divide-gray-800">
                  {users.map((user, index) => (
                    <tr key={user.id} className={`hover:bg-gray-50 dark:hover:bg-[#2c2c2e] transition-colors group ${
                      index % 2 === 0 ? 'bg-white dark:bg-[#1c1c1e]' : 'bg-gray-50/50 dark:bg-[#1a1a1c]'
                    }`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                                                 <div className="flex items-center">
                           <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm relative ${
                             user.isAdmin 
                               ? 'bg-gradient-to-br from-blue-500 to-purple-600' 
                               : 'bg-gradient-to-br from-gray-500 to-gray-600'
                           }`}>
                             {user.username.charAt(0).toUpperCase()}
                             {/* 状态指示器 */}
                             <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-900 ${
                               user.status ? 'bg-green-500' : 'bg-red-500'
                             }`}></div>
                           </div>
                           <div className="ml-3 flex-1">
                             <div className="flex items-center gap-2">
                               <div className="text-sm font-medium text-gray-900 dark:text-white">
                                 {user.username}
                               </div>
                               {/* 小屏幕显示的标签 */}
                               <div className="flex gap-1 sm:hidden">
                                 {user.isAdmin && (
                                   <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
                                     <Shield className="w-3 h-3 mr-0.5" />
                                     管理员
                                   </span>
                                 )}
                                 <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                                   user.status 
                                     ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' 
                                     : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                                 }`}>
                                   {user.status ? '启用' : '禁用'}
                                 </span>
                               </div>
                             </div>
                             <div className="text-xs text-gray-500 dark:text-gray-400">
                               注册于 {new Date(user.createdAt).toLocaleDateString()}
                             </div>
                           </div>
                         </div>
                      </td>
                      <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center">
                          <Mail className="w-4 h-4 mr-2 text-gray-400" />
                          {user.email || (
                            <span className="text-gray-400 italic">未设置</span>
                          )}
                        </div>
                      </td>
                                             <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                         <button
                           onClick={() => handleToggleStatus(user.id, user.status)}
                           className={`group px-3 py-1.5 inline-flex items-center text-xs leading-5 font-semibold rounded-full transition-all duration-200 cursor-pointer hover:scale-105 ${
                             user.status 
                               ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-900/50' 
                               : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-900/50'
                           }`}
                         >
                           <div className={`w-2 h-2 rounded-full mr-2 ${
                             user.status ? 'bg-green-500' : 'bg-red-500'
                           }`}></div>
                           {user.status ? '启用' : '禁用'}
                         </button>
                       </td>
                       <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                         <button
                           onClick={() => handleToggleAdmin(user.id, user.isAdmin)}
                           className={`group px-3 py-1.5 inline-flex items-center text-xs leading-5 font-semibold rounded-full transition-all duration-200 cursor-pointer hover:scale-105 ${
                             user.isAdmin 
                               ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-md' 
                               : 'bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
                           }`}
                         >
                           {user.isAdmin ? (
                             <>
                               <Shield className="w-3 h-3 mr-1.5" />
                               <span className="font-semibold">管理员</span>
                             </>
                           ) : (
                             <>
                               <User className="w-3 h-3 mr-1.5" />
                               <span>普通用户</span>
                             </>
                           )}
                         </button>
                       </td>
                      <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {user.lastLoginAt ? (
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-2 text-gray-400" />
                            <div>
                              <div className="text-sm">{new Date(user.lastLoginAt).toLocaleDateString()}</div>
                              <div className="text-xs text-gray-400">{new Date(user.lastLoginAt).toLocaleTimeString()}</div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center text-gray-400">
                            <Clock className="w-4 h-4 mr-2" />
                            <span className="italic">未登录</span>
                          </div>
                        )}
                      </td>
                                             <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                         <div className="flex items-center gap-2">
                           <button
                             onClick={() => router.push(`/admin/users/${user.id}`)}
                             className="inline-flex items-center px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 
                                      text-xs font-medium rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 
                                      transition-colors duration-200 group-hover:scale-105"
                           >
                             <svg className="w-3 h-3 sm:mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                     d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                             </svg>
                             <span className="hidden sm:inline">编辑</span>
                           </button>
                           
                           {/* 小屏幕快速操作按钮 */}
                           <div className="flex gap-1 sm:hidden">
                             <button
                               onClick={() => handleToggleStatus(user.id, user.status)}
                               className={`p-1.5 rounded-lg text-xs transition-all duration-200 ${
                                 user.status 
                                   ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' 
                                   : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                               }`}
                               title={user.status ? '点击禁用用户' : '点击启用用户'}
                             >
                               {user.status ? (
                                 <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                 </svg>
                               ) : (
                                 <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                 </svg>
                               )}
                             </button>
                             
                             <button
                               onClick={() => handleToggleAdmin(user.id, user.isAdmin)}
                               className={`p-1.5 rounded-lg text-xs transition-all duration-200 ${
                                 user.isAdmin 
                                   ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
                                   : 'bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-300'
                               }`}
                               title={user.isAdmin ? '取消管理员权限' : '设为管理员'}
                             >
                               <Shield className="w-3 h-3" />
                             </button>
                           </div>
                         </div>
                       </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {users.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <div className="text-lg font-medium text-gray-900 dark:text-white mb-2">暂无用户</div>
                <div className="text-gray-500 dark:text-gray-400 mb-4">点击添加用户按钮创建第一个用户</div>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  添加用户
                </button>
              </div>
            )}
          </div>
        </div>

        <CreateUserModal 
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchUsers}
        />
      </div>
      <Footer />
    </div>
  );
}