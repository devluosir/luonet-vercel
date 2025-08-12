// 邮件表单数据类型
export interface MailFormData {
  mail: string;
  language: string;
  replyTo: string;
  reply: string;
  replyLanguage: string;
  replyType: string;
}

// 邮件生成参数
export interface GenerateMailParams {
  language: string;
  type: string;
  content: string;
  originalMail: string;
  mode: 'mail' | 'reply';
}

// 表单验证结果
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

// 邮件类型选项
export interface MailTypeOption {
  value: string;
  label: string;
  emoji?: string;
}

// 语言选项
export interface LanguageOption {
  value: string;
  label: string;
}

// 邮件状态类型
export type MailTab = 'mail' | 'reply';
