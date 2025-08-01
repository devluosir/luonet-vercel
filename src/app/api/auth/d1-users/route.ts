import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { D1UserClient } from '@/lib/d1-client';

// 模拟D1数据库环境（实际部署时会在Cloudflare Workers中）
const mockD1DB = {
  prepare: (sql: string) => ({
    bind: (...args: any[]) => ({
      first: async <T>() => {
        // 模拟数据库查询
        if (sql.includes('SELECT * FROM User WHERE username')) {
          const username = args[0];
          // 这里应该从真实的D1数据库查询
          return null;
        }
        return null;
      },
      all: async <T>() => ({
        results: []
      }),
      run: async () => ({ meta: { changes: 0 } })
    })
  })
};

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    
    if (!username || !password) {
      return NextResponse.json(
        { error: '用户名和密码不能为空' },
        { status: 400 }
      );
    }

    const d1Client = new D1UserClient(mockD1DB as any);
    const user = await d1Client.getUserByUsername(username);

    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 401 }
      );
    }

    if (!user.status) {
      return NextResponse.json(
        { error: '用户已被禁用' },
        { status: 401 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: '密码错误' },
        { status: 401 }
      );
    }

    // 更新最后登录时间
    await d1Client.updateUser(user.id, {
      lastLoginAt: new Date().toISOString()
    });

    // 获取用户权限
    const permissions = await d1Client.getUserPermissions(user.id);

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
        status: user.status
      },
      permissions: permissions.map(p => ({
        id: p.id,
        moduleId: p.moduleId,
        canAccess: p.canAccess
      }))
    });

  } catch (error) {
    console.error('登录错误:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
} 