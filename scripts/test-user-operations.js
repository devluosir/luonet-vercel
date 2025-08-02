const API_BASE_URL = 'https://udb.luocompany.net';

// 模拟管理员session信息
const adminHeaders = {
  'Content-Type': 'application/json',
  'X-User-ID': 'admin-test',
  'X-User-Name': 'admin',
  'X-User-Admin': 'true'
};

async function testCreateUser() {
  console.log('测试创建用户...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        username: 'testuser-' + Date.now(),
        password: 'testpass123',
        email: 'test@example.com',
        isAdmin: false
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ 创建用户成功:', data);
      return data.user;
    } else {
      console.log('❌ 创建用户失败:', data);
      return null;
    }
  } catch (error) {
    console.log('❌ 创建用户异常:', error.message);
    return null;
  }
}

async function testDeleteUser(userId) {
  console.log('测试删除用户...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
      method: 'DELETE',
      headers: adminHeaders
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ 删除用户成功:', data);
      return true;
    } else {
      console.log('❌ 删除用户失败:', data);
      return false;
    }
  } catch (error) {
    console.log('❌ 删除用户异常:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('开始测试用户操作...\n');
  
  // 测试创建用户
  const newUser = await testCreateUser();
  
  if (newUser) {
    console.log('\n等待2秒后删除用户...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 测试删除用户
    await testDeleteUser(newUser.id);
  }
  
  console.log('\n测试完成！');
}

runTests().catch(console.error); 