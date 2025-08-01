#!/usr/bin/env node

/**
 * 权限刷新测试脚本
 * 验证权限刷新时是否正确获取当前用户的权限
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

// 模拟localStorage
const mockLocalStorage = {};

// 模拟NextAuth session缓存
const mockSessionStorage = {};

// 模拟权限缓存键名生成
const getUserPermissionBackupKey = (userId) => `permissions_backup_${userId}`;
const getUserPermissionStoreKey = (userId) => `permission-store_${userId}`;

// 模拟权限备份函数
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

// 模拟清除NextAuth session缓存
const clearNextAuthSessionCache = () => {
  delete mockSessionStorage['next-auth.session-token'];
  delete mockSessionStorage['next-auth.csrf-token'];
  delete mockLocalStorage['next-auth.session-token'];
  delete mockLocalStorage['next-auth.csrf-token'];
  
  console.log(`🗑️ 已清除NextAuth session缓存`);
};

// 模拟获取NextAuth session
const getNextAuthSession = (currentUser) => {
  // 模拟session缓存
  const sessionKey = 'next-auth.session-token';
  const cachedSession = mockSessionStorage[sessionKey];
  
  if (cachedSession) {
    console.log(`📋 从缓存获取到session: ${cachedSession}`);
    return JSON.parse(cachedSession);
  }
  
  // 如果没有缓存，创建新的session
  const session = {
    user: {
      id: currentUser.id,
      username: currentUser.username,
      permissions: currentUser.permissions
    }
  };
  
  mockSessionStorage[sessionKey] = JSON.stringify(session);
  console.log(`🆕 创建新的session: ${currentUser.username}`);
  
  return session;
};

// 测试权限刷新逻辑
function testPermissionRefresh() {
  console.log('🚀 开始权限刷新测试...\n');
  
  // 测试用户1
  console.log('👤 测试用户1 (testuser1)');
  const user1 = testUsers[0];
  
  // 1. 初始登录
  console.log('\n📝 步骤1: 用户1初始登录');
  const session1 = getNextAuthSession(user1);
  backupPermissions(user1);
  
  // 2. 模拟权限刷新
  console.log('\n📝 步骤2: 用户1权限刷新');
  clearUserPermissionCache(user1.id);
  clearNextAuthSessionCache();
  
  // 3. 重新获取session
  console.log('\n📝 步骤3: 重新获取session');
  const newSession1 = getNextAuthSession(user1);
  console.log(`✅ 用户1刷新后的权限: ${JSON.stringify(newSession1.user.permissions)}`);
  
  // 验证权限是否正确
  const user1Permissions = newSession1.user.permissions;
  const expectedUser1Permissions = user1.permissions;
  
  if (JSON.stringify(user1Permissions) === JSON.stringify(expectedUser1Permissions)) {
    console.log('✅ 用户1权限刷新正确');
  } else {
    console.log('❌ 用户1权限刷新错误');
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // 测试用户2
  console.log('👤 测试用户2 (testuser2)');
  const user2 = testUsers[1];
  
  // 1. 初始登录
  console.log('\n📝 步骤1: 用户2初始登录');
  const session2 = getNextAuthSession(user2);
  backupPermissions(user2);
  
  // 2. 模拟权限刷新
  console.log('\n📝 步骤2: 用户2权限刷新');
  clearUserPermissionCache(user2.id);
  clearNextAuthSessionCache();
  
  // 3. 重新获取session
  console.log('\n📝 步骤3: 重新获取session');
  const newSession2 = getNextAuthSession(user2);
  console.log(`✅ 用户2刷新后的权限: ${JSON.stringify(newSession2.user.permissions)}`);
  
  // 验证权限是否正确
  const user2Permissions = newSession2.user.permissions;
  const expectedUser2Permissions = user2.permissions;
  
  if (JSON.stringify(user2Permissions) === JSON.stringify(expectedUser2Permissions)) {
    console.log('✅ 用户2权限刷新正确');
  } else {
    console.log('❌ 用户2权限刷新错误');
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // 测试用户切换
  console.log('🔄 测试用户切换场景');
  
  // 用户1登录
  console.log('\n📝 用户1登录');
  const session1Again = getNextAuthSession(user1);
  backupPermissions(user1);
  
  // 切换到用户2
  console.log('\n📝 切换到用户2');
  clearUserPermissionCache(user1.id);
  clearNextAuthSessionCache();
  
  const session2Again = getNextAuthSession(user2);
  backupPermissions(user2);
  
  // 验证用户2的权限是否正确
  const finalUser2Permissions = session2Again.user.permissions;
  const expectedFinalUser2Permissions = user2.permissions;
  
  if (JSON.stringify(finalUser2Permissions) === JSON.stringify(expectedFinalUser2Permissions)) {
    console.log('✅ 用户切换后权限正确');
  } else {
    console.log('❌ 用户切换后权限错误');
  }
  
  console.log('\n📊 权限刷新测试完成');
  
  // 显示最终缓存状态
  console.log('\n📋 最终缓存状态:');
  Object.keys(mockLocalStorage).forEach(key => {
    console.log(`  ${key}: ${mockLocalStorage[key].substring(0, 100)}...`);
  });
  
  Object.keys(mockSessionStorage).forEach(key => {
    console.log(`  ${key}: ${mockSessionStorage[key].substring(0, 100)}...`);
  });
}

// 运行测试
testPermissionRefresh(); 