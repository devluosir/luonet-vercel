// API 配置
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://udb.luocompany.net';

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
    LIST: `${API_BASE_URL}/admin/users`,
    CREATE: `${API_BASE_URL}/admin/users`,
    GET: (id: string) => `${API_BASE_URL}/admin/users/${id}`,
    UPDATE: (id: string) => `${API_BASE_URL}/admin/users/${id}`,
    DELETE: (id: string) => `${API_BASE_URL}/admin/users/${id}`,
    PERMISSIONS: (id: string) => `${API_BASE_URL}/admin/users/${id}/permissions`,
    BATCH_PERMISSIONS: (id: string) => `${API_BASE_URL}/admin/users/${id}/permissions/batch`,
  },
  
  // 其他API
  GENERATE: `${API_BASE_URL}/generate`,
};

// 通用API请求函数
export async function apiRequest(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
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