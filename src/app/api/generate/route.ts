import { NextRequest, NextResponse } from 'next/server';
import { generateMail } from '@/lib/deepseek';

export async function POST(request: NextRequest) {
  // 设置响应超时
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000); // 2分钟超时
  
  try {
    // 解析请求体
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: '请求体格式错误，请检查JSON格式' },
        { status: 400 }
      );
    }

    const { content, language, type, originalMail, mode } = body;

    // 详细的参数验证
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: '邮件内容不能为空' },
        { status: 400 }
      );
    }

    if (!language || typeof language !== 'string') {
      return NextResponse.json(
        { error: '请选择输出语言' },
        { status: 400 }
      );
    }

    if (!type || typeof type !== 'string') {
      return NextResponse.json(
        { error: '请选择邮件风格' },
        { status: 400 }
      );
    }

    if (!mode || !['mail', 'reply'].includes(mode)) {
      return NextResponse.json(
        { error: '无效的模式参数' },
        { status: 400 }
      );
    }

    // 回复模式下的额外验证
    if (mode === 'reply' && (!originalMail || typeof originalMail !== 'string' || originalMail.trim().length === 0)) {
      return NextResponse.json(
        { error: '回复模式下原始邮件内容不能为空' },
        { status: 400 }
      );
    }

    console.log('开始生成邮件:', { mode, language, type, contentLength: content.length });

    // 调用DeepSeek API生成邮件
    const result = await generateMail({
      content: content.trim(),
      language,
      type,
      originalMail: originalMail ? originalMail.trim() : '',
      mode
    });

    if (!result || typeof result !== 'string' || result.trim().length === 0) {
      return NextResponse.json(
        { error: '生成的内容为空，请重试' },
        { status: 500 }
      );
    }

    console.log('邮件生成成功，内容长度:', result.length);

    return NextResponse.json({ 
      result: result.trim(),
      success: true,
      timestamp: new Date().toISOString()
    });

  } catch (error: unknown) {
    console.error('邮件生成API错误:', error);
    
    // 处理超时错误
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: '请求超时，请稍后重试' },
        { status: 408 }
      );
    }
    
    // 处理其他错误
    if (error instanceof Error) {
      // 根据错误消息返回相应的状态码
      if (error.message.includes('API密钥') || error.message.includes('401')) {
        return NextResponse.json(
          { error: 'API配置错误，请联系管理员' },
          { status: 500 }
        );
      }
      
      if (error.message.includes('频率过高') || error.message.includes('429')) {
        return NextResponse.json(
          { error: '请求过于频繁，请稍后重试' },
          { status: 429 }
        );
      }
      
      if (error.message.includes('超时') || error.message.includes('暂时不可用')) {
        return NextResponse.json(
          { error: '服务暂时不可用，请稍后重试' },
          { status: 503 }
        );
      }
      
      return NextResponse.json(
        { error: error.message || '生成失败，请稍后重试' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: '服务器内部错误，请稍后重试' },
      { status: 500 }
    );
  } finally {
    clearTimeout(timeoutId);
  }
} 