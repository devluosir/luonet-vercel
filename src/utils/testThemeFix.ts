/**
 * 测试主题修复效果
 */

export function testThemeFix() {
  console.log('🧪 开始测试主题修复...');
  
  // 检查HTML元素类
  const htmlElement = document.documentElement;
  const currentClasses = htmlElement.className;
  console.log('📋 HTML元素当前类:', currentClasses);
  
  // 检查是否有冲突的light类
  const hasLightClass = currentClasses.includes('light');
  console.log('⚠️  是否存在light类冲突:', hasLightClass);
  
  // 检查CSS变量
  const computedStyle = getComputedStyle(htmlElement);
  const quotationFrom = computedStyle.getPropertyValue('--quotation-from');
  const quotationTo = computedStyle.getPropertyValue('--quotation-to');
  const quotationIconColor = computedStyle.getPropertyValue('--quotation-icon-color');
  
  console.log('🎨 CSS变量值:');
  console.log('  --quotation-from:', quotationFrom);
  console.log('  --quotation-to:', quotationTo);
  console.log('  --quotation-icon-color:', quotationIconColor);
  
  // 测试主题切换
  console.log('\n🔄 测试主题切换...');
  
  // 切换到深色彩色主题
  console.log('1. 切换到深色彩色主题...');
  window.themeManager?.updateConfig({
    mode: 'dark',
    buttonTheme: 'colorful'
  });
  
  setTimeout(() => {
    const darkColorfulClasses = htmlElement.className;
    const darkColorfulQuotationFrom = getComputedStyle(htmlElement).getPropertyValue('--quotation-from');
    
    console.log('   深色彩色主题 - HTML类:', darkColorfulClasses);
    console.log('   深色彩色主题 - quotationFrom:', darkColorfulQuotationFrom);
    
    // 切换到浅色经典主题
    console.log('2. 切换到浅色经典主题...');
    window.themeManager?.updateConfig({
      mode: 'light',
      buttonTheme: 'classic'
    });
    
    setTimeout(() => {
      const lightClassicClasses = htmlElement.className;
      const lightClassicQuotationFrom = getComputedStyle(htmlElement).getPropertyValue('--quotation-from');
      
      console.log('   浅色经典主题 - HTML类:', lightClassicClasses);
      console.log('   浅色经典主题 - quotationFrom:', lightClassicQuotationFrom);
      
      // 验证修复效果
      const hasDarkClass = lightClassicClasses.includes('dark');
      const hasClassicThemeClass = lightClassicClasses.includes('classic-theme');
      const hasLightClassConflict = lightClassicClasses.includes('light');
      
      console.log('\n✅ 修复验证结果:');
      console.log('   深色类已移除:', !hasDarkClass);
      console.log('   经典主题类已添加:', hasClassicThemeClass);
      console.log('   无light类冲突:', !hasLightClassConflict);
      
      if (!hasDarkClass && hasClassicThemeClass && !hasLightClassConflict) {
        console.log('🎉 主题修复成功！CSS变量应该能正确解析了。');
      } else {
        console.log('❌ 主题修复仍有问题，需要进一步调试。');
      }
    }, 100);
  }, 100);
}

// 暴露到全局
if (typeof window !== 'undefined') {
  (window as any).testThemeFix = testThemeFix;
}
