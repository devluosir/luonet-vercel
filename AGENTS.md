# AGENTS.md

本文件给后续维护代理使用。范围覆盖整个仓库。最后更新：2026-06-18（V26.4.24.0.1）

## 项目定位

这是 Luo & Company 的 LC App / MLUONET 企业业务管理系统。它不是展示站，而是内部业务工具，核心功能是：单据创建（报价/发票/装箱单/采购单）、PDF/Excel 导出、历史记录管理、客户资料维护、权限管理和 AI 邮件助手。

**最高优先级**：业务稳定 > 数据兼容 > PDF 输出正确。不要为了重构而重构。

## 沟通与文档语言

- 默认使用中文沟通和写业务文档。
- 代码命名沿用现有英文风格。
- 用户面向文案保持简洁、清楚、偏业务语境。
- 修改复杂功能时，在最终说明中点明影响的模块、验证方式和风险。

## 当前版本状态

- 应用版本：`1.2.0`（package.json）
- 最新 git tag：`V26.4.24.0.1`
- 主框架：Next.js 14、React 18、TypeScript 5、Tailwind CSS 3
- 部署目标：Vercel 主站（香港 hkg1 区域）+ Cloudflare Worker + D1
- 已知问题：`check:production` 脚本指向 `scripts/pre-production-check.js`，但实际文件是 `scripts/pre-release-check.js`，使用前先修复或用 `check:selectors` 代替。

## 常用命令

```bash
npm install
npm run dev              # 本地开发，localhost:3000
npm run build            # 先跑 embed-resources.js，再 next build
npm run test             # Jest 全量测试
npm run test:watch       # 监听模式测试
npm run check:selectors  # 检查 store/selectors 稳定性（pre-release-check.js）
npm run check:autotable  # 检查废弃的 AutoTable overflow 用法
npm run pre-release      # check:selectors + test + lint（发布前必跑）
```

注意：`npm run build` 会先执行 `scripts/embed-resources.js`，生成/更新 `src/lib/embedded-resources.ts`（内嵌字体和头图）。**不要手动编辑**该文件，改源文件 `public/` 后重新 build。

## 代码结构规则

优先在 `src/features/{module}` 开发新功能：

```text
src/
├── app/              # Next.js App Router 页面 + API routes
├── features/         # 模块化业务代码（优先修改这里）
│   ├── admin/        # 用户和权限管理
│   ├── core/         # 跨模块基类（BaseDocumentService、DocumentLayout 等）
│   ├── customer/     # 客户/供应商/收货人/时间轴/跟进
│   ├── dashboard/    # 首页和快捷入口
│   ├── history/      # 历史记录管理
│   ├── invoice/      # 财务发票
│   ├── mail/         # AI 邮件助手
│   ├── packing/      # 装箱单
│   ├── purchase/     # 采购订单
│   └── quotation/    # 报价单 + 销售确认
├── components/       # 共享组件 + 旧模块遗留组件（迁移中）
├── hooks/            # 跨模块 hooks
├── lib/              # 认证、远程 API、D1 客户端、DeepSeek
├── utils/            # PDF 生成、历史记录、导入导出、主题、存储
├── constants/        # 权限、Dashboard、主题等常量
└── types/            # 跨模块类型定义
```

每个 feature 模块内部结构：

```text
app/         页面容器（组装模块 UI）
components/ 纯 UI 与模块组件
hooks/      页面和业务 hooks
services/   数据读写、PDF、Excel、API 调用
state/      Zustand store 和 selectors
types/      模块类型
utils/      模块内部工具
```

**重要**：`src/components` 与 `src/features` 之间存在迁移中的重复边界。动手前先确认当前页面实际 import 的文件，不要凭文件名猜。

## 路由和模块

| 路由 | 功能 | localStorage Key |
|------|------|-----------------|
| `/` | 登录页（NextAuth Credentials） | `userCache`、`userInfo` |
| `/dashboard` | 首页，快捷创建单据，最近文档 | 各历史 key |
| `/quotation` | 报价单 / 销售确认（Tab 切换） | `quotation_history`、`draftQuotation`、`qt.visibleCols` |
| `/packing` | 装箱单，可从销售确认导入 | `packing_history`、`pk.visibleCols` |
| `/invoice` | 财务发票 | `invoice_history` |
| `/purchase` | 采购订单，支持自动保存草稿 | `purchase_history`、`draftPurchase`、`purchase-autosave` |
| `/history` | 全部历史记录搜索/导入导出 | 全部历史 key |
| `/customer` | 客户/供应商/收货人/时间轴/跟进 | `customer_management`、`supplier_management`、`consignee_management`、`customer_timeline_events`、`customer_followups`、`new_customer_tracking` |
| `/mail` | AI 邮件助手（DeepSeek Chat API） | 无持久化 |
| `/admin` | 用户管理、权限分配 | Cloudflare D1 |

