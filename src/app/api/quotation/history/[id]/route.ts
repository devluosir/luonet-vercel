import { NextResponse } from 'next/server';
import { D1Database } from '@cloudflare/workers-types';

declare global {
  var DB: D1Database;
}

// 获取单个历史记录
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const result = await DB.prepare(
      'SELECT * FROM quotation_history WHERE id = ?'
    ).bind(params.id).first();

    if (!result) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error getting quotation history:', error);
    return NextResponse.json({ error: 'Failed to get quotation history' }, { status: 500 });
  }
}

// 更新历史记录
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const now = new Date().toISOString();

    await DB.prepare(`
      UPDATE quotation_history
      SET data = ?, updated_at = ?
      WHERE id = ?
    `).bind(
      JSON.stringify(body.data),
      now,
      params.id
    ).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating quotation history:', error);
    return NextResponse.json({ error: 'Failed to update quotation history' }, { status: 500 });
  }
}

// 删除历史记录
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await DB.prepare(
      'DELETE FROM quotation_history WHERE id = ?'
    ).bind(params.id).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting quotation history:', error);
    return NextResponse.json({ error: 'Failed to delete quotation history' }, { status: 500 });
  }
} 