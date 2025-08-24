/**
 * 客户管理模块埋点系统
 * 用于收集用户行为、性能指标和错误信息
 */

export interface AnalyticsEvent {
  name: string;
  category: 'user_action' | 'performance' | 'error' | 'feature_usage';
  properties?: Record<string, any>;
  timestamp: number;
  sessionId: string;
  userId?: string;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  context?: Record<string, any>;
}

export interface ErrorEvent {
  message: string;
  stack?: string;
  component?: string;
  action?: string;
  timestamp: number;
  sessionId: string;
}

// 埋点事件类型定义
export const ANALYTICS_EVENTS = {
  // 用户行为事件
  USER_ACTIONS: {
    SEARCH_CUSTOMER: 'search_customer',
    VIEW_CUSTOMER_DETAIL: 'view_customer_detail',
    CREATE_FOLLOW_UP: 'create_follow_up',
    COMPLETE_FOLLOW_UP: 'complete_follow_up',
    ADD_CUSTOMER: 'add_customer',
    EDIT_CUSTOMER: 'edit_customer',
    DELETE_CUSTOMER: 'delete_customer',
    SWITCH_TAB: 'switch_tab',
    USE_FEATURE: 'use_feature',
    SAVE_SEGMENT: 'save_segment',
    USE_SAVED_SEGMENT: 'use_saved_segment'
  },
  
  // 性能指标
  PERFORMANCE: {
    PAGE_LOAD: 'page_load',
    SEARCH_RESPONSE: 'search_response',
    TIMELINE_LOAD: 'timeline_load',
    FOLLOW_UP_LOAD: 'follow_up_load',
    INP: 'inp', // Interaction to Next Paint
    LCP: 'lcp', // Largest Contentful Paint
    CLS: 'cls', // Cumulative Layout Shift
    FID: 'fid'  // First Input Delay
  },
  
  // 错误事件
  ERRORS: {
    API_ERROR: 'api_error',
    VALIDATION_ERROR: 'validation_error',
    STORAGE_ERROR: 'storage_error',
    RENDER_ERROR: 'render_error',
    FEATURE_ERROR: 'feature_error'
  },
  
  // 功能使用事件
  FEATURE_USAGE: {
    TIMELINE_AGGREGATION: 'timeline_aggregation',
    SAVED_SEGMENTS: 'saved_segments',
    DEDUPE_SUGGESTIONS: 'dedupe_suggestions',
    BROADCAST_CHANNEL: 'broadcast_channel',
    INDEXED_DB: 'indexed_db'
  }
} as const;

