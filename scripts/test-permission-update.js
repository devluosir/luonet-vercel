const API_BASE_URL = 'https://udb.luocompany.net';

async function testPermissionUpdate() {
  try {
    console.log('开始测试权限修改和刷新...');
    
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
    
    if (userResponse1.ok) {
      const userData1 = await userResponse1.json();
      console.log('✅ 第一次获取成功');
      console.log('权限数量:', userData1.permissions?.length || 0);
      
      const enabledPermissions1 = userData1.permissions.filter(p => p.canAccess);
      console.log('启用的权限数量:', enabledPermissions1.length);
      console.log('启用的权限:', enabledPermissions1.map(p => p.moduleId));
    }
    
    // 模拟修改权限（禁用ai-email）
    console.log('\n模拟修改权限（禁用ai-email）...');
    const updatedPermissions = [
      { id: '5bfc8f7d-6f6a-4215-a70b-2e113ee6d09f', moduleId: 'history', canAccess: true },
      { id: 'dd395e15-a0df-4d11-886f-afdd67d01ebe', moduleId: 'quotation', canAccess: true },
      { id: '575387af-cce9-4fb9-8113-8bdd4fb50ac4', moduleId: 'packing', canAccess: true },
      { id: '46f12bf1-b2fd-450f-b9ef-38a964854f8a', moduleId: 'invoice', canAccess: true },
      { id: 'fdcff56c-c4f5-4312-9e3f-76837bfe8596', moduleId: 'purchase', canAccess: true },
      { id: '7c581725-ac19-42d2-8791-45074fa80d2e', moduleId: 'ai-email', canAccess: false }, // 禁用ai-email
      { id: 'b8ae50cc-8f43-44ec-a2be-c302db7c53c6', moduleId: 'customer', canAccess: false },
      { id: '8f37a289-5f5d-41de-81c3-37590a4ec315', moduleId: 'date-tools', canAccess: false },
      { id: 'a991bd9a-36ba-4c1f-a220-91adccf8e9d5', moduleId: 'feature5', canAccess: false },
      { id: '0af0be4a-d325-49e4-97c7-b84fbf793b89', moduleId: 'feature3', canAccess: false },
      { id: 'e52ec1da-b341-462b-8b42-e9ab1b14faff', moduleId: 'feature8', canAccess: false },
      { id: 'bdd2d75e-a593-4c03-a7d3-6031edba8bc0', moduleId: 'feature7', canAccess: false },
      { id: '017c9b01-0ae3-4809-b653-31e4fb1b7cbb', moduleId: 'feature6', canAccess: false },
      { id: '088acbe8-4205-4149-aaff-0cf3fee99e11', moduleId: 'feature9', canAccess: false }
    ];
    
    // 更新用户权限
    const updateResponse = await fetch(`${API_BASE_URL}/api/admin/users/${sessionData.user.id}/permissions/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': sessionData.user.id,
        'X-User-Name': sessionData.user.username,
        'X-User-Admin': sessionData.user.isAdmin ? 'true' : 'false'
      },
      body: JSON.stringify({ permissions: updatedPermissions })
    });
    
    if (updateResponse.ok) {
      console.log('✅ 权限更新成功');
    } else {
      console.log('❌ 权限更新失败');
      return;
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
      console.log('启用的权限:', enabledPermissions2.map(p => p.moduleId));
      
      // 检查ai-email是否被禁用
      const aiEmailPermission = userData2.permissions.find(p => p.moduleId === 'ai-email');
      console.log('ai-email权限状态:', aiEmailPermission?.canAccess ? '启用' : '禁用');
    }
    
  } catch (error) {
    console.error('❌ 测试过程中出错:', error);
  }
}

// 运行测试
testPermissionUpdate(); 