import { useMemo } from 'react';
import { usePurchaseStore } from '../state/purchase.store';

export type FieldError = { path: string; message: string };

export function usePurchaseValidation() {
  const draft = usePurchaseStore(s => s.draft);

  const errors: FieldError[] = useMemo(() => {
    const e: FieldError[] = [];
    
    // 供应商信息校验
    if (!draft.supplier?.name?.trim()) {
      e.push({ path: 'supplier.name', message: '供应商名称不能为空' });
    }
    
    // 设置信息校验
    if (!draft.settings?.currency) {
      e.push({ path: 'settings.currency', message: '请选择货币' });
    }
    
    // 商品列表校验
    if (!draft.items?.length) {
      e.push({ path: 'items', message: '至少需要添加一个商品' });
    } else {
      draft.items.forEach((it, i) => {
        if (!it?.name?.trim()) {
          e.push({ path: `items.${i}.name`, message: '商品描述不能为空' });
        }
        if ((it?.qty ?? 0) <= 0) {
          e.push({ path: `items.${i}.qty`, message: '数量必须大于0' });
        }
        if ((it?.price ?? 0) <= 0) {
          e.push({ path: `items.${i}.price`, message: '单价必须大于0' });
        }
      });
    }
    
    return e;
  }, [draft]);

  const isValid = errors.length === 0;
  return { isValid, errors };
}
