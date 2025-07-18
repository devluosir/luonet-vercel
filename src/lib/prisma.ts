import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// 优化连接池配置
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// 优化连接健康检查频率
if (process.env.NODE_ENV === 'development') {
  // 减少检查频率，避免性能影响
  setInterval(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      // 只在出错时输出日志
    } catch (error) {
      console.error('❌ 数据库连接异常:', error);
    }
  }, 120000); // 改为每2分钟检查一次，进一步减少频率
}

export default prisma;