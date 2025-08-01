const API_BASE_URL = 'https://udb.luocompany.net';

async function testPermissionSave() {
  try {
    console.log('开始测试权限保存功能...');
    
    // 模拟权限数据
    const testPermissions = [
      { id: '1', canAccess: true },
      { id: '2', canAccess: false },
      { moduleId: 'new-module', canAccess: true, userId: 'test-user-id' }
    ];
    
    console.log('测试权限数据:', testPermissions);
    
    // 尝试获取真实的认证token
    let authToken = 'test-token'; // 默认值
    
    // 发送请求
    const response = await fetch(`${API_BASE_URL}/api/admin/users/test-user-id/permissions/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ permissions: testPermissions })
    });
    
    console.log('响应状态:', response.status);
    console.log('响应头:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log('响应数据:', data);
    
    if (response.ok) {
      console.log('✅ 权限保存测试成功');
    } else {
      console.log('❌ 权限保存测试失败:', data);
    }
    
  } catch (error) {
    console.error('❌ 测试过程中出错:', error);
  }
}

// 运行测试
testPermissionSave(); 