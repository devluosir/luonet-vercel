import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { ensurePdfFont } from './pdfFontRegistry';
import { logHealthcheck, logPdfGenerated } from './pdfLogger';

// SLA 阈值定义
const HEALTH_THRESHOLDS = {
  EXCELLENT: 800,   // <800ms: 通过
  WARNING: 1200,    // 800-1200ms: 警告
  CRITICAL: 2000,   // >1200ms: 失败
} as const;

// 健康检查结果缓存（开发模式下避免重复检查）
let healthcheckResult: { 
  success: boolean; 
  duration: number; 
  status: 'excellent' | 'warning' | 'critical';
  details: string;
  pdfSize: number;
} | null = null;

/**
 * PDF字体健康检查 - 带阈值和错误分级
 * 检查字体注册、setFont、AutoTable、Blob生成全链路
 */
export async function pdfFontHealthcheck(skipCache = false): Promise<{ 
  success: boolean; 
  duration: number; 
  status: 'excellent' | 'warning' | 'critical';
  details: string;
  pdfSize: number;
}> {
  // 开发模式下复用缓存结果，避免重复检查
  if (!skipCache && healthcheckResult && process.env.NODE_ENV === 'development') {
    console.log('[healthcheck] 复用缓存结果，跳过重复检查');
    return healthcheckResult;
  }
  const t0 = performance.now();
  const errors: string[] = [];
  const warnings: string[] = [];
  let pdfSize = 0;

  try {
    console.log('[healthcheck] 开始PDF字体健康检查...');
    
    // 1. 创建PDF文档
    const doc = new jsPDF({ compress: true });
    
    // 2. 确保字体可用（带回退保护）
    await ensurePdfFont(doc);
    
    // 3. 检查字体列表
    const list = doc.getFontList();
    if (!list['NotoSansSC']?.includes('normal') || !list['NotoSansSC']?.includes('bold')) {
      warnings.push(`NotoSansSC 注册可能不完整: ${JSON.stringify(list['NotoSansSC'])}`);
    } else {
      console.log('[healthcheck] 字体注册成功:', list['NotoSansSC']);
    }
    
    // 4. 测试 setFont & 文本渲染
    doc.setFont('NotoSansSC', 'normal');
    doc.setFontSize(12);
    doc.text('字体正常（normal）', 10, 20);
    
    doc.setFont('NotoSansSC', 'bold');
    doc.text('字体正常（bold）', 10, 30);
    
    // 5. 测试 AutoTable（捕获布局警告但不失败）
    const originalConsoleWarn = console.warn;
    const tableWarnings: string[] = [];
    console.warn = (...args) => {
      const message = args.join(' ');
      if (message.includes('Of the table content') || message.includes('table width')) {
        tableWarnings.push(message);
      } else {
        originalConsoleWarn(...args);
      }
    };

    try {
      (doc as any).autoTable({
        styles: { 
          font: 'NotoSansSC', 
          fontStyle: 'normal', 
          fontSize: 9 
        },
        headStyles: { 
          font: 'NotoSansSC', 
          fontStyle: 'bold' 
        },
        head: [['测试列1', '测试列2', '测试列3']],
        body: [
          ['行1-列1', '行1-列2', '行1-列3'],
          ['行2-列1', '行2-列2', '行2-列3']
        ],
        startY: 40
      });
    } finally {
      console.warn = originalConsoleWarn;
    }

    // 将 AutoTable 布局警告归类为 warning，不是 error
    if (tableWarnings.length > 0) {
      warnings.push(`AutoTable 布局提示: ${tableWarnings.length} 条`);
      console.log('[healthcheck] AutoTable 布局提示:', tableWarnings);
    }
    
    // 6. 生成PDF Blob
    const blob = doc.output('blob');
    if (!blob || blob.size === 0) {
      throw new Error('PDF生成失败：输出为空');
    }
    
    pdfSize = blob.size;
    const duration = performance.now() - t0;
    
    // 7. 根据耗时判断状态
    let status: 'excellent' | 'warning' | 'critical';
    if (duration < HEALTH_THRESHOLDS.EXCELLENT) {
      status = 'excellent';
    } else if (duration < HEALTH_THRESHOLDS.WARNING) {
      status = 'warning';
      warnings.push(`耗时 ${duration.toFixed(1)}ms 超过优秀阈值 (${HEALTH_THRESHOLDS.EXCELLENT}ms)`);
    } else {
      status = 'critical';
      errors.push(`耗时 ${duration.toFixed(1)}ms 超过警告阈值 (${HEALTH_THRESHOLDS.WARNING}ms)`);
    }
    
    // 8. 检查PDF大小
    if (blob.size < 1000) {
      warnings.push(`生成的PDF文件过小 (${blob.size} bytes)，可能有问题`);
    }
    
    const success = errors.length === 0;
    const healthStatus = success ? (status === 'excellent' ? 'pass' : 'warn') : 'fail';
    const details = `生成 ${blob.size} bytes PDF，${warnings.length} 个警告，${errors.length} 个错误`;
    
    logHealthcheck(healthStatus, duration, details);
    logPdfGenerated(blob.size, duration);
    
    const result = {
      success,
      duration,
      status,
      details,
      pdfSize
    };
    
    // 缓存成功的健康检查结果
    if (success && process.env.NODE_ENV === 'development') {
      healthcheckResult = result;
    }
    
    return result;
    
  } catch (error) {
    const duration = performance.now() - t0;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    logHealthcheck('fail', duration, `失败: ${errorMessage}`);
    
    return {
      success: false,
      duration,
      status: 'critical',
      details: `失败: ${errorMessage}`,
      pdfSize: 0
    };
  }
}

/**
 * 开发环境自动健康检查
 */
export function runHealthcheckInDev(): void {
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    // 延迟执行，确保应用完全初始化
    setTimeout(async () => {
      try {
        const result = await pdfFontHealthcheck();
        if (!result.success) {
          console.error('[healthcheck] 开发环境健康检查失败:', result.details);
        } else {
          console.log('[healthcheck] 开发环境健康检查通过:', result.details);
        }
      } catch (error) {
        console.error('[healthcheck] 开发环境健康检查异常:', error);
      }
    }, 3000);
  }
}

/**
 * CI环境健康检查（严格模式）
 */
export async function runHealthcheckInCI(): Promise<void> {
  const result = await pdfFontHealthcheck();
  
  if (!result.success) {
    throw new Error(`PDF字体健康检查失败: ${result.details}`);
  }
  
  console.log(`CI健康检查通过: ${result.details}`);
}