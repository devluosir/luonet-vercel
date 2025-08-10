import { useCallback } from 'react';
import { usePurchaseStore } from '../state/purchase.store';

export type Bind = {
  value: string;
  onChange: (e: any) => void;
  name: string;
};

export type BoolBind = {
  checked: boolean;
  onChange: (e: any) => void;
  name: string;
};

export function usePurchaseForm() {
  const draft = usePurchaseStore(s => s.draft);
  const setField = usePurchaseStore(s => s.setField);

  const field = useCallback((path: string): Bind => {
    const value = getNestedValue(draft, path, '');
    const onChange = (e: any) => setField(path, e?.target?.value ?? '');
    return { value: String(value), onChange, name: path };
  }, [draft, setField]);

  const boolField = useCallback((path: string): BoolBind => {
    const checked = Boolean(getNestedValue(draft, path, false));
    const onChange = (e: any) => setField(path, !!e?.target?.checked);
    return { checked, onChange, name: path };
  }, [draft, setField]);

  const numberField = useCallback((path: string): Bind => {
    const value = getNestedValue(draft, path, 0);
    const onChange = (e: any) => setField(path, parseFloat(e?.target?.value) || 0);
    return { value: String(value), onChange, name: path };
  }, [draft, setField]);

  const selectField = field; // 选项型直接用 field

  return { field, boolField, numberField, selectField, draft };
}

// 工具函数：获取嵌套对象的值
function getNestedValue(obj: any, path: string, defaultValue: any): any {
  const pathParts = path.split('.');
  let current = obj;
  
  for (const part of pathParts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return defaultValue;
    }
  }
  
  return current;
}
