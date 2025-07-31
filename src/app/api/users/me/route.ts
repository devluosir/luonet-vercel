import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { permissions: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      status: user.status,
      isAdmin: user.isAdmin,
      permissions: user.permissions.map(p => ({
        id: p.id,
        moduleId: p.moduleId,
        canAccess: p.canAccess
      }))
    };

    return NextResponse.json(userData);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
} 