import { StorageAdapter, StorageConfig, StorageError, StorageMetrics, StorageEvent, StorageListener } from './StorageAdapter';

export class LocalStorageAdapter implements StorageAdapter {
  private config: StorageConfig;
  private listeners: Map<string, StorageListener[]> = new Map();
  private metrics: StorageMetrics[] = [];

  constructor(config: StorageConfig = {}) {
    this.config = {
      prefix: 'customer_mgmt_',
      version: '1.0.0',
      maxSize: 10, // 10MB
      ...config
    };
  }

  private getFullKey(key: string): string {
    return `${this.config.prefix}${key}`;
  }

  private measureOperation<T>(
    operation: StorageMetrics['operation'],
    key: string,
    fn: () => T
  ): T {
    const startTime = performance.now();
    const startSize = this.getCurrentSize();
    
    try {
      const result = fn();
      const endTime = performance.now();
      const endSize = this.getCurrentSize();
      
      this.recordMetric({
        operation,
        key,
        size: endSize - startSize,
        duration: endTime - startTime,
        success: true,
        timestamp: Date.now()
      });
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      
      this.recordMetric({
        operation,
        key,
        duration: endTime - startTime,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now()
      });
      
      throw error;
    }
  }

  private recordMetric(metric: StorageMetrics): void {
    this.metrics.push(metric);
    
    // 保持最近1000条指标
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  private getCurrentSize(): number {
    let totalSize = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.config.prefix!)) {
        totalSize += localStorage.getItem(key)?.length || 0;
      }
    }
    return totalSize;
  }

  private emitEvent(event: StorageEvent): void {
    const listeners = this.listeners.get(event.type) || [];
    listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Storage listener error:', error);
      }
    });
  }

  async get<T>(key: string): Promise<T | null> {
    return this.measureOperation('get', key, () => {
      try {
        const fullKey = this.getFullKey(key);
        const item = localStorage.getItem(fullKey);
        
        if (item === null) {
          return null;
        }
        
        const parsed = JSON.parse(item);
        
        // 检查版本兼容性
        if (parsed._version && parsed._version !== this.config.version) {
          console.warn(`Data version mismatch for key ${key}: expected ${this.config.version}, got ${parsed._version}`);
        }
        
        return parsed.data;
      } catch (error) {
        throw new StorageError(
          `Failed to get data for key ${key}`,
          'INVALID_DATA',
          error instanceof Error ? error : new Error(String(error))
        );
      }
    });
  }

  async set<T>(key: string, value: T): Promise<void> {
    return this.measureOperation('set', key, () => {
      try {
        const fullKey = this.getFullKey(key);
        const dataToStore = {
          data: value,
          _version: this.config.version,
          _timestamp: Date.now()
        };
        
        const serialized = JSON.stringify(dataToStore);
        const currentSize = this.getCurrentSize();
        const newSize = currentSize + serialized.length;
        
        // 检查存储配额
        if (newSize > (this.config.maxSize! * 1024 * 1024)) {
          throw new StorageError(
            `Storage quota exceeded. Current: ${(currentSize / 1024 / 1024).toFixed(2)}MB, Max: ${this.config.maxSize}MB`,
            'QUOTA_EXCEEDED'
          );
        }
        
        const oldValue = localStorage.getItem(fullKey);
        localStorage.setItem(fullKey, serialized);
        
        this.emitEvent({
          type: 'change',
          key,
          oldValue: oldValue ? JSON.parse(oldValue).data : undefined,
          newValue: value
        });
      } catch (error) {
        if (error instanceof StorageError) {
          throw error;
        }
        throw new StorageError(
          `Failed to set data for key ${key}`,
          'INVALID_DATA',
          error instanceof Error ? error : new Error(String(error))
        );
      }
    });
  }

  async remove(key: string): Promise<void> {
    return this.measureOperation('remove', key, () => {
      try {
        const fullKey = this.getFullKey(key);
        const oldValue = localStorage.getItem(fullKey);
        localStorage.removeItem(fullKey);
        
        if (oldValue) {
          this.emitEvent({
            type: 'change',
            key,
            oldValue: JSON.parse(oldValue).data,
            newValue: undefined
          });
        }
      } catch (error) {
        throw new StorageError(
          `Failed to remove data for key ${key}`,
          'NOT_FOUND',
          error instanceof Error ? error : new Error(String(error))
        );
      }
    });
  }

  async keys(prefix?: string): Promise<string[]> {
    const keys: string[] = [];
    const searchPrefix = prefix ? this.getFullKey(prefix) : this.config.prefix!;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(searchPrefix)) {
        // 移除配置前缀，返回原始key
        const originalKey = key.substring(this.config.prefix!.length);
        keys.push(originalKey);
      }
    }
    
    return keys;
  }

  async clear(): Promise<void> {
    return this.measureOperation('clear', 'all', () => {
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.config.prefix!)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });
      
      this.emitEvent({
        type: 'change',
        key: 'all'
      });
    });
  }

  async size(): Promise<number> {
    return this.getCurrentSize();
  }

  // 监听存储变化
  addEventListener(type: string, listener: StorageListener): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(listener);
  }

  removeEventListener(type: string, listener: StorageListener): void {
    const listeners = this.listeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // 获取性能指标
  getMetrics(): StorageMetrics[] {
    return [...this.metrics];
  }

  // 清理性能指标
  clearMetrics(): void {
    this.metrics = [];
  }

  // 获取存储使用情况
  getStorageInfo(): {
    used: number;
    max: number;
    percentage: number;
    keys: number;
  } {
    const used = this.getCurrentSize();
    const max = this.config.maxSize! * 1024 * 1024;
    const keys = this.keys().then(keys => keys.length);
    
    return {
      used,
      max,
      percentage: (used / max) * 100,
      keys: 0 // 异步获取，这里返回0
    };
  }
}
