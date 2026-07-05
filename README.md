# LC App / MLUONET 企业业务管理系统

LC App 是 Luo & Company 内部使用的业务单据与客户管理系统。基于 Next.js App Router，在同一个登录系统下协同处理报价、销售确认、装箱单、财务发票、采购订单、客户资料、历史记录和 AI 邮件助手。

```text
git@github.com:devluosir/luonet-vercel.git
```

## 当前状态

- **应用版本**：`1.2.0`（最新发布 tag：`v1.2.0`；当前 main 快照见 `docs/core/CURRENT_STATE.md`）
- **主框架**：Next.js 14、React 18、TypeScript 5、Tailwind CSS 3
- **部署**：Vercel 主站（香港 hkg1）+ Cloudflare Worker + D1（用户权限服务）
- **认证**：NextAuth Credentials，远程调用 D1 用户 API 校验账密
- **业务数据**：询报价和客户资料已接入 D1；多数历史单据仍以浏览器 `localStorage` 为主；用户和权限保存在 Cloudflare D1
- **PDF/Excel**：前端生成，中文字体与头图在构建时预嵌入（`scripts/embed-resources.js`）
- **AI 邮件**：调用 DeepSeek Chat API（`/api/generate`）

## 功能地图

| 模块 | 路由 | 主要数据 | 说明 |
|------|------|---------|------|
| 登录 | `/` | NextAuth session、本地权限缓存 | 登录后进入 `/dashboard` |
| Dashboard | `/dashboard` | 各历史记录、权限缓存 | 快速创建单据、最近文档、按权限显示模块 |
| 报价 / 销售确认 | `/quotation` | `quotation_history`、`draftQuotation`、`qt.visibleCols` | Tab 切换报价/确认、PDF、Excel、复制、编辑、订单确认转装箱单 |
| 装箱单 | `/packing` | `packing_history`、`pk.visibleCols` | 支持从销售确认导入，生成装箱单 + 唛头 PDF |
| 财务发票 | `/invoice` | `invoice_history` | 导入报价数据、PDF、Excel、复制、编辑 |
| 采购订单 | `/purchase` | `purchase_history`、`draftPurchase` | 供应商、银行信息、PDF、自动草稿保存 |
| 历史管理 | `/history` | 全部历史记录 | 搜索、筛选、批量删除、导入导出 JSON |
| 客户管理 | `/customer`、`/customer/detail` | 客户/供应商/收货人、联络人、分类、活动、跟进、收货订单 | 统一公司信息 + 联络人数组结构，支持客户分类、卡片/列表视图、详情行内编辑；收货人详情显示收货订单 |
| AI 邮件助手 | `/mail` | DeepSeek API（无持久化） | 撰写、回复、多语言、多语气风格 |
| 管理后台 | `/admin`、`/admin/users/[id]` | D1 User、Permission | 用户创建、账户状态、管理员状态、模块权限 |
| IMPA 物料 | 外部链接 | `impa` 权限 | 左侧工具入口，新窗口打开 `https://impa.luocompany.com` |

**动态路由**（编辑/复制）：`/quotation/edit/[id]`、`/quotation/copy/[id]`、`/packing/edit/[id]`、`/packing/copy/[id]`、`/invoice/edit/[id]`、`/invoice/copy/[id]`、`/purchase/edit/[id]`、`/purchase/copy/[id]`

## 技术架构

```text
src/
├── app/                    # Next.js App Router 页面和 API routes
│   └── api/                # /api/auth、/api/generate、/api/health、/api/quotation
├── features/               # 模块化业务代码（优先在这里开发）
│   ├── admin/              # 用户和权限管理
│   ├── core/               # 跨模块基类和公共服务
│   ├── customer/           # 客户/供应商/收货人/时间轴/跟进
│   ├── dashboard/          # 首页
│   ├── history/            # 历史记录
│   ├── invoice/            # 财务发票
│   ├── mail/               # AI 邮件助手
│   ├── packing/            # 装箱单
│   ├── purchase/           # 采购订单
│   └── quotation/          # 报价单 + 销售确认
├── components/             # 共享组件 + 旧模块遗留（迁移中）
├── hooks/                  # 跨模块 hooks（autoSave、permissions、PDF 预热等）
├── lib/                    # auth.ts、d1-client.ts、deepseek.ts、api-config.ts
├── utils/                  # PDF 生成器、历史记录、导入导出、存储、主题
├── constants/              # permissions.ts、dashboardModules.ts、colorMap.ts
└── types/                  # 跨模块类型定义
```

