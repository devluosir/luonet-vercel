'use client';

import { useEffect, useState } from 'react';

interface PerformanceMetrics {
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  ttfb: number; // Time to First Byte
  domLoad: number; // DOM Content Loaded
  windowLoad: number; // Window Load
}

export default function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 只在开发环境显示
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    const measurePerformance = () => {
      const newMetrics: PerformanceMetrics = {
        fcp: 0,
        lcp: 0,
        fid: 0,
        cls: 0,
        ttfb: 0,
        domLoad: 0,
        windowLoad: 0,
      };

      // 测量 FCP (First Contentful Paint)
      if ('PerformanceObserver' in window) {
        const fcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
          if (fcpEntry) {
            newMetrics.fcp = fcpEntry.startTime;
          }
        });
        fcpObserver.observe({ entryTypes: ['paint'] });

        // 测量 LCP (Largest Contentful Paint)
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          if (lastEntry) {
            newMetrics.lcp = lastEntry.startTime;
          }
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

        // 测量 FID (First Input Delay)
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            // 修复类型错误，使用类型断言
            const firstInputEntry = entry as PerformanceEventTiming;
            if (firstInputEntry.processingStart && firstInputEntry.startTime) {
              newMetrics.fid = firstInputEntry.processingStart - firstInputEntry.startTime;
            }
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });

        // 测量 CLS (Cumulative Layout Shift)
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          newMetrics.cls = clsValue;
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      }

      // 测量其他指标
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        newMetrics.ttfb = navigation.responseStart - navigation.requestStart;
        // 修复类型错误，使用正确的属性名
        newMetrics.domLoad = navigation.domContentLoadedEventEnd - navigation.fetchStart;
        newMetrics.windowLoad = navigation.loadEventEnd - navigation.fetchStart;
      }

      // 延迟更新，确保所有指标都被收集
      setTimeout(() => {
        setMetrics(newMetrics);
        setIsVisible(true);
      }, 1000);
    };

    // 页面加载完成后测量性能
    if (document.readyState === 'complete') {
      measurePerformance();
    } else {
      window.addEventListener('load', measurePerformance);
      return () => window.removeEventListener('load', measurePerformance);
    }
  }, []);

  if (!isVisible || !metrics) {
    return null;
  }

  const getScore = (value: number, threshold: number) => {
    if (value <= threshold) return '🟢';
    if (value <= threshold * 1.5) return '🟡';
    return '🔴';
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 max-w-xs z-50">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">性能监控</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          ×
        </button>
      </div>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">FCP:</span>
          <span className="font-mono">
            {getScore(metrics.fcp, 1800)} {metrics.fcp.toFixed(0)}ms
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">LCP:</span>
          <span className="font-mono">
            {getScore(metrics.lcp, 2500)} {metrics.lcp.toFixed(0)}ms
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">FID:</span>
          <span className="font-mono">
            {getScore(metrics.fid, 100)} {metrics.fid.toFixed(0)}ms
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">CLS:</span>
          <span className="font-mono">
            {getScore(metrics.cls, 0.1)} {metrics.cls.toFixed(3)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">TTFB:</span>
          <span className="font-mono">
            {getScore(metrics.ttfb, 600)} {metrics.ttfb.toFixed(0)}ms
          </span>
        </div>
      </div>
    </div>
  );
} 