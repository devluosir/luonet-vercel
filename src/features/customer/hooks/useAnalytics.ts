/**
 * 埋点Hook
 * 用于在组件中集成埋点功能
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  AnalyticsManager,
  PerformanceMonitor,
  ErrorMonitor,
  initializeAnalytics
} from '../services/analytics';
import { isFeatureEnabled } from '../config/featureFlags';

// 全局初始化标志
let isAnalyticsInitialized = false;

// 定义分析事件类型
const ANALYTICS_EVENTS = {
  PAGE_LOAD: 'page_load',
  USER_ACTION: 'user_action',
  PERFORMANCE: 'performance',
  ERROR: 'error',
  FEATURE_USAGE: 'feature_usage'
} as const;

export function useAnalytics() {
  const isInitializedRef = useRef(false);
  const { data: session } = useSession();
  const [isClient, setIsClient] = useState(false);

  // 确保在客户端渲染
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 初始化埋点系统 - 只在客户端且功能开关启用时初始化一次
  useEffect(() => {
    if (typeof window === 'undefined' || isInitializedRef.current || !isFeatureEnabled('performanceMonitoring') || !isClient) {
      return;
    }

    try {
      if (!isAnalyticsInitialized) {
        initializeAnalytics();
        isAnalyticsInitialized = true;
      }
      isInitializedRef.current = true;
    } catch (error) {
      console.warn('Failed to initialize analytics:', error);
    }
  }, [isClient]);

  // 跟踪用户行为
  const trackUserAction = useCallback((
    action: string,
    properties?: Record<string, any>
  ) => {
    if (isFeatureEnabled('performanceMonitoring') && isClient) {
      AnalyticsManager.getInstance().trackEvent(action, ANALYTICS_EVENTS.USER_ACTION, properties);
    }
  }, [isClient]);

  // 跟踪性能指标
  const trackPerformance = useCallback((
    metric: string,
    value: number,
    unit?: string,
    context?: Record<string, any>
  ) => {
    if (isFeatureEnabled('performanceMonitoring') && isClient) {
      AnalyticsManager.getInstance().trackPerformance(metric, value, unit, context);
    }
  }, [isClient]);

  // 跟踪错误
  const trackError = useCallback((
    message: string,
    stack?: string,
    component?: string,
    action?: string
  ) => {
    if (isFeatureEnabled('performanceMonitoring') && isClient) {
      AnalyticsManager.getInstance().trackError(message, stack, component, action);
    }
  }, [isClient]);

  // 跟踪功能使用
  const trackFeatureUsage = useCallback((
    feature: string,
    properties?: Record<string, any>
  ) => {
    if (isFeatureEnabled('performanceMonitoring') && isClient) {
      AnalyticsManager.getInstance().trackEvent(feature, ANALYTICS_EVENTS.FEATURE_USAGE, properties);
    }
  }, [isClient]);

  // 页面加载性能监控
  const trackPageLoad = useCallback((loadTime: number) => {
    if (isFeatureEnabled('performanceMonitoring') && isClient) {
      AnalyticsManager.getInstance().trackPerformance('page_load_time', loadTime, 'ms');
      AnalyticsManager.getInstance().trackEvent('page_loaded', 'performance', {
        loadTime,
        url: window.location.href,
        userAgent: navigator.userAgent
      });
    }
  }, [isClient]);

  // 搜索行为跟踪
  const trackSearch = useCallback((query: string, resultsCount: number) => {
    trackUserAction('search', { query, resultsCount });
  }, [trackUserAction]);

  // 查看客户详情
  const trackViewCustomerDetail = useCallback((customerId: string, customerName: string) => {
    trackUserAction('view_customer_detail', { customerId, customerName });
  }, [trackUserAction]);

  // 添加客户
  const trackAddCustomer = useCallback((customerType: string) => {
    trackUserAction('add_customer', { customerType });
  }, [trackUserAction]);

  // 编辑客户
  const trackEditCustomer = useCallback((customerId: string, customerType: string) => {
    trackUserAction('edit_customer', { customerId, customerType });
  }, [trackUserAction]);

  // 删除客户
  const trackDeleteCustomer = useCallback((customerId: string, customerType: string) => {
    trackUserAction('delete_customer', { customerId, customerType });
  }, [trackUserAction]);

  // 验证错误
  const trackValidationError = useCallback((field: string, error: string) => {
    trackError(`Validation error: ${field}`, undefined, 'form', 'validation');
  }, [trackError]);

  // API错误
  const trackApiError = useCallback((endpoint: string, status: number, message: string) => {
    trackError(`API Error: ${endpoint}`, undefined, 'api', 'request');
  }, [trackError]);

  // 切换标签页
  const trackSwitchTab = useCallback((tabName: string) => {
    trackUserAction('switch_tab', { tabName });
  }, [trackUserAction]);

  return {
    // 核心跟踪方法
    trackUserAction,
    trackPerformance,
    trackError,
    trackFeatureUsage,

    // 页面加载跟踪
    trackPageLoad,

    // 具体业务跟踪方法
    trackSearch,
    trackViewCustomerDetail,
    trackAddCustomer,
    trackEditCustomer,
    trackDeleteCustomer,
    trackValidationError,
    trackApiError,
    trackSwitchTab,

    // 工具方法
    getAnalyticsStats: () => AnalyticsManager.getInstance().getStats(),
    forceFlush: () => AnalyticsManager.getInstance().forceFlush(),
    isEnabled: isFeatureEnabled('performanceMonitoring')
  };
}

// 性能监控Hook
export function usePerformanceMonitoring() {
  useEffect(() => {
    if (isFeatureEnabled('performanceMonitoring')) {
      PerformanceMonitor.getInstance().startMonitoring();

      return () => {
        PerformanceMonitor.getInstance().stopMonitoring();
      };
    }
  }, []);
}

// 错误监控Hook
export function useErrorMonitoring() {
  useEffect(() => {
    if (isFeatureEnabled('performanceMonitoring')) {
      ErrorMonitor.getInstance().startMonitoring();
    }
  }, []);
}

// 自动性能监控Hook
export function useAutoPerformanceMonitoring() {
  const isInitializedRef = useRef(false);
  const [isClient, setIsClient] = useState(false);

  // 确保在客户端渲染
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 只在功能开关启用时启动监控，避免重复初始化
  useEffect(() => {
    if (typeof window === 'undefined' || isInitializedRef.current || !isFeatureEnabled('performanceMonitoring') || !isClient) {
      return;
    }

    try {
      const performanceMonitor = PerformanceMonitor.getInstance();
      const errorMonitor = ErrorMonitor.getInstance();

      if (!performanceMonitor.isMonitoring) {
        performanceMonitor.startMonitoring();
      }
      if (!errorMonitor.isMonitoring) {
        errorMonitor.startMonitoring();
      }

      isInitializedRef.current = true;

      return () => {
        performanceMonitor.stopMonitoring();
        errorMonitor.stopMonitoring();
      };
    } catch (error) {
      console.warn('Failed to start performance monitoring:', error);
    }
  }, [isClient]);
}
