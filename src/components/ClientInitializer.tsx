'use client';

import { useEffect } from 'react';

// 健康检查缓存，避免重复执行
let healthcheckRun = false;

export default function ClientInitializer() {
  useEffect(() => {
    let cancelled = false;
    // 字体预热推迟到浏览器空闲时执行，不阻塞首屏
    const timer = setTimeout(() => {
      if (cancelled) return;

      const runFontWarmup = async () => {
        try {
          const { initializeGlobalFonts } = await import('../utils/globalFontRegistry');
          if (!cancelled) {
            await initializeGlobalFonts();
            if (process.env.NODE_ENV === 'development') {
              console.log('[ClientInitializer] 字体预热完成');
            }
          }
        } catch (err) {
          console.warn('[ClientInitializer] 字体预热失败:', err);
        }
      };

      // 开发环境健康检查
      if (process.env.NODE_ENV === 'development' && !healthcheckRun) {
        healthcheckRun = true;
        setTimeout(async () => {
          if (cancelled) return;
          try {
            const { pdfFontHealthcheck } = await import('../utils/pdfFontHealthcheck');
            const result = await pdfFontHealthcheck();
            if (result.success) {
              console.log('[healthcheck] 开发环境健康检查通过');
            } else if (result.status === 'critical') {
              console.error('[healthcheck] 开发环境健康检查失败:', result.details);
            } else {
              console.warn('[healthcheck] 开发环境健康检查警告:', result.details);
            }
          } catch (error) {
            console.error('[healthcheck] 开发环境健康检查异常:', error);
          }
        }, 5000);
      }

      // 字体预热等浏览器真正空闲时再执行
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        (window as Window & { requestIdleCallback: (cb: () => void, opts: { timeout: number }) => void })
          .requestIdleCallback(runFontWarmup, { timeout: 8000 });
      } else {
        setTimeout(runFontWarmup, 5000);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  // 组件本身不渲染任何内容
  return null;
}
