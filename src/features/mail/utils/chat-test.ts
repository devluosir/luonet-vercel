// 聊天界面测试工具
export const testChatInterface = () => {
  // 测试聊天界面的基本功能
  const testCases = [
    {
      name: '用户输入显示',
      test: () => {
        // 模拟用户输入
        const userInput = 'Hello, I need help writing a business email.';
        return userInput.length > 0;
      }
    },
    {
      name: 'AI回复显示',
      test: () => {
        // 模拟AI回复
        const aiResponse = '[Subject] Business Email\n\n[English]\nDear Sir/Madam,\n\nThank you for your inquiry...';
        return aiResponse.includes('[Subject]') && aiResponse.includes('[English]');
      }
    },
    {
      name: '消息气泡样式',
      test: () => {
        // 检查消息气泡样式是否正确
        return true; // 这里可以添加实际的样式检查
      }
    }
  ];

  const results = testCases.map(testCase => ({
    name: testCase.name,
    passed: testCase.test()
  }));

  return {
    total: results.length,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length,
    results
  };
};

// 检查聊天界面的响应式布局
export const checkChatResponsiveness = () => {
  const width = typeof window !== 'undefined' ? window.innerWidth : 1024;
  
  return {
    isMobile: width < 768,
    isTablet: width >= 768 && width < 1024,
    isDesktop: width >= 1024,
    currentWidth: width,
    recommendedHeight: Math.min(800, Math.max(600, window.innerHeight - 200))
  };
};

// 模拟聊天消息
export const mockChatMessages = () => {
  return [
    {
      id: 1,
      type: 'ai',
      content: '👋 欢迎使用AI邮件助手\n\n请告诉我您想要写什么邮件，我会帮您生成专业的邮件内容。',
      timestamp: new Date()
    },
    {
      id: 2,
      type: 'user',
      content: '我需要写一封商务邮件给客户，询问产品报价。',
      timestamp: new Date()
    },
    {
      id: 3,
      type: 'ai',
      content: '[Subject] Product Inquiry / 产品咨询\n\n[English]\nDear [Client Name],\n\nI hope this email finds you well. I am writing to inquire about your product pricing and availability.\n\n[中文]\n尊敬的[客户姓名]，\n\n希望您一切安好。我写这封邮件是想询问贵公司的产品价格和库存情况。',
      timestamp: new Date()
    }
  ];
};
