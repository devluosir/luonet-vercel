import type { LanguageOption, MailTypeOption } from '../types';

// 语言选项
export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { value: 'both English and Chinese', label: 'Both EN & CN' },
  { value: 'English', label: 'English' },
  { value: 'Chinese', label: 'Chinese' }
];

// 邮件风格选项
export const MAIL_TYPE_OPTIONS: MailTypeOption[] = [
  { value: 'formal', label: 'Formal', emoji: '📝' },
  { value: 'professional', label: 'Professional', emoji: '💼' },
  { value: 'friendly', label: 'Friendly', emoji: '👋' },
  { value: 'concise', label: 'Concise', emoji: '⚡️' },
  { value: 'detailed', label: 'Detailed', emoji: '📋' },
  { value: 'informal', label: 'Informal', emoji: '😊' },
  { value: 'inspirational', label: 'Inspirational', emoji: '✨' }
];

// 表单字段标签
export const FORM_LABELS = {
  mail: 'Write your email content',
  language: 'Output language',
  replyTo: 'Original email content',
  reply: 'Your reply draft',
  replyLanguage: 'Output language',
  replyType: 'Reply Tone'
} as const;

// 占位符文本
export const PLACEHOLDERS = {
  mail: '请在这里输入邮件内容... / Type your email content here...',
  replyTo: '请粘贴需要回复的邮件内容... / Paste the email content you need to reply to...',
  reply: '请输入您的回复草稿... / Enter your reply draft...'
} as const;

// 按钮文本
export const BUTTON_TEXTS = {
  generateMail: 'Generate Optimized Mail',
  generateReply: 'Generate Optimized Reply',
  generating: 'Generating...',
  copy: 'Copy',
  copied: 'Copied!'
} as const;
