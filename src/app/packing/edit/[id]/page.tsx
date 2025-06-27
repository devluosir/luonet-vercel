'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getPackingHistoryById } from '@/utils/packingHistory';
import PackingPage from '../../page';

interface EditPackingPageProps {
  params: {
    id: string;
  };
}

export default function EditPackingPage({ params }: EditPackingPageProps) {
  const router = useRouter();

  useEffect(() => {
    // 获取历史记录数据
    const historyItem = getPackingHistoryById(params.id);
    
    if (!historyItem) {
      console.error('Packing record not found');
      router.push('/history');
      return;
    }

    // 将数据注入到全局变量中，供 PackingPage 使用
    if (typeof window !== 'undefined') {
      (window as any).__PACKING_DATA__ = historyItem.data;
      (window as any).__EDIT_MODE__ = true;
      (window as any).__EDIT_ID__ = params.id;
    }
  }, [params.id, router]);

  return <PackingPage />;
} 