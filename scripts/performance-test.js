#!/usr/bin/env node

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testPerformance() {
  console.log('🚀 开始性能测试...\n');

  const tests = [
    {
      name: '数据库连接检查',
      url: '/api/debug',
      method: 'GET'
    },
    {
      name: '用户信息获取',
      url: '/api/users/me',
      method: 'GET',
      headers: {
        'Cookie': 'next-auth.session-token=test' // 测试登录状态
      }
    }
  ];

  for (const test of tests) {
    console.log(`📊 测试: ${test.name}`);
    
    const times = [];
    const iterations = 5;
    
    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      
      try {
        const response = await fetch(`${BASE_URL}${test.url}`, {
          method: test.method,
          headers: test.headers || {}
        });
        
        const end = Date.now();
        const duration = end - start;
        times.push(duration);
        
        console.log(`  第${i + 1}次: ${duration}ms (状态: ${response.status})`);
        
        // 添加延迟避免过于频繁的请求
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.log(`  第${i + 1}次: 失败 - ${error.message}`);
      }
    }
    
    if (times.length > 0) {
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const min = Math.min(...times);
      const max = Math.max(...times);
      
      console.log(`  📈 平均时间: ${avg.toFixed(2)}ms`);
      console.log(`  📉 最快时间: ${min}ms`);
      console.log(`  📈 最慢时间: ${max}ms`);
      
      // 性能评估
      if (avg < 1000) {
        console.log('  ✅ 性能优秀 (< 1秒)');
      } else if (avg < 3000) {
        console.log('  🟡 性能良好 (1-3秒)');
      } else {
        console.log('  🔴 性能需要优化 (> 3秒)');
      }
    }
    
    console.log('');
  }
  
  console.log('🎯 性能测试完成！');
}

// 运行测试
testPerformance().catch(console.error); 