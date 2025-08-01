import { D1UserClient } from './lib/d1-client';

// 定义D1数据库接口
interface D1Database {
  prepare: (sql: string) => {
    bind: (...args: any[]) => {
      first: <T>() => Promise<T | null>;
      all: <T>() => Promise<{ results: T[] }>;
      run: () => Promise<{ meta: { changes: number } }>;
    };
    all: <T>() => Promise<{ results: T[] }>;
  };
  batch: (statements: any[]) => Promise<void>;
}

export interface Env {
  USERS_DB: D1Database;
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // 处理用户认证
    if (path === '/api/auth/d1-users' && request.method === 'POST') {
      return handleUserAuth(request, env);
    }

    // 处理用户管理
    if (path.startsWith('/api/admin/users') && request.method === 'GET') {
      return handleGetUsers(request, env);
    }

    // 处理权限管理
    if (path.startsWith('/api/admin/users/') && path.includes('/permissions') && request.method === 'PUT') {
      return handleUpdatePermissions(request, env);
    }

    return new Response('Not Found', { status: 404 });
  }
};

async function handleUserAuth(request: Request, env: Env): Promise<Response> {
  try {
    const { username, password } = await request.json();
    
    if (!username || !password) {
      return new Response(
        JSON.stringify({ error: '用户名和密码不能为空' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const d1Client = new D1UserClient(env.USERS_DB);
    const user = await d1Client.getUserByUsername(username);

    if (!user) {
      return new Response(
        JSON.stringify({ error: '用户不存在' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!user.status) {
      return new Response(
        JSON.stringify({ error: '用户已被禁用' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 验证密码（在实际部署中需要使用bcrypt）
    if (password !== user.password) {
      return new Response(
        JSON.stringify({ error: '密码错误' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 更新最后登录时间
    await d1Client.updateUser(user.id, {
      lastLoginAt: new Date().toISOString()
    });

    // 获取用户权限
    const permissions = await d1Client.getUserPermissions(user.id);

    return new Response(
      JSON.stringify({
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
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('登录错误:', error);
    return new Response(
      JSON.stringify({ error: '服务器错误' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function handleGetUsers(request: Request, env: Env): Promise<Response> {
  try {
    const d1Client = new D1UserClient(env.USERS_DB);
    const users = await d1Client.getAllUsers();

    return new Response(
      JSON.stringify({ users }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('获取用户列表错误:', error);
    return new Response(
      JSON.stringify({ error: '服务器错误' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function handleUpdatePermissions(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url);
    const userId = url.pathname.split('/')[4]; // 从路径中提取用户ID
    const { permissions } = await request.json();

    const d1Client = new D1UserClient(env.USERS_DB);
    
    // 批量更新权限
    await d1Client.batchUpdatePermissions(permissions);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('更新权限错误:', error);
    return new Response(
      JSON.stringify({ error: '服务器错误' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
} 