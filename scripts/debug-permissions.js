const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugPermissions() {
  try {
    console.log('=== 数据库权限调试 ===');
    
    // 检查所有用户
    const users = await prisma.user.findMany({
      include: {
        permissions: true
      }
    });
    
    console.log(`\n总用户数: ${users.length}`);
    
    users.forEach((user, index) => {
      console.log(`\n--- 用户 ${index + 1} ---`);
      console.log(`ID: ${user.id}`);
      console.log(`用户名: ${user.username}`);
      console.log(`邮箱: ${user.email}`);
      console.log(`状态: ${user.status}`);
      console.log(`管理员: ${user.isAdmin}`);
      console.log(`权限数量: ${user.permissions.length}`);
      
      if (user.permissions.length > 0) {
        console.log('权限详情:');
        user.permissions.forEach(permission => {
          console.log(`  - ${permission.moduleId}: ${permission.canAccess}`);
        });
      } else {
        console.log('  - 无权限数据');
      }
    });
    
    // 检查权限表
    const allPermissions = await prisma.permission.findMany();
    console.log(`\n总权限记录数: ${allPermissions.length}`);
    
    if (allPermissions.length > 0) {
      console.log('权限记录详情:');
      allPermissions.forEach(permission => {
        console.log(`  - 用户ID: ${permission.userId}, 模块: ${permission.moduleId}, 可访问: ${permission.canAccess}`);
      });
    }
    
  } catch (error) {
    console.error('调试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugPermissions(); 