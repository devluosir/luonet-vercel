export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  keys(prefix?: string): Promise<string[]>;
  clear(): Promise<void>;
  size(): Promise<number>;
}

export interface StorageConfig {
  prefix?: string;
  version?: string;
  maxSize?: number; // MB
}

// 存储错误类型
export class StorageError extends Error {
  constructor(
    message: string,
    public code: 'QUOTA_EXCEEDED' | 'NOT_FOUND' | 'INVALID_DATA' | 'NETWORK_ERROR',
    public originalError?: Error
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

// 存储性能指标
export interface StorageMetrics {
  operation: 'get' | 'set' | 'remove' | 'clear';
  key: string;
  size?: number; // bytes
  duration: number; // ms
  success: boolean;
  error?: string;
  timestamp: number;
}

// 存储事件
export interface StorageEvent {
  type: 'change' | 'error' | 'quota_exceeded';
  key?: string;
  oldValue?: any;
  newValue?: any;
  error?: StorageError;
}

// 存储监听器
export type StorageListener = (event: StorageEvent) => void;
