const fetch = require('node-fetch');

const API_BASE_URL = 'https://udb.luocompany.net';

async function testDbConnectionSimple() {
  console.log('🔍 简单数据库连接测试...\n');

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

    // 2. 测试获取用户权限
    console.log('\n2. 测试获取用户权限...');
    const userResponse = await fetch(`${API_BASE_URL}/api/admin/users/${loginData.user.id}`, {
      headers: {
        'X-User-ID': loginData.user.id,
        'X-User-Name': loginData.user.username,
        'X-User-Admin': loginData.user.isAdmin ? 'true' : 'false',
      }
    });

    if (!userResponse.ok) {
      throw new Error(`获取用户权限失败: ${userResponse.status}`);
    }

    const userData = await userResponse.json();
    console.log('✅ 获取用户权限成功');
    
    // 3. 测试单个权限更新（使用单个权限更新API）
    console.log('\n3. 测试单个权限更新...');
    const historyPermission = userData.permissions.find(p => p.moduleId === 'history');
    if (!historyPermission) {
      throw new Error('未找到history权限');
    }

    console.log('History权限详情:', {
      id: historyPermission.id,
      moduleId: historyPermission.moduleId,
      canAccess: historyPermission.canAccess
    });

    // 4. 测试批量权限更新（这个API是工作的）
    console.log('\n4. 测试批量权限更新...');
    const batchUpdateResponse = await fetch(`${API_BASE_URL}/api/admin/users/${loginData.user.id}/permissions/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': loginData.user.id,
        'X-User-Name': loginData.user.username,
        'X-User-Admin': loginData.user.isAdmin ? 'true' : 'false',
      },
      body: JSON.stringify({
        permissions: [{
          id: historyPermission.id,
          canAccess: !historyPermission.canAccess
        }]
      })
    });

    console.log('批量更新响应状态:', batchUpdateResponse.status);
    const batchResponseText = await batchUpdateResponse.text();
    console.log('批量更新响应内容:', batchResponseText);

    if (batchUpdateResponse.ok) {
      console.log('✅ 批量权限更新成功');
      
      // 5. 验证更新结果
      console.log('\n5. 验证更新结果...');
      const verifyResponse = await fetch(`${API_BASE_URL}/api/admin/users/${loginData.user.id}`, {
        headers: {
          'X-User-ID': loginData.user.id,
          'X-User-Name': loginData.user.username,
          'X-User-Admin': loginData.user.isAdmin ? 'true' : 'false',
        }
      });

      if (!verifyResponse.ok) {
        throw new Error(`验证失败: ${verifyResponse.status}`);
      }

      const verifyData = await verifyResponse.json();
      const updatedHistoryPermission = verifyData.permissions.find(p => p.moduleId === 'history');
      
      console.log('更新后的History权限:', {
        id: updatedHistoryPermission.id,
        moduleId: updatedHistoryPermission.moduleId,
        canAccess: updatedHistoryPermission.canAccess
      });

      if (updatedHistoryPermission.canAccess !== !historyPermission.canAccess) {
        console.log('⚠️ 权限状态未正确更新');
        console.log(`期望: ${!historyPermission.canAccess}, 实际: ${updatedHistoryPermission.canAccess}`);
      } else {
        console.log('✅ 权限状态已正确更新');
      }
    } else {
      console.log('❌ 批量权限更新失败');
    }

    console.log('\n🎉 数据库连接测试完成');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

testDbConnectionSimple(); 