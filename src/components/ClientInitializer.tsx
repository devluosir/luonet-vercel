'use client';

import { useEffect } from 'react';
import { devExtensionWarning } from '@/utils/preHydrationCleanup';

export default function ClientInitializer() {
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      (async () => {
        try {
          console.info('[ClientInitializer] 开始预热PDF资源...');
          
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
          
          // 开发环境健康检查（空闲时执行，避免干扰首个预览）
          if (process.env.NODE_ENV === 'development' && !cancelled) {
            const { pdfFontHealthcheck } = await import('../utils/pdfFontHealthcheck');
            const runHealthcheck = () => {
              pdfFontHealthcheck().then(result => {
                if (result.success) {
                  console.log('[healthcheck] 开发环境健康检查通过:', result.details);
                } else {
                  console.error('[healthcheck] 开发环境健康检查失败:', result.details);
                }
              }).catch(error => {
                console.error('[healthcheck] 开发环境健康检查异常:', error);
              });
            };
            
            // 使用requestIdleCallback空闲执行，避免与用户操作竞争
            if ((window as any).requestIdleCallback) {
              (window as any).requestIdleCallback(runHealthcheck, { timeout: 3000 });
            } else {
              setTimeout(runHealthcheck, 1200);
            }
          }
          
          if (!cancelled) {
            console.log('[ClientInitializer] PDF资源预热完成');
            
            // 开发环境下检测和警告可能影响 hydration 的浏览器扩展
            devExtensionWarning();
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
