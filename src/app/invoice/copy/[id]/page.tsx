'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getInvoiceHistory } from '@/utils/invoiceHistory';
import InvoicePage from '../../page';

export default function CopyInvoicePage({ params }: { params: { id: string } }) {
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

      // 复制发票数据，但生成新的发票号
      const newData = {
        ...invoice.data,
        invoiceNo: '', // 清空发票号，让用户重新输入
      };

      // 将复制的数据注入到 InvoicePage 组件中
      (window as any).__INVOICE_DATA__ = newData;
      // 确保不设置编辑模式
      (window as any).__EDIT_MODE__ = false;
      (window as any).__EDIT_ID__ = null;
      
    } catch (error) {
      console.error('Error copying invoice:', error);
      setError('复制发票时出错');
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