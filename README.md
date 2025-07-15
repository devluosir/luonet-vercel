# MLUONET - 企业管理系统

## 项目概述

MLUONET是一个现代化的企业管理系统，提供报价单、发票、采购订单、箱单发票等业务模块的管理功能。系统采用Next.js 14构建，支持响应式设计和深色模式。

## 主要功能

### 核心业务模块
- **报价及确认** (`/quotation`) - 生成报价单和销售确认单
- **发票结算** (`/invoice`) - 生成和管理发票
- **采购订单** (`/purchase`) - 生成给供应商的采购订单
- **箱单发票** (`/packing`) - 生成和管理箱单发票
- **单据管理中心** (`/history`) - 统一管理所有单据历史
- **AI邮件助手** (`/mail`) - 智能生成商务邮件
- **日期计算** (`/date-tools`) - 计算日期和天数
- **客户管理** (`/customer`) - 客户信息管理系统

### 管理功能
- **用户管理** - 用户创建、权限分配、状态管理
- **权限控制** - 基于模块的细粒度权限控制
- **系统设置** - 应用配置管理

## 技术架构

### 前端技术栈
- **Next.js 14** - React框架，支持App Router
- **TypeScript** - 类型安全的JavaScript
- **Tailwind CSS** - 实用优先的CSS框架
- **Lucide React** - 现代化图标库
- **NextAuth.js** - 身份认证解决方案

### 后端技术栈
- **Prisma** - 现代化数据库ORM
- **PostgreSQL** - 关系型数据库
- **bcryptjs** - 密码加密
- **NextAuth.js** - 服务端认证

### 性能优化特性
- **智能缓存** - 用户信息缓存5分钟，减少API调用
- **预加载优化** - 分阶段预加载页面，避免资源竞争
- **性能监控** - 实时监控页面加载和API调用性能
- **错误重试** - API调用失败自动重试机制
- **资源优化** - 字体预加载、图片懒加载

## 安装和运行

### 环境要求
- Node.js 18+
- PostgreSQL 12+
- npm 或 yarn

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd mluonet
```

2. **安装依赖**
```bash
npm install
```

3. **环境配置**
```bash
cp .env.example .env.local
```

编辑 `.env.local` 文件，配置以下环境变量：
```env
# 数据库配置
DATABASE_URL="postgresql://username:password@localhost:5432/mluonet"
DIRECT_URL="postgresql://username:password@localhost:5432/mluonet"

# NextAuth配置
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# AI服务配置
DEEPSEEK_API_KEY="your-deepseek-api-key"
```

4. **数据库迁移**
```bash
npx prisma migrate dev
npx prisma generate
```

5. **启动开发服务器**
```bash
npm run dev
```

访问 http://localhost:3000 开始使用

## 性能优化说明

### 已实施的优化措施

1. **缓存策略优化**
   - 用户信息缓存时间从1分钟增加到5分钟
   - 添加缓存过期检查和自动清理
   - 实现智能缓存工具函数

2. **API调用优化**
   - 添加重试机制（最多重试2次）
   - 优化数据库查询，只获取必要字段
   - 添加ETag支持，减少不必要的网络传输

3. **页面加载优化**
   - 分阶段预加载页面，避免资源竞争
   - 优先加载常用页面（quotation, invoice）
   - 延迟加载次要页面（purchase, history）

4. **中间件优化**
   - 跳过静态资源的中间件处理
   - 减少不必要的token验证

5. **性能监控**
   - 实时监控API调用性能
   - 监控资源加载时间
   - 开发环境下输出详细性能指标

### 性能监控工具

系统集成了性能监控工具，在开发环境下会自动输出：
- 页面加载时间
- API调用耗时
- 慢资源加载警告
- 用户信息获取时间

## 故障排除

### 常见问题

1. **页面加载缓慢**
   - 检查网络连接
   - 查看浏览器控制台的性能警告
   - 确认数据库连接正常

2. **API调用失败**
   - 检查用户登录状态
   - 确认API路由配置正确
   - 查看服务器日志

3. **权限问题**
   - 确认用户权限配置
   - 检查模块权限设置
   - 联系管理员分配权限

### 性能问题诊断

1. **启用性能监控**
   在开发环境下，性能监控会自动启用，查看控制台输出：
   ```
   📊 Tools页面加载性能: { dns: 10, tcp: 50, ttfb: 200, ... }
   ⏱️ user_fetch: 150.25ms
   ```

2. **检查慢资源**
   系统会自动警告加载时间超过1秒的资源：
   ```
   🐌 慢资源加载: /api/users/me (1500.00ms)
   ```

3. **API性能监控**
   系统会监控API调用性能，超过2秒的调用会显示警告：
   ```
   🐌 慢API调用: /api/users/me (2500.00ms)
   ```

### 缓存管理

如果遇到数据不一致问题，可以清除缓存：
```javascript
// 在浏览器控制台执行
sessionStorage.removeItem('userInfo');
location.reload();
```

## 开发指南

### 代码规范
- 使用TypeScript进行类型检查
- 遵循ESLint规则
- 使用Prettier进行代码格式化

### 性能最佳实践
- 使用`useCallback`和`useMemo`优化组件性能
- 避免不必要的重新渲染
- 合理使用缓存策略

### 调试技巧
- 在开发环境下查看性能监控输出
- 使用浏览器开发者工具分析网络请求
- 检查React DevTools中的组件渲染情况

## 部署

### Vercel部署
1. 连接GitHub仓库到Vercel
2. 配置环境变量
3. 自动部署

### 自托管部署
1. 构建生产版本：`npm run build`
2. 启动生产服务器：`npm start`
3. 配置反向代理（如Nginx）

## 更新日志

### v1.0.0 (2024-01-04)
- 初始版本发布
- 实现核心业务模块
- 添加用户管理和权限控制
- 集成性能监控和优化

## 贡献指南

欢迎提交Issue和Pull Request来改进项目。

## 许可证

MIT License
