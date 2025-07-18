import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error'] : ['error'], // 减少日志输出
  datasources: {
    db: {
      url: process.env.DIRECT_URL
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
  }, 60000); // 改为每60秒检查一次
}

export default prisma;