/**
 * 主题调试工具
 * 用于在开发环境中调试主题系统
 */

import { themeManager } from './themeUtils';
import { testThemeFix } from './testThemeFix';
import { validateThemeFix } from './validateThemeFix';
import { testColorfulThemeFix } from './testColorfulThemeFix';

export const debugTheme = () => {
  if (process.env.NODE_ENV !== 'development') return;

  console.group('🎨 主题系统调试信息');
  
  // 获取当前配置
  const config = themeManager.getConfig();
  console.log('当前主题配置:', config);
  
  // 测试模块颜色
  const testModules = ['quotation', 'confirmation', 'packing', 'invoice', 'purchase'];
  testModules.forEach(moduleId => {
    const colors = themeManager.getModuleColors(moduleId, config.buttonTheme);
    console.log(`${moduleId} 模块颜色:`, colors);
  });
  
  // 检查DOM状态
  if (typeof window !== 'undefined') {
    const root = document.documentElement;
    console.log('HTML类名:', root.className);
    
    // 检查CSS变量
    const computedStyle = getComputedStyle(root);
    console.log('CSS变量:', {
      primaryColor: computedStyle.getPropertyValue('--primary-color'),
      bgPrimary: computedStyle.getPropertyValue('--bg-primary'),
      // 检查模块按钮的CSS变量
      quotationFrom: computedStyle.getPropertyValue('--quotation-from'),
      quotationTo: computedStyle.getPropertyValue('--quotation-to'),
      quotationIconColor: computedStyle.getPropertyValue('--quotation-icon-color'),
      confirmationFrom: computedStyle.getPropertyValue('--confirmation-from'),
      confirmationTo: computedStyle.getPropertyValue('--confirmation-to'),
      confirmationIconColor: computedStyle.getPropertyValue('--confirmation-icon-color'),
    });
    
    // 检查是否有classic-theme类
    console.log('主题类检查:', {
      hasDarkClass: root.classList.contains('dark'),
      hasClassicThemeClass: root.classList.contains('classic-theme'),
      allClasses: Array.from(root.classList),
    });
  }
  
  // 检查localStorage
  if (typeof window !== 'undefined') {
    console.log('LocalStorage:', {
      themeConfig: localStorage.getItem('theme-config'),
      themeSettings: localStorage.getItem('theme-settings'),
    });
  }
  
  console.groupEnd();
};

// 监控主题切换
export const monitorThemeChanges = () => {
  if (process.env.NODE_ENV !== 'development') return;

  let lastConfig = themeManager.getConfig();
  
  // 添加主题变化监听器
  const unsubscribe = themeManager.addListener((newConfig) => {
    console.group('🔄 主题切换监控');
    console.log('切换前配置:', lastConfig);
    console.log('切换后配置:', newConfig);
    console.log('变化详情:', {
      modeChanged: lastConfig.mode !== newConfig.mode,
      buttonThemeChanged: lastConfig.buttonTheme !== newConfig.buttonTheme,
    });
    
    // 检查DOM状态
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      console.log('DOM状态:', {
        hasDarkClass: root.classList.contains('dark'),
        className: root.className,
      });
    }
    
    console.groupEnd();
    
    lastConfig = newConfig;
  });

  return unsubscribe;
};

// 测试主题切换功能
export const testThemeToggle = () => {
  if (process.env.NODE_ENV !== 'development') return;

  console.group('🧪 主题切换功能测试');
  
  const originalConfig = themeManager.getConfig();
  console.log('原始配置:', originalConfig);
  
  // 测试模式切换
  console.log('测试模式切换...');
  themeManager.toggleMode();
  setTimeout(() => {
    const afterModeToggle = themeManager.getConfig();
    console.log('模式切换后:', afterModeToggle);
    
    // 测试按钮主题切换
    console.log('测试按钮主题切换...');
    themeManager.toggleButtonTheme();
    setTimeout(() => {
      const afterButtonToggle = themeManager.getConfig();
      console.log('按钮主题切换后:', afterButtonToggle);
      
      // 恢复原始配置
      console.log('恢复原始配置...');
      themeManager.updateConfig(originalConfig);
      setTimeout(() => {
        const restoredConfig = themeManager.getConfig();
        console.log('恢复后配置:', restoredConfig);
        console.log('测试完成');
        console.groupEnd();
      }, 100);
    }, 100);
  }, 100);
};

// 自动在开发环境中运行调试
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // 延迟执行，确保主题管理器已初始化
  setTimeout(() => {
    debugTheme();
    monitorThemeChanges();
    
    // 添加全局测试函数
    (window as any).testThemeToggle = testThemeToggle;
    (window as any).debugTheme = debugTheme;
    (window as any).testThemeFix = testThemeFix;
    (window as any).validateThemeFix = validateThemeFix;
    (window as any).testColorfulThemeFix = testColorfulThemeFix;
    
    console.log('🎨 主题调试工具已加载');
    console.log('使用方法:');
    console.log('- testThemeToggle() - 测试主题切换功能');
    console.log('- debugTheme() - 显示当前主题状态');
    console.log('- testThemeFix() - 测试主题修复效果');
    console.log('- validateThemeFix() - 验证主题修复是否有效');
    console.log('- testColorfulThemeFix() - 测试彩色主题切换修复');
  }, 1000);
}
