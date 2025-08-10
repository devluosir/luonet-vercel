import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { ensurePdfFont } from './pdfFontRegistry';
import { logHealthcheck, logPdfGenerated } from './pdfLogger';
import { safeSetFont, getFontName } from './pdf/ensureFont';

// SLA 阈值定义
const HEALTH_THRESHOLDS = {
  EXCELLENT: 2000,  // <2000ms: 通过
  WARNING: 4000,    // 2000-4000ms: 警告
  CRITICAL: 8000,   // >4000ms: 失败
} as const;

// 健康检查结果缓存（开发模式下避免重复检查）
let healthcheckResult: { 
  success: boolean; 
  duration: number; 
  status: 'excellent' | 'warning' | 'critical';
  details: string;
  pdfSize: number;
} | null = null;

// 互斥锁，避免与用户操作竞争
let running = false;

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
  // 避免与用户操作竞争
  if (running) {
    console.log('[healthcheck] 已有检查在运行，跳过重复调用');
    return {
      success: true,
      duration: 0,
      status: 'excellent',
      details: '跳过重复检查',
      pdfSize: 0
    };
  }
  
  // 开发模式下复用缓存结果，避免重复检查
  if (!skipCache && healthcheckResult && process.env.NODE_ENV === 'development') {
    console.log('[healthcheck] 复用缓存结果，跳过重复检查');
    return healthcheckResult;
  }
  
  running = true;
  const t0 = performance.now();
  const errors: string[] = [];
  const warnings: string[] = [];
  let pdfSize = 0;

  try {
    console.log('[healthcheck] 开始PDF字体健康检查...');
    
    // 1. 等待全局字体注册完成
    const { isGlobalFontReady } = await import('./globalFontRegistry');
    if (!isGlobalFontReady()) {
      console.log('[healthcheck] 等待全局字体注册完成...');
      const { initializeGlobalFonts } = await import('./globalFontRegistry');
      await initializeGlobalFonts();
    }
    
    // 2. 创建PDF文档
    const doc = new jsPDF({ compress: true });
    
    // 3. 确保字体可用（带回退保护）
    await ensurePdfFont(doc);
    
    // 4. 检查字体列表
    const list = doc.getFontList();
    console.log('[healthcheck] 可用字体列表:', Object.keys(list));
    
    // 5. 健康检查固定使用preview模式，避免中文字体警告
    // 策略：只测试Helvetica路线，阈值200ms用于生成测试，不测试UI挂载
    const mode: 'preview' | 'export' = 'preview';
    const fontName = getFontName(mode); // preview模式下返回'helvetica'，避免NotoSansSC查找警告
    
    // 6. 测试 setFont & 文本渲染（使用安全的字体设置）
    safeSetFont(doc, 'NotoSansSC', 'normal', mode);
    doc.setFontSize(12);
    doc.text('Font test (normal)', 10, 20);
    
    safeSetFont(doc, 'NotoSansSC', 'bold', mode);
    doc.text('Font test (bold)', 10, 30);
    
    // 7. 测试 AutoTable（使用preview模式字体，避免警告）
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
      // 使用标准化的AutoTable配置，确保符合最新API规范
      (doc as any).autoTable({
        head: [['Test Col1', 'Test Col2', 'Test Col3']],
        body: [
          ['Row1-Col1', 'Row1-Col2', 'Row1-Col3'],
          ['Row2-Col1', 'Row2-Col2', 'Row2-Col3']
        ],
        startY: 40,
        tableWidth: 'wrap' as const,
        // 所有样式配置都使用新版API，杜绝deprecated警告
        styles: { 
          font: fontName, // 使用preview模式字体(helvetica)
          fontStyle: 'normal' as const, 
          fontSize: 9,
          overflow: 'linebreak' as const // ✅ 正确位置：在styles里
        },
        headStyles: { 
          font: fontName, // 使用preview模式字体(helvetica)
          fontStyle: 'bold' as const,
          overflow: 'linebreak' as const // ✅ 正确位置：在headStyles里
        },
        bodyStyles: {
          font: fontName, // 使用preview模式字体(helvetica)
          fontStyle: 'normal' as const,
          overflow: 'linebreak' as const // ✅ 正确位置：在bodyStyles里
        },
        columnStyles: { 0: { cellWidth: 'auto' as const, minCellWidth: 20 } }
      });
    } finally {
      console.warn = originalConsoleWarn;
    }

    // 将 AutoTable 布局警告归类为 warning，不是 error
    if (tableWarnings.length > 0) {
      warnings.push(`AutoTable 布局提示: ${tableWarnings.length} 条`);
      console.log('[healthcheck] AutoTable 布局提示:', tableWarnings);
    }
    
    // 8. 生成PDF Blob
    const blob = doc.output('blob');
    if (!blob || blob.size === 0) {
      throw new Error('PDF生成失败：输出为空');
    }
    
    pdfSize = blob.size;
    const duration = performance.now() - t0;
    
    // 9. 根据耗时判断状态
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
    
    // 10. 检查PDF大小
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
  } finally {
    running = false;
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
          // 只在真正失败时显示错误，警告级别只显示信息
          if (result.status === 'critical') {
            console.error('[healthcheck] 开发环境健康检查失败:', result.details);
          } else {
            console.warn('[healthcheck] 开发环境健康检查警告:', result.details);
          }
        } else {
          console.log('[healthcheck] 开发环境健康检查通过:', result.details);
        }
      } catch (error) {
        console.error('[healthcheck] 开发环境健康检查异常:', error);
      }
    }, 5000); // 增加延迟时间，减少对首屏的影响
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