/**
 * 验证主题修复是否有效
 */

export function validateThemeFix() {
  console.log('🔍 验证主题修复效果...');
  
  const htmlElement = document.documentElement;
  const currentClasses = htmlElement.className;
  
  // 检查是否有冲突的类
  const hasLightClass = currentClasses.includes('light');
  const hasDarkClass = currentClasses.includes('dark');
  const hasClassicThemeClass = currentClasses.includes('classic-theme');
  
  console.log('📋 HTML类检查:');
  console.log('  当前类:', currentClasses);
  console.log('  存在light类:', hasLightClass);
  console.log('  存在dark类:', hasDarkClass);
  console.log('  存在classic-theme类:', hasClassicThemeClass);
  
  // 检查CSS变量
  const computedStyle = getComputedStyle(htmlElement);
  const quotationFrom = computedStyle.getPropertyValue('--quotation-from');
  
  console.log('🎨 CSS变量检查:');
  console.log('  --quotation-from:', quotationFrom);
  
  // 验证修复效果
  const isFixed = !hasLightClass;
  
  if (isFixed) {
    console.log('✅ 主题修复验证通过！');
    console.log('   - 无light类冲突');
    console.log('   - CSS变量应该能正确解析');
    console.log('   - 主题切换应该正常工作');
  } else {
    console.log('❌ 主题修复验证失败！');
    console.log('   - 仍存在light类冲突');
    console.log('   - 需要进一步检查');
  }
  
  return isFixed;
}

// 暴露到全局
if (typeof window !== 'undefined') {
  (window as any).validateThemeFix = validateThemeFix;
}
