/**
 * 权限系统日志工具
 * 统一管理权限相关的日志输出
 */

export interface PermissionLogData {
  userId?: string;
  username?: string;
  isAdmin?: boolean;
  permissionsCount?: number;
  moduleId?: string;
  action?: string;
  error?: any;
  [key: string]: any;
}

/**
 * 权限系统日志记录器
 * @param action 操作描述
 * @param data 相关数据
 */
export const logPermission = (action: string, data: PermissionLogData = {}) => {
  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    action,
    ...data
  };
  
  console.log(`[权限系统] ${action}`, logData);
  
  // 在开发环境下，可以添加更详细的日志
  if (process.env.NODE_ENV === 'development') {
    console.group(`[权限系统] ${action}`);
    console.log('时间:', timestamp);
    console.log('数据:', data);
    console.groupEnd();
  }
};

/**
 * 权限错误日志记录器
 * @param action 操作描述
 * @param error 错误信息
 * @param context 上下文数据
 */
export const logPermissionError = (action: string, error: any, context: PermissionLogData = {}) => {
  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    action,
    error: error instanceof Error ? error.message : error,
    stack: error instanceof Error ? error.stack : undefined,
    ...context
  };
  
  console.warn(`[权限系统] ${action} - 错误`, logData);
  
  // 在开发环境下，显示完整错误信息
  if (process.env.NODE_ENV === 'development') {
    console.group(`[权限系统] ${action} - 错误详情`);
    console.error('错误:', error);
    console.log('上下文:', context);
    console.groupEnd();
  }
};

/**
 * 权限性能日志记录器
 * @param action 操作描述
 * @param startTime 开始时间
 * @param data 相关数据
 */
export const logPermissionPerformance = (action: string, startTime: number, data: PermissionLogData = {}) => {
  const duration = Date.now() - startTime;
  const logData = {
    duration: `${duration}ms`,
    ...data
  };
  
  if (duration > 1000) {
    // 超过1秒的操作记录为警告
    console.warn(`[权限系统] ${action} - 性能警告`, logData);
  } else {
    logPermission(`${action} - 完成`, logData);
  }
}; 