import { Router } from 'itty-router';
const router = Router();
// 添加 CORS 处理
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
// 处理 OPTIONS 请求
router.options('*', () => new Response(null, { headers: corsHeaders }));
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
        return new Response(JSON.stringify({ error: 'Failed to get quotation history' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
});
// 保存新的历史记录
router.post('/api/quotation/history', async (request, env) => {
    try {
        const body = await request.json();
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
        return new Response(JSON.stringify({ error: 'Failed to save quotation history' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
});
// 处理所有请求
export default {
    async fetch(request, env, ctx) {
        return router.handle(request, env, ctx);
    },
};
