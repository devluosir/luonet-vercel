'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getQuotationHistoryById } from '@/utils/quotationHistory';

export default function EditQuotationPage({ params }: { params: { id: string } }) {
  const router = useRouter();

  useEffect(() => {
    const history = getQuotationHistoryById(params.id);
    if (history) {
      // 将历史数据存储到 sessionStorage 中
      sessionStorage.setItem('edit_quotation_data', JSON.stringify({
        type: history.type,
        data: history.data
      }));
      // 重定向到报价页面
      router.push('/quotation');
    } else {
      // 如果找不到历史记录，返回历史记录页面
      router.push('/quotation/history');
    }
  }, [params.id, router]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#1C1C1E] flex items-center justify-center">
      <div className="text-gray-600 dark:text-[#98989D]">
        加载中...
      </div>
    </div>
  );
} 