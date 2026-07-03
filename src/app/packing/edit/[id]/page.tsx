'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getPackingHistoryById } from '@/utils/packingHistory';
import PackingPage from '@/features/packing/app/PackingPage';
import { normalizePackingData } from '@/features/packing/utils/normalizePackingData';

interface EditPackingPageProps {
  params: {
    id: string;
  };
}

export default function EditPackingPage({ params }: EditPackingPageProps) {
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

      // 🆕 恢复保存时的列显示设置
      if (historyItem.data.savedVisibleCols && typeof window !== 'undefined') {
        try {
          localStorage.setItem('pk.visibleCols', JSON.stringify(historyItem.data.savedVisibleCols));
        } catch (e) {
          console.warn('Failed to restore saved column preferences:', e);
        }
      }

      // 将数据注入到全局变量中，供 PackingPage 使用
      if (typeof window !== 'undefined') {
        window.__PACKING_DATA__ = normalizePackingData(historyItem.data);
        window.__EDIT_MODE__ = true;
        window.__EDIT_ID__ = params.id;
      }
    } catch (error) {
      console.error('Error loading packing record:', error);
      setError('加载装箱单记录时出错');
    } finally {
      setIsLoading(false);
    }

    // 清理函数
    return () => {
      if (typeof window !== 'undefined') {
        delete window.__PACKING_DATA__;
        delete window.__EDIT_MODE__;
        delete window.__EDIT_ID__;
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
