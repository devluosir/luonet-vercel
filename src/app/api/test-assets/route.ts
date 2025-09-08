import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const assetTests = {
      logo: '/assets/logo/logo.png',
      icon: '/assets/logo/icon.png',
      favicon: '/assets/logo/favicon.ico',
      timestamp: new Date().toISOString()
    };
    
    return NextResponse.json({
      status: 'success',
      message: '静态资源路径测试',
      assets: assetTests,
      note: '请检查这些路径是否可访问'
    });
    
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: '静态资源测试失败',
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
}
