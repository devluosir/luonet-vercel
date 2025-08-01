const API_BASE_URL = 'https://udb.luocompany.net';

async function testNextAuthLogin() {
  try {
    console.log('开始测试NextAuth登录...');
    
    // 测试NextAuth登录
    const loginResponse = await fetch(`${API_BASE_URL}/api/auth/signin/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'luojun',
        password: 'jschina8',
        callbackUrl: '/dashboard'
      })
    });
    
    console.log('NextAuth登录响应状态:', loginResponse.status);
    console.log('NextAuth登录响应头:', Object.fromEntries(loginResponse.headers.entries()));
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.text();
      console.log('NextAuth登录成功，响应数据:', loginData);
    } else {
      const errorData = await loginResponse.text();
      console.log('NextAuth登录失败:', errorData);
    }
    
  } catch (error) {
    console.error('❌ 测试过程中出错:', error);
  }
}

// 运行测试
testNextAuthLogin(); 