import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const envCheck = {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? '已设置' : '未设置',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      timestamp: new Date().toISOString()
    };
    
    return NextResponse.json({
      status: 'success',
      message: '环境变量检查完成',
      environment: envCheck
    });
    
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: '环境变量检查失败',
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
}
