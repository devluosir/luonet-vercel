'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// 动态导入CustomerPage组件，禁用SSR
const CustomerPage = dynamic(
  () => import('@/features/customer').then(mod => ({ default: mod.CustomerPage })),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <span className="text-gray-600 dark:text-gray-400">正在加载客户管理...</span>
        </div>
      </div>
    )
  }
);

export default function CustomerPageWrapper() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <span className="text-gray-600 dark:text-gray-400">正在初始化...</span>
        </div>
      </div>
    );
  }

  return <CustomerPage />;
}
