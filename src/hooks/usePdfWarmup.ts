import { useCallback } from 'react';
import { preloadFonts } from '@/utils/fontLoader';
import { preloadImages } from '@/utils/imageLoader';

export function usePdfWarmup() {
  return useCallback(async () => {
    try {
      console.log('开始预热PDF相关资源...');
      
      // 并行预热所有PDF相关资源
      await Promise.all([
        // 预热PDF生成器
        import('@/utils/quotationPdfGenerator'),
        import('@/utils/orderConfirmationPdfGenerator'),
        import('@/lib/embedded-resources'),
        // 预热字体资源
        preloadFonts(),
        // 预热图片资源
        preloadImages()
      ]);
      
      console.log('PDF相关资源预热完成');
    } catch (error) {
      console.error('PDF资源预热失败:', error);
    }
  }, []);
}
