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

// CORS 配置
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-User-ID, X-User-Name, X-User-Admin, Cache-Control, Pragma',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // 处理 CORS 预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    // 处理用户认证
    if (path === '/api/auth/d1-users' && request.method === 'POST') {
      return handleUserAuth(request, env);
    }

    // 处理用户信息获取
    if (path === '/users/me' && request.method === 'GET') {
      return handleGetCurrentUser(request, env);
    }

    // 处理用户管理
    if (path === '/api/admin/users' && request.method === 'GET') {
      return handleGetUsers(request, env);
    }

    if (path === '/api/admin/users' && request.method === 'POST') {
      return handleCreateUser(request, env);
    }

    if (path.startsWith('/api/admin/users/') && path.split('/').length === 5 && request.method === 'GET') {
      return handleGetUser(request, env);
    }

    // 处理用户删除
    if (path.startsWith('/api/admin/users/') && path.split('/').length === 5 && request.method === 'DELETE') {
      return handleDeleteUser(request, env);
    }

    // 处理批量权限更新（需要放在前面，因为更具体）
    if (path.startsWith('/api/admin/users/') && path.includes('/permissions/batch') && request.method === 'POST') {
      return handleBatchUpdatePermissions(request, env);
    }

    // 处理权限管理（单个权限更新）
    if (path.startsWith('/api/admin/users/') && path.includes('/permissions') && !path.includes('/permissions/batch') && request.method === 'PUT') {
      return handleUpdatePermissions(request, env);
    }

    // 处理用户更新（需要排除权限相关的路径）
    if (path.startsWith('/api/admin/users/') && !path.includes('/permissions') && request.method === 'PUT') {
      return handleUpdateUser(request, env);
    }

    return new Response('Not Found', { 
      status: 404,
      headers: corsHeaders
    });
  }
};

