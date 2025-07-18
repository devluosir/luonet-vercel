# MLUONET - 外贸文档生成系统

## 项目简介

MLUONET是一个专业的外贸文档生成系统，支持生成发票、报价单、采购订单、装箱单等多种外贸文档。

## 主要功能

- **发票生成**：支持商业发票、形式发票等多种类型
- **报价单生成**：专业的报价单模板和格式
- **采购订单**：完整的采购订单文档
- **装箱单**：详细的装箱清单和规格
- **订单确认书**：销售确认书生成
- **PDF导出**：高质量PDF文档导出
- **印章功能**：支持上海和香港印章
- **多语言支持**：中英文双语支持

## 技术栈

- **前端**：Next.js 14, React 18, TypeScript
- **样式**：Tailwind CSS
- **PDF生成**：jsPDF, jspdf-autotable
- **数据库**：Prisma, PostgreSQL
- **认证**：NextAuth.js
- **部署**：Vercel

## 快速开始

### 环境要求

- Node.js 18+
- PostgreSQL 数据库

### 安装依赖

```bash
npm install
```

### 环境配置

1. 复制环境变量文件：
```bash
cp .env.example .env.local
```

2. 配置数据库连接和认证信息

### 数据库迁移

```bash
npx prisma migrate dev
```

### 开发模式

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

## PDF文件大小优化

### 问题解决

系统已实现PDF文件大小优化，特别是针对印章图片的压缩：

- **原始文件大小**：
  - 上海印章：818KB
  - 香港印章：228KB

- **优化后文件大小**：
  - 上海印章：24KB（压缩率97.07%）
  - 香港印章：6.3KB（压缩率97.26%）

### 优化方案

1. **图片压缩**：使用sharp库进行高质量压缩
2. **运行时优化**：Canvas API动态压缩
3. **智能降级**：压缩失败时自动使用原始图片

### 压缩脚本

```bash
npm run compress-stamps
```

详细优化方案请参考：[PDF_OPTIMIZATION.md](./PDF_OPTIMIZATION.md)

## 项目结构

```
mluonet/
├── src/
│   ├── app/                 # Next.js App Router
│   ├── components/          # React组件
│   ├── lib/                 # 工具库
│   ├── types/               # TypeScript类型定义
│   └── utils/               # 工具函数
├── prisma/                  # 数据库模型和迁移
├── public/                  # 静态资源
├── scripts/                 # 构建脚本
└── docs/                    # 文档
```

## 功能模块

### 发票模块
- 支持多种发票类型
- 自定义模板配置
- 印章和签名功能
- 多币种支持

### 报价单模块
- 专业报价单模板
- 价格计算功能
- 条款和条件设置
- 客户信息管理

### 采购订单模块
- 完整的采购流程
- 供应商信息管理
- 交货条款设置
- 付款条件配置

### 装箱单模块
- 详细的商品清单
- 重量和尺寸信息
- 包装规格说明
- 运输标记功能

## 部署

### Vercel部署

1. 连接GitHub仓库
2. 配置环境变量
3. 自动部署

### 环境变量

```env
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=your-secret
NEXTAUTH_URL=http://localhost:3000
```

## 贡献指南

1. Fork项目
2. 创建功能分支
3. 提交更改
4. 发起Pull Request

## 许可证

MIT License

## 联系方式

如有问题或建议，请通过以下方式联系：

- 邮箱：support@mluonet.com
- GitHub Issues：[项目Issues](https://github.com/your-repo/issues)

## 更新日志

### v0.1.0
- 初始版本发布
- 基础文档生成功能
- PDF文件大小优化
- 印章功能实现
