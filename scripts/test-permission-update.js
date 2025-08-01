#!/usr/bin/env node

/**
 * 权限修改刷新测试脚本
 * 验证管理员修改权限后刷新是否生效
 */

// 模拟localStorage
const mockLocalStorage = {};

// 模拟权限缓存键名生成
const getUserPermissionBackupKey = (userId) => `permissions_backup_${userId}`;
const getUserPermissionStoreKey = (userId) => `permission-store_${userId}`;

// 模拟权限备份
const backupPermissions = (user) => {
  if (!user) return;
  
  const backupKey = getUserPermissionBackupKey(user.id);
  const backup = {
    user: user,
    timestamp: Date.now()
  };
  
  mockLocalStorage[backupKey] = JSON.stringify(backup);
  console.log(`✅ 用户 ${user.username} 的权限已备份到 ${backupKey}`);
};

// 模拟清除用户权限缓存
const clearUserPermissionCache = (userId) => {
  const backupKey = getUserPermissionBackupKey(userId);
  const storeKey = getUserPermissionStoreKey(userId);
  
  delete mockLocalStorage[backupKey];
  delete mockLocalStorage[storeKey];
  
  console.log(`🗑️ 已清除用户 ${userId} 的权限缓存`);
};

// 模拟权限store
const mockPermissionStore = {
  user: null,
  clearUser: function() {
    if (this.user) {
      clearUserPermissionCache(this.user.id);
      this.user = null;
      console.log(`🔄 已清除当前用户权限缓存`);
    }
  },
  getState: function() {
    return this;
  }
};

// 测试场景1: 管理员修改其他用户权限
function testAdminModifyOtherUser() {
  console.log('🧪 测试场景1: 管理员修改其他用户权限');
  
  // 设置当前用户为管理员
  const adminUser = {
    id: 'admin1',
    username: 'admin',
    permissions: [
      { id: 'perm1', moduleId: 'quotation', canAccess: true },
      { id: 'perm2', moduleId: 'invoice', canAccess: true }
    ]
  };
  
  const targetUser = {
    id: 'user1',
    username: 'testuser',
    permissions: [
      { id: 'perm3', moduleId: 'quotation', canAccess: false },
      { id: 'perm4', moduleId: 'invoice', canAccess: false }
    ]
  };
  
  // 备份权限
  backupPermissions(adminUser);
  backupPermissions(targetUser);
  
  console.log('\n📋 初始缓存状态:');
  Object.keys(mockLocalStorage).forEach(key => {
    console.log(`  ${key}: ${mockLocalStorage[key].substring(0, 100)}...`);
  });
  
  // 模拟管理员修改其他用户权限
  console.log('\n📝 管理员修改其他用户权限...');
  mockPermissionStore.user = adminUser;
  
  // 清除目标用户缓存
  clearUserPermissionCache(targetUser.id);
  
  // 检查管理员缓存是否被清除
  const adminCacheKey = getUserPermissionBackupKey(adminUser.id);
  if (mockLocalStorage[adminCacheKey]) {
    console.log('✅ 管理员缓存未被清除（正确，因为修改的是其他用户）');
  } else {
    console.log('❌ 管理员缓存被错误清除');
  }
  
  console.log('\n📋 修改后缓存状态:');
  Object.keys(mockLocalStorage).forEach(key => {
    console.log(`  ${key}: ${mockLocalStorage[key].substring(0, 100)}...`);
  });
}

// 测试场景2: 管理员修改自己的权限
function testAdminModifySelf() {
  console.log('\n🧪 测试场景2: 管理员修改自己的权限');
  
  // 清空缓存
  Object.keys(mockLocalStorage).forEach(key => delete mockLocalStorage[key]);
  
  // 设置当前用户为管理员
  const adminUser = {
    id: 'admin1',
    username: 'admin',
    permissions: [
      { id: 'perm1', moduleId: 'quotation', canAccess: true },
      { id: 'perm2', moduleId: 'invoice', canAccess: true }
    ]
  };
  
  // 备份权限
  backupPermissions(adminUser);
  
  console.log('\n📋 初始缓存状态:');
  Object.keys(mockLocalStorage).forEach(key => {
    console.log(`  ${key}: ${mockLocalStorage[key].substring(0, 100)}...`);
  });
  
  // 模拟管理员修改自己的权限
  console.log('\n📝 管理员修改自己的权限...');
  mockPermissionStore.user = adminUser;
  
  // 清除目标用户缓存（这里是管理员自己）
  clearUserPermissionCache(adminUser.id);
  
  // 检查管理员缓存是否被清除
  const adminCacheKey = getUserPermissionBackupKey(adminUser.id);
  if (!mockLocalStorage[adminCacheKey]) {
    console.log('✅ 管理员缓存已被清除（正确，因为修改的是自己）');
  } else {
    console.log('❌ 管理员缓存未被清除');
  }
  
  // 模拟调用clearUser
  mockPermissionStore.clearUser();
  
  console.log('\n📋 修改后缓存状态:');
  Object.keys(mockLocalStorage).forEach(key => {
    console.log(`  ${key}: ${mockLocalStorage[key].substring(0, 100)}...`);
  });
}

// 测试场景3: 权限修改后的刷新机制
function testPermissionRefresh() {
  console.log('\n🧪 测试场景3: 权限修改后的刷新机制');
  
  // 清空缓存
  Object.keys(mockLocalStorage).forEach(key => delete mockLocalStorage[key]);
  
  const user = {
    id: 'user1',
    username: 'testuser',
    permissions: [
      { id: 'perm1', moduleId: 'quotation', canAccess: false },
      { id: 'perm2', moduleId: 'invoice', canAccess: false }
    ]
  };
  
  // 模拟权限修改前
  console.log('\n📝 权限修改前:');
  backupPermissions(user);
  console.log(`用户权限: ${JSON.stringify(user.permissions)}`);
  
  // 模拟权限修改后
  console.log('\n📝 权限修改后:');
  const updatedUser = {
    ...user,
    permissions: [
      { id: 'perm1', moduleId: 'quotation', canAccess: true },
      { id: 'perm2', moduleId: 'invoice', canAccess: true }
    ]
  };
  
  // 清除旧缓存
  clearUserPermissionCache(user.id);
  
  // 备份新权限
  backupPermissions(updatedUser);
  console.log(`用户权限: ${JSON.stringify(updatedUser.permissions)}`);
  
  // 验证缓存是否正确更新
  const cacheKey = getUserPermissionBackupKey(user.id);
  const cachedData = mockLocalStorage[cacheKey];
  
  if (cachedData) {
    const parsed = JSON.parse(cachedData);
    if (JSON.stringify(parsed.user.permissions) === JSON.stringify(updatedUser.permissions)) {
      console.log('✅ 权限缓存已正确更新');
    } else {
      console.log('❌ 权限缓存更新失败');
    }
  } else {
    console.log('❌ 权限缓存不存在');
  }
}

// 运行所有测试
function runAllTests() {
  console.log('🚀 开始权限修改刷新测试...\n');
  
  testAdminModifyOtherUser();
  testAdminModifySelf();
  testPermissionRefresh();
  
  console.log('\n📊 所有测试完成！');
}

// 运行测试
runAllTests(); 