const fetch = require('node-fetch');

const API_BASE_URL = 'https://udb.luocompany.net';

async function testRouteMatching() {
  console.log('🔍 测试路由匹配...\n');

  try {
    // 1. 管理员登录
    console.log('1. 管理员登录...');
    const loginResponse = await fetch(`${API_BASE_URL}/api/auth/d1-users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'luojun',
        password: '123456'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`登录失败: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    console.log('✅ 管理员登录成功');

    // 2. 测试不同的权限更新路径
    console.log('\n2. 测试不同的权限更新路径...');
    
    const userId = loginData.user.id;
    const testPaths = [
      `/api/admin/users/${userId}/permissions`,
      `/api/admin/users/${userId}/permissions/batch`,
      `/api/admin/users/${userId}/permissions/`,
      `/api/admin/users/${userId}/permissions/123`
    ];

    for (const testPath of testPaths) {
      console.log(`\n测试路径: ${testPath}`);
      
      const response = await fetch(`${API_BASE_URL}${testPath}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': loginData.user.id,
          'X-User-Name': loginData.user.username,
          'X-User-Admin': loginData.user.isAdmin ? 'true' : 'false',
        },
        body: JSON.stringify({
          permissions: [{
            id: 'test-id',
            canAccess: true
          }]
        })
      });

      console.log(`响应状态: ${response.status}`);
      const responseText = await response.text();
      console.log(`响应内容: ${responseText}`);
      
      if (response.status === 404) {
        console.log('❌ 路由未找到');
      } else if (response.status === 200) {
        console.log('✅ 路由匹配成功');
      } else {
        console.log('⚠️ 路由匹配但返回错误');
      }
    }

    // 3. 测试批量权限更新路径
    console.log('\n3. 测试批量权限更新路径...');
    const batchResponse = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/permissions/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': loginData.user.id,
        'X-User-Name': loginData.user.username,
        'X-User-Admin': loginData.user.isAdmin ? 'true' : 'false',
      },
      body: JSON.stringify({
        permissions: [{
          id: 'test-id',
          canAccess: true
        }]
      })
    });

    console.log(`批量更新响应状态: ${batchResponse.status}`);
    const batchResponseText = await batchResponse.text();
    console.log(`批量更新响应内容: ${batchResponseText}`);

    console.log('\n🎉 路由匹配测试完成');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

testRouteMatching(); 