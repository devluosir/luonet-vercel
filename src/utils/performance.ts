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

interface PerformanceMemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

type PerformanceWithMemory = Performance & {
  memory?: PerformanceMemoryInfo;
};

interface PageLoadMetrics {
  categories: ReturnType<PerformanceMonitor['getCategoryStats']>;
  navigation: {
    domContentLoaded: number;
    loadComplete: number;
    ttfb: number;
    domInteractive: number;
  } | null;
  memory: PerformanceMemoryInfo | null;
}

// 性能监控指标分级系统
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, { startTime: number; category: string }> = new Map();
  private categories: Map<string, number[]> = new Map();

  // 性能阈值配置
  private thresholds = {
    loading: 50,      // 加载阶段 > 50ms 警告（首次 ≤ 120ms 可告警不拦截）
    registration: 15,  // 注册阶段 > 15ms 警告（首次 ≤ 40ms）
    generation: 350,   // PDF生成核心 > 350ms 警告（调整为更现实的阈值）
    'preview-mount': 1200  // 预览挂载 > 1200ms 警告（首次预览可能较慢）
  };

  // 冷启动检测状态
  private coldStartDetected = {
    generation: true  // 首次生成视为冷启动
  };

  private constructor() {}

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // 开始监控
  start(name: string, category: 'loading' | 'registration' | 'generation' | 'preview-mount'): string {
    const id = `${category}_${name}_${Date.now()}`;
    this.metrics.set(id, { startTime: performance.now(), category });
    return id;
  }

  // 动态阈值计算（支持模式和冷启动）
  private getThreshold(category: string, context?: { mode?: 'preview' | 'export' | 'final'; operation?: string }): number {
    const baseThreshold = this.thresholds[category as keyof typeof this.thresholds] || 1000;

    if (category === 'generation' && context) {
      const isColdStart = this.coldStartDetected.generation;
      const mode = context.mode || 'preview';

      // 分模式阈值策略
      if (mode === 'preview') {
        return isColdStart ? 400 : 350; // 预览模式：冷启动400ms，热启动350ms
      } else if (mode === 'export' || mode === 'final') {
        return isColdStart ? 500 : 450; // 导出模式：冷启动500ms，热启动450ms
      }
    }

    return baseThreshold;
  }

  // 结束监控（支持上下文信息）
  end(id: string, context?: { mode?: 'preview' | 'export' | 'final'; operation?: string }): number {
    const metric = this.metrics.get(id);
    if (!metric) {
      console.warn(`性能监控指标未找到: ${id}`);
      return 0;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;
    const category = metric.category;
    const threshold = this.getThreshold(category, context);

    // 标记冷启动完成
    if (category === 'generation' && this.coldStartDetected.generation) {
      this.coldStartDetected.generation = false;
    }

    // 记录到分类统计
    if (!this.categories.has(category)) {
      this.categories.set(category, []);
    }
    this.categories.get(category)!.push(duration);

    // 性能告警（带上下文信息）
    const contextInfo = context ? ` [${context.mode || 'default'}${this.coldStartDetected.generation ? ',冷启动' : ''}]` : '';
    if (duration > threshold) {
      console.warn(`⚠️ 性能告警 [${id}]${contextInfo}: ${duration.toFixed(2)}ms > ${threshold}ms 阈值`);
    } else {
      console.log(`✅ 性能正常 [${id}]${contextInfo}: ${duration.toFixed(2)}ms`);
    }

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
  setThreshold(category: 'loading' | 'registration' | 'generation' | 'preview-mount', threshold: number): void {
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
  getPageLoadMetrics(): PageLoadMetrics {
    const stats = this.getCategoryStats();

    // 添加页面加载相关的性能指标
    const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const memory = (performance as PerformanceWithMemory).memory;

    const pageMetrics = {
      categories: stats,
      navigation: navigationTiming ? {
        domContentLoaded: navigationTiming.domContentLoadedEventEnd - navigationTiming.fetchStart,
        loadComplete: navigationTiming.loadEventEnd - navigationTiming.fetchStart,
        ttfb: navigationTiming.responseStart - navigationTiming.requestStart,
        domInteractive: navigationTiming.domInteractive - navigationTiming.fetchStart
      } : null,
      memory: memory ? {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      } : null
    };

    return pageMetrics;
  }

  // 监控异步函数执行时间（支持上下文）
  async monitor<T>(
    name: string,
    fn: () => Promise<T>,
    category: 'loading' | 'registration' | 'generation' | 'preview-mount' = 'generation',
    context?: { mode?: 'preview' | 'export' | 'final'; operation?: string }
  ): Promise<T> {
    const id = this.start(name, category);
    try {
      const result = await fn();
      this.end(id, context);
      return result;
    } catch (error) {
      this.end(id, context);
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
  return function (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (this: unknown, ...args: unknown[]) {
      return performanceMonitor.monitor(name, () => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}

/**
 * 监控PDF生成核心性能（只包含PDF生成，不包含UI挂载）
 */
export async function monitorPdfGeneration<T>(
  name: string,
  fn: () => Promise<T>,
  context?: { mode?: 'preview' | 'export' | 'final'; operation?: string }
): Promise<T> {
  return performanceMonitor.monitor(`PDF生成核心-${name}`, fn, 'generation', context);
}

/**
 * 监控PDF预览挂载性能（包含UI渲染、iframe/object挂载等）
 */
export async function monitorPreviewMount<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  return performanceMonitor.monitor(`预览挂载-${name}`, fn, 'preview-mount');
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

        window.setTimeout = ((fn: TimerHandler, delay?: number, ...args: unknown[]) => {
          const id = originalSetTimeout(fn, delay, ...args);
          timers.add(id);
          return id;
        }) as typeof window.setTimeout;

        window.setInterval = ((fn: TimerHandler, delay?: number, ...args: unknown[]) => {
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
