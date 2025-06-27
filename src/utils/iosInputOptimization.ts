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
  return isIOSDevice() && /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|mercury/.test(ua);
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
 * 优化iOS设备上的输入框元素
 */
export const optimizeIOSInput = (element: HTMLInputElement | HTMLTextAreaElement): void => {
  if (!isIOSDevice()) return;
  
  // 确保光标可见
  element.style.caretColor = '#2563eb';
  element.style.webkitAppearance = 'none';
  element.style.appearance = 'none';
  
  // 优化触摸体验
  element.style.touchAction = 'manipulation';
  element.style.webkitTouchCallout = 'none';
  element.style.webkitUserSelect = 'text';
  element.style.userSelect = 'text';
  
  // 防止自动放大
  if (parseFloat(getComputedStyle(element).fontSize) < 16) {
    element.style.fontSize = '16px';
  }
  
  // 添加focus事件优化
  element.addEventListener('focus', () => {
    // 强制显示光标
    element.style.caretColor = '#2563eb';
    
    // 延迟滚动到可视区域
    setTimeout(() => {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'nearest'
      });
    }, 300);
  });
  
  // 处理暗色模式
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    element.style.caretColor = '#60a5fa';
    element.addEventListener('focus', () => {
      element.style.caretColor = '#60a5fa';
    });
  }
};

/**
 * 为表格中的所有输入框应用iOS优化
 */
export const optimizeTableInputsForIOS = (tableElement: HTMLTableElement): void => {
  if (!isIOSDevice()) return;
  
  const inputs = tableElement.querySelectorAll('input, textarea, select');
  inputs.forEach((input) => {
    if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
      optimizeIOSInput(input);
    }
  });
};

/**
 * 创建iOS优化的输入框属性对象
 */
export const getIOSOptimizedInputProps = () => {
  if (!isIOSDevice()) return {};
  
  return {
    style: {
      caretColor: '#2563eb',
      WebkitAppearance: 'none',
      appearance: 'none',
      touchAction: 'manipulation',
      WebkitTouchCallout: 'none',
      WebkitUserSelect: 'text',
      userSelect: 'text',
      fontSize: 'max(16px, 1em)'
    },
    onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const element = e.target;
      element.style.caretColor = '#2563eb';
      
      // 延迟滚动以避免键盘遮挡
      setTimeout(() => {
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'nearest'
        });
      }, 300);
    }
  };
};

/**
 * 初始化页面iOS优化
 */
export const initIOSOptimization = (): void => {
  if (!isIOSDevice()) return;
  
  // 添加iOS专用样式类
  document.documentElement.classList.add('ios-device');
  
  if (isIOSSafari()) {
    document.documentElement.classList.add('ios-safari');
  }
  
  // 监听暗色模式变化
  if (window.matchMedia) {
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updateCaretColor = (isDark: boolean) => {
      const color = isDark ? '#60a5fa' : '#2563eb';
      document.documentElement.style.setProperty('--ios-caret-color', color);
    };
    
    updateCaretColor(darkModeQuery.matches);
    darkModeQuery.addEventListener('change', (e) => updateCaretColor(e.matches));
  }
  
  // 动态优化页面中的输入框
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          
          // 直接是输入框
          if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
            optimizeIOSInput(element);
          }
          
          // 包含输入框的元素
          const inputs = element.querySelectorAll?.('input, textarea');
          inputs?.forEach((input) => {
            if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
              optimizeIOSInput(input);
            }
          });
        }
      });
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}; 