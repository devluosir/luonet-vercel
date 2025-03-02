'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getInvoiceHistory } from '@/utils/invoiceHistory';
import InvoicePage from '../../page';

export default function EditInvoicePage({ params }: { params: { id: string } }) {
  const router = useRouter();
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

      // 将历史数据注入到 InvoicePage 组件中
      (window as any).__INVOICE_DATA__ = invoice.data;
      // 设置编辑模式标志
      (window as any).__EDIT_MODE__ = true;
      // 设置编辑ID
      (window as any).__EDIT_ID__ = params.id;
      
    } catch (error) {
      console.error('Error loading invoice:', error);
      setError('加载发票时出错');
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

  return <InvoicePage />;
} 