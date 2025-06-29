import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// 定义默认模块列表 - 与工具页面保持一致
const DEFAULT_MODULES = [
  'history',
  'quotation',
  'purchase',
  'packing',
  'invoice',
  'ai-email',
  'date-tools',
  'feature3',
  'feature4',
  'feature5',
  'feature6',
  'feature7',
  'feature8',
  'feature9'
];

export async function GET() {
  try {
    // 检查是否已有管理员用户
    const adminExists = await prisma.user.findFirst({
      where: { isAdmin: true }
    });

    if (adminExists) {
      return NextResponse.json({ 
        error: '已存在管理员账户' 
      }, { status: 400 });
    }

    // 创建管理员用户
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.create({
      data: {
        username: 'admin',
        password: hashedPassword,
        email: 'admin@example.com',
        isAdmin: true,
        status: true,
        permissions: {
          create: DEFAULT_MODULES.map(moduleId => ({
            moduleId,
            canAccess: true
          }))
        }
      },
      include: {
        permissions: true
      }
    });

    return NextResponse.json({ 
      message: '初始化成功',
      admin 
    });
  } catch (error) {
    console.error('初始化失败:', error);
    return NextResponse.json({ 
      error: '初始化失败' 
    }, { status: 500 });
  }
}

// 新增POST方法：更新现有用户权限
export async function POST() {
  try {
    // 获取所有用户
    const users = await prisma.user.findMany({
      include: {
        permissions: true
      }
    });

    console.log(`开始更新 ${users.length} 个用户的权限...`);

    let updatedUsers = 0;
    let addedPermissions = 0;

    for (const user of users) {
      const existingModuleIds = user.permissions.map(p => p.moduleId);
      const missingModules = DEFAULT_MODULES.filter(moduleId => !existingModuleIds.includes(moduleId));

      if (missingModules.length > 0) {
        // 为用户添加缺失的权限
        await prisma.permission.createMany({
          data: missingModules.map(moduleId => ({
            userId: user.id,
            moduleId,
            canAccess: true // 默认给予访问权限
          })),
          skipDuplicates: true
        });

        updatedUsers++;
        addedPermissions += missingModules.length;

        console.log(`为用户 ${user.username} 添加了 ${missingModules.length} 个权限: ${missingModules.join(', ')}`);
      }
    }

    return NextResponse.json({ 
      message: '权限更新成功',
      details: {
        totalUsers: users.length,
        updatedUsers,
        addedPermissions,
        modules: DEFAULT_MODULES
      }
    });
  } catch (error) {
    console.error('权限更新失败:', error);
    return NextResponse.json({ 
      error: '权限更新失败',
      details: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
} 