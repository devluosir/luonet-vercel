import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { userCache } from '../users/me/route';

export async function GET() {
  try {
    const session = await getServerSession(authConfig);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const userId = session.user.id;
    const cacheKey = `user_${userId}`;
    
    // 获取数据库中的用户权限
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        permissions: true
      }
    });

    // 获取缓存中的用户信息
    const cached = userCache.get(cacheKey);
    
    return NextResponse.json({
      userId,
      cacheKey,
      hasCache: !!cached,
      cacheTimestamp: cached?.timestamp,
      cacheAge: cached ? Date.now() - cached.timestamp : null,
      databasePermissions: user?.permissions || [],
      cachedPermissions: cached?.data?.permissions || [],
      cacheData: cached?.data || null
    });
  } catch (error) {
    console.error('调试API错误:', error);
    return NextResponse.json(
      { error: '调试API错误' },
      { status: 500 }
    );
  }
} 