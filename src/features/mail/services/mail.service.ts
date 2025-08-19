import { API_ENDPOINTS, apiRequestWithError } from '@/lib/api-config';
import type { GenerateMailParams, MailFormData, ValidationResult } from '../types';

// 邮件生成服务
export class MailService {
  // 生成邮件内容
  static async generateMail(params: GenerateMailParams): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2分钟超时

    try {
      console.log('发送邮件生成请求:', { 
        mode: params.mode, 
        language: params.language, 
        type: params.type,
        contentLength: params.content.length 
      });

      const data = await apiRequestWithError(API_ENDPOINTS.GENERATE, {
        method: 'POST',
        body: JSON.stringify(params),
        signal: controller.signal
      });

      if (!data.result) {
        console.error('API返回数据格式错误:', data);
        throw new Error('返回数据格式错误');
      }

      console.log('邮件生成成功，内容长度:', data.result.length);
      return data.result;
    } catch (error: unknown) {
      console.error('邮件生成服务错误:', error);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('请求超时，请稍后重试');
        }
        
        // 根据错误消息提供更具体的错误信息
        if (error.message.includes('404')) {
          throw new Error('API接口不存在，请联系管理员');
        } else if (error.message.includes('500')) {
          throw new Error('服务器内部错误，请稍后重试');
        } else if (error.message.includes('503')) {
          throw new Error('服务暂时不可用，请稍后重试');
        } else if (error.message.includes('504')) {
          throw new Error('网关超时，请稍后重试');
        } else if (error.message.includes('429')) {
          throw new Error('请求过于频繁，请稍后重试');
        } else if (error.message.includes('401') || error.message.includes('403')) {
          throw new Error('认证失败，请重新登录');
        } else if (error.message.includes('网络') || error.message.includes('fetch')) {
          throw new Error('网络连接失败，请检查网络设置');
        }
        
        throw new Error(error.message);
      } else {
        throw new Error('生成失败，请稍后重试');
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // 验证表单数据
  static validateFormData(data: MailFormData, activeTab: 'mail' | 'reply'): ValidationResult {
    const errors: Record<string, string> = {};

    if (activeTab === 'mail') {
      if (!data.mail.trim()) {
        errors.mail = '邮件内容不能为空';
      } else if (data.mail.trim().length < 5) {
        errors.mail = '邮件内容至少需要5个字符';
      } else if (data.mail.trim().length > 2000) {
        errors.mail = '邮件内容不能超过2000个字符';
      }
      
      if (!data.language) {
        errors.language = '请选择输出语言';
      }
    } else {
      if (!data.replyTo.trim()) {
        errors.replyTo = '原始邮件内容不能为空';
      } else if (data.replyTo.trim().length < 10) {
        errors.replyTo = '原始邮件内容至少需要10个字符';
      }
      
      if (!data.reply.trim()) {
        errors.reply = '回复内容不能为空';
      } else if (data.reply.trim().length < 5) {
        errors.reply = '回复内容至少需要5个字符';
      } else if (data.reply.trim().length > 1000) {
        errors.reply = '回复内容不能超过1000个字符';
      }
      
      if (!data.replyLanguage) {
        errors.replyLanguage = '请选择输出语言';
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  // 格式化邮件内容
  static formatMailContent(content: string): string {
    if (!content) return '';
    
    // 移除多余的空白行和格式化内容
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n\n')
      .replace(/\n{3,}/g, '\n\n'); // 最多保留两个连续换行
  }

  // 复制内容到剪贴板
  static async copyToClipboard(content: string): Promise<boolean> {
    try {
      if (!content || content.trim().length === 0) {
        return false;
      }
      
      await navigator.clipboard.writeText(content.trim());
      return true;
    } catch (error) {
      console.error('复制到剪贴板失败:', error);
      return false;
    }
  }
}
