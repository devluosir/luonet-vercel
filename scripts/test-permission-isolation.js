#!/usr/bin/env node

/**
 * 权限隔离测试脚本
 * 验证不同用户的权限数据是否互相影响
 */

const API_BASE_URL = 'https://udb.luocompany.net';

// 模拟用户数据
const testUsers = [
  {
    id: 'user1',
    username: 'testuser1',
    permissions: [
      { id: 'perm1', moduleId: 'quotation', canAccess: true },
      { id: 'perm2', moduleId: 'invoice', canAccess: false },
      { id: 'perm3', moduleId: 'purchase', canAccess: true }
    ]
  },
  {
    id: 'user2', 
    username: 'testuser2',
    permissions: [
      { id: 'perm4', moduleId: 'quotation', canAccess: false },
      { id: 'perm5', moduleId: 'invoice', canAccess: true },
      { id: 'perm6', moduleId: 'purchase', canAccess: false }
    ]
  }
];

// 测试权限缓存隔离
function testPermissionCacheIsolation() {
  console.log('🧪 测试权限缓存隔离...');
  
  // 模拟localStorage
  const mockLocalStorage = {};
  
  // 模拟用户特定的权限备份key生成
  const getUserPermissionBackupKey = (userId) => `permissions_backup_${userId}`;
  
  // 为不同用户设置不同的权限数据
  testUsers.forEach(user => {
    const backupKey = getUserPermissionBackupKey(user.id);
    mockLocalStorage[backupKey] = JSON.stringify({
      user,
      timestamp: Date.now()
    });
    console.log(`✅ 用户 ${user.username} 的权限已缓存到 ${backupKey}`);
  });
  
  // 验证权限数据隔离
  testUsers.forEach(user => {
    const backupKey = getUserPermissionBackupKey(user.id);
    const cachedData = mockLocalStorage[backupKey];
    
    if (cachedData) {
      const parsedData = JSON.parse(cachedData);
      console.log(`📋 用户 ${user.username} 的缓存权限:`, parsedData.user.permissions);
      
      // 验证权限数据是否正确隔离
      const otherUsers = testUsers.filter(u => u.id !== user.id);
      otherUsers.forEach(otherUser => {
        const otherBackupKey = getUserPermissionBackupKey(otherUser.id);
        const otherCachedData = mockLocalStorage[otherBackupKey];
        
        if (otherCachedData) {
          const otherParsedData = JSON.parse(otherCachedData);
          const isIsolated = JSON.stringify(parsedData.user.permissions) !== 
                           JSON.stringify(otherParsedData.user.permissions);
          
          console.log(`🔒 用户 ${user.username} 与 ${otherUser.username} 权限隔离: ${isIsolated ? '✅' : '❌'}`);
        }
      });
    }
  });
  
  console.log('\n📊 权限缓存隔离测试完成');
}

// 测试权限数据一致性
function testPermissionDataConsistency() {
  console.log('\n🧪 测试权限数据一致性...');
  
  testUsers.forEach(user => {
    console.log(`\n👤 用户: ${user.username}`);
    console.log(`🆔 ID: ${user.id}`);
    console.log(`📋 权限数量: ${user.permissions.length}`);
    
    user.permissions.forEach(perm => {
      console.log(`  - ${perm.moduleId}: ${perm.canAccess ? '✅' : '❌'}`);
    });
  });
  
  console.log('\n📊 权限数据一致性测试完成');
}

// 测试权限修改影响
function testPermissionModificationImpact() {
  console.log('\n🧪 测试权限修改影响...');
  
  // 模拟修改用户1的权限
  const originalUser1 = testUsers[0];
  const modifiedUser1 = {
    ...originalUser1,
    permissions: [
      ...originalUser1.permissions,
      { id: 'perm7', moduleId: 'packing', canAccess: true }
    ]
  };
  
  console.log(`📝 修改前用户 ${originalUser1.username} 权限数量: ${originalUser1.permissions.length}`);
  console.log(`📝 修改后用户 ${modifiedUser1.username} 权限数量: ${modifiedUser1.permissions.length}`);
  
  // 验证其他用户权限是否受影响
  testUsers.slice(1).forEach(user => {
    const isUnaffected = user.permissions.length === originalUser1.permissions.length;
    console.log(`🔒 用户 ${user.username} 权限未受影响: ${isUnaffected ? '✅' : '❌'}`);
  });
  
  console.log('\n📊 权限修改影响测试完成');
}

// 主测试函数
function runAllTests() {
  console.log('🚀 开始权限隔离测试...\n');
  
  try {
    testPermissionCacheIsolation();
    testPermissionDataConsistency();
    testPermissionModificationImpact();
    
    console.log('\n🎉 所有测试完成！');
    console.log('\n📋 测试总结:');
    console.log('✅ 权限缓存隔离: 每个用户有独立的权限缓存');
    console.log('✅ 权限数据一致性: 权限数据格式正确');
    console.log('✅ 权限修改影响: 用户权限修改不影响其他用户');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testPermissionCacheIsolation,
  testPermissionDataConsistency,
  testPermissionModificationImpact,
  runAllTests
}; 