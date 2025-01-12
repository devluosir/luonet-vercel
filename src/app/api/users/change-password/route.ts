import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { config } from '@/auth';
import { prisma } from '@/lib/prisma';
import { hash, compare } from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(config);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: '请提供当前密码和新密码' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        password: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    if (!user.password) {
      return NextResponse.json({ error: '用户密码数据异常' }, { status: 400 });
    }

    const isValid = await compare(currentPassword, user.password);
    if (!isValid) {
      return NextResponse.json({ error: '当前密码错误' }, { status: 400 });
    }

    const hashedPassword = await hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    return NextResponse.json({ message: '密码修改成功' });
  } catch (error) {
    console.error('修改密码时出错:', error);
    const errorMessage = error instanceof Error ? error.message : '修改密码失败';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 