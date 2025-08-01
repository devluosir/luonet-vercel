// 模拟NextAuth session中的权限数据格式
function testSessionPermissions() {
  console.log('开始测试NextAuth session权限数据格式...');
  
  // 模拟从API获取的原始权限数据
  const apiPermissions = [
    { id: '1', moduleId: 'history', canAccess: true },
    { id: '2', moduleId: 'quotation', canAccess: true },
    { id: '3', moduleId: 'packing', canAccess: true },
    { id: '4', moduleId: 'invoice', canAccess: true },
    { id: '5', moduleId: 'purchase', canAccess: true },
    { id: '6', moduleId: 'ai-email', canAccess: true }
  ];
  
  console.log('API原始权限数据:', apiPermissions);
  
  // 模拟NextAuth authorize函数中的转换
  const sessionPermissions = apiPermissions.map((p) => p.moduleId);
  console.log('NextAuth session权限数据:', sessionPermissions);
  
  // 模拟权限store中的转换
  const convertedPermissions = sessionPermissions.map(moduleId => ({
    id: `session-${moduleId}`,
    moduleId: moduleId,
    canAccess: true
  }));
  
  console.log('转换后的权限数据:', convertedPermissions);
  
  // 测试权限检查
  const hasPermission = (moduleId) => {
    const permission = convertedPermissions.find(p => p.moduleId === moduleId);
    return permission?.canAccess || false;
  };
  
  console.log('\n权限检查测试:');
  const testModules = ['quotation', 'packing', 'invoice', 'purchase', 'ai-email', 'date-tools'];
  testModules.forEach(moduleId => {
    const hasAccess = hasPermission(moduleId);
    console.log(`  ${moduleId}: ${hasAccess ? '✅' : '❌'}`);
  });
}

// 运行测试
testSessionPermissions(); 