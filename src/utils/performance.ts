// requestIdleCallback polyfill for better browser compatibility
const safeRequestIdleCallback = (
  callback: () => void, 
  options?: { timeout?: number }
): void => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(callback, options);
  } else {
    // Fallback to setTimeout for unsupported browsers (e.g., Safari)
    setTimeout(callback, options?.timeout ? Math.min(options.timeout, 100) : 50);
  }
};

// 性能监控工具

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private enabled: boolean = process.env.NODE_ENV === 'development';

  /**
   * 开始性能监控
   */
  start(name: string): void {
    if (!this.enabled) return;
    
    this.metrics.set(name, {
      name,
      startTime: performance.now()
    });
  }

  /**
   * 结束性能监控
   */
  end(name: string): number | undefined {
    if (!this.enabled) return;
    
    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`性能监控指标 "${name}" 未找到`);
      return;
    }

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;
    
    console.log(`性能监控 [${name}]: ${metric.duration.toFixed(2)}ms`);
    return metric.duration;
  }

  /**
   * 监控异步函数性能
   */
  async monitor<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.start(name);
    try {
      const result = await fn();
      this.end(name);
      return result;
    } catch (error) {
      this.end(name);
      throw error;
    }
  }

  /**
   * 获取所有性能指标
   */
  getMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * 清除性能指标
   */
  clear(): void {
    this.metrics.clear();
  }

  /**
   * 启用/禁用性能监控
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}

// 创建全局性能监控实例
export const performanceMonitor = new PerformanceMonitor();

/**
 * 性能监控装饰器
 */
export function monitor(name: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      return performanceMonitor.monitor(name, () => originalMethod.apply(this, args));
    };
    
    return descriptor;
  };
}

/**
 * 监控PDF生成性能
 */
export async function monitorPdfGeneration<T>(
  name: string, 
  fn: () => Promise<T>
): Promise<T> {
  return performanceMonitor.monitor(`PDF生成-${name}`, fn);
}

// 性能优化工具
class PerformanceOptimizer {
  private fontPreloaded: boolean = false;

  optimizeFontLoading() {
    // 由于网页使用系统字体 (Arial, Helvetica, sans-serif)
    // NotoSans字体仅用于PDF生成，无需预加载
    // 移除不必要的字体预加载以提升性能
    console.log('🚀 使用系统字体，跳过字体预加载');
  }

  cleanupUnusedResources() {
    // 简化定时器清理逻辑，减少性能开销
    if (typeof window !== 'undefined') {
      const timers = new Set<number>();
      
      // 只在开发环境启用定时器跟踪
      if (process.env.NODE_ENV === 'development') {
        const originalSetTimeout = window.setTimeout;
        const originalSetInterval = window.setInterval;
        
        window.setTimeout = ((fn: (...args: any[]) => void, delay: number, ...args: any[]) => {
          const id = originalSetTimeout(fn, delay, ...args);
          timers.add(id);
          return id;
        }) as typeof window.setTimeout;
        
        window.setInterval = ((fn: (...args: any[]) => void, delay: number, ...args: any[]) => {
          const id = originalSetInterval(fn, delay, ...args);
          timers.add(id);
          return id;
        }) as typeof window.setInterval;
        
        // 页面卸载时清理
        window.addEventListener('beforeunload', () => {
          if (timers && timers.size > 0) {
            timers.forEach(id => {
              clearTimeout(id);
              clearInterval(id);
            });
          }
        }, { once: true });
      }
    }
  }

  optimizeImages() {
    // 延迟执行图片优化，避免阻塞主线程
    safeRequestIdleCallback(() => this.setupImageLazyLoading());
  }

  private setupImageLazyLoading() {
    // 懒加载图片
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        if (entries && entries.length > 0) {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const img = entry.target as HTMLImageElement;
              if (img.dataset.src) {
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                imageObserver.unobserve(img);
              }
            }
          });
        }
      });
      
      const images = document.querySelectorAll('img[data-src]');
      if (images && images.length > 0) {
        images.forEach(img => {
          imageObserver.observe(img);
        });
      }
    }
  }
}

export const optimizePerformance = new PerformanceOptimizer();
export { safeRequestIdleCallback }; 