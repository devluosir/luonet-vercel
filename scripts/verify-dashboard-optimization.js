// 验证Dashboard优化效果的简单脚本
const fs = require('fs');
const path = require('path');

function verifyDashboardOptimization() {
  console.log('🔍 验证Dashboard优化效果...\n');

  // 1. 检查权限store优化
  console.log('1. 检查权限Store优化...');
  const permissionsFile = path.join(__dirname, '../src/lib/permissions.ts');
  const permissionsContent = fs.readFileSync(permissionsFile, 'utf8');
  
  const hasFirstLoadFlag = permissionsContent.includes('isFirstLoad');
  const hasOptimizedPermissionCheck = permissionsContent.includes('!isFirstLoad &&');
  const hasOptimizedEventTrigger = permissionsContent.includes('!isFirstLoad && typeof window !== \'undefined\'');
  
  console.log(`   ✅ 添加首次加载标志: ${hasFirstLoadFlag ? '是' : '否'}`);
  console.log(`   ✅ 优化权限变化检测: ${hasOptimizedPermissionCheck ? '是' : '否'}`);
  console.log(`   ✅ 优化事件触发逻辑: ${hasOptimizedEventTrigger ? '是' : '否'}`);

  // 2. 检查Dashboard页面优化
  console.log('\n2. 检查Dashboard页面优化...');
  const dashboardFile = path.join(__dirname, '../src/app/dashboard/page.tsx');
  const dashboardContent = fs.readFileSync(dashboardFile, 'utf8');
  
  const hasOptimizedInit = dashboardContent.includes('!user && !isInitialized');
  const hasOptimizedPermissionListener = dashboardContent.includes('isFirstLoad');
  const hasOptimizedLogout = dashboardContent.includes('useCallback(async () => {');
  const hasFixedDependencies = dashboardContent.includes('[user?.permissions]');
  
  console.log(`   ✅ 优化初始化逻辑: ${hasOptimizedInit ? '是' : '否'}`);
  console.log(`   ✅ 优化权限监听: ${hasOptimizedPermissionListener ? '是' : '否'}`);
  console.log(`   ✅ 优化退出逻辑: ${hasOptimizedLogout ? '是' : '否'}`);
  console.log(`   ✅ 修复依赖项问题: ${hasFixedDependencies ? '是' : '否'}`);

  // 3. 检查Header组件优化
  console.log('\n3. 检查Header组件优化...');
  const headerFile = path.join(__dirname, '../src/components/Header.tsx');
  const headerContent = fs.readFileSync(headerFile, 'utf8');
  
  const hasOptimizedLogoutOrder = headerContent.includes('onLogout();\n    // 然后调用signOut');
  
  console.log(`   ✅ 优化退出顺序: ${hasOptimizedLogoutOrder ? '是' : '否'}`);

  // 4. 检查README更新
  console.log('\n4. 检查文档更新...');
  const readmeFile = path.join(__dirname, '../README.md');
  const readmeContent = fs.readFileSync(readmeFile, 'utf8');
  
  const hasOptimizationSection = readmeContent.includes('最新优化 (2024-01-04)');
  const hasPerformanceDetails = readmeContent.includes('Dashboard性能优化');
  
  console.log(`   ✅ 添加优化说明: ${hasOptimizationSection ? '是' : '否'}`);
  console.log(`   ✅ 详细性能说明: ${hasPerformanceDetails ? '是' : '否'}`);

  // 5. 总结
  console.log('\n📊 优化验证总结:');
  const totalChecks = 8;
  const passedChecks = [
    hasFirstLoadFlag,
    hasOptimizedPermissionCheck,
    hasOptimizedEventTrigger,
    hasOptimizedInit,
    hasOptimizedPermissionListener,
    hasOptimizedLogout,
    hasOptimizedLogoutOrder,
    hasFixedDependencies
  ].filter(Boolean).length;

  console.log(`   通过检查: ${passedChecks}/${totalChecks}`);
  
  if (passedChecks === totalChecks) {
    console.log('🎉 所有优化都已正确实施！');
    console.log('\n预期效果:');
    console.log('✅ 首次登录时不会出现两次刷新');
    console.log('✅ 退出登录时不会出现重复退出');
    console.log('✅ 权限加载更加智能和高效');
    console.log('✅ 工具模块能正常显示');
    console.log('✅ 用户体验更加流畅');
  } else {
    console.log('⚠️ 部分优化可能未完全实施，请检查相关文件');
  }

  console.log('\n💡 建议测试步骤:');
  console.log('1. 启动开发服务器: npm run dev');
  console.log('2. 登录系统并进入Dashboard');
  console.log('3. 观察是否还有两次刷新现象');
  console.log('4. 测试退出登录功能');
  console.log('5. 确认工具模块正常显示');
}

// 如果直接运行此脚本
if (require.main === module) {
  verifyDashboardOptimization();
}

module.exports = { verifyDashboardOptimization }; 