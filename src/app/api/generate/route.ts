import { NextRequest, NextResponse } from 'next/server';
import { generateMail } from '@/lib/deepseek';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, language, type, originalMail, mode } = body;

    // 验证必需参数
    if (!content || !language || !type || !mode) {
      return NextResponse.json(
        { error: '缺少必需参数' },
        { status: 400 }
      );
    }

    // 调用DeepSeek API生成邮件
    const result = await generateMail({
      content,
      language,
      type,
      originalMail: originalMail || '',
      mode
    });

    return NextResponse.json({ result });
  } catch (error) {
    console.error('邮件生成错误:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: '生成失败，请稍后重试' },
      { status: 500 }
    );
  }
} 