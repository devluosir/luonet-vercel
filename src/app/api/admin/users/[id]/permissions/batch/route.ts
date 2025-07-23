import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;
    const { permissions } = await request.json();

    // 验证权限数组格式
    if (!Array.isArray(permissions)) {
      return NextResponse.json(
        { error: 'Invalid permissions format' },
        { status: 400 }
      );
    }

    // 删除所有现有权限
    await prisma.permission.deleteMany({
      where: { userId }
    });

    // 创建新的权限记录
    const permissionData = permissions.map(permission => ({
      userId,
      moduleId: permission.moduleId,
      canAccess: permission.canAccess
    }));

    await prisma.permission.createMany({
      data: permissionData
    });

    // 获取更新后的用户权限
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { permissions: true }
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating permissions:', error);
    return NextResponse.json(
      { error: 'Failed to update permissions' },
      { status: 500 }
    );
  }
} 