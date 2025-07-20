const fetch = require('node-fetch');

async function testAPI() {
  try {
    console.log('=== API 测试 ===');
    
    // 测试权限API端点
    const response = await fetch('http://localhost:3000/api/users/me', {
      headers: {
        'Content-Type': 'application/json',
        // 注意：这里需要有效的session cookie，所以这个测试可能不会完全工作
        // 但我们可以检查API端点是否存在
      }
    });
    
    console.log('API 响应状态:', response.status);
    console.log('API 响应头:', response.headers);
    
    if (response.ok) {
      const data = await response.json();
      console.log('API 响应数据:', JSON.stringify(data, null, 2));
    } else {
      console.log('API 错误:', response.statusText);
    }
    
  } catch (error) {
    console.error('API 测试失败:', error.message);
  }
}

testAPI(); 