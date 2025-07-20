import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = params.id;
    const { permissions } = await request.json();

    // 验证权限数组
    if (!Array.isArray(permissions)) {
      return NextResponse.json(
        { error: 'Invalid permissions format' },
        { status: 400 }
      );
    }

    // 获取用户
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { permissions: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 更新权限
    await prisma.user.update({
      where: { id: userId },
      data: {
        permissions: {
          deleteMany: {},  // 删除所有现有权限
          create: permissions.map(permission => ({
            name: permission,
            moduleId: permission,
            canAccess: true
          }))
        }
      }
    });

    // 获取更新后的用户权限
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { permissions: true }
    });

    return NextResponse.json({
      success: true,
      permissions: updatedUser?.permissions || []
    });
  } catch (error) {
    console.error('Error updating permissions:', error);
    return NextResponse.json(
      { error: 'Failed to update permissions' },
      { status: 500 }
    );
  }
} 