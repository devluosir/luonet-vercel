import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

if (!process.env.DEEPSEEK_API_KEY) {
  throw new Error('Missing DEEPSEEK_API_KEY environment variable');
}

// 创建 DeepSeek API 客户端
const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com', // 修改为官方文档推荐的基础 URL
  apiKey: process.env.DEEPSEEK_API_KEY,
  defaultHeaders: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}` // 添加正确的认证头
  }
});

interface GenerateMailOptions {
  content: string;
  language: string;
  type: string;
  originalMail?: string;
  mode: 'mail' | 'reply';
}

export async function generateMail({
  content,
  language,
  type,
  originalMail = '',
  mode
}: GenerateMailOptions): Promise<string> {
  try {
    console.log('Starting mail generation with params:', { content, language, type, mode });
    
    // 构建系统提示词
    const systemPrompt = mode === 'mail' 
      ? `You are a professional business email assistant. Help users write business emails in ${language}. 
         The tone should be ${type}. Focus on clarity, professionalism, and cultural appropriateness.
         Please format the output with clear sections:
         1. For bilingual emails, use [English] and [中文] to separate languages
         2. Start with [Subject] for email subject
         3. Use proper spacing between sections`
      : `You are a professional business email assistant. Help users reply to business emails in ${language}. 
         The tone should be ${type}. Ensure the reply is contextually appropriate and professional.
         Please format the output with clear sections:
         1. For bilingual emails, use [English] and [中文] to separate languages
         2. Use proper spacing between sections`;

    // 构建用户提示词
    const userPrompt = mode === 'mail'
      ? `Please help me write a business email with the following content: ${content}`
      : `Please help me reply to this email:\n\nOriginal email:\n${originalMail}\n\nMy reply draft:\n${content}`;

    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        console.log(`Attempt ${attempts + 1} of ${maxAttempts}`);
        
        const messages: ChatCompletionMessageParam[] = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ];

        const completion = await deepseek.chat.completions.create({
          model: "deepseek-chat",
          messages,
          temperature: 0.7,
          max_tokens: 2000,
          stream: false as const
        });

        console.log('API response status:', completion.choices?.[0]?.finish_reason);
        console.log('API response message:', completion.choices?.[0]?.message);

        if (!completion.choices?.[0]?.message?.content) {
          console.error('Invalid API response format:', completion);
          throw new Error('API 返回数据格式错误');
        }

        return completion.choices[0].message.content;
      } catch (error) {
        console.error(`Attempt ${attempts + 1} failed:`, error);
        
        attempts++;
        if (attempts === maxAttempts) {
          if ('status' in error && error.status === 504) {
            throw new Error('服务器响应超时，请稍后重试');
          }
          if ('status' in error && error.status === 429) {
            throw new Error('请求过于频繁，请稍后重试');
          }
          throw error;
        }
        
        // 指数退避重试
        const delay = Math.min(1000 * Math.pow(2, attempts), 10000);
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error('达到最大重试次数');
  } catch (error) {
    console.error('Final DeepSeek API Error:', error);
    
    // 处理特定错误类型
    if ('status' in error) {
      if (error.status === 504) {
        throw new Error('服务器响应超时，请稍后重试');
      }
      if (error.status === 429) {
        throw new Error('请求过于频繁，请稍后重试');
      }
    }

    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        throw new Error('请求超时，请稍后重试');
      }
      if (error.message.includes('rate limit')) {
        throw new Error('请求过于频繁，请稍后重试');
      }
      if (error.name === 'NetworkError' || error.message.includes('network')) {
        throw new Error('网络连接错误，请检查网络后重试');
      }
      
      throw error;
    }
    
    throw new Error('生成失败，请稍后重试');
  }
} 