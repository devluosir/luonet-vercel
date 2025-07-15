// 性能监控工具
class PerformanceMonitor {
  private timers: Map<string, number> = new Map();
  private metrics: Map<string, any> = new Map();

  startTimer(name: string) {
    this.timers.set(name, performance.now());
  }

  endTimer(name: string): number {
    const startTime = this.timers.get(name);
    if (!startTime) {
      console.warn(`Timer ${name} was not started`);
      return 0;
    }
    
    const duration = performance.now() - startTime;
    this.timers.delete(name);
    this.metrics.set(name, duration);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
    }
    
    return duration;
  }

  getPageLoadMetrics() {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (!navigation) return {};
    
    return {
      dns: navigation.domainLookupEnd - navigation.domainLookupStart,
      tcp: navigation.connectEnd - navigation.connectStart,
      ttfb: navigation.responseStart - navigation.requestStart,
      download: navigation.responseEnd - navigation.responseStart,
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      load: navigation.loadEventEnd - navigation.loadEventStart,
      total: navigation.loadEventEnd - navigation.fetchStart,
    };
  }

  monitorResourceLoading() {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource') {
          const resource = entry as PerformanceResourceTiming;
          if (resource.duration > 1000) { // 超过1秒的资源
            console.warn(`🐌 慢资源加载: ${resource.name} (${resource.duration.toFixed(2)}ms)`);
          }
        }
      }
    });
    
    observer.observe({ entryTypes: ['resource'] });
  }

  monitorApiCalls() {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();
      let url = '';
      
      // 正确处理不同类型的fetch参数
      if (typeof args[0] === 'string') {
        url = args[0];
      } else if (args[0] instanceof Request) {
        url = args[0].url;
      } else if (args[0] instanceof URL) {
        url = args[0].toString();
      } else {
        url = 'unknown';
      }
      
      try {
        const response = await originalFetch(...args);
        const duration = performance.now() - startTime;
        
        if (duration > 2000) { // 超过2秒的API调用
          console.warn(`🐌 慢API调用: ${url} (${duration.toFixed(2)}ms)`);
        }
        
        return response;
      } catch (error) {
        const duration = performance.now() - startTime;
        console.error(`❌ API调用失败: ${url} (${duration.toFixed(2)}ms)`, error);
        throw error;
      }
    };
  }
}

// 性能优化工具
class PerformanceOptimizer {
  optimizeFontLoading() {
    // 预加载关键字体
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'font';
    link.type = 'font/woff2';
    link.href = '/fonts/NotoSansSC-Regular.ttf';
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  }

  cleanupUnusedResources() {
    // 清理未使用的定时器
    const originalSetTimeout = window.setTimeout;
    const originalSetInterval = window.setInterval;
    const timers = new Set<number>();
    
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
      timers.forEach(id => {
        clearTimeout(id);
        clearInterval(id);
      });
    });
  }

  optimizeImages() {
    // 懒加载图片
    if ('IntersectionObserver' in window) {
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
      
      document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
      });
    }
  }
}

export const performanceMonitor = new PerformanceMonitor();
export const optimizePerformance = new PerformanceOptimizer(); 