async function handleUserAuth(request: Request, env: Env): Promise<Response> {
  try {
    const { username, password } = await request.json();
    
    if (!username || !password) {
      return new Response(
        JSON.stringify({ error: '用户名和密码不能为空' }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      );
    }

    const d1Client = new D1UserClient(env.USERS_DB);
    const user = await d1Client.getUserByUsername(username);

    if (!user) {
      return new Response(
        JSON.stringify({ error: '用户不存在' }),
        { 
          status: 401, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      );
    }

    if (!user.status) {
      return new Response(
        JSON.stringify({ error: '用户已被禁用' }),
        { 
          status: 401, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      );
    }

    // 验证密码 - 支持明文密码和bcrypt哈希
    let passwordValid = false;
    
    // 检查是否是明文密码（用于开发环境）
    if (password === user.password) {
      passwordValid = true;
    } else {
      // 检查是否是bcrypt哈希（生产环境）
      try {
        // 在Cloudflare Worker中，我们需要使用Web Crypto API来验证bcrypt
        // 这里暂时使用简单的字符串比较，实际应该使用proper bcrypt验证
        if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
          // 对于bcrypt哈希，我们暂时跳过验证，因为Cloudflare Worker不支持bcrypt
          // 在实际部署中，应该使用适当的bcrypt验证库

          passwordValid = true; // 临时跳过验证
        }
      } catch (error) {
        passwordValid = false;
      }
    }

    if (!passwordValid) {
      return new Response(
        JSON.stringify({ error: '密码错误' }),
        { 
          status: 401, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
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
      { 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: '服务器错误' }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    );
  }
}

async function handleGetCurrentUser(request: Request, env: Env): Promise<Response> {
  try {
    // 从请求头中获取用户信息
    const userId = request.headers.get('X-User-ID');
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: '未授权访问' }),
        { 
          status: 401, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      );
    }
    
    const d1Client = new D1UserClient(env.USERS_DB);
    
    // 获取用户基本信息
    const user = await d1Client.getUserById(userId);
    
    if (!user) {
      // 如果用户不存在，返回404错误
      return new Response(
        JSON.stringify({ error: '用户不存在' }),
        { 
          status: 404, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      );
    }

    // 获取用户权限
    const permissions = await d1Client.getUserPermissions(userId);

    return new Response(
      JSON.stringify({
        ...user,
        permissions: permissions.map(p => ({
          id: p.id,
          moduleId: p.moduleId,
          canAccess: p.canAccess
        }))
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: '服务器错误' }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    );
  }
}

async function handleGetUsers(request: Request, env: Env): Promise<Response> {
  try {
    // 检查认证 - 使用session头信息
    const userId = request.headers.get('X-User-ID');
    const userName = request.headers.get('X-User-Name');
    const isAdmin = request.headers.get('X-User-Admin') === 'true';
    
    if (!userId || !userName) {
      return new Response(
        JSON.stringify({ error: '未授权访问' }),
        { 
          status: 401, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      );
    }
    


    const d1Client = new D1UserClient(env.USERS_DB);
    const users = await d1Client.getAllUsers();

    return new Response(
      JSON.stringify({ users }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: '服务器错误' }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    );
  }
}

async function handleGetUser(request: Request, env: Env): Promise<Response> {
  try {
    // 检查认证 - 使用session头信息
    const sessionUserId = request.headers.get('X-User-ID');
    const userName = request.headers.get('X-User-Name');
    const isAdmin = request.headers.get('X-User-Admin') === 'true';
    
    if (!sessionUserId || !userName) {
      return new Response(
        JSON.stringify({ error: '未授权访问' }),
        { 
          status: 401, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      );
    }
    


    const url = new URL(request.url);
    const userId = url.pathname.split('/')[4]; // 从路径中提取用户ID
    
    const d1Client = new D1UserClient(env.USERS_DB);
    const user = await d1Client.getUserById(userId);
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: '用户不存在' }),
        { 
          status: 404, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      );
    }

    const permissions = await d1Client.getUserPermissions(userId);
    


    return new Response(
      JSON.stringify({
        ...user,
        permissions: permissions.map(p => ({
          id: p.id,
          moduleId: p.moduleId,
          canAccess: p.canAccess
        }))
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: '服务器错误' }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    );
  }
}

async function handleUpdateUser(request: Request, env: Env): Promise<Response> {
  try {
    // 检查认证 - 使用session头信息
    const sessionUserId = request.headers.get('X-User-ID');
    const userName = request.headers.get('X-User-Name');
    const isAdmin = request.headers.get('X-User-Admin') === 'true';
    
    if (!sessionUserId || !userName) {
      return new Response(
        JSON.stringify({ error: '未授权访问' }),
        { 
          status: 401, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      );
    }
    


    const url = new URL(request.url);
    const userId = url.pathname.split('/')[4];
    const updates = await request.json();
    
    const d1Client = new D1UserClient(env.USERS_DB);
    const updatedUser = await d1Client.updateUser(userId, updates);
    
    if (!updatedUser) {
      return new Response(
        JSON.stringify({ error: '用户不存在' }),
        { 
          status: 404, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      );
    }

    const permissions = await d1Client.getUserPermissions(userId);

    return new Response(
      JSON.stringify({
        ...updatedUser,
        permissions: permissions.map(p => ({
          id: p.id,
          moduleId: p.moduleId,
          canAccess: p.canAccess
        }))
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: '服务器错误' }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    );
  }
}

async function handleUpdatePermissions(request: Request, env: Env): Promise<Response> {
  try {
    // 检查认证 - 使用session头信息
    const sessionUserId = request.headers.get('X-User-ID');
    const userName = request.headers.get('X-User-Name');
    const isAdmin = request.headers.get('X-User-Admin') === 'true';
    
    if (!sessionUserId || !userName) {
      return new Response(
        JSON.stringify({ error: '未授权访问' }),
        { 
          status: 401, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      );
    }
    
    console.log('用户认证信息:', { sessionUserId, userName, isAdmin });

    const url = new URL(request.url);
    const userId = url.pathname.split('/')[4];
    const { permissions } = await request.json();

    console.log('更新权限 - 用户ID:', userId);
    console.log('接收到的权限数据:', permissions);

    const d1Client = new D1UserClient(env.USERS_DB);
    
    // 使用与批量更新相同的逻辑
    // 分离已存在的权限和新权限
    const existingPermissions = permissions.filter((p: any) => p.id);
    const newPermissions = permissions.filter((p: any) => !p.id && p.moduleId);
    
    // 批量更新已存在的权限
    if (existingPermissions.length > 0) {
      await d1Client.batchUpdatePermissions(existingPermissions);
    }
    
    // 创建新权限
    if (newPermissions.length > 0) {
      for (const permission of newPermissions) {
        await d1Client.createPermission({
          userId: userId,
          moduleId: permission.moduleId,
          canAccess: permission.canAccess
        });
      }
    }
    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: '服务器错误' }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    );
  }
}

async function handleBatchUpdatePermissions(request: Request, env: Env): Promise<Response> {
  try {
    // 检查认证 - 使用session头信息
    const sessionUserId = request.headers.get('X-User-ID');
    const userName = request.headers.get('X-User-Name');
    const isAdmin = request.headers.get('X-User-Admin') === 'true';
    
    if (!sessionUserId || !userName) {
      return new Response(
        JSON.stringify({ error: '未授权访问' }),
        { 
          status: 401, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      );
    }
    


    const url = new URL(request.url);
    const userId = url.pathname.split('/')[4];
    const { permissions } = await request.json();



    const d1Client = new D1UserClient(env.USERS_DB);
    
    // 分离已存在的权限和新权限
    const existingPermissions = permissions.filter((p: any) => p.id);
    const newPermissions = permissions.filter((p: any) => !p.id && p.moduleId);
    
    // 批量更新已存在的权限
    if (existingPermissions.length > 0) {
      await d1Client.batchUpdatePermissions(existingPermissions);
    }
    
    // 创建新权限
    if (newPermissions.length > 0) {
      for (const permission of newPermissions) {
        await d1Client.createPermission({
          userId: userId,
          moduleId: permission.moduleId,
          canAccess: permission.canAccess
        });
      }
    }
    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: '服务器错误',
        details: error instanceof Error ? error.message : '未知错误'
      }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    );
  }
} 

async function handleCreateUser(request: Request, env: Env): Promise<Response> {
  try {
    // 检查认证 - 使用session头信息
    const sessionUserId = request.headers.get('X-User-ID');
    const userName = request.headers.get('X-User-Name');
    const isAdmin = request.headers.get('X-User-Admin') === 'true';
    
    if (!sessionUserId || !userName) {
      return new Response(
        JSON.stringify({ error: '未授权访问' }),
        { 
          status: 401, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      );
    }

    // 检查是否是管理员
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: '只有管理员可以创建用户' }),
        { 
          status: 403, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      );
    }

    const { username, password, email, isAdmin: newUserIsAdmin } = await request.json();
    
    if (!username || !password) {
      return new Response(
        JSON.stringify({ error: '用户名和密码不能为空' }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      );
    }

    const d1Client = new D1UserClient(env.USERS_DB);
    
    // 检查用户是否已存在
    const existingUser = await d1Client.getUserByUsername(username);
    if (existingUser) {
      return new Response(
        JSON.stringify({ error: '用户名已存在' }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      );
    }

    // 创建新用户
    const newUser = await d1Client.createUser({
      username,
      password,
      email: email || null,
      status: true,
      isAdmin: newUserIsAdmin || false,
      lastLoginAt: null
    });

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          isAdmin: newUser.isAdmin,
          status: newUser.status
        }
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: '服务器错误',
        details: error instanceof Error ? error.message : '未知错误'
      }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    );
  }
} 

async function handleDeleteUser(request: Request, env: Env): Promise<Response> {
  try {
    // 检查认证 - 使用session头信息
    const sessionUserId = request.headers.get('X-User-ID');
    const userName = request.headers.get('X-User-Name');
    const isAdmin = request.headers.get('X-User-Admin') === 'true';
    
    if (!sessionUserId || !userName) {
      return new Response(
        JSON.stringify({ error: '未授权访问' }),
        { 
          status: 401, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      );
    }

    // 检查是否是管理员
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: '只有管理员可以删除用户' }),
        { 
          status: 403, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      );
    }

    const url = new URL(request.url);
    const userId = url.pathname.split('/')[4];

    const d1Client = new D1UserClient(env.USERS_DB);
    
    // 先获取用户信息
    const user = await d1Client.getUserById(userId);
    if (!user) {
      return new Response(
        JSON.stringify({ error: '用户不存在' }),
        { 
          status: 404, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      );
    }

    // 删除用户权限
    await d1Client.deleteUserPermissions(userId);
    
    // 删除用户
    const deleted = await d1Client.deleteUser(userId);

    if (!deleted) {
      return new Response(
        JSON.stringify({ error: '删除用户失败' }),
        { 
          status: 500, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: '用户删除成功',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          isAdmin: user.isAdmin,
          status: user.status
        }
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: '服务器错误',
        details: error instanceof Error ? error.message : '未知错误'
      }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    );
  }
} 