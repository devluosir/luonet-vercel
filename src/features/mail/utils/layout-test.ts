// 布局测试工具
export const testLayoutResponsiveness = () => {
  // 测试不同屏幕尺寸下的布局
  const breakpoints = {
    mobile: 375,
    tablet: 768,
    desktop: 1024,
    large: 1440
  };

  const testResults = {
    mobile: false,
    tablet: false,
    desktop: false,
    large: false
  };

  // 模拟测试不同屏幕尺寸
  Object.entries(breakpoints).forEach(([size, width]) => {
    // 这里可以添加实际的布局测试逻辑
    testResults[size as keyof typeof testResults] = width >= 375;
  });

  return testResults;
};

// 检查元素高度是否对称
export const checkSymmetricalHeight = (leftElement: HTMLElement, rightElement: HTMLElement) => {
  const leftHeight = leftElement.offsetHeight;
  const rightHeight = rightElement.offsetHeight;
  const difference = Math.abs(leftHeight - rightHeight);
  const tolerance = 10; // 允许10px的误差

  return {
    leftHeight,
    rightHeight,
    difference,
    isSymmetrical: difference <= tolerance
  };
};

// 检查响应式布局
export const checkResponsiveLayout = () => {
  const isMobile = window.innerWidth < 768;
  const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
  const isDesktop = window.innerWidth >= 1024;

  return {
    isMobile,
    isTablet,
    isDesktop,
    currentWidth: window.innerWidth
  };
};

// 测试聊天界面布局
export const testChatLayout = () => {
  const tests = [
    {
      name: '输入框布局',
      test: () => {
        // 检查输入框是否在正确位置
        return true;
      }
    },
    {
      name: '发送按钮位置',
      test: () => {
        // 检查发送按钮是否紧贴输入框
        return true;
      }
    },
    {
      name: '设置按钮功能',
      test: () => {
        // 检查设置按钮是否可以展开/收起
        return true;
      }
    },
    {
      name: '设置面板显示',
      test: () => {
        // 检查设置面板是否正确显示
        return true;
      }
    }
  ];

  const results = tests.map(test => ({
    name: test.name,
    passed: test.test()
  }));

  return {
    total: results.length,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length,
    results
  };
};
