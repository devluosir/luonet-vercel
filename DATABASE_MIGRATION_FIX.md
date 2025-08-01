# 数据库迁移修复指南

## 问题描述

项目在本地开发时出现 Prisma 连接错误：
```
PrismaClientConstructorValidationError: Invalid value undefined for datasource "db" provided to PrismaClient constructor.
```

## 原因分析

1. **项目已迁移到 Cloudflare D1**：根据 `MIGRATION_SUMMARY.md`，项目已经迁移到 Cloudflare D1 数据库
2. **本地环境缺少数据库配置**：本地开发环境没有配置 `DATABASE_URL` 环境变量
3. **双重认证系统**：项目同时存在本地 NextAuth 和 Cloudflare Worker 两套认证系统

## 解决方案

### 方案一：完全使用 Cloudflare D1（推荐）

1. **删除本地 API 路由**：
   ```bash
   rm -rf src/app/api/auth
   rm -rf src/app/api/admin
   rm -rf src/app/api/users
   ```

2. **配置环境变量**：
   创建 `.env.local` 文件：
   ```env
   NEXT_PUBLIC_API_BASE_URL=https://udb.luocompany.net
   NEXTAUTH_SECRET=your-secret-key-here
   NEXTAUTH_URL=http://localhost:3000
   ```

3. **更新认证逻辑**：
   修改 `src/lib/auth.ts` 使用远程 API 而不是本地数据库

### 方案二：本地开发模式（当前实现）

1. **已实现的修复**：
   - ✅ 修改了 `src/lib/prisma.ts`，在缺少数据库连接时使用模拟客户端
   - ✅ 修改了 `src/lib/auth.ts`，添加了模拟用户数据支持

2. **本地开发登录**：
   - 用户名：`admin`
   - 密码：`admin`

3. **环境变量配置**：
   ```env
   NEXT_PUBLIC_API_BASE_URL=https://udb.luocompany.net
   NEXTAUTH_SECRET=your-secret-key-here
   NEXTAUTH_URL=http://localhost:3000
   ```

## 当前状态

- ✅ Prisma 连接错误已修复
- ✅ 本地开发可以使用模拟数据
- ✅ 生产环境使用 Cloudflare D1
- ⚠️ 建议最终迁移到完全使用 Cloudflare Worker

## 下一步操作

1. **测试本地开发**：
   ```bash
   npm run dev
   ```
   使用 `admin/admin` 登录

2. **验证生产环境**：
   确保 `https://udb.luocompany.net` 正常工作

3. **最终迁移**：
   考虑完全移除本地 API 路由，统一使用 Cloudflare Worker

## 注意事项

- 本地开发时使用模拟数据，不会影响生产环境
- 生产环境仍然使用 Cloudflare D1 数据库
- 如果需要真实的本地数据库，可以配置本地 PostgreSQL 或 SQLite 