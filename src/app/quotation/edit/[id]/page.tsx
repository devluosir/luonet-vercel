'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getQuotationHistory } from '@/utils/quotationHistory';
import QuotationPage from '../../page';

export default function EditQuotationPage({ params }: { params: { id: string } }) {
  const router = useRouter();
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

      // 将历史数据注入到 QuotationPage 组件中
      (window as any).__QUOTATION_DATA__ = quotation.data;
      // 设置编辑模式标志
      (window as any).__EDIT_MODE__ = true;
      // 设置编辑ID
      (window as any).__EDIT_ID__ = params.id;
      // 设置类型
      (window as any).__QUOTATION_TYPE__ = quotation.type;
      
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