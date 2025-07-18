import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { databaseMonitor } from '@/utils/database';

// 内存缓存
const userCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const userId = session.user.id;
    const cacheKey = `user_${userId}`;
    
    // 检查缓存
    const cached = userCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json(cached.data, {
        headers: {
          'Cache-Control': 'public, max-age=300', // 5分钟浏览器缓存
          'ETag': `"${cached.timestamp}"`
        }
      });
    }

    // 使用数据库监控优化查询
    const user = await databaseMonitor.monitorQuery(
      'get_user_with_permissions',
      () => prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          email: true,
          status: true,
          isAdmin: true,
          permissions: {
            select: {
              id: true,
              moduleId: true,
              canAccess: true
            }
          }
        }
      })
    );

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      status: user.status,
      isAdmin: user.isAdmin,
      permissions: user.permissions
    };

    // 更新缓存
    userCache.set(cacheKey, {
      data: userData,
      timestamp: Date.now()
    });

    // 清理过期缓存
    const now = Date.now();
    userCache.forEach((value, key) => {
      if (now - value.timestamp > CACHE_DURATION) {
        userCache.delete(key);
      }
    });

    return NextResponse.json(userData, {
      headers: {
        'Cache-Control': 'public, max-age=300',
        'ETag': `"${Date.now()}"`
      }
    });

  } catch (error) {
    console.error('获取用户信息失败:', error);
    return NextResponse.json(
      { error: '获取用户信息失败' },
      { status: 500 }
    );
  }
} 