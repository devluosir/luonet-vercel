'use client';

import { useEffect, useState } from 'react';
import { getInvoiceHistory } from '@/utils/invoiceHistory';
import InvoicePage from '../../page';
import type { InvoiceData } from '@/features/invoice';

interface CustomWindow extends Window {
  __INVOICE_DATA__?: InvoiceData;
  __EDIT_MODE__?: boolean;
  __EDIT_ID__?: string;
}

interface ErrorResponse {
  message: string;
  code?: string;
  details?: unknown;
}

export default function InvoiceEditPage({ params }: { params: { id: string } }) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 从历史记录中加载发票数据
    try {
      const history = getInvoiceHistory();
      const invoice = history.find(item => item.id === params.id);
      
      if (!invoice) {
        setError('发票未找到');
        return;
      }

      // 🆕 恢复保存时的列显示设置
      if (invoice.data && typeof window !== 'undefined') {
        try {
          // 发票模块使用数据字段控制列显示，不需要修改localStorage
          // 列显示设置已经保存在 invoice.data 中
          console.log('恢复发票列显示设置:', {
            showHsCode: invoice.data.showHsCode,
            showPartName: invoice.data.showPartName,
            showDescription: invoice.data.showDescription,
            showRemarks: invoice.data.showRemarks
          });
        } catch (e) {
          console.warn('Failed to restore saved column preferences:', e);
        }
      }

      // 将数据注入到 InvoicePage 组件中
      const customWindow = window as unknown as CustomWindow;
      customWindow.__INVOICE_DATA__ = invoice.data;
      customWindow.__EDIT_MODE__ = true;
      customWindow.__EDIT_ID__ = params.id;
      
    } catch (error: unknown) {
      console.error('Error loading invoice:', error);
      const errorMessage = error instanceof Error ? error.message : 
        (error as ErrorResponse)?.message || '加载发票时出错';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }

    // 清理函数
    return () => {
      const customWindow = window as unknown as CustomWindow;
      customWindow.__INVOICE_DATA__ = undefined;
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

  return <InvoicePage />;
} 