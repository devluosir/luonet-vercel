// iOS设备输入优化工具

/**
 * 检测是否为iOS设备
 */
export const isIOSDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

/**
 * 检测是否为iOS Safari浏览器
 */
export const isIOSSafari = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua) && !/CriOS/.test(ua);
  
  return isIOS && isSafari;
};

/**
 * 获取iOS版本号
 */
export const getIOSVersion = (): number | null => {
  if (!isIOSDevice()) return null;
  
  const match = navigator.userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
};

/**
 * 优化iOS设备上的输入框元素 - 简化版本
 */
export const optimizeIOSInput = (element: HTMLInputElement | HTMLTextAreaElement): void => {
  if (!isIOSDevice()) return;
  
  // 简化的光标优化
  element.style.caretColor = '#007AFF';
  (element.style as any).webkitCaretColor = '#007AFF';
  
  // 基础触摸优化
  element.style.touchAction = 'manipulation';
  (element.style as any).webkitAppearance = 'none';
  element.style.appearance = 'none';
  
  // 防止自动放大
  if (parseFloat(getComputedStyle(element).fontSize) < 16) {
    element.style.fontSize = '16px';
  }
  
  // 添加CSS类
  if (!element.classList.contains('ios-optimized-input')) {
    element.classList.add('ios-optimized-input');
  }
};

/**
 * 批量优化页面上的所有输入框
 */
export const optimizeAllInputs = (): void => {
  if (!isIOSDevice()) return;
  
  const inputs = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea, select');
  inputs.forEach(optimizeIOSInput);
};

/**
 * 全局初始化iOS输入优化 - 简化版本
 */
export const initIOSOptimization = (): void => {
  if (!isIOSDevice()) return;
  
  // 等待DOM完全加载
  const init = () => {
    // 优化现有的所有输入框
    optimizeAllInputs();
    
    // 简化的变化监听器
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            
            // 检查新添加的输入框
            if (element.matches('input, textarea, select')) {
              optimizeIOSInput(element as HTMLInputElement | HTMLTextAreaElement);
            }
            
            // 检查内部输入框
            const inputs = element.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea, select');
            inputs.forEach(optimizeIOSInput);
          }
        });
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  };
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}; 