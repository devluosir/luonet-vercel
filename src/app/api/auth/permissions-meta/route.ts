import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface WorkerUserResponse {
  username?: string;
  updatedAt?: string | null;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const username = session.user.username || session.user.name || '';
    if (!username) {
      return NextResponse.json({ error: '当前用户缺少用户名' }, { status: 400 });
    }

    const apiToken = process.env.API_TOKEN;
    if (!apiToken) {
      console.error('权限元信息API: API_TOKEN 未配置');
      return NextResponse.json({ error: '服务器配置错误' }, { status: 500 });
    }

    const workerBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://udb.luocompany.net';
    const response = await fetch(
      `${workerBase}/api/admin/users?username=${encodeURIComponent(username)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`,
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      console.error('权限元信息API: Worker 请求失败', response.status);
      return NextResponse.json({ error: '获取权限元信息失败' }, { status: 502 });
    }

    const userData = await response.json() as WorkerUserResponse;
    return NextResponse.json({ updatedAt: userData.updatedAt ?? null });
  } catch (error) {
    console.error('权限元信息API错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
