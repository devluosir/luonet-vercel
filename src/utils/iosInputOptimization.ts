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
 * 优化iOS设备上的输入框元素 - 增强版本
 */
export const optimizeIOSInput = (element: HTMLInputElement | HTMLTextAreaElement): void => {
  if (!isIOSDevice()) return;
  
  const style = element.style as any;
  
  // 强制设置光标颜色和样式 - 确保在所有层级都可见
  element.style.caretColor = '#007AFF';
  style.webkitCaretColor = '#007AFF';
  style.webkitAppearance = 'none';
  element.style.appearance = 'none';
  style.webkitTextFillColor = 'initial';
  style.webkitOpacity = '1';
  element.style.opacity = '1';
  
  // 设置层级确保光标在正确位置
  element.style.position = 'relative';
  element.style.zIndex = '1';
  
  // 添加硬件加速确保渲染正确
  style.webkitTransform = 'translateZ(0)';
  element.style.transform = 'translateZ(0)';
  style.willChange = 'transform';
  
  // 优化触摸体验
  element.style.touchAction = 'manipulation';
  style.webkitTouchCallout = 'none';
  style.webkitUserSelect = 'text';
  element.style.userSelect = 'text';
  
  // 确保背景不会遮挡光标
  element.style.backgroundClip = 'padding-box';
  
  // 防止自动放大
  if (parseFloat(getComputedStyle(element).fontSize) < 16) {
    element.style.fontSize = '16px';
  }
  
  // 添加CSS类确保样式应用
  if (!element.classList.contains('ios-optimized-input')) {
    element.classList.add('ios-optimized-input');
  }
  
  // 添加focus事件优化
  const handleFocus = () => {
    // 焦点时进一步强化光标可见性
    element.style.caretColor = '#007AFF';
    style.webkitCaretColor = '#007AFF';
    element.style.zIndex = '2';
    style.webkitTransform = 'translateZ(1px)';
    element.style.transform = 'translateZ(1px)';
    
    // 确保输入框在可视区域内
    setTimeout(() => {
      if (element.scrollIntoView) {
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'nearest'
        });
      }
    }, 100);
  };
  
  const handleBlur = () => {
    // 失焦时重置层级
    element.style.zIndex = '1';
    style.webkitTransform = 'translateZ(0)';
    element.style.transform = 'translateZ(0)';
  };
  
  // 移除旧的事件监听器（如果存在）
  element.removeEventListener('focus', handleFocus);
  element.removeEventListener('blur', handleBlur);
  
  // 添加新的事件监听器
  element.addEventListener('focus', handleFocus);
  element.addEventListener('blur', handleBlur);
  
  // 添加input事件确保持续优化
  element.addEventListener('input', () => {
    element.style.caretColor = '#007AFF';
    style.webkitCaretColor = '#007AFF';
  });
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
 * 为页面添加变化监听器，自动优化新添加的输入框
 */
export const setupMutationObserver = (): MutationObserver | null => {
  if (!isIOSDevice() || typeof window === 'undefined') return null;
  
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          
          // 检查新添加的元素是否为输入框
          if (element.matches('input, textarea, select')) {
            optimizeIOSInput(element as HTMLInputElement | HTMLTextAreaElement);
          }
          
          // 检查新添加的元素内部是否包含输入框
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
  
  return observer;
};

/**
 * 全局初始化iOS输入优化
 */
export const initIOSOptimization = (): void => {
  if (!isIOSDevice()) return;
  
  // 等待DOM完全加载
  const init = () => {
    // 优化现有的所有输入框
    optimizeAllInputs();
    
    // 设置变化监听器
    setupMutationObserver();
    
    // 添加全局CSS强制规则
    const style = document.createElement('style');
    style.textContent = `
      /* iOS强制光标优化 */
      input, textarea, select {
        caret-color: #007AFF !important;
        -webkit-caret-color: #007AFF !important;
        -webkit-text-fill-color: initial !important;
        -webkit-opacity: 1 !important;
        opacity: 1 !important;
        position: relative !important;
        z-index: 1 !important;
        -webkit-transform: translateZ(0) !important;
        transform: translateZ(0) !important;
      }
      
      input:focus, textarea:focus, select:focus {
        caret-color: #007AFF !important;
        -webkit-caret-color: #007AFF !important;
        z-index: 2 !important;
        -webkit-transform: translateZ(1px) !important;
        transform: translateZ(1px) !important;
      }
      
      .ios-optimized-input {
        caret-color: #007AFF !important;
        -webkit-caret-color: #007AFF !important;
        -webkit-text-fill-color: initial !important;
        -webkit-opacity: 1 !important;
        opacity: 1 !important;
        -webkit-appearance: none !important;
        appearance: none !important;
        position: relative !important;
        z-index: 1 !important;
        -webkit-transform: translateZ(0) !important;
        transform: translateZ(0) !important;
        background-clip: padding-box !important;
        will-change: transform !important;
      }
    `;
    document.head.appendChild(style);
  };
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}; 