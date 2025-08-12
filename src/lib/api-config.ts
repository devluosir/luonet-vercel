import { getSession } from 'next-auth/react';

// API基础URL - 使用环境变量，支持Vercel部署
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://udb.luocompany.net';

// API端点配置
export const API_ENDPOINTS = {
  USERS: {
    CHANGE_PASSWORD: `${API_BASE_URL}/users/change-password`,
    LIST: `${API_BASE_URL}/api/admin/users`,
    CREATE: `${API_BASE_URL}/api/admin/users`,
    GET: (id: string) => `${API_BASE_URL}/api/admin/users/${id}`,
    UPDATE: (id: string) => `${API_BASE_URL}/api/admin/users/${id}`,
    DELETE: (id: string) => `${API_BASE_URL}/api/admin/users/${id}`,
    PERMISSIONS: (id: string) => `${API_BASE_URL}/api/admin/users/${id}/permissions`,
    BATCH_PERMISSIONS: (id: string) => `${API_BASE_URL}/api/admin/users/${id}/permissions/batch`,
  },
  
  AUTH: {
    SIGNOUT: `${API_BASE_URL}/api/auth/signout`,
  },
  
  // 其他API
  GENERATE: '/api/generate',
};

// 获取用户信息（优先从localStorage获取）
export async function getUserInfo() {
  try {
    if (typeof window !== 'undefined') {
      // 优先从localStorage获取用户信息
      const username = localStorage.getItem('username');
      const userId = localStorage.getItem('userId');
      const isAdmin = localStorage.getItem('isAdmin') === 'true';
      
      if (username && userId) {
        return {
          id: userId,
          username: username,
          isAdmin: isAdmin
        };
      }
      
      // 如果localStorage没有，尝试从session获取
      const session = await getSession();
      if (session?.user) {
        return {
          id: session.user.id || session.user.username || '',
          username: session.user.username || session.user.name || '',
          isAdmin: session.user.isAdmin || false
        };
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}

// 通用API请求函数
export async function apiRequest(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  // 获取用户信息
  const userInfo = await getUserInfo();

  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // 如果有用户信息，添加认证头
  if (userInfo) {
    // 使用用户信息作为认证
    defaultOptions.headers = {
      ...defaultOptions.headers,
      'X-User-ID': userInfo.id,
      'X-User-Name': userInfo.username,
      'X-User-Admin': userInfo.isAdmin ? 'true' : 'false',
    };
  }

  // 处理相对URL（本地API路由）
  const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;

  return fetch(fullUrl, defaultOptions);
}

// 带错误处理的API请求
export async function apiRequestWithError(
  url: string, 
  options: RequestInit = {}
): Promise<any> {
  const response = await apiRequest(url, options);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
} 