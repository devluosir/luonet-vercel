/**
 * 测试彩色主题切换修复效果
 */

export function testColorfulThemeFix() {
  console.log('🎨 开始测试彩色主题切换修复...');
  
  const htmlElement = document.documentElement;
  
  // 检查初始状态
  console.log('📋 初始状态检查:');
  console.log('  HTML类名:', htmlElement.className);
  
  // 检查quotation模块的CSS变量
  const checkQuotationVariables = () => {
    const computedStyle = getComputedStyle(htmlElement);
    const from = computedStyle.getPropertyValue('--quotation-from');
    const to = computedStyle.getPropertyValue('--quotation-to');
    const hoverFrom = computedStyle.getPropertyValue('--quotation-hover-from');
    const hoverTo = computedStyle.getPropertyValue('--quotation-hover-to');
    const iconColor = computedStyle.getPropertyValue('--quotation-icon-color');
    
    return { from, to, hoverFrom, hoverTo, iconColor };
  };
  
  console.log('🎨 初始quotation变量:', checkQuotationVariables());
  
  // 测试步骤1：切换到经典主题
  console.log('\n🔄 步骤1: 切换到经典主题...');
  window.themeManager?.updateConfig({
    mode: 'light',
    buttonTheme: 'classic'
  });
  
  setTimeout(() => {
    console.log('  经典主题 - HTML类名:', htmlElement.className);
    console.log('  经典主题 - quotation变量:', checkQuotationVariables());
    
    // 测试步骤2：切换回彩色主题
    console.log('\n🔄 步骤2: 切换回彩色主题...');
    window.themeManager?.updateConfig({
      mode: 'light',
      buttonTheme: 'colorful'
    });
    
    setTimeout(() => {
      console.log('  彩色主题 - HTML类名:', htmlElement.className);
      console.log('  彩色主题 - quotation变量:', checkQuotationVariables());
      
      // 验证修复效果
      const variables = checkQuotationVariables();
      const hasColorfulFrom = variables.from.includes('59, 130, 246') || variables.from.includes('147, 197, 253');
      const hasColorfulTo = variables.to.includes('37, 99, 235') || variables.to.includes('96, 165, 250');
      
      console.log('\n✅ 修复验证结果:');
      console.log('  彩色主题from值正确:', hasColorfulFrom);
      console.log('  彩色主题to值正确:', hasColorfulTo);
      console.log('  无classic-theme类:', !htmlElement.className.includes('classic-theme'));
      
      if (hasColorfulFrom && hasColorfulTo && !htmlElement.className.includes('classic-theme')) {
        console.log('🎉 彩色主题切换修复成功！');
        console.log('   - 从经典主题切换回彩色主题时，CSS变量已正确清除');
        console.log('   - globals.css中的彩色主题变量已生效');
        console.log('   - 图标应该显示彩色效果');
      } else {
        console.log('❌ 彩色主题切换修复仍有问题');
        console.log('   - CSS变量可能没有正确清除或设置');
        console.log('   - 需要进一步调试');
      }
    }, 100);
  }, 100);
}

// 暴露到全局
if (typeof window !== 'undefined') {
  (window as any).testColorfulThemeFix = testColorfulThemeFix;
}
