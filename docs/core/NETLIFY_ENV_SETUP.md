# Netlify环境变量设置

## 当前问题
API配置需要正确使用Netlify的环境变量，而不是硬编码地址。

## 环境变量配置

### 1. 本地开发环境
在 `.env.local` 文件中：
```
NEXT_PUBLIC_API_BASE_URL=https://udb.luocompany.net
```

### 2. Netlify生产环境
需要在Netlify控制台中设置以下环境变量：

#### 必需的环境变量
- `NEXT_PUBLIC_API_BASE_URL`: `https://udb.luocompany.net`
- `NEXTAUTH_SECRET`: [你的NextAuth密钥]
- `NEXTAUTH_URL`: `https://luocompany.net`

#### 设置步骤
1. 登录Netlify控制台
2. 选择你的项目
3. 进入 "Site settings" → "Environment variables"
4. 添加以下变量：

| 变量名 | 值 | 环境 |
|--------|----|----|
| `NEXT_PUBLIC_API_BASE_URL` | `https://udb.luocompany.net` | Production, Preview, Development |
| `NEXTAUTH_SECRET` | [你的密钥] | Production, Preview, Development |
| `NEXTAUTH_URL` | `https://luocompany.net` | Production, Preview, Development |

### 3. 代码中的使用
```typescript
// src/lib/api-config.ts
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://udb.luocompany.net';
```

## 验证步骤

### 本地验证
```bash
# 检查环境变量是否正确加载
npm run dev
# 访问 http://localhost:3000/admin
# 查看浏览器控制台，应该看到正确的API地址
```

### 生产验证
1. 部署到Netlify
2. 检查环境变量是否正确设置
3. 访问生产环境的管理页面
4. 确认API调用正常

## 注意事项

1. **NEXT_PUBLIC_前缀**: 只有以 `NEXT_PUBLIC_` 开头的环境变量才能在客户端使用
2. **环境变量优先级**: Netlify的环境变量会覆盖本地 `.env` 文件
3. **安全性**: 确保敏感信息（如密钥）不在客户端暴露

## 故障排除

如果API仍然指向错误的地址：

1. 检查Netlify环境变量设置
2. 清除浏览器缓存
3. 重新部署应用
4. 检查构建日志中的环境变量加载情况 