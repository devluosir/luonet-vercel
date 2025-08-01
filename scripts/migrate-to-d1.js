const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// 模拟D1数据库操作（实际部署时会在Cloudflare Workers环境中运行）
class MockD1Client {
  constructor() {
    this.users = [];
    this.permissions = [];
  }

  async createUser(user) {
    const newUser = {
      id: user.id,
      username: user.username,
      password: user.password,
      email: user.email,
      status: user.status,
      isAdmin: user.isAdmin,
      lastLoginAt: user.lastLoginAt?.toISOString() || null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    };
    this.users.push(newUser);
    return newUser;
  }

  async createPermission(permission) {
    const newPermission = {
      id: permission.id,
      userId: permission.userId,
      moduleId: permission.moduleId,
      canAccess: permission.canAccess
    };
    this.permissions.push(newPermission);
    return newPermission;
  }

  async getAllUsers() {
    return this.users;
  }

  async getUserPermissions(userId) {
    return this.permissions.filter(p => p.userId === userId);
  }
}

async function migrateToD1() {
  console.log('开始迁移用户数据到D1数据库...');
  
  const prisma = new PrismaClient();
  const d1Client = new MockD1Client();

  try {
    // 获取所有用户
    console.log('获取用户数据...');
    const users = await prisma.user.findMany({
      include: {
        permissions: true
      }
    });

    console.log(`找到 ${users.length} 个用户`);

    // 迁移用户数据
    for (const user of users) {
      console.log(`迁移用户: ${user.username}`);
      
      // 创建用户
      await d1Client.createUser({
        id: user.id,
        username: user.username,
        password: user.password,
        email: user.email,
        status: user.status,
        isAdmin: user.isAdmin,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      });

      // 迁移权限
      for (const permission of user.permissions) {
        await d1Client.createPermission({
          id: permission.id,
          userId: permission.userId,
          moduleId: permission.moduleId,
          canAccess: permission.canAccess
        });
      }
    }

    // 验证迁移结果
    const migratedUsers = await d1Client.getAllUsers();
    console.log(`成功迁移 ${migratedUsers.length} 个用户`);

    // 验证权限数据
    let totalPermissions = 0;
    for (const user of migratedUsers) {
      const permissions = await d1Client.getUserPermissions(user.id);
      totalPermissions += permissions.length;
    }
    console.log(`成功迁移 ${totalPermissions} 个权限记录`);

    console.log('迁移完成！');
    
    // 生成SQL插入语句（用于手动执行）
    console.log('\n=== 生成的SQL插入语句 ===');
    console.log('-- 用户数据');
    for (const user of migratedUsers) {
      console.log(`INSERT INTO User (id, username, password, email, status, isAdmin, lastLoginAt, createdAt, updatedAt) VALUES ('${user.id}', '${user.username}', '${user.password}', ${user.email ? `'${user.email}'` : 'NULL'}, ${user.status ? 1 : 0}, ${user.isAdmin ? 1 : 0}, ${user.lastLoginAt ? `'${user.lastLoginAt}'` : 'NULL'}, '${user.createdAt}', '${user.updatedAt}');`);
    }
    
    console.log('\n-- 权限数据');
    for (const user of migratedUsers) {
      const permissions = await d1Client.getUserPermissions(user.id);
      for (const permission of permissions) {
        console.log(`INSERT INTO Permission (id, userId, moduleId, canAccess) VALUES ('${permission.id}', '${permission.userId}', '${permission.moduleId}', ${permission.canAccess ? 1 : 0});`);
      }
    }

  } catch (error) {
    console.error('迁移失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  migrateToD1();
}

module.exports = { migrateToD1 }; 