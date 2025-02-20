import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { D1Database } from '@cloudflare/workers-types';

declare global {
  var DB: D1Database;
}

// 获取历史记录列表
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const type = searchParams.get('type');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let query = 'SELECT * FROM quotation_history';
    const params: any[] = [];
    const conditions: string[] = [];

    if (search) {
      conditions.push('(customer_name LIKE ? OR quotation_no LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (type && type !== 'all') {
      conditions.push('type = ?');
      params.push(type);
    }

    if (startDate && endDate) {
      conditions.push('created_at BETWEEN ? AND ?');
      params.push(startDate, endDate);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

    const results = await DB.prepare(query).bind(...params).all();
    return NextResponse.json({ items: results.results });
  } catch (error) {
    console.error('Error getting quotation history:', error);
    return NextResponse.json({ error: 'Failed to get quotation history' }, { status: 500 });
  }
}

// 保存新的历史记录
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const id = nanoid();
    const now = new Date().toISOString();

    await DB.prepare(`
      INSERT INTO quotation_history (
        id, type, customer_name, quotation_no, total_amount, currency, data, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      body.type,
      body.customerName,
      body.quotationNo,
      body.totalAmount,
      body.currency,
      JSON.stringify(body.data),
      now,
      now
    ).run();

    return NextResponse.json({ id });
  } catch (error) {
    console.error('Error saving quotation history:', error);
    return NextResponse.json({ error: 'Failed to save quotation history' }, { status: 500 });
  }
} 