动态路由：`edit/[id]`、`copy/[id]` 存在于 quotation、packing、invoice、purchase 四个模块。

## 数据边界

### Cloudflare D1（`schema.sql` / `src/worker.ts`）

- **User**：id、username、password（bcrypt hash）、email、status、isAdmin、lastLoginAt、createdAt、updatedAt
- **Permission**：id、userId、moduleId、canAccess — 用户到模块权限的映射
- **quotation_history**：旧表，保留兼容，主站历史**目前不走这个表**

Worker 入口：`src/worker.ts`，D1 客户端：`src/lib/d1-client.ts`，配置：`wrangler.toml`。
线上 API 基地址：`https://udb.luocompany.net`

### 浏览器本地存储（业务单据主存储）

所有业务历史和客户数据当前保存在浏览器 `localStorage`（约 5MB 上限）。关键 key：

| Key | 用途 |
|-----|------|
| `quotation_history` | 报价单与销售确认，按 `type` 字段区分 |
| `invoice_history` | 财务发票记录 |
| `packing_history` | 装箱单记录 |
| `purchase_history` | 采购订单记录 |
| `customer_management` | 客户列表 |
| `supplier_management` | 供应商列表 |
| `consignee_management` | 收货人列表 |
| `customer_timeline_events` | 客户时间轴事件 |
| `customer_followups` | 客户跟进记录 |
| `new_customer_tracking` | 新客户跟踪 |
| `userCache`、`userInfo` | 登录用户信息缓存 |
| `latestPermissions`、`permissionsTimestamp` | 权限本地缓存 |
| `qt.visibleCols`、`pk.visibleCols` | 报价/装箱单列显示设置 |
| `themeConfig`、`theme-settings` | 主题和按钮风格 |
| `draftQuotation`、`draftPurchase` | 草稿暂存 |

配额监控：`src/utils/storageQuotaManager.ts`。新增字段、图片、长文本或大批量历史时，必须评估 5MB 上限影响。

### IndexedDB（字体和图片缓存）

`idb-keyval` 用于字体和头图缓存：`src/utils/fontCache.ts`、`src/utils/imageCache.ts`。

## 认证与权限

认证主线（不要只改一处）：

1. `/` 登录页 → NextAuth Credentials Provider → `src/lib/auth.ts`
2. `auth.ts` 调用 `https://udb.luocompany.net/api/auth/d1-users` 验证用户名密码
3. 登录成功后，JWT/session 写入 `username`、`isAdmin`、`permissions`（完整权限数组）
4. `src/app/providers.tsx` 在客户端初始化权限 store 和本地缓存
5. `src/middleware.ts` 拦截未登录访问和 `/admin` 路径

**认证已知问题**：`silent-refresh` 场景（密码为字符串 `'silent-refresh'`）依赖 `localStorage.userCache`，服务端 authorize 函数访问不到 `window`，该分支实际无效。

**Worker 管理接口安全**：当前通过请求头 `X-User-ID`、`X-User-Name`、`X-User-Admin` 传递身份，**客户端可伪造**。这是高风险点，后续应迁移到 HMAC 签名或 NextAuth 服务端 session 校验。

权限模块列表（`src/constants/permissions.ts`）：
```text
quotation, packing, invoice, purchase, customer, history, ai-email, admin
```

修改权限时至少检查：`src/constants/permissions.ts`、`src/constants/dashboardModules.ts`、`src/lib/permissions.ts`、`src/hooks/usePermissionInit.ts`、`src/hooks/usePermissionRefresh.ts`、`src/middleware.ts`、`src/features/admin`。

## PDF 和 Excel 规则

PDF 相关改动风险高。修改前先定位具体生成器：

| 单据类型 | 生成器文件 |
|---------|-----------|
| 报价单 | `src/utils/quotationPdfGenerator.ts` |
| 销售确认 | `src/utils/orderConfirmationPdfGenerator.ts` |
| 财务发票 | `src/utils/invoicePdfGenerator.ts` + `src/features/invoice/services/pdf.service.ts` |
| 装箱单 | `src/utils/packingPdfGenerator.ts` |
| 装箱单（唛头） | `src/utils/shippingMarksPdfGenerator.ts` |
| 采购订单 | `src/utils/purchasePdfGenerator.ts` + `src/features/purchase/services/pdf.service.ts` |
| 通用表格 | `src/utils/tableRenderer.ts`、`src/utils/pdfTableGenerator.ts` |

字体和图片资源：

- 字体：`public/fonts/NotoSansSC-Regular.ttf`、`public/fonts/NotoSansSC-Bold.ttf`（及同名 .gz）
- 头图：`public/images/header-bilingual.jpg`、`public/images/header-english.png`
- 印章：`public/images/stamp-hongkong.png`、`public/images/stamp-shanghai.png`
- Logo：`public/assets/logo/`

