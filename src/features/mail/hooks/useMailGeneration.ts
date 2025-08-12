import { useCallback } from 'react';
import { useMailStore } from '../state/mail.store';
import { useFormData, useActiveTab, useMailType } from '../state/mail.selectors';
import { MailService } from '../services/mail.service';
import type { GenerateMailParams } from '../types';

export function useMailGeneration() {
  const formData = useFormData();
  const activeTab = useActiveTab();
  const mailType = useMailType();
  const { setLoading, setError, setGeneratedContent, clearError } = useMailStore();

  // 生成邮件内容
  const generateMail = useCallback(async () => {
    try {
      clearError();
      setLoading(true);
      
      const params: GenerateMailParams = {
        language: activeTab === 'mail' ? formData.language : formData.replyLanguage,
        type: activeTab === 'mail' ? mailType : formData.replyType,
        content: activeTab === 'mail' ? formData.mail : formData.reply,
        originalMail: activeTab === 'mail' ? '' : formData.replyTo,
        mode: activeTab
      };

      const content = await MailService.generateMail(params);
      const formattedContent = MailService.formatMailContent(content);
      setGeneratedContent(formattedContent);

    } catch (error: unknown) {
      console.error('Generate Error:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('生成失败，请稍后重试');
      }
    } finally {
      setLoading(false);
    }
  }, [activeTab, formData, mailType, setLoading, setError, setGeneratedContent, clearError]);

  return {
    generateMail,
    isLoading: useMailStore(state => state.isLoading),
    error: useMailStore(state => state.error)
  };
}
