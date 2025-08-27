# 邮件助手连接问题修复指南

## 🔍 问题诊断

根据测试结果，邮件助手模块连接不正常的主要原因是：

### ❌ 主要问题
1. **DEEPSEEK_API_KEY环境变量未设置**
2. **API基础URL配置可能有问题**

### ✅ 网络连接状态
- DeepSeek API服务器连接正常
- 基础网络连接正常

## 🛠️ 解决方案

### 1. 设置环境变量

#### 本地开发环境
创建 `.env.local` 文件：

```bash
# 在项目根目录创建 .env.local 文件
touch .env.local
```

在 `.env.local` 文件中添加：

```env
# DeepSeek API密钥
DEEPSEEK_API_KEY=your_deepseek_api_key_here

# API基础URL（可选，默认使用相对路径）
NEXT_PUBLIC_API_BASE_URL=https://your-domain.vercel.app
```

#### Vercel部署环境
1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择你的项目
3. 进入 **Settings** → **Environment Variables**
4. 添加以下环境变量：

| 变量名 | 值 | 环境 |
|--------|-----|------|
| `DEEPSEEK_API_KEY` | `your_deepseek_api_key_here` | Production, Preview, Development |

### 2. 获取DeepSeek API密钥

1. 访问 [DeepSeek Console](https://platform.deepseek.com/)
2. 注册或登录账户
3. 进入 **API Keys** 页面
4. 创建新的API密钥
5. 复制API密钥并保存到环境变量中

### 3. 验证配置

#### 本地验证
```bash
# 重新启动开发服务器
npm run dev

# 运行连接测试
node test-mail-connection.js
```

#### 部署验证
1. 推送代码到GitHub
2. Vercel自动重新部署
3. 访问邮件助手页面测试功能

### 4. 故障排除

#### 如果仍然无法连接

1. **检查API密钥格式**
   ```bash
   # API密钥应该以 sk- 开头
   DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

2. **检查网络连接**
   ```bash
   # 测试DeepSeek API连接
   curl -H "Authorization: Bearer YOUR_API_KEY" \
        -H "Content-Type: application/json" \
        -d '{"model":"deepseek-chat","messages":[{"role":"user","content":"Hello"}]}' \
        https://api.deepseek.com/v1/chat/completions
   ```

3. **检查Vercel函数配置**
   - 确认 `vercel.json` 中的函数配置正确
   - 检查内存限制和超时设置

4. **查看错误日志**
   - 浏览器开发者工具 → Console
   - Vercel Dashboard → Functions → 查看函数日志

### 5. 代码优化建议

#### 改进错误处理
在 `src/lib/deepseek.ts` 中添加更详细的错误信息：

```typescript
if (!process.env.DEEPSEEK_API_KEY) {
  console.error('❌ DEEPSEEK_API_KEY 环境变量未设置');
  console.error('💡 请检查以下位置:');
  console.error('   1. 本地开发: .env.local 文件');
  console.error('   2. Vercel部署: 项目设置 → Environment Variables');
  throw new Error('API配置错误: DEEPSEEK_API_KEY 未设置');
}
```

#### 添加健康检查
创建API健康检查端点：

```typescript
// src/app/api/health/route.ts
export async function GET() {
  const hasApiKey = !!process.env.DEEPSEEK_API_KEY;
  
  return Response.json({
    status: hasApiKey ? 'healthy' : 'unhealthy',
    apiKey: hasApiKey ? 'configured' : 'missing',
    timestamp: new Date().toISOString()
  });
}
```

## 📋 检查清单

- [ ] 创建 `.env.local` 文件（本地开发）
- [ ] 在Vercel中设置环境变量（生产环境）
- [ ] 获取有效的DeepSeek API密钥
- [ ] 重启开发服务器
- [ ] 运行连接测试脚本
- [ ] 测试邮件助手功能
- [ ] 检查错误日志

## 🔗 相关链接

- [DeepSeek API文档](https://platform.deepseek.com/docs)
- [Vercel环境变量配置](https://vercel.com/docs/projects/environment-variables)
- [Next.js环境变量](https://nextjs.org/docs/basic-features/environment-variables)

## 📞 技术支持

如果问题仍然存在，请：

1. 检查浏览器控制台错误信息
2. 查看Vercel函数日志
3. 确认API密钥有效性和权限
4. 联系技术支持团队