嵌入脚本：`scripts/embed-resources.js` → 生成 `src/lib/embedded-resources.ts`（构建时自动运行）。

禁止重新引入 `jspdf-autotable` 的废弃 `overflow` 用法：

```bash
npm run check:autotable
```

## AI 邮件助手

- API 路由：`src/app/api/generate/route.ts`（POST）
- AI 服务：`src/lib/deepseek.ts`（OpenAI-compatible SDK → DeepSeek Chat API）
- 超时：2 分钟（`AbortController`）
- 参数：`content`、`language`、`type`、`mode`（mail/reply）、`originalMail`（reply 模式必填）
- 需要环境变量：`DEEPSEEK_API_KEY`

## 前端实现习惯

- TypeScript 严格模式，优先补类型，不要使用大面积 `any`。
- 路径别名使用 `@/`（指向 `src/`）。
- 访问 `window`、`localStorage`、DOM、NextAuth client hooks 的组件必须是 client component（`'use client'`）。
- 避免水合错误：SSR 阶段不要读取浏览器状态，使用客户端 effect 或安全工具函数（`src/utils/safeLocalStorage.ts`）。
- 状态管理走 Zustand store + selectors，不要绕过 store 直接操作 localStorage。
- Tailwind 动态类名依赖 safelist，动态拼类前看 `tailwind.config.ts`。

## 测试和验证

改动后按风险选择验证：

- 普通工具函数：`npm run test -- <测试文件名>`
- Store/selectors：跑 `src/features/{module}/state/__tests__/`
- PDF 或导入导出：至少手动生成一次对应 PDF/Excel
- 权限或登录：本地登录、刷新 session、普通用户与管理员路径都要看
- 构建资源：`npm run build`

发布前必跑：

```bash
npm run pre-release   # check:selectors + test + lint
```

## 部署与 Git

```bash
# Vercel 主站（自动触发 push 到 main）
# 配置：vercel.json（区域：hkg1，standalone 输出）

# Cloudflare Worker 手动部署
npx wrangler d1 execute mluonet-users --file schema.sql   # 更新 schema
npx wrangler deploy                                         # 部署 worker
```

Git remote：

```text
origin git@github.com:devluosir/luonet-vercel.git
```

指定 SSH 私钥：

```bash
GIT_SSH_COMMAND="ssh -i ~/.ssh/imac26_ed25519 -o StrictHostKeyChecking=no" git fetch origin
```

**绝对不要提交**：私钥、`.env.local`、真实 API key、生产 token。`wrangler.toml` 中已有明文 `API_TOKEN`，后续应迁移到 Cloudflare secret 并轮换。

## 高风险区域（改动需额外谨慎）

1. **Worker 管理接口认证**：`X-User-*` headers 客户端可伪造，最高优先级安全修复
2. **权限缓存和 session 刷新**：多处联动，只改一处必出问题
3. **PDF 字体、头图、表格分页和合并单元格**：调试成本高
4. **`quotation_history` 报价与销售确认共存结构**：按 `type` 字段区分，迁移时要保持兼容
5. **本地存储配额**：5MB 上限，历史记录增大时要触发清理
6. **旧组件与 feature 模块重复代码**：改前先确认实际 import 路径
7. **主题系统和 Tailwind safelist**：动态类名容易被 purge
8. **`validatePassword` 方法**（`d1-client.ts`）：bcrypt 分支有 bug，直接返回 false，修改密码功能受影响

## 推荐优化路线（优先级排序）

1. **紧急安全**：将 Worker 管理接口从 `X-User-*` header 认证迁移到 HMAC 签名或 JWT 校验；轮换已暴露的 `wrangler.toml` API_TOKEN。
2. **数据持久化**：业务历史数据从 `localStorage` 迁移到服务端数据库（Cloudflare D1 扩展 schema 或独立数据库），解决多设备同步和 5MB 配额问题。
3. **测试覆盖**：补 Playwright 关键路径集成测试（登录、权限、创建单据、PDF 生成、导入导出）。
4. **代码清理**：分批消除 `src/components` 与 `src/features` 的重复实现，让每个业务模块自包含。
5. **修复已知问题**：`check:production` 脚本路径、`validatePassword` bcrypt 分支、`silent-refresh` 服务端不可用问题。
6. **构建质量**：恢复 `eslint.ignoreDuringBuilds = false`，在 CI 中强制执行 lint。

## 文档索引

- `README.md`：项目概览和快速上手
- `AGENTS.md`：代理维护说明（本文件）
- `docs/README.md`：文档总目录（96个文档）
- `docs/core/`：项目总结、更新日志、系统报告
- `docs/features/`：各功能模块设计文档
- `docs/bugfixes/`：问题修复记录
- `docs/technical/`：性能、主题、稳定性、权限技术文档
- `RELEASE_CHECKLIST.md`：发布检查清单
- `VERCEL_DEPLOYMENT.md`：Vercel 部署说明
