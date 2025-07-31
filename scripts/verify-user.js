const { PrismaClient } = require('@prisma/client');
const { compare, hash } = require('bcryptjs');

const prisma = new PrismaClient();

async function verifyUser() {
  try {
    // 1. 查找用户
    const user = await prisma.user.findUnique({
      where: { username: 'luojun' },
      include: { permissions: true }
    });

    if (!user) {
      console.log('用户不存在，创建新用户...');
      // 创建用户
      const password = await hash('jschina8', 10);
      const newUser = await prisma.user.create({
        data: {
          username: 'luojun',
          password,
          email: 'luojun@example.com',
          isAdmin: true,
          status: true,
          permissions: {
            create: [
              { moduleId: 'quotation', canAccess: true },
              { moduleId: 'invoice', canAccess: true },
              { moduleId: 'purchase', canAccess: true },
              { moduleId: 'packing', canAccess: true },
              { moduleId: 'history', canAccess: true },
              { moduleId: 'customer', canAccess: true },
              { moduleId: 'ai-email', canAccess: true },
              { moduleId: 'date-tools', canAccess: true }
            ]
          }
        },
        include: {
          permissions: true
        }
      });
      console.log('新用户创建成功:', {
        id: newUser.id,
        username: newUser.username,
        isAdmin: newUser.isAdmin,
        permissions: newUser.permissions.map(p => p.moduleId)
      });
    } else {
      console.log('找到用户:', {
        id: user.id,
        username: user.username,
        isAdmin: user.isAdmin,
        permissions: user.permissions.map(p => p.moduleId)
      });

      // 验证密码
      const isValid = await compare('jschina8', user.password);
      console.log('密码验证:', isValid ? '正确' : '错误');

      if (!isValid) {
        // 更新密码
        const newPassword = await hash('jschina8', 10);
        await prisma.user.update({
          where: { id: user.id },
          data: { password: newPassword }
        });
        console.log('密码已更新');
      }
    }

  } catch (error) {
    console.error('验证失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyUser();