// 性能监控工具
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private thresholds: Map<string, number> = new Map();

  constructor() {
    // 设置性能阈值
    this.thresholds.set('font-warmup', 200); // 字体预热阈值 200ms
    this.thresholds.set('pdf-generation', 300); // PDF生成阈值 300ms
    this.thresholds.set('table-generation', 150); // 表格生成阈值 150ms
  }

  /**
   * 开始计时
   */
  start(name: string): string {
    const startTime = performance.now();
    const id = `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 存储开始时间
    (window as any)[`perf_${id}`] = startTime;
    
    return id;
  }

  /**
   * 结束计时并记录
   */
  end(id: string, name: string): number {
    const startTime = (window as any)[`perf_${id}`];
    if (!startTime) {
      console.warn(`性能监控: 未找到开始时间 ${id}`);
      return 0;
    }

    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // 记录指标
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(duration);
    
    // 检查阈值
    const threshold = this.thresholds.get(name);
    if (threshold && duration > threshold) {
      console.warn(`[性能警告] ${name}: ${duration.toFixed(2)}ms (阈值: ${threshold}ms)`);
    } else {
      console.log(`[性能监控] ${name}: ${duration.toFixed(2)}ms`);
    }
    
    // 清理
    delete (window as any)[`perf_${id}`];
    
    return duration;
  }

  /**
   * 获取性能统计
   */
  getStats(name: string): {
    count: number;
    avg: number;
    min: number;
    max: number;
    latest: number;
  } | null {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) return null;

    const sum = values.reduce((a, b) => a + b, 0);
    return {
      count: values.length,
      avg: sum / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      latest: values[values.length - 1]
    };
  }

  /**
   * 获取所有统计
   */
  getAllStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    this.metrics.forEach((_, name) => {
      stats[name] = this.getStats(name);
    });
    return stats;
  }

  /**
   * 清除统计数据
   */
  clear(): void {
    this.metrics.clear();
  }

  /**
   * 打印性能报告
   */
  printReport(): void {
    console.log('=== 性能监控报告 ===');
    const stats = this.getAllStats();
    
    for (const [name, stat] of Object.entries(stats)) {
      if (stat) {
        const threshold = this.thresholds.get(name);
        const status = threshold && stat.avg > threshold ? '⚠️' : '✅';
        console.log(`${status} ${name}:`);
        console.log(`  平均: ${stat.avg.toFixed(2)}ms`);
        console.log(`  最小: ${stat.min.toFixed(2)}ms`);
        console.log(`  最大: ${stat.max.toFixed(2)}ms`);
        console.log(`  次数: ${stat.count}`);
        if (threshold) {
          console.log(`  阈值: ${threshold}ms`);
        }
        console.log('');
      }
    }
  }
}

// 全局性能监控实例
export const performanceMonitor = new PerformanceMonitor();

// 便捷函数
export const startTimer = (name: string) => performanceMonitor.start(name);
export const endTimer = (id: string, name: string) => performanceMonitor.end(id, name);
export const getStats = (name: string) => performanceMonitor.getStats(name);
export const printReport = () => performanceMonitor.printReport();
