'use client';

import { useEffect } from 'react';

export default function ClientInitializer() {
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      (async () => {
        try {
          console.info('[ClientInitializer] 开始预热PDF资源...');
          
          // 动态导入，避免首屏同步成本/SSR 参与
          const { preloadFonts, warmupFontRegistration } = await import('../utils/fontLoader');
          const { preloadImages } = await import('../utils/imageLoader');
          
          if (!cancelled) {
            // 预热字体资源
            await preloadFonts();
          }
          
          if (!cancelled) {
            // 预热图片资源
            await preloadImages();
          }
          
          if (!cancelled) {
            // 预热字体注册
            await warmupFontRegistration();
          }
          
          // 开发环境健康检查
          if (process.env.NODE_ENV === 'development' && !cancelled) {
            const { runHealthcheckInDev } = await import('../utils/pdfFontHealthcheck');
            if (typeof runHealthcheckInDev === 'function') {
              runHealthcheckInDev();
            }
          }
          
          if (!cancelled) {
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
