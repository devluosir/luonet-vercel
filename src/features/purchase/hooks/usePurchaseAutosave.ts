import { useEffect, useRef } from 'react';
import { usePurchaseStore } from '../state/purchase.store';

export function usePurchaseAutosave(wait = 300) {
  const data = usePurchaseStore(s => s.data);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        localStorage.setItem('purchase-autosave', JSON.stringify(data));
      } catch (e: any) {
        // 兜底：配额不足时尝试轻量保存关键字段
        try {
          const slim = { 
            attn: data.attn, 
            orderNo: data.orderNo, 
            contractAmount: data.contractAmount 
          };
          localStorage.setItem('purchase-autosave-slim', JSON.stringify(slim));
        } catch {}
      }
    }, wait);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [data, wait]);
}
