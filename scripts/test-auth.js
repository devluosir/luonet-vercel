const { PrismaClient } = require('@prisma/client');
const { compare, hash } = require('bcryptjs');

const prisma = new PrismaClient();

async function testAuth() {
  try {
    // 1. 创建测试用户
    const password = await hash('test123', 10);
    const user = await prisma.user.upsert({
      where: { username: 'testuser' },
      update: { password },
      create: {
        username: 'testuser',
        password,
        email: 'test@example.com',
        isAdmin: true,
        status: true,
        permissions: {
          create: [
            { moduleId: 'quotation', canAccess: true },
            { moduleId: 'invoice', canAccess: true },
            { moduleId: 'purchase', canAccess: true },
            { moduleId: 'packing', canAccess: true },
          ]
        }
      },
      include: {
        permissions: true
      }
    });

    console.log('Test user created:', {
      id: user.id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin,
      permissions: user.permissions
    });

    // 2. 测试密码验证
    const testPassword = 'test123';
    const isValid = await compare(testPassword, user.password);
    console.log('Password validation:', isValid);

    // 3. 测试权限查询
    const userWithPermissions = await prisma.user.findUnique({
      where: { username: 'testuser' },
      include: { permissions: true }
    });

    console.log('User permissions:', userWithPermissions?.permissions);

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAuth();