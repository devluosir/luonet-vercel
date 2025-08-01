// 模拟dashboard中的权限检查逻辑
function testDashboardPermissions() {
  console.log('开始测试Dashboard权限显示...');
  
  // 模拟用户权限数据（从之前的测试结果）
  const userPermissions = [
    { moduleId: 'history', canAccess: true },
    { moduleId: 'quotation', canAccess: true },
    { moduleId: 'packing', canAccess: true },
    { moduleId: 'invoice', canAccess: true },
    { moduleId: 'purchase', canAccess: true },
    { moduleId: 'ai-email', canAccess: true },
    { moduleId: 'customer', canAccess: false },
    { moduleId: 'date-tools', canAccess: false },
    { moduleId: 'feature5', canAccess: false },
    { moduleId: 'feature3', canAccess: false },
    { moduleId: 'feature8', canAccess: false },
    { moduleId: 'feature7', canAccess: false },
    { moduleId: 'feature6', canAccess: false },
    { moduleId: 'feature9', canAccess: false }
  ];
  
  // 模拟hasPermission函数
  const hasPermission = (moduleId) => {
    const permission = userPermissions.find(p => p.moduleId === moduleId);
    return permission?.canAccess || false;
  };
  
  // 模拟dashboard模块
  const QUICK_CREATE_MODULES = [
    { id: 'quotation', name: '新报价单' },
    { id: 'confirmation', name: '销售确认' },
    { id: 'packing', name: '箱单发票' },
    { id: 'invoice', name: '财务发票' },
    { id: 'purchase', name: '采购订单' }
  ];
  
  const TOOL_MODULES = [
    { id: 'ai-email', name: 'AI邮件助手' },
    { id: 'date-tools', name: '日期计算' }
  ];
  
  const TOOLS_MODULES = [
    { id: 'history', name: '单据管理' },
    { id: 'customer', name: '客户管理' }
  ];
  
  // 测试权限映射
  const permissions = {
    quotation: hasPermission('quotation'),
    packing: hasPermission('packing'),
    invoice: hasPermission('invoice'),
    purchase: hasPermission('purchase')
  };
  
  const documentTypePermissions = {
    quotation: permissions.quotation,
    confirmation: permissions.quotation, // 销售确认使用报价单权限
    packing: permissions.packing,
    invoice: permissions.invoice,
    purchase: permissions.purchase
  };
  
  console.log('权限映射结果:');
  console.log('  quotation:', permissions.quotation ? '✅' : '❌');
  console.log('  packing:', permissions.packing ? '✅' : '❌');
  console.log('  invoice:', permissions.invoice ? '✅' : '❌');
  console.log('  purchase:', permissions.purchase ? '✅' : '❌');
  
  // 测试快速创建模块
  const availableQuickCreateModules = QUICK_CREATE_MODULES.filter(module => {
    if (module.id === 'confirmation') {
      return documentTypePermissions.confirmation;
    }
    return documentTypePermissions[module.id];
  });
  
  console.log('\n快速创建模块:');
  availableQuickCreateModules.forEach(module => {
    console.log(`  ✅ ${module.name} (${module.id})`);
  });
  
  // 测试工具模块
  const availableToolModules = TOOL_MODULES.filter(module => hasPermission(module.id));
  
  console.log('\n工具模块:');
  availableToolModules.forEach(module => {
    console.log(`  ✅ ${module.name} (${module.id})`);
  });
  
  // 测试Tools模块
  const availableToolsModules = TOOLS_MODULES.filter(module => hasPermission(module.id));
  
  console.log('\nTools模块:');
  availableToolsModules.forEach(module => {
    console.log(`  ✅ ${module.name} (${module.id})`);
  });
  
  console.log('\n总结:');
  console.log(`快速创建模块: ${availableQuickCreateModules.length}/5`);
  console.log(`工具模块: ${availableToolModules.length}/2`);
  console.log(`Tools模块: ${availableToolsModules.length}/2`);
}

// 运行测试
testDashboardPermissions(); 