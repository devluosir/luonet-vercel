import { NextResponse } from 'next/server';
import { getQuotationHistory, deleteQuotationHistory } from '@/utils/quotationHistory';

// 获取单个历史记录
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const history = getQuotationHistory();
    const record = history.find(item => item.id === params.id);

    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    return NextResponse.json(record);
  } catch (error) {
    console.error('Error getting quotation history:', error);
    return NextResponse.json({ error: 'Failed to get quotation history' }, { status: 500 });
  }
}

// 删除历史记录
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const success = deleteQuotationHistory(params.id);
    if (!success) {
      return NextResponse.json({ error: 'Failed to delete record' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting quotation history:', error);
    return NextResponse.json({ error: 'Failed to delete quotation history' }, { status: 500 });
  }
} 