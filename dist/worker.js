import { Router } from 'itty-router';
// 创建路由器实例
const router = Router();
// CORS 头
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
};
// 错误响应处理函数
const errorResponse = (error, status = 500) => {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({
        error: status === 500 ? 'Internal Server Error' : 'Bad Request',
        message
    }), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
};
// 成功响应处理函数
const successResponse = (data) => {
    return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
};
// 验证 API Token
const validateToken = (request, env) => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
        return false;
    }
    const token = authHeader.replace('Bearer ', '');
    return token === env.API_TOKEN;
};
// 身份验证中间件
const authMiddleware = async (request, env) => {
    if (request.method === 'OPTIONS') {
        return;
    }
    if (!validateToken(request, env)) {
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
// 获取历史记录列表
router.get('/api/quotation/history', async (request, { env }) => {
    try {
        // 验证身份
        const authResult = await authMiddleware(request, env);
        if (authResult)
            return authResult;
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
        return successResponse({ items: results.results || [] });
    }
    catch (error) {
        console.error('Error in GET /api/quotation/history:', error);
        return errorResponse(error);
    }
});
// 保存报价历史
router.post('/api/quotation/history', async (request, { env }) => {
    try {
        // 验证身份
        const authResult = await authMiddleware(request, env);
        if (authResult)
            return authResult;
        const data = await request.json();
        const { type, customerName, quotationNo, totalAmount, currency, data: quotationData } = data;
        if (!type || !customerName || !quotationNo) {
            return errorResponse('Missing required fields', 400);
        }
        await env.DB.prepare('INSERT INTO quotation_history (type, customer_name, quotation_no, total_amount, currency, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))')
            .bind(type, customerName, quotationNo, totalAmount, currency, JSON.stringify(quotationData))
            .run();
        return successResponse({ success: true });
    }
    catch (error) {
        console.error('Error in POST /api/quotation/history:', error);
        return errorResponse(error);
    }
});
// 导出默认处理函数
export default {
    async fetch(request, env, ctx) {
        try {
            // 设置请求超时
            const timeoutPromise = new Promise((_, reject) => {
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
        }
        catch (error) {
            console.error('Error in fetch:', error);
            if (error.message === 'Request timeout') {
                return errorResponse('Request timeout', 408);
            }
            return errorResponse(error);
        }
    },
};
