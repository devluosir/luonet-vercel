import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cache } from 'react';

export const dynamic = 'force-dynamic';

// 缓存获取用户信息的函数 - 增加缓存时间
const getUserInfo = cache(async (userId: string) => {
  return await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      status: true,
      isAdmin: true,
      updatedAt: true, // 添加updatedAt字段用于ETag
      permissions: {
        select: {
          id: true,
          moduleId: true,
          canAccess: true,
        }
      },
    },
  });
});

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.sub) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const user = await getUserInfo(token.sub);

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 检查用户状态
    if (!user.status) {
      return NextResponse.json({ error: '账号已被禁用' }, { status: 403 });
    }

    return NextResponse.json(user, {
      headers: {
        'Cache-Control': 'private, max-age=300',  // 客户端缓存5分钟
        'ETag': `"${user.id}-${user.updatedAt?.getTime() || Date.now()}"`, // 添加ETag支持
      },
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    return NextResponse.json(
      { error: '获取用户信息失败' },
      { status: 500 }
    );
  }
} 