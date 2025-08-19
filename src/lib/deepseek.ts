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
  
  // 创建AbortController用于超时控制
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒超时
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(data),
      signal: controller.signal
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`DeepSeek API错误: ${response.status} ${response.statusText}`, text);
      
      // 根据状态码返回具体错误信息
      if (response.status === 429) {
        throw new Error('API请求频率过高，请稍后重试');
      } else if (response.status === 401) {
        throw new Error('API密钥无效或已过期');
      } else if (response.status === 403) {
        throw new Error('API访问被拒绝，请检查权限');
      } else if (response.status === 500) {
        throw new Error('DeepSeek服务器内部错误，请稍后重试');
      } else if (response.status === 502 || response.status === 503 || response.status === 504) {
        throw new Error('DeepSeek服务暂时不可用，请稍后重试');
      } else {
        throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
      }
    }

    return response.json();
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('请求超时，请稍后重试');
      }
      throw error;
    }
    throw new Error('网络请求失败');
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function generateMail({
  content,
  language,
  type,
  originalMail = '',
  mode
}: GenerateMailOptions): Promise<string> {
  try {
    // 输入验证
    if (!content.trim()) {
      throw new Error('邮件内容不能为空');
    }
    
    if (!language || !type || !mode) {
      throw new Error('缺少必需的参数');
    }

    const systemPrompt = mode === 'mail' 
      ? `You are a professional business email assistant. Help users write business emails in ${language}. 
         The tone should be ${type}. Focus on clarity, professionalism, and cultural appropriateness.
         Please format the output with clear sections:
         1. For bilingual emails, use [English] and [中文] to separate languages
         2. Start with [Subject] for email subject
         3. Use proper spacing between sections
         4. Keep the response concise and professional`
      : `You are a professional business email assistant. Help users reply to business emails in ${language}. 
         The tone should be ${type}. Ensure the reply is contextually appropriate and professional.
         Please format the output with clear sections:
         1. For bilingual emails, use [English] and [中文] to separate languages
         2. Use proper spacing between sections
         3. Keep the response concise and professional`;

    const userPrompt = mode === 'mail'
      ? `Please help me write a business email with the following content: ${content}`
      : `Please help me reply to this email:\n\nOriginal email:\n${originalMail}\n\nMy reply draft:\n${content}`;

    let retryCount = 0;
    const maxRetries = 2; // 减少重试次数，避免长时间等待
    
    while (retryCount <= maxRetries) {
      try {
        console.log(`尝试生成邮件 (第${retryCount + 1}次)`);
        
        const requestData = {
          model: "deepseek-chat",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 600, // 减少token数量，提高响应速度
          presence_penalty: 0,
          frequency_penalty: 0
        };

        const response = await makeRequest(`${BASE_URL}/chat/completions`, requestData);

        if (!response.choices?.[0]?.message?.content) {
          throw new Error('API 返回数据格式错误');
        }

        const result = response.choices[0].message.content;
        console.log('邮件生成成功');
        return result;
        
      } catch (error: unknown) {
        const err = error as Error;
        console.error(`邮件生成失败 (第${retryCount + 1}次):`, err.message);
        
        // 如果是最后一次重试，直接抛出错误
        if (retryCount === maxRetries) {
          throw err;
        }
        
        // 对于特定错误类型进行重试
        if (err.message.includes('504') || 
            err.message.includes('408') || 
            err.message.includes('502') || 
            err.message.includes('503') ||
            err.message.includes('超时') ||
            err.message.includes('暂时不可用')) {
          
          const delay = 2000 * (retryCount + 1); // 递增延迟
          console.log(`等待${delay}ms后重试...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          retryCount++;
          continue;
        }
        
        // 对于其他错误，不重试
        throw err;
      }
    }
    
    throw new Error('达到最大重试次数');
    
  } catch (error: unknown) {
    console.error('邮件生成最终失败:', error);
    
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('生成失败，请稍后重试');
  }
} 