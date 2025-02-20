import { Router } from 'itty-router';
import { D1Database, ExecutionContext } from '@cloudflare/workers-types';

// 定义环境变量接口
interface Env {
  DB: D1Database;
  API_TOKEN: string;
  MAIN_SITE_URL: string;  // 添加主站 URL 环境变量
}

// 定义报价历史记录接口
interface QuotationHistory {
  type: string;
  customerName: string;
  quotationNo: string;
  totalAmount: number;
  currency: string;
  data: any;
}

// 创建路由器实例
const router = Router<{ env: Env }>();

// CORS 头
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// 错误响应处理函数
const errorResponse = (error: any, status = 500) => {
  const message = error instanceof Error ? error.message : String(error);
  return new Response(
    JSON.stringify({
      error: status === 500 ? 'Internal Server Error' : 'Bad Request',
      message
    }),
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
};

// 成功响应处理函数
const successResponse = (data: any) => {
  return new Response(
    JSON.stringify(data),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
};

// 验证 API Token
const validateToken = async (request: Request, env: Env) => {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return false;
  }
  const token = authHeader.replace('Bearer ', '');

  try {
    // 调用主站的认证 API 验证 token
    const response = await fetch(`${env.MAIN_SITE_URL}/api/auth/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json() as { valid: boolean };
    return data.valid === true;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
};

// 身份验证中间件
const authMiddleware = async (request: Request, env: Env) => {
  if (request.method === 'OPTIONS') {
    return;
  }

  const isValid = await validateToken(request, env);
  if (!isValid) {
    return errorResponse('Unauthorized', 401);
  }
};

// 处理根路径请求
router.get('/', () => {
  return new Response('Quotation API is running', {
    headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
  });
});

// 处理预检请求
router.options('*', () => {
  return new Response(null, {
    headers: corsHeaders
  });
});

// 添加重试函数
const fetchWithRetry = async (url: string, options: RequestInit, maxRetries = 3) => {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Connection': 'keep-alive',
          'Keep-Alive': 'timeout=30, max=100'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response;
    } catch (error) {
      lastError = error;
      if (i === maxRetries - 1) break;
      // 指数退避重试
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
  throw lastError;
};

// 修改获取历史记录的路由处理
router.get('/api/quotation/history', async (request: Request, { env }: { env: Env }) => {
  try {
    // 验证身份
    const authResult = await authMiddleware(request, env);
    if (authResult) return authResult;

    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    const type = url.searchParams.get('type') || 'all';

    let query = 'SELECT * FROM quotation_history';
    const params = [];
    const conditions = [];

    if (search) {
      conditions.push('(customer_name LIKE ? OR quotation_no LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (type && type !== 'all') {
      conditions.push('type = ?');
      params.push(type);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC LIMIT 100';

    const results = await env.DB.prepare(query)
      .bind(...params)
      .all();

    return new Response(JSON.stringify({ items: results.results || [] }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Connection': 'keep-alive',
        'Keep-Alive': 'timeout=30, max=100'
      }
    });
  } catch (error: any) {
    console.error('Error in GET /api/quotation/history:', error);
    return errorResponse(error);
  }
});

// 修改保存报价历史的路由处理
router.post('/api/quotation/history', async (request: Request, { env }: { env: Env }) => {
  try {
    // 验证身份
    const authResult = await authMiddleware(request, env);
    if (authResult) return authResult;

    const data = await request.json() as QuotationHistory;
    const { type, customerName, quotationNo, totalAmount, currency, data: quotationData } = data;

    if (!type || !customerName || !quotationNo) {
      return errorResponse('Missing required fields', 400);
    }

    await env.DB.prepare(
      'INSERT INTO quotation_history (type, customer_name, quotation_no, total_amount, currency, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))'
    )
      .bind(type, customerName, quotationNo, totalAmount, currency, JSON.stringify(quotationData))
      .run();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Connection': 'keep-alive',
        'Keep-Alive': 'timeout=30, max=100'
      }
    });
  } catch (error: any) {
    console.error('Error in POST /api/quotation/history:', error);
    return errorResponse(error);
  }
});

// 导出默认处理函数
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      // 设置请求超时
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 30000);
      });

      // 处理 CORS 预检请求
      if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
      }

      // 处理请求
      const responsePromise = router.handle(request, { env });
      
      // 使用 Promise.race 实现超时控制
      const response = await Promise.race([responsePromise, timeoutPromise]);
      
      // 如果没有匹配的路由
      if (!response) {
        return new Response('Not Found', { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
        });
      }

      // 确保响应包含 CORS 头
      const headers = new Headers(response.headers);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        headers.set(key, value);
      });

      return new Response(response.body, {
        status: response.status || 200,
        statusText: response.statusText || '',
        headers
      });
    } catch (error: any) {
      console.error('Error in fetch:', error);
      if (error.message === 'Request timeout') {
        return errorResponse('Request timeout', 408);
      }
      return errorResponse(error);
    }
  },
}; 