// 埋点管理器
export class AnalyticsManager {
  private static instance: AnalyticsManager;
  private events: AnalyticsEvent[] = [];
  private performanceMetrics: PerformanceMetric[] = [];
  private errors: ErrorEvent[] = [];
  private sessionId: string;
  private userId?: string;
  private isEnabled: boolean = true;
  private batchSize: number = 10;
  private flushInterval: number = 30000; // 30秒
  private flushTimer?: NodeJS.Timeout;

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.startPeriodicFlush();
  }

  static getInstance(): AnalyticsManager {
    if (!AnalyticsManager.instance) {
      AnalyticsManager.instance = new AnalyticsManager();
    }
    return AnalyticsManager.instance;
  }

  // 生成会话ID
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 设置用户ID
  setUserId(userId: string): void {
    this.userId = userId;
  }

  // 启用/禁用埋点
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  // 记录用户行为事件
  trackEvent(
    name: string,
    category: AnalyticsEvent['category'] = 'user_action',
    properties?: Record<string, any>
  ): void {
    if (!this.isEnabled) return;

    const event: AnalyticsEvent = {
      name,
      category,
      properties,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId
    };

    this.events.push(event);
    this.checkBatchSize();
  }

  // 记录性能指标
  trackPerformance(
    name: string,
    value: number,
    unit: string = 'ms',
    context?: Record<string, any>
  ): void {
    if (!this.isEnabled) return;

    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      context
    };

    this.performanceMetrics.push(metric);
    this.checkBatchSize();
  }

  // 记录错误
  trackError(
    message: string,
    stack?: string,
    component?: string,
    action?: string
  ): void {
    if (!this.isEnabled) return;

    const error: ErrorEvent = {
      message,
      stack,
      component,
      action,
      timestamp: Date.now(),
      sessionId: this.sessionId
    };

    this.errors.push(error);
    this.checkBatchSize();
  }

  // 检查批量大小并触发发送
  private checkBatchSize(): void {
    const totalEvents = this.events.length + this.performanceMetrics.length + this.errors.length;
    if (totalEvents >= this.batchSize) {
      this.flush();
    }
  }

  // 开始定期发送
  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  // 发送数据
  private flush(): void {
    if (!this.isEnabled) return;

    const data = {
      events: [...this.events],
      performanceMetrics: [...this.performanceMetrics],
      errors: [...this.errors],
      sessionId: this.sessionId,
      userId: this.userId,
      timestamp: Date.now()
    };

    // 清空缓存
    this.events = [];
    this.performanceMetrics = [];
    this.errors = [];

    // 发送数据（这里可以根据实际需求配置发送目标）
    this.sendData(data);
  }

  // 发送数据到后端或分析服务
  private sendData(data: any): void {
    // 开发环境：输出到控制台
    if (process.env.NODE_ENV === 'development') {
      console.group('📊 Analytics Data');
      console.log('Session ID:', data.sessionId);
      console.log('User ID:', data.userId);
      console.log('Events:', data.events);
      console.log('Performance Metrics:', data.performanceMetrics);
      console.log('Errors:', data.errors);
      console.groupEnd();
    }

    // 生产环境：发送到分析服务
    if (process.env.NODE_ENV === 'production') {
      // 这里可以集成实际的分析服务，如 Google Analytics、Mixpanel 等
      // 或者发送到自己的后端API
      this.sendToAnalyticsService(data);
    }

    // 本地存储备份（可选）
    this.saveToLocalStorage(data);
  }

  // 发送到分析服务
  private sendToAnalyticsService(data: any): void {
    // 示例：发送到 Google Analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'customer_management_analytics', {
        custom_parameters: data
      });
    }

    // 示例：发送到自定义API
    fetch('/api/analytics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    }).catch(error => {
      console.error('Failed to send analytics data:', error);
    });
  }

  // 保存到本地存储
  private saveToLocalStorage(data: any): void {
    try {
      const key = `analytics_${Date.now()}`;
      localStorage.setItem(key, JSON.stringify(data));
      
      // 清理旧数据（保留最近100条）
      this.cleanupOldAnalytics();
    } catch (error) {
      console.warn('Failed to save analytics to localStorage:', error);
    }
  }

  // 清理旧的埋点数据
  private cleanupOldAnalytics(): void {
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('analytics_'));
      if (keys.length > 100) {
        keys.sort().slice(0, keys.length - 100).forEach(key => {
          localStorage.removeItem(key);
        });
      }
    } catch (error) {
      console.warn('Failed to cleanup old analytics:', error);
    }
  }

  // 获取统计数据
  getStats(): {
    eventsCount: number;
    performanceMetricsCount: number;
    errorsCount: number;
    sessionId: string;
    userId?: string;
  } {
    return {
      eventsCount: this.events.length,
      performanceMetricsCount: this.performanceMetrics.length,
      errorsCount: this.errors.length,
      sessionId: this.sessionId,
      userId: this.userId
    };
  }

  // 手动发送数据
  forceFlush(): void {
    this.flush();
  }

  // 销毁实例
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush();
  }
}

// 便捷函数
export const analytics = AnalyticsManager.getInstance();

