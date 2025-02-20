import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ 
      req, 
      secret: process.env.NEXTAUTH_SECRET 
    });

    // 验证 token 是否有效且用户是否启用
    if (token?.sub) {
      return NextResponse.json({ valid: true });
    }

    return NextResponse.json({ valid: false }, { status: 401 });
  } catch (error) {
    console.error('Token validation error:', error);
    return NextResponse.json(
      { error: 'Token validation failed' },
      { status: 500 }
    );
  }
} 