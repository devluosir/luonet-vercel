// 邮件模块测试工具
import type { MailFormData, GenerateMailParams } from '../types';

// 创建测试用的表单数据
export const createTestFormData = (): MailFormData => ({
  mail: 'Hello, I would like to inquire about your products.',
  language: 'both English and Chinese',
  replyTo: '',
  reply: '',
  replyLanguage: 'both English and Chinese',
  replyType: 'formal'
});

// 创建测试用的生成参数
export const createTestGenerateParams = (): GenerateMailParams => ({
  language: 'both English and Chinese',
  type: 'formal',
  content: 'Hello, I would like to inquire about your products.',
  originalMail: '',
  mode: 'mail'
});

// 验证邮件内容格式
export const validateMailContent = (content: string): boolean => {
  if (!content || typeof content !== 'string') {
    return false;
  }
  
  // 检查是否包含基本的邮件结构
  const hasSubject = content.includes('[Subject]') || content.includes('[主题]');
  const hasContent = content.length > 50; // 至少50个字符
  
  return hasSubject && hasContent;
};

// 模拟API响应
export const mockApiResponse = (success: boolean = true) => {
  if (success) {
    return {
      result: `[Subject] Product Inquiry / 产品咨询

[English]
Dear Sir/Madam,

Thank you for your inquiry about our products. We are pleased to provide you with detailed information about our offerings.

Please find attached our latest product catalog and pricing information. If you have any specific requirements or questions, please don't hesitate to contact us.

We look forward to hearing from you.

Best regards,
[Your Name]

[中文]
尊敬的先生/女士：

感谢您对我们产品的咨询。我们很高兴为您提供关于我们产品的详细信息。

请查看附件中的最新产品目录和价格信息。如果您有任何具体要求或问题，请随时与我们联系。

我们期待您的回复。

此致
敬礼
[您的姓名]`
    };
  } else {
    throw new Error('模拟API错误');
  }
};
