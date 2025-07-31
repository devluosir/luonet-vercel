import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.username !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { status } = body;

    // 验证状态值
    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return NextResponse.json(
        { error: '无效的状态值' },
        { status: 400 }
      );
    }

    // 检查用户是否存在
    const user = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    // 不允许修改管理员状态
    if (user.username === 'admin') {
      return NextResponse.json(
        { error: '不能修改管理员状态' },
        { status: 403 }
      );
    }

    // 更新用户状态
    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: { status },
      select: {
        id: true,
        username: true,
        email: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('更新用户状态失败:', error);
    return NextResponse.json(
      { error: '更新用户状态失败' },
      { status: 500 }
    );
  }
} 