// 性能监控
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private observers: Map<string, PerformanceObserver> = new Map();
  public isMonitoring: boolean = false;

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // 监控页面加载性能
  monitorPageLoad(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          analytics.trackPerformance('page_load', navigation.loadEventEnd - navigation.loadEventStart);
          analytics.trackPerformance('dom_content_loaded', navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart);
        }
      }, 0);
    });
  }

  // 监控交互性能
  monitorInteraction(): void {
    if (typeof window === 'undefined') return;

    // 检查浏览器是否支持 interaction 类型的 Performance Observer
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'interaction') {
              const interactionEntry = entry as any;
              analytics.trackPerformance('inp', interactionEntry.duration);
            }
          }
        });
        
        observer.observe({ entryTypes: ['interaction'] });
        this.observers.set('interaction', observer);
      } catch (error) {
        console.warn('Browser does not support interaction Performance Observer:', error);
      }
    }
  }

  // 监控布局偏移
  monitorLayoutShift(): void {
    if (typeof window === 'undefined') return;

    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          let clsValue = 0;
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'layout-shift') {
              const layoutShiftEntry = entry as any;
              if (!layoutShiftEntry.hadRecentInput) {
                clsValue += layoutShiftEntry.value;
              }
            }
          }
          analytics.trackPerformance('cls', clsValue);
        });
        
        observer.observe({ entryTypes: ['layout-shift'] });
        this.observers.set('layout-shift', observer);
      } catch (error) {
        console.warn('Browser does not support layout-shift Performance Observer:', error);
      }
    }
  }

  // 监控最大内容绘制
  monitorLCP(): void {
    if (typeof window === 'undefined') return;

    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'largest-contentful-paint') {
              analytics.trackPerformance('lcp', entry.startTime);
            }
          }
        });
        
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.set('largest-contentful-paint', observer);
      } catch (error) {
        console.warn('Browser does not support largest-contentful-paint Performance Observer:', error);
      }
    }
  }

  // 开始所有性能监控
  startMonitoring(): void {
    if (this.isMonitoring) {
      console.warn('Performance monitoring is already running');
      return;
    }
    
    try {
      this.monitorPageLoad();
      this.monitorInteraction();
      this.monitorLayoutShift();
      this.monitorLCP();
      this.isMonitoring = true;
    } catch (error) {
      console.warn('Failed to start performance monitoring:', error);
    }
  }

  // 停止监控
  stopMonitoring(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    this.isMonitoring = false;
  }
}

// 错误监控
export class ErrorMonitor {
  private static instance: ErrorMonitor;
  private listeners: { error: (event: globalThis.ErrorEvent) => void; unhandledrejection: (event: PromiseRejectionEvent) => void } | null = null;
  public isMonitoring: boolean = false;

  static getInstance(): ErrorMonitor {
    if (!ErrorMonitor.instance) {
      ErrorMonitor.instance = new ErrorMonitor();
    }
    return ErrorMonitor.instance;
  }

  // 开始错误监控
  startMonitoring(): void {
    if (this.isMonitoring) {
      console.warn('Error monitoring is already running');
      return;
    }
    
    if (typeof window === 'undefined') return;

    try {
      // 全局错误处理
      const errorHandler = (event: globalThis.ErrorEvent) => {
        analytics.trackError(
          event.message,
          (event as any).error?.stack,
          'global',
          'unhandled_error'
        );
      };

      // Promise 错误处理
      const rejectionHandler = (event: PromiseRejectionEvent) => {
        analytics.trackError(
          event.reason?.message || 'Unhandled Promise Rejection',
          event.reason?.stack,
          'global',
          'unhandled_rejection'
        );
      };

      window.addEventListener('error', errorHandler);
      window.addEventListener('unhandledrejection', rejectionHandler);
      
      this.listeners = { error: errorHandler, unhandledrejection: rejectionHandler };
      this.isMonitoring = true;
    } catch (error) {
      console.warn('Failed to start error monitoring:', error);
    }
  }

  // 停止错误监控
  stopMonitoring(): void {
    if (!this.isMonitoring || !this.listeners) return;
    
    if (typeof window !== 'undefined') {
      window.removeEventListener('error', this.listeners.error);
      window.removeEventListener('unhandledrejection', this.listeners.unhandledrejection);
    }
    
    this.listeners = null;
    this.isMonitoring = false;
  }
}

// 初始化分析系统
export function initializeAnalytics(): void {
  if (typeof window === 'undefined') return;

  try {
    // 初始化分析管理器
    const analyticsManager = AnalyticsManager.getInstance();
    
    // 初始化性能监控
    const performanceMonitor = PerformanceMonitor.getInstance();
    if (!performanceMonitor.isMonitoring) {
      performanceMonitor.startMonitoring();
    }
    
    // 初始化错误监控
    const errorMonitor = ErrorMonitor.getInstance();
    if (!errorMonitor.isMonitoring) {
      errorMonitor.startMonitoring();
    }
    
    // 开发环境调试信息
    if (process.env.NODE_ENV === 'development') {
      console.log('Analytics system initialized successfully');
    }
  } catch (error) {
    console.warn('Failed to initialize analytics system:', error);
  }
}

// 开发环境调试工具
if (process.env.NODE_ENV === 'development') {
  (window as any).__ANALYTICS__ = {
    analytics,
    performanceMonitor: PerformanceMonitor.getInstance(),
    errorMonitor: ErrorMonitor.getInstance(),
    initializeAnalytics
  };
}