每个 feature 模块内部结构：`app/`（页面容器）、`components/`（UI）、`hooks/`（业务 hooks）、`services/`（数据 + PDF + Excel + API）、`state/`（Zustand store + selectors）、`types/`、`utils/`。

## 数据与存储

### Cloudflare D1（用户、权限、询报价、客户资料）

`schema.sql` 当前包含：

```sql
User        -- id、username、password(bcrypt)、email、status、isAdmin、lastLoginAt
Permission  -- id、userId、moduleId、canAccess  （外键 User.id 级联删除）
quotation_history  -- 旧表，保留兼容，主站历史目前不使用
Document    -- 统一业务单据表，当前询报价登记使用
Customer    -- 客户/供应商/收货人公司资料
Contact     -- 联络人资料
CustomerEvent -- 客户事件、时间轴、跟进
```

Worker 入口：`src/worker.ts`。配置：`wrangler.toml`（Worker 名 `mluonet-users`，D1 binding `USERS_DB`，自定义域 `udb.luocompany.net`）。

### 浏览器 localStorage（多数历史单据仍以此为主）

| Key | 用途 | 上限影响 |
|-----|------|---------|
| `quotation_history` | 报价单与销售确认，`type` 字段区分 | 高 |
| `invoice_history` | 财务发票 | 中 |
| `packing_history` | 装箱单 | 中 |
| `purchase_history` | 采购订单 | 中 |
| `customer_management` | 客户列表 | 中 |
| `supplier_management` | 供应商列表 | 低 |
| `consignee_management` | 收货人列表 | 低 |
| `customer_timeline_events` | 客户时间轴 | 中 |
| `customer_followups` | 跟进记录 | 低 |
| `new_customer_tracking` | 新客户跟踪 | 低 |
| `userCache`、`userInfo`、`latestPermissions` | 登录和权限缓存 | 低 |
| `qt.visibleCols`、`pk.visibleCols` | 列显示偏好 | 极低 |
| `theme-config`、`themeConfig` | 主题明暗模式（兼容旧 key） | 极低 |
| `draftQuotation`、`draftPurchase` | 草稿暂存 | 低 |

配额监控：`src/utils/storageQuotaManager.ts`（5MB 上限估算，超出时触发清理）。

### IndexedDB（字体/图片缓存）

`idb-keyval`：`src/utils/fontCache.ts`、`src/utils/imageCache.ts`，用于 PDF 中文字体和头图预缓存。

## 认证与权限

流程：

1. 登录页 → NextAuth Credentials → `src/lib/auth.ts`
2. `auth.ts` POST `https://udb.luocompany.net/api/auth/d1-users`，验证用户名 + bcrypt 密码
3. 登录成功：JWT 写入 `username`、`isAdmin`、`permissions`（完整权限数组）
4. 客户端 `src/app/providers.tsx` 同步 session → Zustand store → localStorage 缓存
5. `src/middleware.ts` 拦截未登录用户和 `/admin` 路径

权限模块唯一注册表：`src/constants/permissionModules.ts`

当前模块：
```text
quotation, packing, invoice, purchase,
inquiry, inquiry.batchEdit, order.financials,
history, customer,
ai-email, impa, clock, holidays, rmb
```

说明：`admin` 不是普通 moduleId，后台访问由 `isAdmin` 控制。修改权限逻辑时需同步检查 `permissionModules.ts`、侧边栏/移动端入口、`src/lib/permissions.ts`、权限初始化/刷新 hooks、middleware 和 `src/features/admin`。

## PDF、Excel 与静态资源

PDF 引擎：`jspdf` + `jspdf-autotable`。生成器：

| 单据 | 文件 |
|------|------|
| 报价单 | `src/utils/quotationPdfGenerator.ts` |
| 销售确认 | `src/utils/orderConfirmationPdfGenerator.ts` |
| 发票 | `src/utils/invoicePdfGenerator.ts` |
| 装箱单 | `src/utils/packingPdfGenerator.ts` |
| 唛头 | `src/utils/shippingMarksPdfGenerator.ts` |
| 采购 | `src/utils/purchasePdfGenerator.ts` |

**构建前自动运行**：

```bash
node scripts/embed-resources.js
```

