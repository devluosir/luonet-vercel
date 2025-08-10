'use client';
import React, { useEffect } from 'react';
import PurchasePage from '@/features/purchase/app/PurchasePage';
import { usePurchaseStore } from '@/features/purchase/state/purchase.store';
import { PurchaseService } from '@/features/purchase/services/purchase.service';
import type { PurchaseOrderData } from '@/types/purchase';
import { format } from 'date-fns';

export default function EditPurchasePage({ params }: { params: { id: string } }) {
  const init = usePurchaseStore(s => s.init);

  useEffect(() => {
    (async () => {
      try {
        const data = await PurchaseService.load(params.id);
        if (data) {
          // 转换为 PurchaseOrderData 格式
          const converted: Partial<PurchaseOrderData> = {
            attn: data.attn || '',
            ourRef: data.ourRef || '',
            yourRef: data.yourRef || '',
            orderNo: data.orderNo || '',
            date: data.date || format(new Date(), 'yyyy-MM-dd'),
            supplierQuoteDate: data.supplierQuoteDate || format(new Date(), 'yyyy-MM-dd'),
            contractAmount: data.contractAmount || '',
            projectSpecification: data.projectSpecification || '',
            paymentTerms: data.paymentTerms || '交货后30天',
            invoiceRequirements: data.invoiceRequirements || '如前；',
            deliveryInfo: data.deliveryInfo || '',
            orderNumbers: data.orderNumbers || '',
            showStamp: data.showStamp || false,
            showBank: data.showBank || false,
            currency: data.currency || 'USD',
            stampType: data.stampType || 'none',
            from: data.from || ''
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