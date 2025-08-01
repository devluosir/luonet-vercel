const API_BASE_URL = 'https://udb.luocompany.net';

async function checkUserPermissions() {
  try {
    console.log('开始检查用户权限数据...');
    
    // 测试获取用户数据
    const response = await fetch(`${API_BASE_URL}/api/admin/users/cmd9wa3b100002m1jfs5knol8`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      }
    });
    
    console.log('响应状态:', response.status);
    console.log('响应头:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log('用户数据:', data);
      console.log('权限数据:', data.permissions);
      console.log('权限数量:', data.permissions?.length || 0);
      
      if (data.permissions && data.permissions.length > 0) {
        console.log('✅ 用户有权限数据');
        data.permissions.forEach((perm, index) => {
          console.log(`权限 ${index + 1}:`, {
            id: perm.id,
            moduleId: perm.moduleId,
            canAccess: perm.canAccess
          });
        });
      } else {
        console.log('❌ 用户没有权限数据');
      }
    } else {
      const errorData = await response.json();
      console.log('❌ 获取用户数据失败:', errorData);
    }
    
  } catch (error) {
    console.error('❌ 检查过程中出错:', error);
  }
}

// 运行检查
checkUserPermissions(); 