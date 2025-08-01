const fetch = require('node-fetch');

const API_BASE_URL = 'https://udb.luocompany.net';

async function testCompletePermissionSystem() {
  console.log('🧪 全面测试权限系统...\n');

  try {
    // 1. 测试用户认证
    console.log('1. 测试用户认证...');
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
    console.log('✅ 用户认证成功');
    console.log('用户信息:', {
      id: loginData.user.id,
      username: loginData.user.username,
      isAdmin: loginData.user.isAdmin
    });

    // 2. 测试获取用户列表
    console.log('\n2. 测试获取用户列表...');
    const usersResponse = await fetch(`${API_BASE_URL}/api/admin/users`, {
      headers: {
        'X-User-ID': loginData.user.id,
        'X-User-Name': loginData.user.username,
        'X-User-Admin': loginData.user.isAdmin ? 'true' : 'false',
      }
    });

    if (!usersResponse.ok) {
      throw new Error(`获取用户列表失败: ${usersResponse.status}`);
    }

    const usersData = await usersResponse.json();
    console.log('✅ 获取用户列表成功');
    console.log('用户数量:', usersData.users?.length || 0);

    // 3. 测试获取单个用户权限
    console.log('\n3. 测试获取单个用户权限...');
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
    console.log('权限数量:', userData.permissions?.length || 0);
    console.log('启用的权限:', userData.permissions?.filter(p => p.canAccess).length || 0);

    // 4. 测试获取当前用户信息（/users/me）
    console.log('\n4. 测试获取当前用户信息...');
    const meResponse = await fetch(`${API_BASE_URL}/users/me`, {
      headers: {
        'X-User-ID': loginData.user.id,
        'X-User-Name': loginData.user.username,
        'X-User-Admin': loginData.user.isAdmin ? 'true' : 'false',
      }
    });

    if (!meResponse.ok) {
      throw new Error(`获取当前用户信息失败: ${meResponse.status}`);
    }

    const meData = await meResponse.json();
    console.log('✅ 获取当前用户信息成功');
    console.log('权限数量:', meData.permissions?.length || 0);
    console.log('启用的权限:', meData.permissions?.filter(p => p.canAccess).length || 0);

    // 5. 测试权限更新（单个权限）
    console.log('\n5. 测试权限更新（单个权限）...');
    const historyPermission = userData.permissions.find(p => p.moduleId === 'history');
    if (!historyPermission) {
      throw new Error('未找到history权限');
    }

    const newCanAccess = !historyPermission.canAccess;
    console.log(`准备将history权限从 ${historyPermission.canAccess} 更新为 ${newCanAccess}`);

    const updateResponse = await fetch(`${API_BASE_URL}/api/admin/users/${loginData.user.id}/permissions`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': loginData.user.id,
        'X-User-Name': loginData.user.username,
        'X-User-Admin': loginData.user.isAdmin ? 'true' : 'false',
      },
      body: JSON.stringify({
        permissions: [{
          id: historyPermission.id,
          canAccess: newCanAccess
        }]
      })
    });

    console.log('权限更新响应状态:', updateResponse.status);
    const updateResponseText = await updateResponse.text();
    console.log('权限更新响应内容:', updateResponseText);

    if (!updateResponse.ok) {
      console.log('⚠️ 权限更新失败，但继续测试其他功能');
    } else {
      console.log('✅ 权限更新成功');
    }

    // 6. 测试权限刷新（重新获取权限）
    console.log('\n6. 测试权限刷新...');
    const refreshResponse = await fetch(`${API_BASE_URL}/users/me?force=true`, {
      headers: {
        'X-User-ID': loginData.user.id,
        'X-User-Name': loginData.user.username,
        'X-User-Admin': loginData.user.isAdmin ? 'true' : 'false',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    if (!refreshResponse.ok) {
      throw new Error(`权限刷新失败: ${refreshResponse.status}`);
    }

    const refreshData = await refreshResponse.json();
    console.log('✅ 权限刷新成功');
    console.log('刷新后权限数量:', refreshData.permissions?.length || 0);
    console.log('刷新后启用的权限:', refreshData.permissions?.filter(p => p.canAccess).length || 0);

    // 7. 比较权限数据
    console.log('\n7. 比较权限数据...');
    const originalPermissions = userData.permissions || [];
    const refreshedPermissions = refreshData.permissions || [];
    
    console.log('原始权限数量:', originalPermissions.length);
    console.log('刷新后权限数量:', refreshedPermissions.length);
    
    const originalEnabled = originalPermissions.filter(p => p.canAccess).map(p => p.moduleId).sort();
    const refreshedEnabled = refreshedPermissions.filter(p => p.canAccess).map(p => p.moduleId).sort();
    
    console.log('原始启用的模块:', originalEnabled);
    console.log('刷新后启用的模块:', refreshedEnabled);
    
    const hasChanges = JSON.stringify(originalEnabled) !== JSON.stringify(refreshedEnabled);
    if (hasChanges) {
      console.log('✅ 检测到权限变化');
    } else {
      console.log('⚠️ 权限没有变化');
    }

    // 8. 测试批量权限更新
    console.log('\n8. 测试批量权限更新...');
    const batchUpdateResponse = await fetch(`${API_BASE_URL}/api/admin/users/${loginData.user.id}/permissions/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': loginData.user.id,
        'X-User-Name': loginData.user.username,
        'X-User-Admin': loginData.user.isAdmin ? 'true' : 'false',
      },
      body: JSON.stringify({
        permissions: userData.permissions.map(p => ({
          id: p.id,
          canAccess: p.canAccess
        }))
      })
    });

    console.log('批量更新响应状态:', batchUpdateResponse.status);
    const batchResponseText = await batchUpdateResponse.text();
    console.log('批量更新响应内容:', batchResponseText);

    if (!batchUpdateResponse.ok) {
      console.log('⚠️ 批量权限更新失败，但继续测试其他功能');
    } else {
      console.log('✅ 批量权限更新成功');
    }

    // 9. 总结测试结果
    console.log('\n9. 测试结果总结...');
    console.log('✅ 用户认证: 正常');
    console.log('✅ 获取用户列表: 正常');
    console.log('✅ 获取单个用户权限: 正常');
    console.log('✅ 获取当前用户信息: 正常');
    console.log('✅ 权限刷新: 正常');
    
    if (updateResponse.ok) {
      console.log('✅ 单个权限更新: 正常');
    } else {
      console.log('❌ 单个权限更新: 失败');
    }
    
    if (batchUpdateResponse.ok) {
      console.log('✅ 批量权限更新: 正常');
    } else {
      console.log('❌ 批量权限更新: 失败');
    }

    console.log('\n🎉 权限系统测试完成');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

testCompletePermissionSystem(); 