import { Router } from 'itty-router';
const router = Router();
// 添加 CORS 处理
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
// 处理预检请求
router.options('*', () => new Response(null, { headers: corsHeaders }));
// 处理根路径请求
router.get('/', () => new Response('Quotation API is running', {
    headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
}));
// 获取历史记录列表
router.get('/api/quotation/history', async (request, env) => {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        const type = searchParams.get('type');
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
        console.error('Error getting quotation history:', error);
        return new Response(JSON.stringify({ error: 'Failed to get quotation history', details: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
});
// 保存新的历史记录
router.post('/api/quotation/history', async (request, env) => {
    try {
        if (!request.body) {
            return new Response(JSON.stringify({ error: 'Request body is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        const body = await request.json();
        // 验证必填字段
        if (!body.type || !body.customerName || !body.quotationNo) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        await env.DB.prepare(`
      INSERT INTO quotation_history (
        id, type, customer_name, quotation_no, total_amount, currency, data, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, body.type, body.customerName, body.quotationNo, body.totalAmount, body.currency, JSON.stringify(body.data), now, now).run();
        return new Response(JSON.stringify({ id }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
    catch (error) {
        console.error('Error saving quotation history:', error);
        return new Response(JSON.stringify({ error: 'Failed to save quotation history', details: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
});
// 处理 404
router.all('*', () => new Response('Not Found', {
    status: 404,
    headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
}));
// 处理所有请求
export default {
    async fetch(request, env, ctx) {
        try {
            return await router.handle(request, env, ctx);
        }
        catch (error) {
            console.error('Unhandled error:', error);
            return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
    },
};
