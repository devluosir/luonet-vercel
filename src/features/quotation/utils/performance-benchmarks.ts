// 🚀 Notes功能性能基准测试和对比分析工具

import React from 'react';

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  threshold: number;
  status: 'good' | 'warning' | 'critical';
}

interface BenchmarkResult {
  componentName: string;
  metrics: PerformanceMetric[];
  timestamp: number;
  deviceInfo: {
    userAgent: string;
    memory?: number;
    hardwareConcurrency: number;
    connection?: any;
  };
}

class NotesPerformanceBenchmark {
  private results: BenchmarkResult[] = [];
  private observers: Map<string, PerformanceObserver> = new Map();

  constructor() {
    this.setupPerformanceObservers();
  }

  // 🚀 设置性能观察器
  private setupPerformanceObservers() {
    if (typeof window === 'undefined') return;

    // 监控渲染性能
    if ('PerformanceObserver' in window) {
      const renderObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name.includes('notes') || entry.name.includes('Notes')) {
            this.recordMetric('render-time', entry.duration, 'ms');
          }
        });
      });

      try {
        renderObserver.observe({ entryTypes: ['measure'] });
        this.observers.set('render', renderObserver);
      } catch (e) {
        console.warn('Performance Observer not supported for measures');
      }
    }
  }

  // 🚀 记录性能指标
  recordMetric(name: string, value: number, unit: string) {
    const thresholds: Record<string, number> = {
      'render-time': 16, // 60fps = 16.67ms per frame
      'update-time': 5,
      'drag-time': 10,
      'memory-usage': 50 * 1024 * 1024, // 50MB
      'bundle-size': 100 * 1024, // 100KB
      'first-paint': 1000, // 1s
      'interaction-time': 100, // 100ms
    };

    const threshold = thresholds[name] || value;
    const status: PerformanceMetric['status'] = 
      value <= threshold ? 'good' :
      value <= threshold * 1.5 ? 'warning' : 'critical';

    const metric: PerformanceMetric = {
      name,
      value: Math.round(value * 100) / 100,
      unit,
      threshold,
      status,
    };

    // 记录到控制台（开发模式）
    if (process.env.NODE_ENV === 'development') {
      const emoji = status === 'good' ? '✅' : status === 'warning' ? '⚠️' : '❌';
      console.log(`${emoji} [NotesPerf] ${name}: ${metric.value}${unit} (threshold: ${threshold}${unit})`);
    }

    return metric;
  }

  // 🚀 开始性能测试
  async startBenchmark(componentName: string): Promise<() => BenchmarkResult> {
    const startTime = performance.now();
    const startMemory = (performance as any).memory?.usedJSHeapSize || 0;

    // 标记开始
    performance.mark(`${componentName}-start`);

    return () => {
      // 标记结束
      performance.mark(`${componentName}-end`);
      performance.measure(
        `${componentName}-duration`,
        `${componentName}-start`,
        `${componentName}-end`
      );

      const endTime = performance.now();
      const endMemory = (performance as any).memory?.usedJSHeapSize || 0;

      const metrics: PerformanceMetric[] = [
        this.recordMetric('total-time', endTime - startTime, 'ms'),
        this.recordMetric('memory-delta', endMemory - startMemory, 'bytes'),
      ];

      // 添加渲染特定指标
      if (componentName.toLowerCase().includes('notes')) {
        metrics.push(
          this.recordMetric('render-time', endTime - startTime, 'ms'),
          this.recordMetric('memory-usage', endMemory, 'bytes')
        );
      }

      const result: BenchmarkResult = {
        componentName,
        metrics,
        timestamp: Date.now(),
        deviceInfo: {
          userAgent: navigator.userAgent,
          memory: (performance as any).memory?.usedJSHeapSize,
          hardwareConcurrency: navigator.hardwareConcurrency,
          connection: (navigator as any).connection,
        },
      };

      this.results.push(result);
      return result;
    };
  }

  // 🚀 测试组件渲染性能
  async benchmarkRender(
    componentName: string,
    renderFn: () => void,
    iterations = 10
  ): Promise<PerformanceMetric[]> {
    const results: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const endBenchmark = await this.startBenchmark(`${componentName}-render-${i}`);
      
      await new Promise(resolve => {
        // 使用 requestAnimationFrame 确保在下一帧测量
        requestAnimationFrame(() => {
          renderFn();
          requestAnimationFrame(() => {
            const result = endBenchmark();
            const renderMetric = result.metrics.find(m => m.name === 'render-time');
            if (renderMetric) {
              results.push(renderMetric.value);
            }
            resolve(undefined);
          });
        });
      });
    }

    const avg = results.reduce((a, b) => a + b, 0) / results.length;
    const min = Math.min(...results);
    const max = Math.max(...results);
    const p95 = results.sort((a, b) => a - b)[Math.floor(results.length * 0.95)];

    return [
      this.recordMetric('avg-render-time', avg, 'ms'),
      this.recordMetric('min-render-time', min, 'ms'),
      this.recordMetric('max-render-time', max, 'ms'),
      this.recordMetric('p95-render-time', p95, 'ms'),
    ];
  }

  // 🚀 测试拖拽性能
  async benchmarkDragOperation(
    componentName: string,
    dragFn: () => Promise<void>
  ): Promise<PerformanceMetric[]> {
    const endBenchmark = await this.startBenchmark(`${componentName}-drag`);
    
    const startTime = performance.now();
    await dragFn();
    const endTime = performance.now();
    
    const result = endBenchmark();
    const dragTime = endTime - startTime;
    
    return [
      this.recordMetric('drag-operation-time', dragTime, 'ms'),
      ...result.metrics,
    ];
  }

  // 🚀 对比分析
  compareResults(baseline: BenchmarkResult[], optimized: BenchmarkResult[]): {
    improvements: Array<{
      metric: string;
      baselineValue: number;
      optimizedValue: number;
      improvement: number;
      improvementPercent: number;
    }>;
    summary: {
      totalImprovements: number;
      averageImprovement: number;
      significantImprovements: number;
    };
  } {
    const improvements: any[] = [];
    
    baseline.forEach(baselineResult => {
      const optimizedResult = optimized.find(r => r.componentName === baselineResult.componentName);
      if (!optimizedResult) return;

      baselineResult.metrics.forEach(baselineMetric => {
        const optimizedMetric = optimizedResult.metrics.find(m => m.name === baselineMetric.name);
        if (!optimizedMetric) return;

        const improvement = baselineMetric.value - optimizedMetric.value;
        const improvementPercent = (improvement / baselineMetric.value) * 100;

        improvements.push({
          metric: `${baselineResult.componentName}.${baselineMetric.name}`,
          baselineValue: baselineMetric.value,
          optimizedValue: optimizedMetric.value,
          improvement,
          improvementPercent,
        });
      });
    });

    const positiveImprovements = improvements.filter(i => i.improvement > 0);
    const significantImprovements = positiveImprovements.filter(i => i.improvementPercent > 10);

    return {
      improvements,
      summary: {
        totalImprovements: positiveImprovements.length,
        averageImprovement: positiveImprovements.reduce((sum, i) => sum + i.improvementPercent, 0) / positiveImprovements.length || 0,
        significantImprovements: significantImprovements.length,
      },
    };
  }

  // 🚀 生成性能报告
  generateReport(): {
    results: BenchmarkResult[];
    summary: {
      totalTests: number;
      averageRenderTime: number;
      memoryUsage: number;
      criticalIssues: number;
    };
    recommendations: string[];
  } {
    const summary = {
      totalTests: this.results.length,
      averageRenderTime: 0,
      memoryUsage: 0,
      criticalIssues: 0,
    };

    const recommendations: string[] = [];

    // 计算汇总统计
    let totalRenderTime = 0;
    let renderTimeCount = 0;
    let totalMemory = 0;
    let memoryCount = 0;

    this.results.forEach(result => {
      result.metrics.forEach(metric => {
        if (metric.name.includes('render-time')) {
          totalRenderTime += metric.value;
          renderTimeCount++;
        }
        if (metric.name.includes('memory')) {
          totalMemory += metric.value;
          memoryCount++;
        }
        if (metric.status === 'critical') {
          summary.criticalIssues++;
        }
      });
    });

    summary.averageRenderTime = renderTimeCount > 0 ? totalRenderTime / renderTimeCount : 0;
    summary.memoryUsage = memoryCount > 0 ? totalMemory / memoryCount : 0;

    // 生成建议
    if (summary.averageRenderTime > 16) {
      recommendations.push('渲染时间过长，建议优化组件渲染逻辑或使用 React.memo');
    }
    if (summary.memoryUsage > 50 * 1024 * 1024) {
      recommendations.push('内存使用量过高，检查是否存在内存泄漏');
    }
    if (summary.criticalIssues > 0) {
      recommendations.push(`发现 ${summary.criticalIssues} 个严重性能问题，需要立即处理`);
    }
    if (recommendations.length === 0) {
      recommendations.push('性能表现良好，继续保持！');
    }

    return {
      results: this.results,
      summary,
      recommendations,
    };
  }

  // 🚀 清理资源
  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    this.results = [];
  }
}

