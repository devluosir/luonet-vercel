'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getQuotationHistory } from '@/utils/quotationHistory';
import QuotationPage from '../../page';

export default function QuotationEditPage({ params }: { params: { id: string } }) {
  const _router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 添加 window 类型定义
  interface CustomWindow extends Window {
    __QUOTATION_DATA__?: QuotationData;
    __EDIT_MODE__?: boolean;
    __EDIT_ID__?: string;
    __QUOTATION_TYPE__?: 'quotation' | 'confirmation';
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const customWindow = window as unknown as CustomWindow;
      customWindow.__QUOTATION_DATA__ = null;
      customWindow.__EDIT_MODE__ = true;
      customWindow.__EDIT_ID__ = null;
      customWindow.__QUOTATION_TYPE__ = 'quotation';
    }
  }, []);

  useEffect(() => {
    // 从历史记录中加载报价数据
    try {
      const history = getQuotationHistory();
      const quotation = history.find(item => item.id === params.id);
      
      if (!quotation) {
        setError('报价单未找到');
        return;
      }

      // 将历史数据注入到 QuotationPage 组件中
      const customWindow = window as unknown as CustomWindow;
      customWindow.__QUOTATION_DATA__ = quotation.data;
      customWindow.__EDIT_MODE__ = true;
      customWindow.__EDIT_ID__ = params.id;
      customWindow.__QUOTATION_TYPE__ = quotation.type;
      
    } catch (error) {
      console.error('Error loading quotation:', error);
      setError('加载报价单时出错');
    } finally {
      setIsLoading(false);
    }
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