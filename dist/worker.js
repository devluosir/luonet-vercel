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
        query += ' ORDER BY created_at DESC';
        const results = await env.DB.prepare(query).bind(...params).all();
        return new Response(JSON.stringify({ items: results.results }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
    catch (error) {
        return new Response(JSON.stringify({ error: 'Failed to get history', message: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
// 保存报价历史
router.post('/api/quotation/history', async (request, { env }) => {
    try {
        const data = await request.json();
        const { type, customerName, quotationNo, totalAmount, currency, data: quotationData } = data;
        const result = await env.DB.prepare('INSERT INTO quotation_history (type, customer_name, quotation_no, total_amount, currency, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))')
            .bind(type, customerName, quotationNo, totalAmount, currency, JSON.stringify(quotationData))
            .run();
        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
    catch (error) {
        return new Response(JSON.stringify({ error: 'Failed to save quotation', message: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
// 导出默认处理函数
export default {
    async fetch(request, env, ctx) {
        try {
            // 处理 CORS 预检请求
            if (request.method === 'OPTIONS') {
                return new Response(null, {
                    headers: corsHeaders
                });
            }
            // 处理请求
            const response = await router.handle(request, { env });
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
            return new Response(JSON.stringify({
                error: 'Internal Server Error',
                message: error.message
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    },
};
