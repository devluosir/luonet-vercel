import type { BaseDocument } from '../types';

// 基础服务接口
export interface BaseDocumentService<T extends BaseDocument> {
  // CRUD 操作
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
  getById(id: string): Promise<T>;
  list(params?: ListParams): Promise<ListResult<T>>;
  
  // 特殊操作
  duplicate(id: string): Promise<T>;
  export(id: string, format: 'pdf' | 'excel'): Promise<Blob>;
  preview(id: string): Promise<string>;
}

// 列表参数
export interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

// 列表结果
export interface ListResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 基础服务实现
export abstract class BaseDocumentServiceImpl<T extends BaseDocument> implements BaseDocumentService<T> {
  protected baseUrl: string;
  protected documentType: string;

  constructor(baseUrl: string, documentType: string) {
    this.baseUrl = baseUrl;
    this.documentType = documentType;
  }

  // 通用API调用方法
  protected async apiCall<TResult>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<TResult> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
    };

    const response = await fetch(url, {
      ...defaultOptions,
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API调用失败: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // 创建文档
  async create(data: Partial<T>): Promise<T> {
    return this.apiCall<T>(`/${this.documentType}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // 更新文档
  async update(id: string, data: Partial<T>): Promise<T> {
    return this.apiCall<T>(`/${this.documentType}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // 删除文档
  async delete(id: string): Promise<void> {
    await this.apiCall(`/${this.documentType}/${id}`, {
      method: 'DELETE',
    });
  }

  // 获取文档
  async getById(id: string): Promise<T> {
    return this.apiCall<T>(`/${this.documentType}/${id}`);
  }

  // 获取文档列表
  async list(params: ListParams = {}): Promise<ListResult<T>> {
    const searchParams = new URLSearchParams();
    
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.search) searchParams.append('search', params.search);
    if (params.sortBy) searchParams.append('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.append('sortOrder', params.sortOrder);
    
    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString());
        }
      });
    }

    const queryString = searchParams.toString();
    const url = `/${this.documentType}${queryString ? `?${queryString}` : ''}`;
    
    return this.apiCall<ListResult<T>>(url);
  }

  // 复制文档
  async duplicate(id: string): Promise<T> {
    return this.apiCall<T>(`/${this.documentType}/${id}/duplicate`, {
      method: 'POST',
    });
  }

  // 导出文档
  async export(id: string, format: 'pdf' | 'excel'): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/${this.documentType}/${id}/export?format=${format}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`导出失败: ${response.status} ${response.statusText}`);
    }

    return response.blob();
  }

  // 预览文档
  async preview(id: string): Promise<string> {
    const response = await this.apiCall<{ previewUrl: string }>(`/${this.documentType}/${id}/preview`);
    return response.previewUrl;
  }

  // 本地存储操作
  protected saveToLocalStorage(key: string, data: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.warn('本地存储失败:', error);
    }
  }

  protected loadFromLocalStorage<TData>(key: string): TData | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.warn('本地存储读取失败:', error);
      return null;
    }
  }

  protected removeFromLocalStorage(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('本地存储删除失败:', error);
    }
  }
}
