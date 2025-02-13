import OpenAI from 'openai';

if (!process.env.DEEPSEEK_API_KEY) {
  throw new Error('Missing DEEPSEEK_API_KEY environment variable');
}

// 创建 DeepSeek API 客户端
const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY,
  defaultHeaders: { 'Content-Type': 'application/json' },
  timeout: 60000,
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
    console.log('Generating mail with params:', { content, language, type, mode });
    
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

    console.log('System prompt:', systemPrompt);

    // 构建用户提示词
    const userPrompt = mode === 'mail'
      ? `Please help me write a business email with the following content: ${content}`
      : `Please help me reply to this email:\n\nOriginal email:\n${originalMail}\n\nMy reply draft:\n${content}`;

    console.log('User prompt:', userPrompt);

    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        const completion = await deepseek.chat.completions.create({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 2000
        }, {
          timeout: 30000 // 在 RequestOptions 中设置超时
        });

        console.log('API response:', completion);

        if (!completion.choices?.[0]?.message?.content) {
          throw new Error('API 返回数据格式错误');
        }

        return completion.choices[0].message.content;
      } catch (error) {
        attempts++;
        if (attempts === maxAttempts) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 2000 * attempts));
      }
    }

    throw new Error('达到最大重试次数');
  } catch (error) {
    console.error('DeepSeek API Error:', error);
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        throw new Error('请求超时，请稍后重试');
      }
      if (error.message.includes('rate limit')) {
        throw new Error('请求过于频繁，请稍后重试');
      }
    }
    throw new Error(error instanceof Error ? error.message : '生成失败，请稍后重试');
  }
} 