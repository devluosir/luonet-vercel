import { useCallback } from 'react';
import { useMailStore } from '../state/mail.store';
import { useFormData } from '../state/mail.selectors';
import { MailService } from '../services/mail.service';
import type { MailFormData } from '../types';

export function useMailForm() {
  const formData = useFormData();
  const { updateFormData, setError, clearError } = useMailStore();
  const activeTab = useMailStore(state => state.activeTab);

  // 字段绑定函数
  const field = useCallback((name: keyof MailFormData) => ({
    value: formData[name],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      updateFormData({ [name]: e.target.value });
      clearError(); // 清除错误信息
    },
    name
  }), [formData, updateFormData, clearError]);

  // 表单验证
  const validate = useCallback(() => {
    const result = MailService.validateFormData(formData, activeTab);
    if (!result.isValid) {
      setError(Object.values(result.errors)[0] || '表单验证失败');
    }
    return result.isValid;
  }, [formData, activeTab, setError]);

  // 重置表单
  const reset = useCallback(() => {
    useMailStore.getState().resetForm();
  }, []);

  // 更新单个字段
  const setField = useCallback((name: keyof MailFormData, value: string) => {
    updateFormData({ [name]: value });
    clearError();
  }, [updateFormData, clearError]);

  return {
    formData,
    field,
    validate,
    reset,
    setField,
    updateFormData
  };
}
