import { NextResponse, NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';

interface PermissionUpdate {
  moduleId: string;
  canAccess: boolean;
}

// 导入用户缓存以便清除
import { userCache } from '../../../../../users/me/route';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.sub || !token.isAdmin) {
      return NextResponse.json(
        { error: '需要管理员权限' },
        { status: 403 }
      );
    }

    const userId = params.id;
    if (!userId) {
      return NextResponse.json(
        { error: '用户ID不能为空' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const permissions = body.permissions as PermissionUpdate[];
    
    if (!Array.isArray(permissions)) {
      return NextResponse.json(
        { error: '无效的权限数据格式' },
        { status: 400 }
      );
    }

    // 使用事务确保数据一致性
    await prisma.$transaction(async (tx) => {
      // 删除现有权限
      await tx.permission.deleteMany({
        where: { userId }
      });

      // 只创建被启用的权限
      const enabledPermissions = permissions
        .filter(p => p.canAccess)
        .map(p => ({
          userId,
          moduleId: p.moduleId,
          canAccess: true,
        }));

      if (enabledPermissions.length > 0) {
        await tx.permission.createMany({
          data: enabledPermissions,
        });
      }
    });

    // 清除用户缓存
    const cacheKey = `user_${userId}`;
    if (userCache.has(cacheKey)) {
      userCache.delete(cacheKey);
      console.log(`已清除用户 ${userId} 的缓存`);
    }

    // 获取更新后的用户信息
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        permissions: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('批量更新权限错误:', error);
    return NextResponse.json(
      { error: '更新权限失败', userId: params.id, stack: (error as Error).stack },
      { status: 500 }
    );
  }
} 