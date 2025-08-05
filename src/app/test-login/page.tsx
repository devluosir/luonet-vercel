'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function TestLoginPage() {
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();

  const testAuth = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://udb.luocompany.net'}/api/auth/d1-users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'test',
          password: 'test'
        })
      });

      const data = await response.json();
      setTestResult({
        status: response.status,
        ok: response.ok,
        data: data
      });
    } catch (error) {
      setTestResult({
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">登录问题诊断</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">URL参数</h2>
            <div className="space-y-2">
              <p><strong>当前URL:</strong> {typeof window !== 'undefined' ? window.location.href : '服务器端'}</p>
              <p><strong>CallbackUrl:</strong> {searchParams?.get('callbackUrl') || '无'}</p>
              <p><strong>所有参数:</strong></p>
              <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto max-h-32">
                {JSON.stringify(Object.fromEntries(searchParams?.entries() || []), null, 2)}
              </pre>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">API测试</h2>
            <button
              onClick={testAuth}
              disabled={loading}
              className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? '测试中...' : '测试认证API'}
            </button>
            
            {testResult && (
              <div className="mt-4 p-4 bg-gray-50 rounded-md">
                <h3 className="font-semibold mb-2">测试结果:</h3>
                <pre className="text-sm overflow-auto max-h-64">
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">环境信息</h2>
          <div className="space-y-2">
            <p><strong>API基础URL:</strong> {process.env.NEXT_PUBLIC_API_BASE_URL || 'https://udb.luocompany.net'}</p>
            <p><strong>NEXTAUTH_SECRET:</strong> {process.env.NEXTAUTH_SECRET ? '已设置' : '未设置'}</p>
            <p><strong>NODE_ENV:</strong> {process.env.NODE_ENV}</p>
          </div>
        </div>
      </div>
    </div>
  );
} 