生成 `src/lib/embedded-resources.ts`，内嵌：

- 中文字体：`public/fonts/NotoSansSC-Regular.ttf`、`public/fonts/NotoSansSC-Bold.ttf`（及 .gz）
- PDF 头图：`public/images/header-bilingual.jpg`、`public/images/header-english.png`
- 印章：`public/images/stamp-hongkong.png`、`public/images/stamp-shanghai.png`
- Logo：`public/assets/logo/`

## 环境变量

本地开发创建 `.env.local`：

```bash
DEEPSEEK_API_KEY=sk-...
NEXTAUTH_SECRET=replace-with-a-long-random-secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=https://udb.luocompany.net
NODE_ENV=development
# 可选
WORKER_URL=https://udb.luocompany.net
API_TOKEN=replace-with-worker-token
```

⚠️ `wrangler.toml` 中目前含明文 `API_TOKEN`，后续需迁移到 Cloudflare secret 并轮换。

## 本地开发

```bash
npm install
npm run dev        # 访问 http://localhost:3000
```

常用命令：

```bash
npm run build              # 生成嵌入资源 + Next.js 构建
npm start                  # 运行生产构建
npm run test               # Jest 全量测试
npm run test:watch         # 监听测试
npm run check:selectors    # 检查 selector 稳定性
npm run check:autotable    # 检查废弃 AutoTable 用法
npm run pre-release        # 发布前全量检查（check:selectors + test + lint）
```

注意：`check:production` 和 `check:production:full` 当前均指向 `scripts/pre-release-check.js`。

构建配置当前设置 `eslint.ignoreDuringBuilds = true`，构建通过不代表无 lint 问题。

## 测试

- 框架：Jest + `jsdom` 环境
- 配置：`jest.config.js`、`jest.setup.js`
- 路径别名：`@/* → src/*`
- 覆盖范围：工具函数、PDF 单位显示、报价 store、采购 selector、客户时间轴

发布前：

```bash
npm run pre-release
```

## 部署

### Vercel 主站

- 配置：`vercel.json`
- 区域：`hkg1`（香港）
- 输出：standalone
- 缓存策略：字体/logo 长缓存（1年）、图片短缓存（1天）、API 禁缓存
- 安全头：`X-Content-Type-Options`、`X-Frame-Options`（DENY）、`X-XSS-Protection`

### Cloudflare Worker / D1

- 配置：`wrangler.toml`
- Worker 名：`mluonet-users`
- 入口：`src/worker.ts`
- D1 binding：`USERS_DB`
- 自定义域：`udb.luocompany.net`

```bash
npx wrangler d1 execute mluonet-users --file schema.sql   # 更新数据库 schema
npx wrangler deploy                                         # 部署 Worker
```

## Git 与 SSH

```text
origin git@github.com:devluosir/luonet-vercel.git
```

指定私钥：

```bash
GIT_SSH_COMMAND="ssh -i ~/.ssh/imac26_ed25519 -o StrictHostKeyChecking=no" git fetch origin
```

不要把私钥或 `.env.local` 提交进仓库。

## 后续优化重点

参见 `AGENTS.md` 推荐优化路线，按优先级：

1. **安全**：Worker 管理接口从 `X-User-*` header 升级到签名验证；轮换已暴露 token。
2. **数据持久化**：业务历史从 `localStorage` 迁移到服务端，解决多设备同步和 5MB 配额。
3. **测试**：补 Playwright 关键路径集成测试（登录、PDF、导入导出）。
4. **代码整合**：消除 `src/components` 与 `src/features` 之间的重复实现。
5. **已知缺陷修复**：`validatePassword` bcrypt 分支、`silent-refresh` 服务端失效。
6. **构建质量**：恢复 ESLint 构建检查，建立 CI 流程。

## 文档索引

- `AGENTS.md`：代理维护说明（完整技术细节）
- `docs/core/CURRENT_STATE.md`：最新系统现状说明书
- `docs/README.md`：文档总目录
- `docs/core/`：项目总结、现状说明、更新日志
- `docs/features/`：各功能模块设计文档
- `docs/bugfixes/`：问题修复记录
- `docs/technical/`：性能、主题、稳定性、权限技术文档
- `RELEASE_CHECKLIST.md`：发布检查清单
- `VERCEL_DEPLOYMENT.md`：Vercel 部署说明