// 🚀 性能测试工具函数
export const createNotesPerformanceTest = () => {
  const benchmark = new NotesPerformanceBenchmark();
  
  return {
    // 测试渲染性能
    testRender: (componentName: string, renderFn: () => void, iterations = 10) =>
      benchmark.benchmarkRender(componentName, renderFn, iterations),
    
    // 测试拖拽性能
    testDrag: (componentName: string, dragFn: () => Promise<void>) =>
      benchmark.benchmarkDragOperation(componentName, dragFn),
    
    // 开始测试
    start: (componentName: string) => benchmark.startBenchmark(componentName),
    
    // 对比结果
    compare: (baseline: BenchmarkResult[], optimized: BenchmarkResult[]) =>
      benchmark.compareResults(baseline, optimized),
    
    // 生成报告
    report: () => benchmark.generateReport(),
    
    // 清理
    cleanup: () => benchmark.cleanup(),
  };
};

// 🚀 React Hook for performance testing
export const useNotesPerformanceTesting = () => {
  const [isRunning, setIsRunning] = React.useState(false);
  const [results, setResults] = React.useState<BenchmarkResult[]>([]);
  const benchmarkRef = React.useRef<NotesPerformanceBenchmark>();

  React.useEffect(() => {
    benchmarkRef.current = new NotesPerformanceBenchmark();
    return () => benchmarkRef.current?.cleanup();
  }, []);

  const runTest = React.useCallback(async (
    testName: string,
    testFn: () => void | Promise<void>
  ) => {
    if (!benchmarkRef.current || isRunning) return;

    setIsRunning(true);
    try {
      const endBenchmark = await benchmarkRef.current.startBenchmark(testName);
      await testFn();
      const result = endBenchmark();
      setResults(prev => [...prev, result]);
      return result;
    } finally {
      setIsRunning(false);
    }
  }, [isRunning]);

  const generateReport = React.useCallback(() => {
    return benchmarkRef.current?.generateReport();
  }, []);

  return {
    isRunning,
    results,
    runTest,
    generateReport,
    clearResults: () => setResults([]),
  };
};

// 🚀 导出默认实例
export const notesPerformanceTester = createNotesPerformanceTest();

// 🚀 预定义的测试场景
export const testScenarios = {
  // 基础渲染测试
  basicRender: {
    name: 'Notes基础渲染',
    test: (renderFn: () => void) => notesPerformanceTester.testRender('BasicNotes', renderFn),
  },
  
  // 大量Notes渲染测试
  heavyRender: {
    name: 'Notes大量条目渲染',
    test: (renderFn: () => void) => notesPerformanceTester.testRender('HeavyNotes', renderFn, 5),
  },
  
  // 拖拽性能测试
  dragPerformance: {
    name: 'Notes拖拽性能',
    test: (dragFn: () => Promise<void>) => notesPerformanceTester.testDrag('DragNotes', dragFn),
  },
  
  // 移动端触摸测试
  mobileTouch: {
    name: 'Notes移动端触摸',
    test: (touchFn: () => void) => notesPerformanceTester.testRender('MobileNotes', touchFn),
  },
};

export default NotesPerformanceBenchmark;
