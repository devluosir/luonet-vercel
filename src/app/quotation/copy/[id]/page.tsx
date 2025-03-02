'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getQuotationHistory } from '@/utils/quotationHistory';
import QuotationPage from '../../page';

export default function CopyQuotationPage({ params }: { params: { id: string } }) {
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

      // 复制数据，但清除一些字段
      const copiedData = {
        ...quotation.data,
        quotationNo: '', // 清除报价单号
        contractNo: '', // 清除订单号
        date: new Date().toISOString(), // 更新日期
      };

      // 将复制的数据注入到 QuotationPage 组件中
      (window as any).__QUOTATION_DATA__ = copiedData;
      // 设置编辑模式标志为 false，因为这是新建
      (window as any).__EDIT_MODE__ = false;
      // 不设置编辑ID，因为这是新建
      (window as any).__EDIT_ID__ = undefined;
      // 设置类型
      (window as any).__QUOTATION_TYPE__ = quotation.type;
      
    } catch (error) {
      console.error('Error copying quotation:', error);
      setError('复制报价单时出错');
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