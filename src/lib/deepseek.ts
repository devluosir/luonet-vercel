import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

if (!process.env.DEEPSEEK_API_KEY) {
  throw new Error('Missing DEEPSEEK_API_KEY environment variable');
}

const BASE_URL = process.env.BASE_URL || 'https://api.deepseek.com';
console.log('Using BASE_URL:', BASE_URL); // 添加日志

// 定义错误类型接口
interface APIError {
  status?: number;
  message?: string;
  name?: string;
}

// 创建 DeepSeek API 客户端
const deepseek = new OpenAI({
  baseURL: BASE_URL,
  apiKey: process.env.DEEPSEEK_API_KEY
});

interface GenerateMailOptions {
  content: string;
  language: string;
  type: string;
  originalMail?: string;
  mode: 'mail' | 'reply';
}

// 类型守卫函数
function isAPIError(error: unknown): error is APIError {
  return typeof error === 'object' && error !== null && ('status' in error || 'message' in error);
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
    console.log('Using API Key:', process.env.DEEPSEEK_API_KEY?.substring(0, 8) + '...'); // 只打印 API key 的前8位
    
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

        const apiUrl = `${BASE_URL}/v1/chat/completions`;
        console.log('Making request to:', apiUrl);

        const requestBody = {
          model: "deepseek-chat",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 2000,
          stream: false
        };

        console.log('Request body:', JSON.stringify(requestBody, null, 2));

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
            'Accept': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          let errorMessage = `API 请求失败: ${response.status} ${response.statusText}`;
          try {
            const errorData = await response.text();
            console.error('API Error Response:', errorData);
            errorMessage += ` - ${errorData}`;
          } catch (e) {
            console.error('Failed to read error response:', e);
          }
          
          if (response.status === 504) {
            throw new Error('服务器响应超时，请稍后重试');
          }
          if (response.status === 429) {
            throw new Error('请求过于频繁，请稍后重试');
          }
          throw new Error(errorMessage);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType?.includes('application/json')) {
          console.error('Unexpected content type:', contentType);
          throw new Error('API 返回格式错误');
        }

        const data = await response.json();
        console.log('API Response:', JSON.stringify(data, null, 2));

        if (!data.choices?.[0]?.message?.content) {
          console.error('Invalid API response format:', data);
          throw new Error('API 返回数据格式错误');
        }

        return data.choices[0].message.content;
      } catch (error) {
        console.error(`Attempt ${attempts + 1} failed:`, error);
        
        attempts++;
        if (attempts === maxAttempts) {
          if (error instanceof Error) {
            throw error;
          }
          throw new Error('请求失败，请稍后重试');
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
    
    if (error instanceof Error) {
      // 添加更多上下文信息到错误消息中
      error.message = `DeepSeek API Error: ${error.message} (BASE_URL: ${BASE_URL})`;
      throw error;
    }
    
    throw new Error('生成失败，请稍后重试');
  }
} 