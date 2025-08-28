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

      // 🆕 恢复保存时的列显示设置
      if (quotation.data.savedVisibleCols && typeof window !== 'undefined') {
        try {
          localStorage.setItem('qt.visibleCols', JSON.stringify(quotation.data.savedVisibleCols));
        } catch (e) {
          console.warn('Failed to restore saved column preferences:', e);
        }
      }

      // 将数据注入到 QuotationPage 组件中（复制模式）
      const customWindow = window as unknown as CustomWindow;
      customWindow.__QUOTATION_DATA__ = copiedData;
      customWindow.__EDIT_MODE__ = false; // 复制模式
      customWindow.__EDIT_ID__ = undefined; // 没有编辑ID
      customWindow.__QUOTATION_TYPE__ = quotation.type;
      // 注入Notes配置
      if (quotation.data.notesConfig) {
        customWindow.__NOTES_CONFIG__ = quotation.data.notesConfig;
      }
      
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
      customWindow.__QUOTATION_DATA__ = undefined;
      customWindow.__EDIT_MODE__ = false;
      customWindow.__EDIT_ID__ = undefined;
      customWindow.__QUOTATION_TYPE__ = undefined;
      customWindow.__NOTES_CONFIG__ = undefined;
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