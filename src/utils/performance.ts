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

// 性能监控指标分级系统
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, { startTime: number; category: string }> = new Map();
  private categories: Map<string, number[]> = new Map();

  // 性能阈值配置
  private thresholds = {
    loading: 50,      // 加载阶段 > 50ms 警告（首次 ≤ 120ms 可告警不拦截）
    registration: 15,  // 注册阶段 > 15ms 警告（首次 ≤ 40ms）
    generation: 200    // 生成阶段 > 200ms 警告（表格复杂场景 ≤ 350ms）
  };

  private constructor() {}

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // 开始监控
  start(name: string, category: 'loading' | 'registration' | 'generation'): string {
    const id = `${category}_${name}_${Date.now()}`;
    this.metrics.set(id, { startTime: performance.now(), category });
    return id;
  }

  // 结束监控
  end(id: string): number {
    const metric = this.metrics.get(id);
    if (!metric) {
      console.warn(`性能监控指标未找到: ${id}`);
      return 0;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;
    
    // 检查是否超过阈值
    const threshold = this.thresholds[metric.category as keyof typeof this.thresholds];
    if (duration > threshold) {
      console.warn(`⚠️ 性能警告 [${metric.category}] [${id}]: ${duration.toFixed(2)}ms (阈值: ${threshold}ms)`);
    }
    
    // 记录到分类统计
    if (!this.categories.has(metric.category)) {
      this.categories.set(metric.category, []);
    }
    this.categories.get(metric.category)!.push(duration);

    // 输出监控日志
    console.log(`性能监控 [${metric.category}] [${id}]: ${duration.toFixed(2)}ms`);
    
    // 清理指标
    this.metrics.delete(id);
    
    return duration;
  }

  // 获取分类统计
  getCategoryStats(): Record<string, { count: number; avg: number; min: number; max: number; threshold: number }> {
    const stats: Record<string, { count: number; avg: number; min: number; max: number; threshold: number }> = {};
    
    this.categories.forEach((durations, category) => {
      const count = durations.length;
      const avg = durations.reduce((sum, d) => sum + d, 0) / count;
      const min = Math.min(...durations);
      const max = Math.max(...durations);
      const threshold = this.thresholds[category as keyof typeof this.thresholds];
      
      stats[category] = { count, avg, min, max, threshold };
    });
    
    return stats;
  }

  // 输出性能报告
  printReport(): void {
    const stats = this.getCategoryStats();
    console.log('=== PDF性能监控报告 ===');
    
    Object.entries(stats).forEach(([category, stat]) => {
      const thresholdStatus = stat.avg > stat.threshold ? '⚠️ 超阈值' : '✅ 正常';
      console.log(`${category} ${thresholdStatus}:`);
      console.log(`  执行次数: ${stat.count}`);
      console.log(`  平均耗时: ${stat.avg.toFixed(2)}ms (阈值: ${stat.threshold}ms)`);
      console.log(`  最小耗时: ${stat.min.toFixed(2)}ms`);
      console.log(`  最大耗时: ${stat.max.toFixed(2)}ms`);
    });
    
    console.log('=======================');
  }

  // 设置阈值
  setThreshold(category: 'loading' | 'registration' | 'generation', threshold: number): void {
    this.thresholds[category] = threshold;
  }

  // 清理所有数据
  clear(): void {
    this.metrics.clear();
    this.categories.clear();
  }

  // 兼容性方法 - 用于页面加载监控
  startTimer(name: string): string {
    return this.start(name, 'loading');
  }

  endTimer(name: string): number {
    // 查找对应的metric
    const matchingKey = Array.from(this.metrics.keys()).find(key => key.includes(name));
    if (matchingKey) {
      return this.end(matchingKey);
    }
    console.warn(`性能监控: 未找到对应的计时器 ${name}`);
    return 0;
  }

  // 获取页面加载性能指标
  getPageLoadMetrics(): Record<string, any> {
    const stats = this.getCategoryStats();
    
    // 添加页面加载相关的性能指标
    const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    const pageMetrics = {
      categories: stats,
      navigation: navigationTiming ? {
        domContentLoaded: navigationTiming.domContentLoadedEventEnd - navigationTiming.fetchStart,
        loadComplete: navigationTiming.loadEventEnd - navigationTiming.fetchStart,
        ttfb: navigationTiming.responseStart - navigationTiming.requestStart,
        domInteractive: navigationTiming.domInteractive - navigationTiming.fetchStart
      } : null,
      memory: (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
      } : null
    };
    
    return pageMetrics;
  }

  // 监控异步函数执行时间
  async monitor<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const id = this.start(name, 'generation');
    try {
      const result = await fn();
      this.end(id);
      return result;
    } catch (error) {
      this.end(id);
      throw error;
    }
  }
}

// 便捷函数
export const performanceMonitor = PerformanceMonitor.getInstance();

// 分类监控函数
export const monitorLoading = (name: string) => performanceMonitor.start(name, 'loading');
export const monitorRegistration = (name: string) => performanceMonitor.start(name, 'registration');
export const monitorGeneration = (name: string) => performanceMonitor.start(name, 'generation');

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

/**
 * 监控字体字节串加载性能
 */
export async function monitorFontBytesLoading<T>(
  name: string, 
  fn: () => Promise<T>
): Promise<T> {
  return performanceMonitor.monitor(`字体字节串加载-${name}`, fn);
}

/**
 * 监控字体注册性能
 */
export async function monitorFontRegistration<T>(
  name: string, 
  fn: () => Promise<T>
): Promise<T> {
  return performanceMonitor.monitor(`字体注册-${name}`, fn);
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