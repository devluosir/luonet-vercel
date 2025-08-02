import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // 获取当前session
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    // 强制刷新session - 这会重新从数据库获取最新的用户权限
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/auth/session`, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    if (response.ok) {
      const sessionData = await response.json();
      
      // 返回最新的用户权限数据
      return NextResponse.json({ 
        success: true, 
        message: '权限已刷新',
        user: sessionData.user,
        permissions: sessionData.user?.permissions || []
      });
    } else {
      return NextResponse.json({ error: '刷新权限失败' }, { status: 500 });
    }
  } catch (error) {
    console.error('强制刷新API错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
} 