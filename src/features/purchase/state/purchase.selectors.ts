import { shallow } from 'zustand/shallow';
import { useMemo } from 'react';
import { usePurchaseStore } from './purchase.store';

// 计算合计信息 - 修复：分片订阅 + useMemo 合成
export const useTotals = (): { subtotal: number; count: number; qtyTotal: number } => {
  const items = usePurchaseStore(s => s.draft.items);
  
  return useMemo(() => {
    const subtotal = items.reduce((acc, it) => acc + it.qty * it.price, 0);
    const count = items.length;
    const qtyTotal = items.reduce((acc, it) => acc + it.qty, 0);
    return { subtotal, count, qtyTotal };
  }, [items]);
};

// 获取供应商信息
export const useSupplier = () => usePurchaseStore(s => s.draft.supplier);

// 获取银行信息
export const useBankInfo = () => usePurchaseStore(s => s.draft.bank);

// 获取设置信息
export const useSettings = () => usePurchaseStore(s => s.draft.settings);

// 获取商品列表
export const useItems = () => usePurchaseStore(s => s.draft.items);

// 获取备注
export const useNotes = () => usePurchaseStore(s => s.draft.notes);

// 检查是否可以生成PDF - 修复：分片订阅 + useMemo 合成
export const useCanGeneratePdf = () => {
  const supplier = usePurchaseStore(s => s.draft.supplier);
  const items = usePurchaseStore(s => s.draft.items);
  
  return useMemo(() => {
    const hasSupplier = supplier.name.trim().length > 0;
    const hasItems = items.length > 0;
    const hasValidItems = items.every(item => 
      item.name.trim().length > 0 && item.qty > 0 && item.price > 0
    );
    return hasSupplier && hasItems && hasValidItems;
  }, [supplier, items]);
};

// 获取表单验证状态 - 修复：分片订阅 + useMemo 合成
export const useValidationState = (): { isValid: boolean; errors: string[] } => {
  const supplier = usePurchaseStore(s => s.draft.supplier);
  const items = usePurchaseStore(s => s.draft.items);
  
  return useMemo(() => {
    const errors: string[] = [];
    
    if (!supplier.name.trim()) {
      errors.push('供应商名称不能为空');
    }
    
    if (items.length === 0) {
      errors.push('至少需要添加一个商品');
    } else {
      items.forEach((item, index) => {
        if (!item.name.trim()) {
          errors.push(`商品 ${index + 1} 名称不能为空`);
        }
        if (item.qty <= 0) {
          errors.push(`商品 ${index + 1} 数量必须大于0`);
        }
        if (item.price <= 0) {
          errors.push(`商品 ${index + 1} 价格必须大于0`);
        }
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }, [supplier, items]);
};

// PDF负载选择器 - 修复：分片订阅 + useMemo 合成
export const usePdfPayload = () => {
  const supplier = usePurchaseStore(s => s.draft.supplier);
  const bank = usePurchaseStore(s => s.draft.bank);
  const settings = usePurchaseStore(s => s.draft.settings);
  const items = usePurchaseStore(s => s.draft.items);
  const notes = usePurchaseStore(s => s.draft.notes);
  
  return useMemo(() => {
    const mappedItems = items.map(x => ({ 
      name: x.name, 
      qty: x.qty, 
      unit: x.unit, 
      price: x.price, 
      amount: x.qty * x.price 
    }));
    const subtotal = items.reduce((a, it) => a + it.qty * it.price, 0);
    
    return {
      supplier,
      bank,
      settings,
      items: mappedItems,
      subtotal,
      notes,
    };
  }, [supplier, bank, settings, items, notes]);
};
