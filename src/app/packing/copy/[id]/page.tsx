'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getPackingHistoryById } from '@/utils/packingHistory';
import PackingPage from '../../page';

interface CopyPackingPageProps {
  params: {
    id: string;
  };
}

export default function CopyPackingPage({ params }: CopyPackingPageProps) {
  const router = useRouter();

  useEffect(() => {
    // 获取历史记录数据
    const historyItem = getPackingHistoryById(params.id);
    
    if (!historyItem) {
      console.error('Packing record not found');
      router.push('/history');
      return;
    }

    // 复制数据，清除原有的发票号等标识字段
    const copiedData = {
      ...historyItem.data,
      invoiceNo: '', // 清空发票号，让用户重新填写
      orderNo: '', // 清空订单号
      date: new Date().toISOString().split('T')[0], // 设置为今天
    };

    // 将数据注入到全局变量中，供 PackingPage 使用
    // 注意：复制模式不设置 EDIT_ID，这样会创建新记录
    if (typeof window !== 'undefined') {
      (window as any).__PACKING_DATA__ = copiedData;
      (window as any).__EDIT_MODE__ = false;
      delete (window as any).__EDIT_ID__;
    }
  }, [params.id, router]);

  return <PackingPage />;
} 