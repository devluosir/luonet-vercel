import { useCallback, useEffect, useRef } from 'react';
import { preloadFonts } from '@/utils/fontLoader';
import { preloadImages } from '@/utils/imageLoader';

// 预热状态管理
let warmupInProgress = false;
let warmupCompleted = false;
let warmupPromise: Promise<void> | null = null;

/**
 * PDF预热钩子 - 优化版本
 */
export function usePdfWarmup() {
  const warmupRef = useRef<(() => Promise<void>) | null>(null);

  const warmup = useCallback(async () => {
    // 如果已经预热完成，直接返回
    if (warmupCompleted) {
      console.log('PDF资源已预热，跳过重复预热');
      return;
    }

    // 如果正在预热，返回现有的Promise
    if (warmupInProgress && warmupPromise) {
      console.log('PDF资源正在预热中，等待完成...');
      return warmupPromise;
    }

    // 开始预热
    warmupInProgress = true;
    warmupPromise = new Promise(async (resolve, reject) => {
      try {
        const startTime = performance.now();
        console.log('开始预热PDF相关资源...');

        // 并行预热所有资源
        await Promise.all([
          // PDF生成器模块
          import('@/utils/quotationPdfGenerator').then(() => {
            console.log('报价PDF生成器预热完成');
          }),
          import('@/utils/orderConfirmationPdfGenerator').then(() => {
            console.log('订单确认PDF生成器预热完成');
          }),
          // 字体和图片资源
          preloadFonts().then(() => {
            console.log('字体资源预热完成');
          }),
          preloadImages().then(() => {
            console.log('图片资源预热完成');
          })
        ]);

        const endTime = performance.now();
        console.log(`PDF相关资源预热完成，总耗时: ${(endTime - startTime).toFixed(2)}ms`);
        
        warmupCompleted = true;
        resolve();
      } catch (error) {
        console.error('PDF资源预热失败:', error);
        reject(error);
      } finally {
        warmupInProgress = false;
      }
    });

    return warmupPromise;
  }, []);

  // 保存warmup函数引用
  warmupRef.current = warmup;

  // 页面加载完成后自动预热
  useEffect(() => {
    const handleWarmup = () => {
      if (warmupRef.current && !warmupCompleted && !warmupInProgress) {
        // 使用 requestIdleCallback 在浏览器空闲时预热
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          requestIdleCallback(() => {
            warmupRef.current?.();
          }, { timeout: 3000 });
        } else {
          // 降级方案
          setTimeout(() => {
            warmupRef.current?.();
          }, 2000);
        }
      }
    };

    // 页面加载完成后预热
    if (document.readyState === 'complete') {
      handleWarmup();
    } else {
      window.addEventListener('load', handleWarmup, { once: true });
    }

    return () => {
      window.removeEventListener('load', handleWarmup);
    };
  }, []);

  return warmup;
}

/**
 * 获取预热状态
 */
export function getWarmupStatus() {
  return {
    inProgress: warmupInProgress,
    completed: warmupCompleted
  };
}

/**
 * 重置预热状态（用于测试或强制重新预热）
 */
export function resetWarmupStatus() {
  warmupInProgress = false;
  warmupCompleted = false;
  warmupPromise = null;
  console.log('PDF预热状态已重置');
}
