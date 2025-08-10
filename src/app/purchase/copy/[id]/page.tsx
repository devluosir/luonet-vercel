'use client';
import React, { useEffect } from 'react';
import PurchasePage from '@/features/purchase/app/PurchasePage';
import { usePurchaseStore } from '@/features/purchase/state/purchase.store';
import { PurchaseService } from '@/features/purchase/services/purchase.service';
import type { PurchaseDraft } from '@/features/purchase/utils/types';

export default function CopyPurchasePage({ params }: { params: { id: string } }) {
  const init = usePurchaseStore(s => s.init);

  useEffect(() => {
    (async () => {
      try {
        const source = await PurchaseService.load(params.id);
        if (source) {
          // 转换旧格式到新格式
          const cloned: PurchaseDraft = {
            supplier: {
              name: source.attn || '',
              attn: source.attn
            },
            bank: {},
            settings: {
              poNo: '', // 清空订单号，让用户重新填写
              currency: source.currency || 'USD',
              date: source.date,
              purchaser: source.from
            },
            items: [],
            notes: source.projectSpecification
          };
          init(cloned);
        } else {
          console.warn('未找到采购订单数据:', params.id);
          init();
        }
      } catch (error) {
        console.error('复制采购订单失败:', error);
        init();
      }
    })();
  }, [params.id, init]);

  return <PurchasePage />;
} 