import { useEffect, useRef } from 'react';
import { usePurchaseStore } from '../state/purchase.store';

export function usePurchaseAutosave(wait = 300) {
  const draft = usePurchaseStore(s => s.draft);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        localStorage.setItem('purchase-autosave', JSON.stringify(draft));
      } catch (e: any) {
        // 兜底：配额不足时尝试轻量保存关键字段
        try {
          const slim = { 
            supplier: draft.supplier, 
            settings: draft.settings, 
            items: draft.items?.slice(0, 50) 
          };
          localStorage.setItem('purchase-autosave-slim', JSON.stringify(slim));
        } catch {}
      }
    }, wait);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [draft, wait]);
}
