'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateUserPage() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    isAdmin: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('https://udb.luocompany.net/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('用户创建成功！');
        setFormData({
          username: '',
          password: '',
          email: '',
          isAdmin: false
        });
      } else {
        setError(data.error || '创建用户失败');
      }
    } catch (error) {
      console.error('创建用户错误:', error);
      setError('创建用户过程中发生错误');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center mb-6">创建测试用户</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">用户名:</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">密码:</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">邮箱:</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="isAdmin"
              checked={formData.isAdmin}
              onChange={handleInputChange}
              className="mr-2"
            />
            <label className="text-sm">管理员权限</label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '创建中...' : '创建用户'}
          </button>
        </form>

        {/* 错误信息 */}
        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {/* 成功信息 */}
        {success && (
          <div className="mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-md">
            {success}
          </div>
        )}

        {/* 快速创建按钮 */}
        <div className="mt-6 space-y-2">
          <h3 className="text-sm font-medium">快速创建测试用户:</h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setFormData({
                  username: 'testuser1',
                  password: '123456',
                  email: 'test1@example.com',
                  isAdmin: false
                });
              }}
              className="px-3 py-2 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              普通用户1
            </button>
            <button
              onClick={() => {
                setFormData({
                  username: 'testuser2',
                  password: '123456',
                  email: 'test2@example.com',
                  isAdmin: false
                });
              }}
              className="px-3 py-2 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              普通用户2
            </button>
            <button
              onClick={() => {
                setFormData({
                  username: 'testadmin',
                  password: '123456',
                  email: 'admin@example.com',
                  isAdmin: true
                });
              }}
              className="px-3 py-2 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              测试管理员
            </button>
            <button
              onClick={() => {
                setFormData({
                  username: 'limiteduser',
                  password: '123456',
                  email: 'limited@example.com',
                  isAdmin: false
                });
              }}
              className="px-3 py-2 text-xs bg-orange-500 text-white rounded hover:bg-orange-600"
            >
              受限用户
            </button>
          </div>
        </div>

        {/* 导航链接 */}
        <div className="mt-6 text-center">
          <a
            href="/login-test"
            className="text-blue-600 hover:text-blue-500 text-sm"
          >
            返回登录测试页面
          </a>
        </div>
      </div>
    </div>
  );
} 