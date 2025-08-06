'use client';

import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { usePermissionRefresh } from '@/hooks/usePermissionRefresh';
import { useEffect, useState } from 'react';

export function PermissionRefreshButton() {
  const { data: session } = useSession();
  const { refresh, isRefreshing, refreshSuccess, refreshError } = usePermissionRefresh();
  const [showMessage, setShowMessage] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  const username = session?.user?.username || session?.user?.name;

  const handleClick = async () => {
    if (username) {
      await refresh(username);
    }
  };

  // 处理消息显示
  useEffect(() => {
    if (refreshSuccess) {
      setMessage('权限刷新成功，页面即将重载...');
      setMessageType('success');
      setShowMessage(true);
      setTimeout(() => setShowMessage(false), 3000);
    }
  }, [refreshSuccess]);

  useEffect(() => {
    if (refreshError) {
      setMessage(refreshError);
      setMessageType('error');
      setShowMessage(true);
      setTimeout(() => setShowMessage(false), 5000);
    }
  }, [refreshError]);

  if (!username) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={isRefreshing}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        title="刷新用户权限"
      >
        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        {isRefreshing ? '刷新中...' : '刷新权限'}
      </button>

      {/* 消息提示 */}
      {showMessage && (
        <div className="absolute top-full mt-2 left-0 z-50">
          <div className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg shadow-lg ${
            messageType === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {messageType === 'success' ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            {message}
          </div>
        </div>
      )}
    </div>
  );
} 