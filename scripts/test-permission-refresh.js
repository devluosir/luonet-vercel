const API_BASE_URL = 'https://udb.luocompany.net';

async function testPermissionRefresh() {
  try {
    console.log('开始测试权限刷新...');
    
    // 模拟NextAuth session数据
    const sessionData = {
      user: {
        id: 'cmd9wa3b100002m1jfs5knol8',
        name: 'luojun',
        username: 'luojun',
        isAdmin: true
      }
    };
    
    // 第一次获取用户权限
    console.log('第一次获取用户权限...');
    const userResponse1 = await fetch(`${API_BASE_URL}/api/admin/users/${sessionData.user.id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': sessionData.user.id,
        'X-User-Name': sessionData.user.username,
        'X-User-Admin': sessionData.user.isAdmin ? 'true' : 'false'
      }
    });
    
    let userData1 = null;
    if (userResponse1.ok) {
      userData1 = await userResponse1.json();
      console.log('✅ 第一次获取成功');
      console.log('权限数量:', userData1.permissions?.length || 0);
      
      const enabledPermissions1 = userData1.permissions.filter(p => p.canAccess);
      console.log('启用的权限数量:', enabledPermissions1.length);
    }
    
    // 等待1秒
    console.log('等待1秒...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 第二次获取用户权限（模拟刷新）
    console.log('第二次获取用户权限（模拟刷新）...');
    const userResponse2 = await fetch(`${API_BASE_URL}/api/admin/users/${sessionData.user.id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': sessionData.user.id,
        'X-User-Name': sessionData.user.username,
        'X-User-Admin': sessionData.user.isAdmin ? 'true' : 'false',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (userResponse2.ok) {
      const userData2 = await userResponse2.json();
      console.log('✅ 第二次获取成功');
      console.log('权限数量:', userData2.permissions?.length || 0);
      
      const enabledPermissions2 = userData2.permissions.filter(p => p.canAccess);
      console.log('启用的权限数量:', enabledPermissions2.length);
      
      // 比较两次获取的数据
      console.log('数据是否相同:', JSON.stringify(userData1.permissions) === JSON.stringify(userData2.permissions));
    }
    
  } catch (error) {
    console.error('❌ 测试过程中出错:', error);
  }
}

// 运行测试
testPermissionRefresh(); 