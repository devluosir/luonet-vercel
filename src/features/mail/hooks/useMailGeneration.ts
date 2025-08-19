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
      
      // 验证表单数据
      const validation = MailService.validateFormData(formData, activeTab);
      if (!validation.isValid) {
        const firstError = Object.values(validation.errors)[0];
        setError(firstError);
        return;
      }
      
      const params: GenerateMailParams = {
        language: activeTab === 'mail' ? formData.language : formData.replyLanguage,
        type: activeTab === 'mail' ? mailType : formData.replyType,
        content: activeTab === 'mail' ? formData.mail : formData.reply,
        originalMail: activeTab === 'mail' ? '' : formData.replyTo,
        mode: activeTab
      };

      console.log('开始生成邮件:', { 
        mode: activeTab, 
        language: params.language, 
        type: params.type,
        contentLength: params.content.length 
      });

      const content = await MailService.generateMail(params);
      
      if (!content || content.trim().length === 0) {
        throw new Error('生成的内容为空，请重试');
      }
      
      const formattedContent = MailService.formatMailContent(content);
      
      if (!formattedContent || formattedContent.trim().length === 0) {
        throw new Error('格式化后的内容为空，请重试');
      }
      
      setGeneratedContent(formattedContent);
      console.log('邮件生成完成，内容长度:', formattedContent.length);

    } catch (error: unknown) {
      console.error('邮件生成错误:', error);
      
      if (error instanceof Error) {
        // 根据错误类型提供不同的处理建议
        let errorMessage = error.message;
        
        if (error.message.includes('超时') || error.message.includes('504')) {
          errorMessage = '请求超时，请稍后重试。如果问题持续存在，请检查网络连接。';
        } else if (error.message.includes('频率过高') || error.message.includes('429')) {
          errorMessage = '请求过于频繁，请等待1-2分钟后重试。';
        } else if (error.message.includes('暂时不可用') || error.message.includes('503')) {
          errorMessage = '服务暂时不可用，请稍后重试。';
        } else if (error.message.includes('网络连接失败')) {
          errorMessage = '网络连接失败，请检查网络设置后重试。';
        } else if (error.message.includes('API配置错误')) {
          errorMessage = '系统配置错误，请联系管理员。';
        } else if (error.message.includes('认证失败')) {
          errorMessage = '登录已过期，请重新登录后重试。';
        }
        
        setError(errorMessage);
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
