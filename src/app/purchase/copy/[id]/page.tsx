'use client';

import { useEffect, useState } from 'react';
import { getPurchaseHistoryById } from '@/utils/purchaseHistory';
import PurchaseOrderPage from '../../page';
import type { PurchaseOrderData } from '@/types/purchase';

interface CustomWindow extends Window {
  __PURCHASE_DATA__?: PurchaseOrderData;
  __EDIT_MODE__?: boolean;
  __EDIT_ID__?: string;
}

interface ErrorResponse {
  message: string;
  code?: string;
  details?: unknown;
}

export default function PurchaseOrderCopyPage({ params }: { params: { id: string } }) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 从历史记录中加载采购订单数据
    try {
      const purchase = getPurchaseHistoryById(params.id);
      
      if (!purchase) {
        setError('采购订单未找到');
        return;
      }

      // 复制数据，但清除一些字段
      const copiedData = {
        ...purchase.data,
        orderNo: '', // 清除订单号
        date: new Date().toISOString().split('T')[0], // 更新日期，使用 YYYY-MM-DD 格式
      };

      // 将复制的数据注入到 PurchaseOrderPage 组件中
      const customWindow = window as unknown as CustomWindow;
      customWindow.__PURCHASE_DATA__ = copiedData;
      customWindow.__EDIT_MODE__ = false;
      customWindow.__EDIT_ID__ = undefined;
      
    } catch (error: unknown) {
      console.error('Error copying purchase order:', error);
      const errorMessage = error instanceof Error ? error.message : 
        (error as ErrorResponse)?.message || '复制采购订单时出错';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }

    // 清理函数
    return () => {
      const customWindow = window as unknown as CustomWindow;
      customWindow.__PURCHASE_DATA__ = undefined;
      customWindow.__EDIT_MODE__ = false;
      customWindow.__EDIT_ID__ = undefined;
    };
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#1C1C1E]">
        <div className="text-gray-600 dark:text-[#98989D]">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#1C1C1E]">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  return <PurchaseOrderPage />;
} 