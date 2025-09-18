# Vercel 部署指南

## 🚀 项目已配置为 Vercel 部署

### 📋 部署前准备

1. **安装 Vercel CLI** (可选)
   ```bash
   npm i -g vercel
   ```

2. **环境变量配置**
   在 Vercel 控制台中设置以下环境变量：
   - `WORKER_URL`: 你的 Worker URL
   - `API_TOKEN`: 你的 API Token
   - `NEXTAUTH_URL`: 生产环境 URL
   - `NEXTAUTH_SECRET`: NextAuth 密钥

### 🔧 配置文件说明

#### vercel.json
- 配置了构建命令和输出目录
- 设置了 API 路由的 CORS 头部
- 配置了静态资源缓存策略
- 设置了安全头部

#### next.config.mjs
- 启用了 `output: 'standalone'` 优化
- 配置了图片优化
- 设置了 webpack 优化

### 📦 构建脚本
```bash
npm run build  # 构建项目
npm run start  # 启动生产服务器
```

### 🌐 部署步骤

1. **连接 GitHub 仓库**
   - 在 Vercel 控制台导入项目
   - 选择 `devluosir/luonet-vercel` 仓库

2. **配置构建设置**
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

3. **设置环境变量**
   - 在项目设置中添加所需的环境变量

4. **部署**
   - 点击 Deploy 按钮
   - 等待构建完成

### 🔍 部署后检查

1. **功能测试**
   - 测试 PDF 生成功能
   - 测试字体加载
   - 测试 API 路由

2. **性能检查**
   - 检查页面加载速度
   - 检查资源缓存
   - 检查字体压缩

### 🛠️ 故障排除

1. **构建失败**
   - 检查 Node.js 版本 (推荐 18.x)
   - 检查依赖安装
   - 查看构建日志

2. **字体加载问题**
   - 检查字体文件路径
   - 检查 Content-Type 头部
   - 检查缓存设置

3. **API 路由问题**
   - 检查 CORS 配置
   - 检查环境变量
   - 检查函数超时设置

### 📊 性能优化

- 启用了图片优化
- 配置了静态资源缓存
- 设置了代码分割
- 优化了字体加载

### 🔒 安全配置

- 设置了安全头部
- 配置了 CORS 策略
- 启用了内容安全策略
