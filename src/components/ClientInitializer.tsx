'use client';

import { useEffect } from 'react';

// 健康检查缓存，避免重复执行
let healthcheckRun = false;

export default function ClientInitializer() {
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      (async () => {
        try {
          // 只在开发环境显示预热日志
          if (process.env.NODE_ENV === 'development') {
            console.info('[ClientInitializer] 开始预热PDF资源...');
          }

          // 延迟预热，避免阻塞首屏渲染
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // 动态导入，避免首屏同步成本/SSR 参与
          const { preloadFonts } = await import('../utils/fontLoader');
          const { preloadImages } = await import('../utils/imageLoader');
          const { initializeGlobalFonts } = await import('../utils/globalFontRegistry');
          
          if (!cancelled) {
            // 应用级字体预注册（彻底单例化）
            await initializeGlobalFonts();
          }
          
          if (!cancelled) {
            // 预热图片资源
            await preloadImages();
          }
          
          // 开发环境健康检查（延迟执行，避免干扰首屏）
          if (process.env.NODE_ENV === 'development' && !cancelled && !healthcheckRun) {
            healthcheckRun = true;
            const { pdfFontHealthcheck } = await import('../utils/pdfFontHealthcheck');
            const runHealthcheck = () => {
              pdfFontHealthcheck().then(result => {
                if (result.success) {
                  // 只在真正成功时显示简短信息
                  console.log('[healthcheck] 开发环境健康检查通过');
                } else {
                  // 只在真正失败时显示错误，警告级别只显示信息
                  if (result.status === 'critical') {
                    console.error('[healthcheck] 开发环境健康检查失败:', result.details);
                  } else {
                    console.warn('[healthcheck] 开发环境健康检查警告:', result.details);
                  }
                }
              }).catch(error => {
                console.error('[healthcheck] 开发环境健康检查异常:', error);
              });
            };
            
            // 延迟执行健康检查，避免干扰首屏渲染
            setTimeout(() => {
              if ((window as any).requestIdleCallback) {
                (window as any).requestIdleCallback(runHealthcheck, { timeout: 5000 });
              } else {
                setTimeout(runHealthcheck, 3000);
              }
            }, 2000);
          }
          
          if (!cancelled && process.env.NODE_ENV === 'development') {
            console.log('[ClientInitializer] PDF资源预热完成');
          }
        } catch (err) {
          // 吞掉错误，避免冒泡到 ErrorBoundary
          console.error('[ClientInitializer] 预热失败：', err);
        }
      })();
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  // 组件本身不渲染任何内容
  return null;
}
