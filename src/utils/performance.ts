// 性能监控工具
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // 开始计时
  startTimer(name: string): void {
    this.metrics.set(`${name}_start`, performance.now());
  }

  // 结束计时并记录
  endTimer(name: string): number {
    const startTime = this.metrics.get(`${name}_start`);
    if (!startTime) {
      console.warn(`Timer ${name} was not started`);
      return 0;
    }

    const endTime = performance.now();
    const duration = endTime - startTime;
    
    this.metrics.set(`${name}_duration`, duration);
    this.metrics.delete(`${name}_start`);

    // 在开发环境下输出性能数据
    if (process.env.NODE_ENV === 'development') {
      console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
    }

    return duration;
  }

  // 获取页面加载性能指标
  getPageLoadMetrics(): Record<string, number> {
    if (typeof window === 'undefined') return {};

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (!navigation) return {};

    return {
      dns: navigation.domainLookupEnd - navigation.domainLookupStart,
      tcp: navigation.connectEnd - navigation.connectStart,
      ttfb: navigation.responseStart - navigation.requestStart,
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
      loadComplete: navigation.loadEventEnd - navigation.fetchStart,
    };
  }

  // 监控资源加载
  monitorResourceLoading(): void {
    if (typeof window === 'undefined') return;

    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'resource') {
          const resourceEntry = entry as PerformanceResourceTiming;
          if (resourceEntry.duration > 1000) { // 超过1秒的资源
            console.warn(`🐌 慢资源加载: ${resourceEntry.name} (${resourceEntry.duration.toFixed(2)}ms)`);
          }
        }
      });
    });

    observer.observe({ entryTypes: ['resource'] });
  }

  // 预加载关键资源
  preloadCriticalResources(): void {
    if (typeof window === 'undefined') return;

    const criticalResources = [
      '/logo/logo.png',
      '/fonts/NotoSansSC-Regular.ttf',
      '/fonts/NotoSansSC-Bold.ttf'
    ];

    criticalResources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = resource.endsWith('.ttf') ? 'font' : 'image';
      link.href = resource;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });
  }

  // 优化图片加载
  optimizeImageLoading(): void {
    if (typeof window === 'undefined') return;

    // 使用 Intersection Observer 实现图片懒加载
    const imageObserver = new IntersectionObserver((entries) => {
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
    });

    // 观察所有带有 data-src 属性的图片
    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });
  }
}

// 导出单例实例
export const performanceMonitor = PerformanceMonitor.getInstance();

// 性能优化工具函数
export const optimizePerformance = {
  // 延迟加载非关键资源
  deferNonCriticalResources: () => {
    if (typeof window === 'undefined') return;

    // 延迟加载非关键CSS
    const nonCriticalCSS = document.querySelectorAll('link[rel="stylesheet"][data-non-critical]');
    nonCriticalCSS.forEach(link => {
      link.setAttribute('media', 'print');
      link.setAttribute('onload', "this.media='all'");
    });
  },

  // 优化字体加载
  optimizeFontLoading: () => {
    if (typeof window === 'undefined') return;

    // 使用 Font Loading API
    if ('fonts' in document) {
      document.fonts.ready.then(() => {
        document.documentElement.classList.add('fonts-loaded');
      });
    }
  },

  // 清理未使用的资源
  cleanupUnusedResources: () => {
    if (typeof window === 'undefined') return;

    // 清理过期的 localStorage 数据
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.includes('temp_') || key.includes('cache_')) {
        const timestamp = localStorage.getItem(`${key}_timestamp`);
        if (timestamp && Date.now() - parseInt(timestamp) > 24 * 60 * 60 * 1000) {
          localStorage.removeItem(key);
          localStorage.removeItem(`${key}_timestamp`);
        }
      }
    });
  }
}; 