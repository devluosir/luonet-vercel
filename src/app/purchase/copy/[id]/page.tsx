'use client';
import React, { useEffect } from 'react';
import PurchasePage from '@/features/purchase/app/PurchasePage';
import { usePurchaseStore } from '@/features/purchase/state/purchase.store';
import { PurchaseService } from '@/features/purchase/services/purchase.service';
import type { PurchaseOrderData } from '@/types/purchase';
import { format } from 'date-fns';

export default function CopyPurchasePage({ params }: { params: { id: string } }) {
  const init = usePurchaseStore(s => s.init);

  useEffect(() => {
    (async () => {
      try {
        const source = await PurchaseService.load(params.id);
        if (source) {
          // 转换为 PurchaseOrderData 格式
          const cloned: Partial<PurchaseOrderData> = {
            attn: source.attn || '',
            ourRef: source.ourRef || '',
            yourRef: source.yourRef || '',
            orderNo: '', // 清空订单号，让用户重新填写
            date: source.date || format(new Date(), 'yyyy-MM-dd'),
            supplierQuoteDate: source.supplierQuoteDate || format(new Date(), 'yyyy-MM-dd'),
            contractAmount: source.contractAmount || '',
            projectSpecification: source.projectSpecification || '',
            paymentTerms: source.paymentTerms || '交货后30天',
            invoiceRequirements: source.invoiceRequirements || '如前；',
            deliveryInfo: source.deliveryInfo || '',
            orderNumbers: source.orderNumbers || '',
            showStamp: source.showStamp || false,
            showBank: source.showBank || false,
            currency: source.currency || 'USD',
            stampType: source.stampType || 'none',
            from: source.from || ''
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