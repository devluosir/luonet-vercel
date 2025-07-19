'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getPackingHistoryById } from '@/utils/packingHistory';
import PackingPage from '../../page';

interface CopyPackingPageProps {
  params: {
    id: string;
  };
}

export default function CopyPackingPage({ params }: CopyPackingPageProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 获取历史记录数据
    try {
      const historyItem = getPackingHistoryById(params.id);
      
      if (!historyItem) {
        setError('装箱单记录未找到');
        return;
      }

      // 复制数据，只清除发票号，保留订单号
      const copiedData = {
        ...historyItem.data,
        invoiceNo: '', // 清空发票号，让用户重新填写
        date: new Date().toISOString().split('T')[0], // 设置为今天
      };

      // 将数据注入到全局变量中，供 PackingPage 使用
      // 注意：复制模式不设置 EDIT_ID，这样会创建新记录
      if (typeof window !== 'undefined') {
        (window as any).__PACKING_DATA__ = copiedData;
        (window as any).__EDIT_MODE__ = false;
        delete (window as any).__EDIT_ID__;
      }
    } catch (error) {
      console.error('Error copying packing record:', error);
      setError('复制装箱单时出错');
    } finally {
      setIsLoading(false);
    }

    // 清理函数
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).__PACKING_DATA__;
        delete (window as any).__EDIT_MODE__;
        delete (window as any).__EDIT_ID__;
      }
    };
  }, [params.id, router]);

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

  return <PackingPage />;
} 