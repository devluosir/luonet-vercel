'use client';

import { useEffect, useState } from 'react';
import { getQuotationHistory } from '@/utils/quotationHistory';
import QuotationPage from '../../page';
import type { CustomWindow } from '@/types/quotation';

export default function QuotationEditPage({ params }: { params: { id: string } }) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 从历史记录中加载报价数据
    try {
      const history = getQuotationHistory();
      const quotation = history.find(item => item.id === params.id);
      
      if (!quotation) {
        setError('报价单未找到');
        return;
      }

      // 将数据注入到 QuotationPage 组件中
      const customWindow = window as unknown as CustomWindow;
      customWindow.__QUOTATION_DATA__ = quotation.data;
      customWindow.__EDIT_MODE__ = true;
      customWindow.__EDIT_ID__ = params.id;
      customWindow.__QUOTATION_TYPE__ = quotation.type;
      
    } catch (error: unknown) {
      console.error('Error loading quotation:', error);
      setError(error instanceof Error ? error.message : '加载报价单时出错');
    } finally {
      setIsLoading(false);
    }

    // 清理函数
    return () => {
      const customWindow = window as unknown as CustomWindow;
      customWindow.__QUOTATION_DATA__ = null;
      customWindow.__EDIT_MODE__ = false;
      customWindow.__EDIT_ID__ = undefined;
      customWindow.__QUOTATION_TYPE__ = 'quotation';
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

  return <QuotationPage />;
} 