# MLuoNet - 专业的报价和订单确认系统

## 项目概述

MLuoNet是一个基于Next.js构建的专业报价和订单确认系统，提供完整的业务流程管理功能。

## 最新更新

### 移动端性能优化 (2024-08-02)

#### 问题诊断
通过性能分析发现手机端页面加载慢的主要原因：
1. **字体文件过大**: NotoSansSC字体文件总计20MB
2. **PDF页面代码过大**: 单个页面达到15.4MB
3. **缺乏代码分割**: 所有PDF相关代码一次性加载

#### 优化方案实施

**1. 字体文件压缩**
- 原始字体文件: 20MB → 压缩后: 12MB (节省40%)
- 创建字体压缩脚本: `scripts/compress-fonts.js`
- 优化字体加载策略: 添加 `font-display: swap`

**2. 代码分割优化**
- PDF生成器懒加载: 创建 `LazyPDFGenerator` 组件
- 更激进的代码分割: 分离PDF相关代码到独立chunk
- 优化webpack配置: 添加字体和组件分割

**3. 移动端专项优化**
- 优化字体CSS: 移动端优先使用系统字体
- 添加性能监控: 实时跟踪关键性能指标
- 简化主页面: 移除不必要的性能监控代码

**4. 缓存策略优化**
- 字体文件长期缓存: 1年缓存期
- 静态资源缓存: 图片和图标优化缓存
- 启用gzip压缩: 减少传输大小

#### 性能提升效果
- **字体加载**: 20MB → 12MB (节省40%)
- **PDF页面**: 15.4MB → 按需加载
- **预计整体提升**: 移动端加载时间减少60-70%

#### 技术实现
- 创建字体压缩工具: `scripts/compress-fonts.js`
- 创建性能分析工具: `scripts/performance-optimizer.js`
- 优化Next.js配置: 添加代码分割和缓存策略
- 创建懒加载组件: `LazyPDFGenerator.tsx`
- 添加性能监控: `PerformanceMonitor.tsx`

### 字体加载优化 (2024-01-XX)

#### 性能优化
1. **按需字体加载**：
   - 将中文字体从全局加载中提取出来
   - 创建专门的字体加载工具 `src/utils/fontLoader.ts`
   - 仅在PDF生成页面加载字体文件

2. **PDF页面优化**：
   - 为所有PDF生成页面添加专门的字体CSS文件
   - 包括：quotation、invoice、packing、purchase、history页面
   - 字体文件仅在需要时加载，提高页面加载速度

3. **代码重构**：
   - 统一所有PDF生成器的字体加载逻辑
   - 创建可复用的字体加载函数
   - 减少代码重复，提高维护性

#### 技术实现
- 创建 `src/utils/fontLoader.ts` 字体加载工具
- 创建 `src/app/pdf-fonts.css` 字体样式文件
- 修改所有PDF生成器使用统一的字体加载方法
- 在相关页面中导入字体CSS文件

### 用户管理页面布局优化 (2024-01-XX)

#### 功能改进
1. **布局重新设计**：
   - 将编辑按钮移至用户头像和基本信息的右侧
   - 注册时间和最后登录时间显示在同一行
   - 在状态行增加已开通模块的小图标显示

2. **模块权限可视化**：
   - 在用户状态旁边显示已开通的模块图标
   - 支持报价、箱单、发票、采购、日期等模块的权限显示
   - 图标采用不同颜色区分不同模块

3. **响应式设计优化**：
   - 在小屏幕上注册时间和登录时间自动换行
   - 保持卡片布局的紧凑性和可读性

#### 技术实现
- 更新了User接口以包含权限信息
- 修改了API端点以返回用户权限数据
- 添加了模块定义和图标映射
- 优化了CSS布局和响应式设计

## 主要功能

### 用户管理
- 用户创建、编辑、删除
- 权限管理和模块分配
- 用户状态监控
- 登录历史记录

### 业务模块
- **报价管理**：创建和管理客户报价
- **箱单发票**：生成装箱单和发票
- **财务发票**：财务发票管理
- **采购订单**：采购订单处理
- **日期工具**：日期计算工具

### 系统特性
- 响应式设计，支持移动端
- 深色模式支持
- 权限控制系统
- 实时数据同步

## 技术栈

- **前端框架**：Next.js 14 (App Router)
- **样式**：Tailwind CSS
- **认证**：NextAuth.js
- **数据库**：Cloudflare D1
- **部署**：Vercel

## 开发环境设置

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 性能优化工具

```bash
# 压缩字体文件
node scripts/compress-fonts.js

# 性能分析
node scripts/performance-optimizer.js
```

## 项目结构

```
src/
├── app/                    # Next.js App Router页面
│   ├── admin/             # 管理员页面
│   ├── dashboard/         # 仪表板
│   └── api/              # API路由
├── components/            # React组件
│   ├── LazyPDFGenerator.tsx  # 懒加载PDF生成器
│   └── PerformanceMonitor.tsx # 性能监控组件
├── lib/                  # 工具库和配置
├── types/                # TypeScript类型定义
└── utils/                # 工具函数
scripts/
├── compress-fonts.js     # 字体压缩工具
└── performance-optimizer.js # 性能分析工具
```

## 部署

项目已配置为在Vercel上自动部署。主要配置包括：

- `vercel.json`：Vercel部署配置
- `wrangler.toml`：Cloudflare Workers配置
- 环境变量配置

## 性能监控

项目集成了性能监控功能，在开发环境下会显示关键性能指标：
- **FCP** (First Contentful Paint): 首次内容绘制时间
- **LCP** (Largest Contentful Paint): 最大内容绘制时间
- **FID** (First Input Delay): 首次输入延迟
- **CLS** (Cumulative Layout Shift): 累积布局偏移
- **TTFB** (Time to First Byte): 首字节时间

## 贡献指南

1. Fork项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建Pull Request

## 许可证

本项目采用MIT许可证。