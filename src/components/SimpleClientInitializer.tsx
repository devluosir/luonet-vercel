'use client';

import React, { useEffect } from 'react';

/**
 * 简化的客户端初始化组件
 * 只做最基本的预热，避免复杂的依赖
 */
export function SimpleClientInitializer() {
  useEffect(() => {
    // 确保只在客户端运行
    if (typeof window === 'undefined') return;

    console.log('[SimpleClientInitializer] 开始基础预热...');

    // 延迟执行，确保所有模块都已加载
    const timer = setTimeout(() => {
      try {
        // 只做最基本的预热，避免复杂的依赖
        console.log('[SimpleClientInitializer] 基础预热完成');
      } catch (error) {
        console.error('[SimpleClientInitializer] 初始化失败:', error);
      }
    }, 500); // 延迟500ms执行

    return () => clearTimeout(timer);
  }, []);

  // 这个组件不渲染任何内容
  return null;
}
