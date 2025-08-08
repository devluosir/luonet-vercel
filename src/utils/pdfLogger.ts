/**
 * PDF相关关键日志控制器
 * 保留关键的性能和状态日志，便于线上排障
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface PDFLogConfig {
  enabled: boolean;
  level: LogLevel;
  preserveKeys: string[];
}

// 生产环境保留关键日志
const LOG_CONFIG: PDFLogConfig = {
  enabled: true,
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  preserveKeys: [
    'cache-hit',       // 缓存命中
    'cache-miss',      // 缓存未命中
    'bytes-loaded',    // 字节数据加载
    'instance-reg',    // 实例级注册
    'pdf-generated',   // PDF生成完成
    'healthcheck',     // 健康检查
    'font-fallback',   // 字体回退
    'performance',     // 性能指标
  ]
};

class PDFLogger {
  private shouldLog(level: LogLevel, key?: string): boolean {
    if (!LOG_CONFIG.enabled) return false;
    
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevel = levels.indexOf(LOG_CONFIG.level);
    const targetLevel = levels.indexOf(level);
    
    if (targetLevel < currentLevel) return false;
    
    // 关键日志始终保留
    if (key && LOG_CONFIG.preserveKeys.includes(key)) return true;
    
    return true;
  }

  debug(key: string, message: string, ...args: any[]) {
    if (this.shouldLog('debug', key)) {
      console.log(`[PDF:${key}] ${message}`, ...args);
    }
  }

  info(key: string, message: string, ...args: any[]) {
    if (this.shouldLog('info', key)) {
      console.log(`[PDF:${key}] ${message}`, ...args);
    }
  }

  warn(key: string, message: string, ...args: any[]) {
    if (this.shouldLog('warn', key)) {
      console.warn(`[PDF:${key}] ${message}`, ...args);
    }
  }

  error(key: string, message: string, ...args: any[]) {
    if (this.shouldLog('error', key)) {
      console.error(`[PDF:${key}] ${message}`, ...args);
    }
  }

  // 性能日志（始终保留关键指标）
  performance(operation: string, duration: number, metadata?: Record<string, any>) {
    if (this.shouldLog('info', 'performance')) {
      const meta = metadata ? ` | ${JSON.stringify(metadata)}` : '';
      console.log(`[PDF:performance] ${operation}: ${duration.toFixed(2)}ms${meta}`);
    }
  }

  // 缓存状态日志
  cacheHit(key: string, size: number) {
    this.info('cache-hit', `缓存命中: ${key} (~${Math.round(size/1024)}KB)`);
  }

  cacheMiss(key: string, loadTime: number) {
    this.info('cache-miss', `缓存未命中: ${key}, 加载耗时: ${loadTime.toFixed(2)}ms`);
  }

  // 字体状态日志
  fontRegistered(instanceCount: number, duration: number) {
    this.info('instance-reg', `实例注册完成: #${instanceCount}, 耗时: ${duration.toFixed(2)}ms`);
  }

  fontFallback(reason: string) {
    this.warn('font-fallback', `字体回退: ${reason}`);
  }

  // PDF生成日志
  pdfGenerated(size: number, duration: number) {
    this.info('pdf-generated', `PDF生成完成: ${size} bytes, 耗时: ${duration.toFixed(2)}ms`);
  }

  // 健康检查日志
  healthcheck(status: 'pass' | 'warn' | 'fail', duration: number, details: string) {
    const level = status === 'fail' ? 'error' : status === 'warn' ? 'warn' : 'info';
    this[level]('healthcheck', `健康检查${status}: ${duration.toFixed(2)}ms | ${details}`);
  }
}

export const pdfLogger = new PDFLogger();

// 便捷函数
export const logCacheHit = (key: string, size: number) => pdfLogger.cacheHit(key, size);
export const logCacheMiss = (key: string, loadTime: number) => pdfLogger.cacheMiss(key, loadTime);
export const logFontRegistered = (duration: number) => pdfLogger.fontRegistered(1, duration);
export const logFontFallback = (reason: string) => pdfLogger.fontFallback(reason);
export const logPdfGenerated = (size: number, duration: number) => pdfLogger.pdfGenerated(size, duration);
export const logHealthcheck = (status: 'pass' | 'warn' | 'fail', duration: number, details: string) => 
  pdfLogger.healthcheck(status, duration, details);
export const logPerformance = (operation: string, duration: number, metadata?: Record<string, any>) => 
  pdfLogger.performance(operation, duration, metadata);
