import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface Permission {
  id: string;
  moduleId: string;
  canAccess: boolean;
}

export async function POST(request: NextRequest) {
  try {
    // 从请求头获取用户信息
    const userId = request.headers.get('X-User-ID');
    const userName = request.headers.get('X-User-Name');
    const isAdmin = request.headers.get('X-User-Admin') === 'true';

    if (!userId || !userName) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 从数据库获取最新权限
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://udb.luocompany.net'}/api/auth/d1-users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': userId,
        'X-User-Name': userName,
        'X-User-Admin': isAdmin ? 'true' : 'false'
      },
      body: JSON.stringify({
        username: userName,
        password: 'dummy' // 使用虚拟密码，实际会使用session验证
      })
    });

    if (!response.ok) {
      throw new Error('获取权限失败');
    }

    const data = await response.json();
    const permissions: Permission[] = data.permissions || [];

    // 返回最新的用户权限数据
    return NextResponse.json({ 
      success: true, 
      message: '获取最新权限成功',
      user: {
        id: userId,
        username: userName,
        email: data.user?.email || null,
        status: true,
        isAdmin: isAdmin,
        permissions: permissions
      },
      permissions: permissions
    });
  } catch (error) {
    console.error('获取最新权限API错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
} 