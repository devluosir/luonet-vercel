import { ChangeEvent, useCallback } from 'react';
import { safeString, numberOrZero } from '../utils/normalizers';
import { usePurchaseStore } from '../state/purchase.store';
import { getIn } from '../utils/path';

type Bind = { value: any; onChange: (e: any) => void; name: string };

export function usePurchaseForm() {
  const draft = usePurchaseStore(s => s.draft);
  const setField = usePurchaseStore(s => s.setField);

  const field = useCallback((path: string): Bind => {
    const value = safeString(getIn(draft, path, ''));
    const onChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> | { target: { value: any }}) =>
      setField(path, (e as any)?.target?.value ?? '');
    return { value, onChange, name: path };
  }, [draft, setField]);

  const numberField = useCallback((path: string): Bind => {
    const value = String(getIn(draft, path, 0));
    const onChange = (e: any) => setField(path, numberOrZero(e?.target?.value));
    return { value, onChange, name: path };
  }, [draft, setField]);

  const boolField = useCallback((path: string): { checked: boolean; onChange: (e: any) => void; name: string } => {
    const checked = Boolean(getIn(draft, path, false));
    const onChange = (e: any) => setField(path, !!e?.target?.checked);
    return { checked, onChange, name: path };
  }, [draft, setField]);

  const selectField = field; // 选项型直接用 field

  return { field, numberField, boolField, selectField, draft };
}
