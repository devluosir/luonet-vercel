'use client';

import { useEffect, useState } from 'react';
import { getQuotationHistory } from '@/utils/quotationHistory';
import QuotationPage from '../../page';
import type { CustomWindow } from '@/types/quotation';

export default function QuotationCopyPage({ params }: { params: { id: string } }) {
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

      // 复制数据，清空Quotation No和Contract No
      const copiedData = {
        ...quotation.data,
        quotationNo: '', // 清空报价单号，让用户重新填写
        contractNo: '', // 清空合同号，让用户重新填写
        date: new Date().toISOString().split('T')[0], // 设置为今天
      };

      // 将数据注入到 QuotationPage 组件中（复制模式）
      const customWindow = window as unknown as CustomWindow;
      customWindow.__QUOTATION_DATA__ = copiedData;
      customWindow.__EDIT_MODE__ = false; // 复制模式
      customWindow.__EDIT_ID__ = undefined; // 没有编辑ID
      customWindow.__QUOTATION_TYPE__ = quotation.type;
      
      // 立即设置loading为false，让页面快速显示
      setIsLoading(false);
      
    } catch (error: unknown) {
      console.error('Error loading quotation:', error);
      setError(error instanceof Error ? error.message : '加载报价单时出错');
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
        <div className="flex flex-col items-center space-y-3">
          <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <div className="text-sm text-gray-600 dark:text-[#98989D]">复制报价单...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#1C1C1E]">
        <div className="text-center">
          <div className="text-red-600 mb-4">{error}</div>
          <button 
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  return <QuotationPage />;
} 