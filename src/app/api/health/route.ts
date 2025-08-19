import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const hasApiKey = !!process.env.DEEPSEEK_API_KEY;
    const apiKeyFormat = process.env.DEEPSEEK_API_KEY?.startsWith('sk-') ? 'valid' : 'invalid';
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'default';
    
    // 检查环境变量
    const envStatus = {
      DEEPSEEK_API_KEY: hasApiKey ? 'configured' : 'missing',
      API_KEY_FORMAT: hasApiKey ? apiKeyFormat : 'n/a',
      NEXT_PUBLIC_API_BASE_URL: apiBaseUrl,
      NODE_ENV: process.env.NODE_ENV || 'unknown'
    };
    
    // 检查服务状态
    const serviceStatus = {
      mailService: hasApiKey ? 'ready' : 'unconfigured',
      deepseekAPI: hasApiKey ? 'configured' : 'missing_key',
      timestamp: new Date().toISOString()
    };
    
    return NextResponse.json({
      status: hasApiKey ? 'healthy' : 'unhealthy',
      message: hasApiKey ? '邮件助手服务正常' : '邮件助手服务配置不完整',
      environment: envStatus,
      services: serviceStatus,
      recommendations: hasApiKey ? [] : [
        '请在Vercel项目设置中添加DEEPSEEK_API_KEY环境变量',
        '确保API密钥格式正确（以sk-开头）',
        '重新部署项目以应用环境变量'
      ]
    });
    
  } catch (error) {
    console.error('健康检查失败:', error);
    
    return NextResponse.json({
      status: 'error',
      message: '健康检查失败',
      error: error instanceof Error ? error.message : '未知错误',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
