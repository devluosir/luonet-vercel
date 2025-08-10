import { shallow } from 'zustand/shallow';
import { usePurchaseStore } from './purchase.store';

// 计算合计信息
export const useTotals = (): { subtotal: number; count: number } => usePurchaseStore(s => {
  const subtotal = s.draft.items.reduce((acc, it) => acc + it.qty * it.price, 0);
  const count = s.draft.items.length;
  return { subtotal, count };
});

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

// 检查是否可以生成PDF
export const useCanGeneratePdf = () => usePurchaseStore(s => {
  const hasSupplier = s.draft.supplier.name.trim().length > 0;
  const hasItems = s.draft.items.length > 0;
  const hasValidItems = s.draft.items.every(item => 
    item.name.trim().length > 0 && item.qty > 0 && item.price > 0
  );
  return hasSupplier && hasItems && hasValidItems;
});

// 获取表单验证状态
export const useValidationState = (): { isValid: boolean; errors: string[] } => usePurchaseStore(s => {
  const errors: string[] = [];
  
  if (!s.draft.supplier.name.trim()) {
    errors.push('供应商名称不能为空');
  }
  
  if (s.draft.items.length === 0) {
    errors.push('至少需要添加一个商品');
  } else {
    s.draft.items.forEach((item, index) => {
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
});

// PDF负载选择器 - 集中确定导出数据结构
export const usePdfPayload = () => usePurchaseStore(s => {
  const d = s.draft;
  return {
    supplier: d.supplier,
    bank: d.bank,
    settings: d.settings,
    items: d.items.map(x => ({ 
      name: x.name, 
      qty: x.qty, 
      unit: x.unit, 
      price: x.price, 
      amount: x.qty * x.price 
    })),
    subtotal: d.items.reduce((a, it) => a + it.qty * it.price, 0),
    notes: d.notes,
  };
});
