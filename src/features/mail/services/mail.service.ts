import { API_ENDPOINTS, apiRequestWithError } from '@/lib/api-config';
import type { GenerateMailParams, MailFormData, ValidationResult } from '../types';

// 邮件生成服务
export class MailService {
  // 生成邮件内容
  static async generateMail(params: GenerateMailParams): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // 90秒超时

    try {
      const data = await apiRequestWithError(API_ENDPOINTS.GENERATE, {
        method: 'POST',
        body: JSON.stringify(params),
        signal: controller.signal
      });

      if (!data.result) {
        throw new Error('返回数据格式错误');
      }

      return data.result;
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('请求超时，请稍后重试');
        } else {
          throw new Error(error.message);
        }
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
      }
      if (!data.language) {
        errors.language = '请选择输出语言';
      }
    } else {
      if (!data.replyTo.trim()) {
        errors.replyTo = '原始邮件内容不能为空';
      }
      if (!data.reply.trim()) {
        errors.reply = '回复内容不能为空';
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
    
    // 移除多余的空白行
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n\n');
  }

  // 复制内容到剪贴板
  static async copyToClipboard(content: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(content);
      return true;
    } catch (error) {
      console.error('Failed to copy:', error);
      return false;
    }
  }
}
