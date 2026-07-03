/**
 * 事件采样日志工具
 * 用于追踪频繁的store写入操作，帮助定位性能问题
 */

interface LogEntry {
  action: string;
  keys: string[];
  timestamp: number;
}

class EventSampler {
  private logs: LogEntry[] = [];
  private timer: NodeJS.Timeout | null = null;
  private readonly flushInterval = 500; // 500ms内合并输出

  public log(action: string, data: unknown) {
    if (process.env.NODE_ENV !== 'development') return;

    const keys = data && typeof data === 'object' ? Object.keys(data) : [];
    this.logs.push({
      action,
      keys,
      timestamp: Date.now(),
    });

    this.scheduleFlush();
  }

  private scheduleFlush() {
    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.timer = setTimeout(() => {
      this.flush();
    }, this.flushInterval);
  }

  private flush() {
    if (this.logs.length === 0) return;

    // 按action分组统计
    const grouped = this.logs.reduce((acc, log) => {
      if (!acc[log.action]) {
        acc[log.action] = {
          count: 0,
          keys: new Set<string>(),
          firstTime: log.timestamp,
          lastTime: log.timestamp,
        };
      }

      acc[log.action].count++;
      log.keys.forEach(key => acc[log.action].keys.add(key));
      acc[log.action].lastTime = log.timestamp;

      return acc;
    }, {} as Record<string, {
      count: number;
      keys: Set<string>;
      firstTime: number;
      lastTime: number;
    }>);

    // 输出汇总日志
    console.group('📊 Store Events Summary (last 500ms)');
    Object.entries(grouped).forEach(([action, stats]) => {
      const duration = stats.lastTime - stats.firstTime;
      const keysArray = Array.from(stats.keys);

      console.log(`${action}:`, {
        count: stats.count,
        duration: `${duration}ms`,
        keys: keysArray,
        frequency: duration > 0 ? `${(stats.count / duration * 1000).toFixed(1)}/s` : 'instant'
      });
    });
    console.groupEnd();

    // 清空日志
    this.logs = [];
    this.timer = null;
  }
}

export const eventSampler = new EventSampler();
