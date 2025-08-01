const API_BASE_URL = 'https://udb.luocompany.net';

async function testLogin() {
  try {
    console.log('开始测试登录...');
    
    // 测试登录
    const loginResponse = await fetch(`${API_BASE_URL}/api/auth/d1-users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'luojun',
        password: 'jschina8'
      })
    });
    
    console.log('登录响应状态:', loginResponse.status);
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('登录成功，用户数据:', loginData);
      
      // 测试获取用户列表（需要认证）
      const usersResponse = await fetch(`${API_BASE_URL}/api/admin/users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token' // 使用测试token
        }
      });
      
      console.log('用户列表响应状态:', usersResponse.status);
      
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        console.log('✅ 获取用户列表成功');
      } else {
        const errorData = await usersResponse.json();
        console.log('❌ 获取用户列表失败:', errorData);
      }
    } else {
      const errorData = await loginResponse.json();
      console.log('❌ 登录失败:', errorData);
    }
    
  } catch (error) {
    console.error('❌ 测试过程中出错:', error);
  }
}

// 运行测试
testLogin(); 