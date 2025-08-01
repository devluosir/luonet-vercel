const API_BASE_URL = 'https://udb.luocompany.net';

async function testNewAuth() {
  try {
    console.log('开始测试新的认证系统...');
    
    // 模拟NextAuth session数据
    const sessionData = {
      user: {
        id: 'cmd9wa3b100002m1jfs5knol8',
        name: 'luojun',
        username: 'luojun',
        isAdmin: true
      }
    };
    
    // 测试获取用户列表
    const usersResponse = await fetch(`${API_BASE_URL}/api/admin/users`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': sessionData.user.id,
        'X-User-Name': sessionData.user.username,
        'X-User-Admin': sessionData.user.isAdmin ? 'true' : 'false'
      }
    });
    
    console.log('用户列表响应状态:', usersResponse.status);
    
    if (usersResponse.ok) {
      const usersData = await usersResponse.json();
      console.log('✅ 获取用户列表成功');
      console.log('用户数量:', usersData.length);
    } else {
      const errorData = await usersResponse.json();
      console.log('❌ 获取用户列表失败:', errorData);
    }
    
    // 测试获取单个用户
    const userResponse = await fetch(`${API_BASE_URL}/api/admin/users/${sessionData.user.id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': sessionData.user.id,
        'X-User-Name': sessionData.user.username,
        'X-User-Admin': sessionData.user.isAdmin ? 'true' : 'false'
      }
    });
    
    console.log('单个用户响应状态:', userResponse.status);
    
    if (userResponse.ok) {
      const userData = await userResponse.json();
      console.log('✅ 获取单个用户成功');
      console.log('用户权限数量:', userData.permissions?.length || 0);
    } else {
      const errorData = await userResponse.json();
      console.log('❌ 获取单个用户失败:', errorData);
    }
    
  } catch (error) {
    console.error('❌ 测试过程中出错:', error);
  }
}

// 运行测试
testNewAuth(); 