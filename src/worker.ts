import { D1UserClient } from './lib/d1-client';
import bcrypt from 'bcryptjs';

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
  API_TOKEN: string;
}

// CORS 配置
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cache-Control, Pragma',
  'Access-Control-Max-Age': '86400',
};

/** 验证请求携带的 Bearer token 是否与 Cloudflare secret 一致 */
function verifyBearerToken(request: Request, env: Env): boolean {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return false;
  return auth.slice(7) === env.API_TOKEN;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    }
  );
}

function unauthorizedResponse(): Response {
  return jsonResponse({ error: '未授权访问' }, 401);
}

function parseJsonData<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

type DocumentRow = {
  id: string;
  user_id: string;
  type: string;
  doc_no: string;
  customer_name: string | null;
  total_amount: number | null;
  currency: string | null;
  status: string;
  data: string;
  created_at: string;
  updated_at: string;
};

function serializeDocument(row: DocumentRow) {
  return {
    ...row,
    data: parseJsonData<Record<string, unknown>>(row.data, {}),
  };
}

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

    // 处理业务单据 API
    if (path === '/api/documents' && request.method === 'GET') {
      return handleListDocuments(request, env);
    }

    if (path === '/api/documents' && request.method === 'POST') {
      return handleCreateDocument(request, env);
    }

    if (path.startsWith('/api/documents/') && path.split('/').length === 4 && request.method === 'GET') {
      return handleGetDocument(request, env);
    }

    if (path.startsWith('/api/documents/') && path.split('/').length === 4 && request.method === 'PUT') {
      return handleUpdateDocument(request, env);
    }

    if (path.startsWith('/api/documents/') && path.split('/').length === 4 && request.method === 'DELETE') {
      return handleDeleteDocument(request, env);
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

    // 处理权限删除
    if (path.startsWith('/api/admin/permissions/') && request.method === 'DELETE') {
      return handleDeletePermission(request, env);
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
    
    console.log('handleUserAuth - 开始验证:', { username, password: password ? '***' : 'empty' });
    
    if (!username || !password) {
      console.log('handleUserAuth - 用户名或密码为空');
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
      console.log('handleUserAuth - 用户不存在:', username);
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

    console.log('handleUserAuth - 找到用户:', {
      id: user.id,
      username: user.username,
      password: user.password ? `${user.password.substring(0, 10)}...` : 'empty',
      status: user.status,
      isAdmin: user.isAdmin
    });

    if (!user.status) {
      console.log('handleUserAuth - 用户已被禁用:', username);
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

    // 验证密码 - 安全且实用的验证
    let passwordValid = false;
    
    console.log('开始密码验证:', { 
      username, 
      inputPassword: password ? '***' : 'empty',
      storedPasswordType: user.password ? (user.password.startsWith('$2') ? 'bcrypt' : 'plaintext') : 'empty',
      storedPasswordLength: user.password ? user.password.length : 0,
      inputPasswordLength: password ? password.length : 0
    });
    
    // 验证逻辑：
    // 1. 如果存储的密码是明文，直接比较
    // 2. 如果存储的密码是bcrypt格式，使用bcrypt.compare验证
    // 3. 如果存储的密码为空，拒绝登录
    if (!user.password) {
      console.log('密码验证失败: 数据库中密码为空');
      passwordValid = false;
    } else if (!password) {
      console.log('密码验证失败: 用户未输入密码');
      passwordValid = false;
    } else if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      // 使用bcrypt验证密码
      try {
        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
          console.log('密码验证成功: bcrypt密码匹配');
          passwordValid = true;
        } else {
          console.log('密码验证失败: bcrypt密码不匹配');
          passwordValid = false;
        }
      } catch (error) {
        console.log('密码验证失败: bcrypt验证出错:', error);
        passwordValid = false;
      }
    } else if (password === user.password) {
      console.log('密码验证成功: 明文密码匹配');
      console.log('密码匹配详情:', {
        inputPassword: password,
        storedPassword: user.password,
        match: password === user.password
      });
      passwordValid = true;
    } else {
      console.log('密码验证失败: 密码不匹配');
      console.log('密码不匹配详情:', {
        inputPassword: password,
        storedPassword: user.password,
        match: password === user.password
      });
      passwordValid = false;
    }

    if (!passwordValid) {
      console.log('handleUserAuth - 密码验证失败，拒绝登录');
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
    
    console.log('handleUserAuth - 密码验证成功，允许登录');

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

async function handleGetUsers(request: Request, env: Env): Promise<Response> {
  try {
    if (!verifyBearerToken(request, env)) {
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
    const username = url.searchParams.get('username');
    
    const d1Client = new D1UserClient(env.USERS_DB);
    
    // 如果提供了username参数，则查询单个用户
    if (username) {
      console.log('handleGetUsers - 查询用户:', username);
      const user = await d1Client.getUserByUsername(username);
      console.log('handleGetUsers - 查询结果:', user);
      
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
      
      // 获取用户权限
      const permissions = await d1Client.getUserPermissions(user.id);
      console.log('handleGetUsers - 用户权限:', permissions);
      
      const responseData = {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
        status: user.status,
        permissions: permissions.map(p => ({
          id: p.id,
          moduleId: p.moduleId,
          canAccess: p.canAccess
        }))
      };
      
      console.log('handleGetUsers - 返回数据:', responseData);
      
      return new Response(
        JSON.stringify(responseData),
        { 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      );
    }

    // 否则返回所有用户
    const users = await d1Client.getAllUsers();

    // 为每个用户获取权限信息
    const usersWithPermissions = await Promise.all(
      users.map(async (user) => {
        const permissions = await d1Client.getUserPermissions(user.id);
        return {
          ...user,
          permissions: permissions.map(p => ({
            id: p.id,
            moduleId: p.moduleId,
            canAccess: p.canAccess
          }))
        };
      })
    );

    return new Response(
      JSON.stringify({ users: usersWithPermissions }),
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
    if (!verifyBearerToken(request, env)) {
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
    if (!verifyBearerToken(request, env)) {
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

    // 检查是否是密码修改请求
    if (updates.currentPassword && updates.newPassword) {
      // 验证当前密码
      const isValidPassword = await d1Client.validatePassword(userId, updates.currentPassword);
      if (!isValidPassword) {
        return new Response(
          JSON.stringify({ error: '当前密码错误' }),
          { 
            status: 400, 
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            } 
          }
        );
      }

      // 更新密码
      const passwordUpdated = await d1Client.updatePassword(userId, updates.newPassword);
      if (!passwordUpdated) {
        return new Response(
          JSON.stringify({ error: '密码更新失败' }),
          { 
            status: 500, 
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            } 
          }
        );
      }

      // 获取更新后的用户信息
      const updatedUser = await d1Client.getUserById(userId);
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
    }

    // 普通用户信息更新
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
    if (!verifyBearerToken(request, env)) {
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
    if (!verifyBearerToken(request, env)) {
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
    if (!verifyBearerToken(request, env)) {
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

    const { username, password, email, isAdmin: newUserIsAdmin } = await request.json();
    
    console.log('创建用户数据:', { username, email, isAdmin: newUserIsAdmin });
    
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
    console.log('检查用户是否已存在:', username);
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
    console.log('开始创建新用户...');
    
    // 使用bcrypt加密密码
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('密码已加密:', { originalLength: password.length, hashedLength: hashedPassword.length });
    
    const newUser = await d1Client.createUser({
      username,
      password: hashedPassword, // 使用加密后的密码
      email: email || null,
      status: true,
      isAdmin: newUserIsAdmin || false,
      lastLoginAt: null
    });

    console.log('用户创建成功:', newUser);

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
    console.error('创建用户时发生错误:', error);
    
    // 提供更详细的错误信息
    let errorMessage = '服务器错误';
    let errorDetails = '';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || '';
    }
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: errorDetails,
        timestamp: new Date().toISOString()
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
    if (!verifyBearerToken(request, env)) {
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

async function handleDeletePermission(request: Request, env: Env): Promise<Response> {
  try {
    if (!verifyBearerToken(request, env)) {
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
    const permissionId = url.pathname.split('/')[4]; // 从路径中提取权限ID

    const d1Client = new D1UserClient(env.USERS_DB);
    
    // 先获取权限信息
    const permission = await d1Client.getPermissionById(permissionId);
    if (!permission) {
      return new Response(
        JSON.stringify({ error: '权限不存在' }),
        { 
          status: 404, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      );
    }

    // 删除权限
    const deleted = await d1Client.deletePermission(permissionId);

    if (!deleted) {
      return new Response(
        JSON.stringify({ error: '删除权限失败' }),
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
        message: '权限删除成功',
        permission: {
          id: permission.id,
          userId: permission.userId,
          moduleId: permission.moduleId,
          canAccess: permission.canAccess
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

async function handleListDocuments(request: Request, env: Env): Promise<Response> {
  try {
    if (!verifyBearerToken(request, env)) return unauthorizedResponse();

    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id');
    if (!userId) return jsonResponse({ error: '缺少 user_id' }, 400);

    const type = url.searchParams.get('type');
    const status = url.searchParams.get('status') || 'active';
    const search = url.searchParams.get('search');
    const limit = Math.min(Number(url.searchParams.get('limit')) || 100, 500);
    const offset = Number(url.searchParams.get('offset')) || 0;

    const conditions = ['user_id = ?'];
    const values: Array<string | number> = [userId];

    if (type) {
      conditions.push('type = ?');
      values.push(type);
    }

    if (status !== 'all') {
      conditions.push('status = ?');
      values.push(status);
    }

    if (search) {
      conditions.push('(doc_no LIKE ? OR customer_name LIKE ?)');
      values.push(`%${search}%`, `%${search}%`);
    }

    values.push(limit, offset);

    const result = await env.USERS_DB.prepare(`
      SELECT * FROM Document
      WHERE ${conditions.join(' AND ')}
      ORDER BY updated_at DESC
      LIMIT ? OFFSET ?
    `).bind(...values).all<DocumentRow>();

    return jsonResponse({
      documents: result.results.map(serializeDocument),
      pagination: { limit, offset, count: result.results.length },
    });
  } catch (error) {
    return jsonResponse({
      error: '服务器错误',
      details: error instanceof Error ? error.message : '未知错误',
    }, 500);
  }
}

async function handleGetDocument(request: Request, env: Env): Promise<Response> {
  try {
    if (!verifyBearerToken(request, env)) return unauthorizedResponse();

    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id');
    const documentId = url.pathname.split('/')[3];
    if (!userId) return jsonResponse({ error: '缺少 user_id' }, 400);

    const document = await env.USERS_DB.prepare(`
      SELECT * FROM Document
      WHERE id = ? AND user_id = ?
      LIMIT 1
    `).bind(documentId, userId).first<DocumentRow>();

    if (!document) return jsonResponse({ error: '单据不存在' }, 404);
    return jsonResponse({ document: serializeDocument(document) });
  } catch (error) {
    return jsonResponse({
      error: '服务器错误',
      details: error instanceof Error ? error.message : '未知错误',
    }, 500);
  }
}

async function handleCreateDocument(request: Request, env: Env): Promise<Response> {
  try {
    if (!verifyBearerToken(request, env)) return unauthorizedResponse();

    const body = await request.json();
    const userId = body.user_id;
    const type = body.type;
    const docNo = body.doc_no;
    const data = body.data;

    if (!userId || !type || !docNo || data === undefined) {
      return jsonResponse({ error: '缺少必要字段' }, 400);
    }

    const id = body.id || crypto.randomUUID();
    const dataText = typeof data === 'string' ? data : JSON.stringify(data);

    await env.USERS_DB.prepare(`
      INSERT INTO Document (
        id, user_id, type, doc_no, customer_name, total_amount, currency, status, data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      userId,
      type,
      docNo,
      body.customer_name || null,
      body.total_amount ?? null,
      body.currency || 'USD',
      body.status || 'active',
      dataText
    ).run();

    const created = await env.USERS_DB.prepare(`
      SELECT * FROM Document WHERE id = ? AND user_id = ? LIMIT 1
    `).bind(id, userId).first<DocumentRow>();

    return jsonResponse({ success: true, document: created ? serializeDocument(created) : null }, 201);
  } catch (error) {
    return jsonResponse({
      error: '服务器错误',
      details: error instanceof Error ? error.message : '未知错误',
    }, 500);
  }
}

async function handleUpdateDocument(request: Request, env: Env): Promise<Response> {
  try {
    if (!verifyBearerToken(request, env)) return unauthorizedResponse();

    const url = new URL(request.url);
    const documentId = url.pathname.split('/')[3];
    const body = await request.json();
    const userId = body.user_id;
    if (!userId) return jsonResponse({ error: '缺少 user_id' }, 400);

    const fields: string[] = [];
    const values: Array<string | number | null> = [];
    const updatableFields = [
      'type',
      'doc_no',
      'customer_name',
      'total_amount',
      'currency',
      'status',
      'data',
    ];

    for (const field of updatableFields) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        fields.push(`${field} = ?`);
        const value = field === 'data' && typeof body[field] !== 'string'
          ? JSON.stringify(body[field])
          : body[field];
        values.push(value ?? null);
      }
    }

    if (fields.length === 0) {
      return jsonResponse({ error: '没有可更新字段' }, 400);
    }

    values.push(userId, documentId);
    const result = await env.USERS_DB.prepare(`
      UPDATE Document
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND id = ?
    `).bind(...values).run();

    if (result.meta.changes === 0) return jsonResponse({ error: '单据不存在' }, 404);

    const updated = await env.USERS_DB.prepare(`
      SELECT * FROM Document WHERE id = ? AND user_id = ? LIMIT 1
    `).bind(documentId, userId).first<DocumentRow>();

    return jsonResponse({ success: true, document: updated ? serializeDocument(updated) : null });
  } catch (error) {
    return jsonResponse({
      error: '服务器错误',
      details: error instanceof Error ? error.message : '未知错误',
    }, 500);
  }
}

async function handleDeleteDocument(request: Request, env: Env): Promise<Response> {
  try {
    if (!verifyBearerToken(request, env)) return unauthorizedResponse();

    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id');
    const documentId = url.pathname.split('/')[3];
    if (!userId) return jsonResponse({ error: '缺少 user_id' }, 400);

    const result = await env.USERS_DB.prepare(`
      UPDATE Document
      SET status = 'deleted', updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).bind(documentId, userId).run();

    if (result.meta.changes === 0) return jsonResponse({ error: '单据不存在' }, 404);
    return jsonResponse({ success: true });
  } catch (error) {
    return jsonResponse({
      error: '服务器错误',
      details: error instanceof Error ? error.message : '未知错误',
    }, 500);
  }
}
