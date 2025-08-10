'use client';
import React, { useEffect } from 'react';
import PurchasePage from '@/features/purchase/app/PurchasePage';
import { usePurchaseStore } from '@/features/purchase/state/purchase.store';
import { PurchaseService } from '@/features/purchase/services/purchase.service';
import type { PurchaseDraft } from '@/features/purchase/utils/types';

export default function EditPurchasePage({ params }: { params: { id: string } }) {
  const init = usePurchaseStore(s => s.init);

  useEffect(() => {
    (async () => {
      try {
        const data = await PurchaseService.load(params.id);
        if (data) {
          // 转换旧格式到新格式
          const converted: PurchaseDraft = {
            supplier: {
              name: data.attn || '',
              attn: data.attn
            },
            bank: {},
            settings: {
              poNo: data.orderNo || '',
              currency: data.currency || 'USD',
              date: data.date,
              purchaser: data.from
            },
            items: [],
            notes: data.projectSpecification
          };
          init(converted);
        } else {
          console.warn('未找到采购订单数据:', params.id);
          init();
        }
      } catch (error) {
        console.error('加载采购订单失败:', error);
        init();
      }
    })();
  }, [params.id, init]);

  return <PurchasePage />;
} 