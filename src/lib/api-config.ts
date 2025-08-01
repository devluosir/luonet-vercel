// API 配置
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://udb.luocompany.net';

// 获取NextAuth session数据的函数
export async function getNextAuthSession() {
  try {
    // 尝试从NextAuth的API获取session
    const response = await fetch('/api/auth/session', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const session = await response.json();
      return session;
    }
  } catch (error) {
    console.log('获取NextAuth session失败:', error);
  }
  return null;
}

// API 端点
export const API_ENDPOINTS = {
  // 用户认证
  AUTH: {
    LOGIN: `${API_BASE_URL}/auth/login`,
    LOGOUT: `${API_BASE_URL}/auth/logout`,
    VALIDATE: `${API_BASE_URL}/auth/validate`,
    SIGNIN: `${API_BASE_URL}/auth/signin`,
    SIGNOUT: `${API_BASE_URL}/auth/signout`,
  },
  
  // 用户管理
  USERS: {
    ME: `${API_BASE_URL}/users/me`,
    CHANGE_PASSWORD: `${API_BASE_URL}/users/change-password`,
    LIST: `${API_BASE_URL}/api/admin/users`,
    CREATE: `${API_BASE_URL}/api/admin/users`,
    GET: (id: string) => `${API_BASE_URL}/api/admin/users/${id}`,
    UPDATE: (id: string) => `${API_BASE_URL}/api/admin/users/${id}`,
    DELETE: (id: string) => `${API_BASE_URL}/api/admin/users/${id}`,
    PERMISSIONS: (id: string) => `${API_BASE_URL}/api/admin/users/${id}/permissions`,
    BATCH_PERMISSIONS: (id: string) => `${API_BASE_URL}/api/admin/users/${id}/permissions/batch`,
  },
  
  // 其他API
  GENERATE: `${API_BASE_URL}/generate`,
};

// 通用API请求函数
export async function apiRequest(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  // 获取认证token - 尝试多种方式
  let authToken = null;
  if (typeof window !== 'undefined') {
    // 尝试从localStorage获取token
    authToken = localStorage.getItem('next-auth.session-token') || 
                localStorage.getItem('__Secure-next-auth.session-token') ||
                localStorage.getItem('next-auth.csrf-token') ||
                localStorage.getItem('__Secure-next-auth.csrf-token');
    
    // 如果还是没有token，尝试从cookies获取
    if (!authToken) {
      const cookies = document.cookie.split(';');
      const sessionCookie = cookies.find(cookie => 
        cookie.trim().startsWith('next-auth.session-token=') ||
        cookie.trim().startsWith('__Secure-next-auth.session-token=')
      );
      if (sessionCookie) {
        authToken = sessionCookie.split('=')[1];
      }
    }
    
    // 如果还是没有token，尝试从sessionStorage获取
    if (!authToken) {
      authToken = sessionStorage.getItem('next-auth.session-token') || 
                  sessionStorage.getItem('__Secure-next-auth.session-token');
    }
    
    // 最后尝试从NextAuth的默认存储位置获取
    if (!authToken) {
      try {
        const nextAuthData = localStorage.getItem('next-auth.callback-url') || 
                            localStorage.getItem('next-auth.csrf-token');
        if (nextAuthData) {
          // 尝试解析NextAuth的数据
          const authData = JSON.parse(nextAuthData);
          if (authData && authData.token) {
            authToken = authData.token;
          }
        }
      } catch (error) {
        console.log('解析NextAuth数据失败:', error);
      }
    }
  }

  console.log('API请求认证信息:', {
    url,
    hasAuthToken: !!authToken,
    tokenLength: authToken?.length,
    hasCredentials: !!authToken
  });

  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
      ...options.headers,
    },
    // 根据是否有认证token决定是否包含credentials
    ...(authToken ? { credentials: 'include' } : {}),
    ...options,
  };

  return fetch(url, defaultOptions);
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