import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    console.log('🔍 API /users/me - Session:', session ? { userId: session.user.id, username: session.user.username } : 'No session');
    
    if (!session || !session.user.id) {
      console.log('🔍 API /users/me - Unauthorized: No session or user ID');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { permissions: true }
    });

    if (!user) {
      console.log('🔍 API /users/me - User not found:', session.user.id);
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

    console.log('🔍 API /users/me - Success:', userData.username, '权限数量:', userData.permissions.length);
    return NextResponse.json(userData);
  } catch (error) {
    console.error('🔍 API /users/me - Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
} 