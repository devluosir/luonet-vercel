const API_BASE_URL = 'https://udb.luocompany.net';

async function testPermissions() {
  try {
    console.log('开始测试权限显示...');
    
    // 模拟NextAuth session数据
    const sessionData = {
      user: {
        id: 'cmd9wa3b100002m1jfs5knol8',
        name: 'luojun',
        username: 'luojun',
        isAdmin: true
      }
    };
    
    // 获取用户权限数据
    const userResponse = await fetch(`${API_BASE_URL}/api/admin/users/${sessionData.user.id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': sessionData.user.id,
        'X-User-Name': sessionData.user.username,
        'X-User-Admin': sessionData.user.isAdmin ? 'true' : 'false'
      }
    });
    
    if (userResponse.ok) {
      const userData = await userResponse.json();
      console.log('✅ 获取用户数据成功');
      console.log('用户权限数量:', userData.permissions?.length || 0);
      
      // 分析权限数据
      const enabledPermissions = userData.permissions.filter(p => p.canAccess);
      const disabledPermissions = userData.permissions.filter(p => !p.canAccess);
      
      console.log('启用的权限数量:', enabledPermissions.length);
      console.log('禁用的权限数量:', disabledPermissions.length);
      
      console.log('启用的权限:');
      enabledPermissions.forEach(p => {
        console.log(`  - ${p.moduleId}: ${p.canAccess}`);
      });
      
      console.log('禁用的权限:');
      disabledPermissions.forEach(p => {
        console.log(`  - ${p.moduleId}: ${p.canAccess}`);
      });
      
      // 测试dashboard中需要的权限
      const dashboardModules = [
        'quotation', 'packing', 'invoice', 'purchase', 
        'history', 'customer', 'ai-email', 'date-tools'
      ];
      
      console.log('\nDashboard模块权限检查:');
      dashboardModules.forEach(moduleId => {
        const permission = userData.permissions.find(p => p.moduleId === moduleId);
        const hasAccess = permission?.canAccess || false;
        console.log(`  ${moduleId}: ${hasAccess ? '✅' : '❌'}`);
      });
      
    } else {
      const errorData = await userResponse.json();
      console.log('❌ 获取用户数据失败:', errorData);
    }
    
  } catch (error) {
    console.error('❌ 测试过程中出错:', error);
  }
}

// 运行测试
testPermissions(); 