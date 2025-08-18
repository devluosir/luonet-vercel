interface DeepSeekResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

interface _DeepSeekError {
  message: string;
  status?: number;
}

// Environment variable check moved inside functions to avoid build-time errors

const BASE_URL = 'https://api.deepseek.com/v1';

interface GenerateMailOptions {
  content: string;
  language: string;
  type: string;
  originalMail?: string;
  mode: 'mail' | 'reply';
}

interface RequestData {
  model: string;
  messages: Array<{
    role: string;
    content: string;
  }>;
  temperature: number;
  max_tokens: number;
  presence_penalty: number;
  frequency_penalty: number;
}

async function makeRequest(url: string, data: RequestData): Promise<DeepSeekResponse> {
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error('Missing DEEPSEEK_API_KEY environment variable');
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      'Accept': 'application/json'
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const text = await response.text();

    throw new Error(`API 请求失败: ${response.status} ${response.statusText} - ${text}`);
  }

  return response.json();
}

export async function generateMail({
  content,
  language,
  type,
  originalMail = '',
  mode
}: GenerateMailOptions): Promise<string> {
  try {

    
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

    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount <= maxRetries) {
      try {

        
        const requestData = {
          model: "deepseek-chat",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 800,
          presence_penalty: 0,
          frequency_penalty: 0
        };

        const response = await makeRequest(`${BASE_URL}/chat/completions`, requestData);

        if (!response.choices?.[0]?.message?.content) {
          throw new Error('API 返回数据格式错误');
        }

        return response.choices[0].message.content;
        
      } catch (error: unknown) {

        
        const err = error as Error;
        
        if (err.message.includes('504') || err.message.includes('408')) {
          if (retryCount === maxRetries) {
            throw new Error('服务器响应超时，请稍后重试');
          }
          await new Promise(resolve => setTimeout(resolve, 3000 * (retryCount + 1)));
          retryCount++;
          continue;
        }
        
        if (err.message.includes('429')) {
          throw new Error('请求过于频繁，请稍后重试');
        }
        
        throw error;
      }
    }
    
    throw new Error('达到最大重试次数');
    
  } catch (error: unknown) {

    if (error instanceof Error) {
      throw error;
    }
    throw new Error('生成失败，请稍后重试');
  }
} 