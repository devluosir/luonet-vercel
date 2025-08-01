# Cloudflare数据库迁移指南

## 概述

本指南将帮助你将MLUONET系统的用户数据库从PostgreSQL迁移到Cloudflare D1数据库。

## 迁移方案对比

### 方案一：Cloudflare D1数据库（推荐）

**优势**：
- ✅ 与现有wrangler.toml配置兼容
- ✅ 支持SQLite语法，迁移简单
- ✅ 免费额度充足（每天100,000次读取，每天100,000次写入）
- ✅ 与Cloudflare Workers完美集成
- ✅ 全球分布式，低延迟
- ✅ 自动备份和恢复

**劣势**：
- ❌ 不支持复杂的SQL查询
- ❌ 事务支持有限

### 方案二：Cloudflare R2存储

**优势**：
- ✅ 无限存储空间
- ✅ 与S3兼容的API
- ✅ 全球CDN加速

**劣势**：
- ❌ 不适合频繁的读写操作
- ❌ 需要额外的数据库层

## 已完成的迁移步骤

### 1. 创建D1数据库
```bash
npx wrangler d1 create mluonet-users
```

### 2. 配置wrangler.toml
```toml
[[d1_databases]]
binding = "USERS_DB"
database_name = "mluonet-users"
database_id = "f8dac0b4-d25a-4d11-b64f-b592ea24e17d"
```

### 3. 创建数据库Schema
- 用户表：`User`
- 权限表：`Permission`
- 索引和触发器

### 4. 数据迁移
- 成功迁移9个用户
- 成功迁移126个权限记录
- 保持数据完整性

### 5. 创建D1客户端
- 完整的CRUD操作
- 权限管理
- 批量操作支持

## 部署步骤

### 1. 部署到远程D1数据库
```bash
# 部署Schema
npx wrangler d1 execute mluonet-users --file=prisma/d1-schema.sql --remote

# 插入数据
npx wrangler d1 execute mluonet-users --file=prisma/d1-data.sql --remote
```

### 2. 部署Workers
```bash
# 构建项目
npm run build

# 部署Workers
npx wrangler deploy
```

### 3. 验证部署
```bash
# 测试用户认证
curl -X POST https://mluonet-users.your-subdomain.workers.dev/api/auth/d1-users \
  -H "Content-Type: application/json" \
  -d '{"username":"roger","password":"your-password"}'

# 测试获取用户列表
curl https://mluonet-users.your-subdomain.workers.dev/api/admin/users
```

## API端点

### 用户认证
```
POST /api/auth/d1-users
Content-Type: application/json

{
  "username": "roger",
  "password": "your-password"
}
```

### 获取用户列表
```
GET /api/admin/users
```

### 更新用户权限
```
PUT /api/admin/users/{userId}/permissions
Content-Type: application/json

{
  "permissions": [
    {"id": "permission-id", "canAccess": true}
  ]
}
```

## 性能优化

### 1. 缓存策略
- 用户信息缓存15分钟
- 权限信息缓存15分钟
- 使用Cloudflare Cache API

### 2. 数据库优化
- 创建必要的索引
- 使用批量操作减少请求次数
- 优化查询语句

### 3. 监控和日志
- 使用Cloudflare Analytics
- 监控API响应时间
- 错误日志记录

## 成本分析

### D1数据库成本
- **免费额度**：每天100,000次读取，每天100,000次写入
- **超出费用**：$0.40/百万次读取，$5.00/百万次写入
- **存储费用**：$0.20/GB/月

### Workers成本
- **免费额度**：每天100,000次请求
- **超出费用**：$5.00/百万次请求

### 预估月成本
- 假设每天1,000次用户操作
- 月成本：$0-5（在免费额度内）

## 安全考虑

### 1. 数据加密
- D1数据库自动加密
- 传输层TLS加密
- 密码哈希存储

### 2. 访问控制
- API密钥管理
- 用户权限验证
- 请求频率限制

### 3. 备份策略
- 自动每日备份
- 跨区域复制
- 灾难恢复计划

## 故障排除

### 常见问题

1. **数据库连接失败**
   ```bash
   # 检查wrangler.toml配置
   npx wrangler d1 list
   ```

2. **数据迁移失败**
   ```bash
   # 重新执行迁移
   npx wrangler d1 execute mluonet-users --file=prisma/d1-schema.sql --remote
   ```

3. **Workers部署失败**
   ```bash
   # 检查构建错误
   npm run build
   # 重新部署
   npx wrangler deploy
   ```

### 调试工具
```bash
# 查看Workers日志
npx wrangler tail

# 测试本地开发
npx wrangler dev

# 查看数据库内容
npx wrangler d1 execute mluonet-users --command="SELECT * FROM User LIMIT 5"
```

## 下一步计划

### 1. 完全迁移
- [ ] 更新前端代码使用D1 API
- [ ] 移除PostgreSQL依赖
- [ ] 更新认证系统

### 2. 功能增强
- [ ] 添加用户注册功能
- [ ] 实现密码重置
- [ ] 添加多因素认证

### 3. 监控和优化
- [ ] 设置性能监控
- [ ] 优化查询性能
- [ ] 实现自动扩展

## 联系支持

如果在迁移过程中遇到问题，请：

1. 查看Cloudflare文档：https://developers.cloudflare.com/d1/
2. 检查项目日志
3. 联系技术支持

---

**迁移完成时间**：2025-01-20
**迁移状态**：✅ 数据库Schema和数据已迁移
**下一步**：部署Workers并测试API 