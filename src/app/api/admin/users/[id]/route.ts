import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { userCache } from '../../../users/me/route';

export async function GET(
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

    const id = params?.id;
    if (!id) {
      return NextResponse.json(
        { error: '用户ID不能为空' },
        { status: 400 }
      );
    }

    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        permissions: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('获取用户信息时出错:', error);
    return NextResponse.json(
      { error: '获取用户信息失败' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.sub || !token.isAdmin) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: '无效的用户ID' }, { status: 400 });
    }

    const { isAdmin, status, email, password } = await req.json();
    const updateData: { isAdmin?: boolean; status?: boolean; email?: string; password?: string } = {};

    // 检查是否更新管理员权限
    if (typeof isAdmin === 'boolean') {
      // 防止取消最后一个管理员的管理员权限
      if (!isAdmin) {
        const adminCount = await prisma.user.count({
          where: { isAdmin: true },
        });
        if (adminCount <= 1) {
          return NextResponse.json(
            { error: '必须保留至少一个管理员账号' },
            { status: 400 }
          );
        }
      }
      updateData.isAdmin = isAdmin;
    }

    // 检查是否更新状态
    if (typeof status === 'boolean') {
      // 防止禁用最后一个管理员账户
      if (!status) {
        const targetUser = await prisma.user.findUnique({
          where: { id },
          select: { isAdmin: true },
        });
        
        if (targetUser?.isAdmin) {
          const adminCount = await prisma.user.count({
            where: { isAdmin: true, status: true },
          });
          if (adminCount <= 1) {
            return NextResponse.json(
              { error: '必须保留至少一个启用状态的管理员账号' },
              { status: 400 }
            );
          }
        }
      }
      updateData.status = status;
    }

    // 检查是否更新邮箱
    if (typeof email === 'string') {
      updateData.email = email;
    }

    // 检查是否更新密码
    if (typeof password === 'string') {
      updateData.password = await bcrypt.hash(password, 10); // 使用 bcrypt 进行密码哈希
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        permissions: true,
      },
    });

    // 清除用户缓存
    const cacheKey = `user_${id}`;
    if (userCache.has(cacheKey)) {
      userCache.delete(cacheKey);
      console.log(`已清除用户 ${id} 的缓存`);
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('更新用户信息失败:', error);
    return NextResponse.json(
      { error: '更新用户信息失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const id = params?.id;
    if (!id) {
      return NextResponse.json(
        { error: '用户ID不能为空' },
        { status: 400 }
      );
    }

    // 检查是否是最后一个管理员
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { isAdmin: true },
    });

    if (targetUser?.isAdmin) {
      const adminCount = await prisma.user.count({
        where: { isAdmin: true },
      });
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: '不能删除最后一个管理员账号' },
          { status: 400 }
        );
      }
    }

    // 删除用户相关数据
    await prisma.$transaction([
      // 删除用户的权限
      prisma.permission.deleteMany({
        where: { userId: id },
      }),
      // 删除用户
      prisma.user.delete({
        where: { id },
      }),
    ]);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('删除用户时出错:', error);
    return NextResponse.json(
      { error: '删除用户失败' },
      { status: 500 }
    );
  }
} 