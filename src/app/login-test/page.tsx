'use client';

import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// 常见的测试用户名（基于实际数据库可能存在的用户）
const COMMON_USERS = [
  {
    username: 'luojun',
    password: '123456',
    description: '管理员用户 - 所有权限'
  },
  {
    username: 'admin',
    password: 'admin',
    description: '管理员用户'
  },
  {
    username: 'user',
    password: 'user',
    description: '普通用户'
  },
  {
    username: 'test',
    password: 'test',
    description: '测试用户'
  }
];

export default function LoginTestPage() {
  const [selectedUser, setSelectedUser] = useState(COMMON_USERS[0]);
  const [customUsername, setCustomUsername] = useState('');
  const [customPassword, setCustomPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [existingUsers, setExistingUsers] = useState<any[]>([]);
  const router = useRouter();
  const { data: session, status } = useSession();

  // 如果已登录，跳转到dashboard
  useEffect(() => {
    if (session && status === 'authenticated') {
      router.push('/dashboard');
    }
  }, [session, status, router]);

  if (session && status === 'authenticated') {
    return null;
  }

  // 获取现有用户列表 - 暂时注释掉，因为需要认证
  // useEffect(() => {
  //   const fetchUsers = async () => {
  //     try {
  //       const response = await fetch('https://udb.luocompany.net/api/admin/users', {
  //         method: 'GET',
  //         headers: {
  //           'Content-Type': 'application/json',
  //         },
  //       });
        
  //       if (response.ok) {
  //         const data = await response.json();
  //         setExistingUsers(data.users || []);
  //       }
  //     } catch (error) {
  //       console.error('获取用户列表失败:', error);
  //     }
  //   };

  //   fetchUsers();
  // }, []);

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const username = customUsername || selectedUser.username;
      const password = customPassword || selectedUser.password;
      
      console.log('测试登录:', { username, password });
      
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(`登录失败: ${result.error}`);
      } else if (result?.ok) {
        setSuccess('登录成功！正在跳转...');
        setTimeout(() => {
          router.push('/dashboard');
        }, 1000);
      }
    } catch (error) {
      console.error('登录错误:', error);
      setError('登录过程中发生错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center mb-6">权限测试登录</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 登录表单 */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">登录测试</h2>
            
            {/* 预设用户选择 */}
            <div>
              <label className="block text-sm font-medium mb-2">选择预设用户:</label>
              <select
                value={selectedUser.username}
                onChange={(e) => {
                  const user = COMMON_USERS.find(u => u.username === e.target.value);
                  if (user) setSelectedUser(user);
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                {COMMON_USERS.map(user => (
                  <option key={user.username} value={user.username}>
                    {user.username} - {user.description}
                  </option>
                ))}
              </select>
            </div>

            {/* 自定义用户输入 */}
            <div>
              <label className="block text-sm font-medium mb-2">或输入自定义用户名:</label>
              <input
                type="text"
                value={customUsername}
                onChange={(e) => setCustomUsername(e.target.value)}
                placeholder="输入用户名"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">密码:</label>
              <input
                type="password"
                value={customPassword}
                onChange={(e) => setCustomPassword(e.target.value)}
                placeholder="输入密码"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            {/* 登录按钮 */}
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '登录中...' : '登录'}
            </button>

            {/* 错误信息 */}
            {error && (
              <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
                {error}
              </div>
            )}

            {/* 成功信息 */}
            {success && (
              <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded-md">
                {success}
              </div>
            )}
          </div>

          {/* 现有用户列表 */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">数据库中的用户</h2>
            
            {existingUsers.length > 0 ? (
              <div className="space-y-2">
                {existingUsers.map(user => (
                  <div key={user.id} className="p-3 bg-gray-100 dark:bg-gray-700 rounded-md">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{user.username}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {user.email || '无邮箱'} - {user.isAdmin ? '管理员' : '普通用户'}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setCustomUsername(user.username);
                          setCustomPassword(''); // 清空密码，让用户输入
                        }}
                        className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        使用
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-md">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  正在加载用户列表...
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 说明 */}
        <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-md">
          <h3 className="font-medium mb-2">使用说明:</h3>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>• 选择预设用户或输入自定义用户名和密码</li>
            <li>• 点击右侧用户列表中的"使用"按钮快速填入用户名</li>
            <li>• 登录成功后会跳转到dashboard页面</li>
            <li>• 可以在dashboard中查看权限显示情况</li>
            <li>• 如果登录失败，请检查用户名和密码是否正确</li>
          </ul>
          
          <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-600">
            <a
              href="/create-user"
              className="inline-block px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
            >
              创建新测试用户
            </a>
          </div>
        </div>
      </div>
    </div>
  );
} 