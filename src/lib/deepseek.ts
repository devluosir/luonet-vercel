import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

if (!process.env.DEEPSEEK_API_KEY) {
  throw new Error('Missing DEEPSEEK_API_KEY environment variable');
}

// 设置基础 URL，确保使用 v1 路径
const BASE_URL = (process.env.BASE_URL || 'https://api.deepseek.com/v1').replace(/\/+$/, '');
console.log('Using BASE_URL:', BASE_URL);

// 创建 DeepSeek API 客户端
const deepseek = new OpenAI({
  baseURL: BASE_URL,
  apiKey: process.env.DEEPSEEK_API_KEY,
  timeout: 60000, // 60 秒超时
  maxRetries: 3
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
    console.log('Using API Key:', process.env.DEEPSEEK_API_KEY?.substring(0, 8) + '...');
    
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

    const userPrompt = mode === 'mail'
      ? `Please help me write a business email with the following content: ${content}`
      : `Please help me reply to this email:\n\nOriginal email:\n${originalMail}\n\nMy reply draft:\n${content}`;

    try {
      const completion = await deepseek.chat.completions.create({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        presence_penalty: 0,
        frequency_penalty: 0
      });

      if (!completion.choices?.[0]?.message?.content) {
        throw new Error('API 返回数据格式错误');
      }

      return completion.choices[0].message.content;
      
    } catch (error: any) {
      console.error('DeepSeek API Error:', error);
      
      if (error.status === 504 || error.status === 408) {
        throw new Error('服务器响应超时，请稍后重试');
      }
      if (error.status === 429) {
        throw new Error('请求过于频繁，请稍后重试');
      }
      
      // 处理其他错误
      const errorMessage = error.message || '未知错误';
      throw new Error(`DeepSeek API 错误: ${errorMessage}`);
    }
    
  } catch (error) {
    console.error('Final Error:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('生成失败，请稍后重试');
  }
} 