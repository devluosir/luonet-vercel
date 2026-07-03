import { useCallback, type ChangeEvent } from 'react';
import { usePurchaseStore } from '../state/purchase.store';

type TextInputEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;
type CheckboxEvent = ChangeEvent<HTMLInputElement>;

export type Bind = {
  value: string;
  onChange: (e: TextInputEvent) => void;
  name: string;
};

export type BoolBind = {
  checked: boolean;
  onChange: (e: CheckboxEvent) => void;
  name: string;
};

export function usePurchaseForm() {
  const draft = usePurchaseStore(s => s.draft);
  const setField = usePurchaseStore(s => s.setField);

  const field = useCallback((path: string): Bind => {
    const value = getNestedValue(draft, path, '');
    const onChange = (e: TextInputEvent) => setField(path, e.target.value ?? '');
    return { value: String(value), onChange, name: path };
  }, [draft, setField]);

  const boolField = useCallback((path: string): BoolBind => {
    const checked = Boolean(getNestedValue(draft, path, false));
    const onChange = (e: CheckboxEvent) => setField(path, !!e.target.checked);
    return { checked, onChange, name: path };
  }, [draft, setField]);

  const numberField = useCallback((path: string): Bind => {
    const value = getNestedValue(draft, path, 0);
    const onChange = (e: TextInputEvent) => setField(path, parseFloat(e.target.value) || 0);
    return { value: String(value), onChange, name: path };
  }, [draft, setField]);

  const selectField = field; // 选项型直接用 field

  return { field, boolField, numberField, selectField, draft, setField };
}

// 工具函数：获取嵌套对象的值
function getNestedValue<T>(obj: unknown, path: string, defaultValue: T): unknown {
  const pathParts = path.split('.');
  let current = obj;

  for (const part of pathParts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return defaultValue;
    }
  }

  return current;
}
