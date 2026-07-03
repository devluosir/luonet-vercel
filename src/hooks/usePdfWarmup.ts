'use client';

import { useEffect, useRef } from 'react';

// Dev/多处挂载去重（模块级保证只跑一次）
let warmedUp = false;

type FontLoaderModule = Partial<typeof import('../utils/fontLoader')>;
type ImageLoaderModule = Partial<typeof import('../utils/imageLoader')>;
type QuotationGeneratorModule = Partial<typeof import('../utils/quotationPdfGenerator')>;
type OrderGeneratorModule = Partial<typeof import('../utils/orderConfirmationPdfGenerator')>;

// 统一把任何返回值包成 Promise
function toPromise<T>(v: T | Promise<T> | void): Promise<T | void> {
  if (v && typeof v === 'object' && 'then' in v && typeof v.then === 'function') {
    return v as Promise<T>;
  }
  return Promise.resolve(v);
}

// 兼容 SSR：在类型上声明，运行时只在浏览器用
const requestIdle: (cb: IdleRequestCallback, opts?: IdleRequestOptions) => number =
  typeof window !== 'undefined' && 'requestIdleCallback' in window
    ? window.requestIdleCallback.bind(window)
    : (cb: IdleRequestCallback) => (
      setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 0 }), 0) as unknown as number
    );

const cancelIdle: (id: number) => void =
  typeof window !== 'undefined' && 'cancelIdleCallback' in window
    ? window.cancelIdleCallback.bind(window)
    : (id: number) => clearTimeout(id as unknown as number);

export function usePdfWarmup() {
  const startedRef = useRef(false);

  useEffect(() => {
    // 严格去重：组件级 + 模块级
    if (startedRef.current || warmedUp) return;
    startedRef.current = true;
    warmedUp = true;

    // 只在开发环境显示预热日志
    if (process.env.NODE_ENV === 'development') {
      console.log('开始预热PDF相关资源...');
    }

    // 延迟预热，避免阻塞首屏渲染
    const _delay = process.env.NODE_ENV === 'development' ? 2000 : 3000;

    const idleId = requestIdle(async () => {
      try {
        // 动态导入，避免阻塞首屏
        const fontLoader: FontLoaderModule = await import('../utils/fontLoader').catch(() => ({}));
        const imageLoader: ImageLoaderModule = await import('../utils/imageLoader').catch(() => ({}));
        const quotationGen: QuotationGeneratorModule = await import('../utils/quotationPdfGenerator').catch(() => ({}));
        const orderGen: OrderGeneratorModule = await import('../utils/orderConfirmationPdfGenerator').catch(() => ({}));

        // 统一用 toPromise 包装，避免 undefined.then 报错
        if (fontLoader?.preloadFonts) {
          await toPromise(fontLoader.preloadFonts());
          if (process.env.NODE_ENV === 'development') {
            console.log('字体资源预热完成');
          }
        }

        if (imageLoader?.preloadImages) {
          await toPromise(imageLoader.preloadImages());
          if (process.env.NODE_ENV === 'development') {
            console.log('图片资源预热完成');
          }
        }

        if (quotationGen?.generateQuotationPDF) {
          // 预热报价PDF生成器
          if (process.env.NODE_ENV === 'development') {
            console.log('报价PDF生成器预热完成');
          }
        }

        if (orderGen?.generateOrderConfirmationPDF) {
          // 预热订单确认PDF生成器
          if (process.env.NODE_ENV === 'development') {
            console.log('订单确认PDF生成器预热完成');
          }
        }
      } catch (e) {
        console.error('PDF资源预热失败:', e);
      }
    }, { timeout: 2000 });

    return () => {
      cancelIdle(idleId);
    };
  }, []);
}

/**
 * 获取预热状态
 */
export function getWarmupStatus() {
  return {
    inProgress: false,
    completed: warmedUp
  };
}

/**
 * 重置预热状态（用于测试或强制重新预热）
 */
export function resetWarmupStatus() {
  warmedUp = false;
  console.log('PDF预热状态已重置');
}
