import { NextResponse } from 'next/server';
import { databaseMonitor, connectionPoolMonitor } from '@/utils/database';

export async function GET() {
  try {
    // 获取数据库连接状态
    const poolStatus = await connectionPoolMonitor.getPoolStatus();
    
    // 获取查询统计信息
    const queryStats = databaseMonitor.getQueryStats();
    
    // 执行连接测试
    const connectionTest = await databaseMonitor.checkConnection();
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      database: {
        connection: {
          status: poolStatus.connected ? 'healthy' : 'unhealthy',
          responseTime: connectionTest ? '< 1000ms' : 'timeout',
          lastCheck: poolStatus.timestamp
        },
        pool: {
          status: poolStatus.connected ? 'active' : 'inactive',
          maxConnections: 10,
          minConnections: 2
        },
        queries: {
          total: Object.keys(queryStats).length,
          slowQueries: Object.values(queryStats).reduce((sum: number, stat: any) => sum + stat.slowQueries, 0),
          stats: queryStats
        }
      },
      performance: {
        slowQueryThreshold: '1000ms',
        connectionTimeout: '30s',
        maxRetries: 2
      }
    });
  } catch (error) {
    console.error('数据库监控API错误:', error);
    return NextResponse.json({
      error: '获取数据库状态失败',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 