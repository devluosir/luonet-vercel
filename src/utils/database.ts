import { prisma } from '@/lib/prisma';

// 数据库性能监控工具
class DatabaseMonitor {
  private queryTimes: Map<string, number[]> = new Map();
  private slowQueryThreshold = 1000; // 1秒

  // 监控查询性能
  async monitorQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await queryFn();
      const duration = performance.now() - startTime;
      
      // 记录查询时间
      if (!this.queryTimes.has(queryName)) {
        this.queryTimes.set(queryName, []);
      }
      this.queryTimes.get(queryName)!.push(duration);
      
      // 检查慢查询
      if (duration > this.slowQueryThreshold) {
        console.warn(`🐌 慢查询: ${queryName} (${duration.toFixed(2)}ms)`);
      }
      
      // 开发环境下输出性能信息
      if (process.env.NODE_ENV === 'development') {
        console.log(`📊 查询性能: ${queryName} - ${duration.toFixed(2)}ms`);
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(`❌ 查询失败: ${queryName} (${duration.toFixed(2)}ms)`, error);
      throw error;
    }
  }

  // 获取查询统计信息
  getQueryStats() {
    const stats: Record<string, any> = {};
    
    this.queryTimes.forEach((times, queryName) => {
      if (times.length > 0) {
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        const max = Math.max(...times);
        const min = Math.min(...times);
        
        stats[queryName] = {
          count: times.length,
          average: avg.toFixed(2),
          max: max.toFixed(2),
          min: min.toFixed(2),
          slowQueries: times.filter(t => t > this.slowQueryThreshold).length
        };
      }
    });
    
    return stats;
  }

  // 检查数据库连接状态
  async checkConnection(): Promise<boolean> {
    try {
      const startTime = performance.now();
      await prisma.$queryRaw`SELECT 1`;
      const duration = performance.now() - startTime;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔗 数据库连接检查: ${duration.toFixed(2)}ms`);
      }
      
      return duration < 1000; // 连接时间应小于1秒
    } catch (error) {
      console.error('❌ 数据库连接检查失败:', error);
      return false;
    }
  }

  // 清理统计数据
  clearStats() {
    this.queryTimes.clear();
  }
}

export const databaseMonitor = new DatabaseMonitor();

// 数据库连接池状态监控
export const connectionPoolMonitor = {
  // 获取连接池状态
  async getPoolStatus() {
    try {
      // 这里可以添加更详细的连接池状态检查
      const isConnected = await databaseMonitor.checkConnection();
      return {
        connected: isConnected,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  },

  // 健康检查
  async healthCheck() {
    const status = await this.getPoolStatus();
    if (!status.connected) {
      console.error('🚨 数据库连接池健康检查失败');
    }
    return status;
  }
}; 