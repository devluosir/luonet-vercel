# 认证测试指南

## 🎯 测试目标

验证使用 `luojun` / `jschina8` 进行登录认证是否正常工作。

## 📋 当前配置

### 认证配置
- **用户名**: `luojun`
- **密码**: `jschina8`
- **权限**: 管理员权限，包含所有模块访问权限
- **备用账户**: `admin` / `admin`

### 认证流程
1. 前端使用 NextAuth 的 `signIn` 函数
2. 调用本地 `/api/auth/callback/credentials` 端点
3. NextAuth 验证凭据并创建会话
4. 重定向到仪表板页面

## 🧪 测试方法

### 方法一：使用测试页面
访问 `http://localhost:3000/test-auth` 进行测试

### 方法二：使用认证状态页面
访问 `http://localhost:3000/auth-status` 进行详细测试

### 方法三：使用主页面
访问 `http://localhost:3000` 使用登录表单

## 🔧 技术细节

### 认证配置 (`src/lib/auth.ts`)
```typescript
// 本地开发时使用模拟数据
if (credentials.username === 'luojun' && credentials.password === 'jschina8') {
  return {
    id: 'mock-luojun-id',
    email: 'luojun@example.com',
    name: 'luojun',
    username: 'luojun',
    isAdmin: true,
    image: null,
    permissions: ['admin', 'quotation', 'invoice', 'packing', 'purchase', 'customer', 'ai-email', 'date-tools', 'history']
  };
}
```

### 环境变量配置 (`.env.local`)
```env
NEXT_PUBLIC_API_BASE_URL=https://udb.luocompany.net
NEXTAUTH_SECRET=your-secret-key-here-change-in-production
NEXTAUTH_URL=http://localhost:3000
```

## ✅ 预期结果

### 成功登录后
- 用户状态显示为已登录
- 用户名显示为 `luojun`
- 邮箱显示为 `luojun@example.com`
- 权限包含所有模块
- 可以访问仪表板和其他功能页面

### 权限列表
- `admin` - 管理员权限
- `quotation` - 报价模块
- `invoice` - 发票模块
- `packing` - 装箱单模块
- `purchase` - 采购模块
- `customer` - 客户模块
- `ai-email` - AI 邮件模块
- `date-tools` - 日期工具模块
- `history` - 历史记录模块

## 🐛 故障排除

### 如果登录失败
1. 检查开发服务器是否正常运行
2. 检查环境变量是否正确配置
3. 检查浏览器控制台是否有错误信息
4. 尝试使用备用账户 `admin` / `admin`

### 如果出现 401 错误
1. 确认 NextAuth 配置正确
2. 检查认证 API 路由是否正常工作
3. 验证环境变量设置

## 📝 测试步骤

1. **启动开发服务器**
   ```bash
   npm run dev
   ```

2. **访问测试页面**
   - 打开 `http://localhost:3000/test-auth`
   - 或打开 `http://localhost:3000/auth-status`

3. **输入凭据**
   - 用户名: `luojun`
   - 密码: `jschina8`

4. **点击登录按钮**

5. **验证结果**
   - 检查是否显示登录成功
   - 验证用户信息和权限是否正确
   - 测试是否可以访问其他功能页面

## 🎉 成功标志

- ✅ 登录成功，无错误信息
- ✅ 用户信息正确显示
- ✅ 权限列表完整
- ✅ 可以正常访问应用功能
- ✅ 会话状态正确维护 