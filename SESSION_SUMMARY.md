# LC App 改造总结（2026-06）

本文档记录 2026 年 6 月 Cowork 会话完成的所有工作，以及后续方案，供下次快速恢复上下文使用。

---

## 项目背景

**LC App**：外贸公司内部工具，用于生成报价单、发票、装箱单、采购单，管理客户档案。

**技术栈**：
- Next.js 14 App Router + TypeScript 5 strict + Tailwind CSS 3
- Cloudflare Worker + D1（数据库）— 部署在 `udb.luocompany.net`
- NextAuth Credentials Provider（JWT 策略）
- Vercel（前端部署）
- localStorage 作为主要业务数据存储，D1 作为云端备份与同步

---

## 本次完成的工作（TASK-01 ~ TASK-19）

### 🔴 安全修复（TASK-01 ~ TASK-03）

| Task | 内容 | 提交 |
|------|------|------|
| 01 | 从 `wrangler.toml` 删除明文 `API_TOKEN`，改用 Cloudflare secret | `57e49b5f` |
| 02 | `/api/generate`（DeepSeek）加 NextAuth session 认证 | `656a8ab3` |
| 03 | `validatePassword` 支持 bcrypt 哈希验证 | `5bf53204` |

### 🟡 工程修复（TASK-04 ~ TASK-07）

| Task | 内容 | 提交 |
|------|------|------|
| 04 | 修复 `check:production` 脚本路径 + Jest flags | `71f34c3c` |
| 05 | 恢复 ESLint 构建检查（之前被关闭） | `4d1cf82b` |
| 06 | `silent-refresh` 改为服务端安全，移除 `window` 访问 | `e5e72136` |
| 07 | 添加 GitHub Actions CI（lint + test + build） | `d84f1ecd` |

### 🟢 D1 数据层建设（TASK-08 ~ TASK-12）

| Task | 内容 | 提交 |
|------|------|------|
| 08 | D1 Schema 扩展：`Document`、`Customer`、`CustomerEvent` 表 | `901324cd` |
| 09 | Worker 管理接口改用 `API_TOKEN` Bearer 鉴权 | `3af77673` |
| 10 | Next.js 管理 API 代理（浏览器→Vercel→Worker，避免 CORS） | `b09918c3` |
| 11 | Worker Document CRUD API + Next.js 代理路由 `/api/documents` | `bfa3f7bd` |
| 12 | Worker Customer CRUD API + Next.js 代理路由 `/api/customers` | `e949e556` |

### 🔵 D1 数据管线（TASK-13 ~ TASK-15）

| Task | 内容 | 提交 |
|------|------|------|
| 13 | localStorage 双写 D1（fire-and-forget，5 个写路径文件） | `83e19c8b` |
| 14 | D1 历史数据一次性迁移工具（`INSERT OR REPLACE` + 管理员 UI） | `d7af8d52` |
| 15 | 登录时从 D1 拉取合并到 localStorage（多设备同步） | `aacd6be0` |

**数据管线完整流程**：
```
用户保存文档
  → localStorage.setItem()（主写，同步）
  → d1SyncDocument()（D1 双写，fire-and-forget，后台）

用户登录
  → pullAllFromD1()（并发拉取 8 种数据类型）
  → mergeIntoStorage()（D1 updated_at 更新则以 D1 为准）
  → localStorage 更新（多设备数据一致）

管理员一键迁移（仅需执行一次）
  → D1MigrationPanel → migrateAllToD1()
  → 读取 localStorage 全量数据 → POST 到 /api/documents|customers
```

### 🧪 测试与 CI（TASK-16 ~ TASK-17）

| Task | 内容 | 提交 |
|------|------|------|
| 16 | Playwright E2E 套件（登录/Dashboard/报价单保存+D1断言/历史页） | `fa1a6a65` |
| 17 | GitHub Actions 新增 E2E job（push to main 后针对生产站点运行） | `88507f4e` |

### 🟢 客户多联系人扩展（TASK-34）

| Task | 内容 | 提交 |
|------|------|------|
| 34 | 新增 `Contact` 类型，`contacts[]` 替代 `contact2*`；表单动态增删；旧数据自动迁移；D1 同步 + 询价人选项全部适配 | `6fccd03d` |

### 🔴 客户 D1 字段修复（TASK-33）

| Task | 内容 | 提交 |
|------|------|------|
| 33 | `customerService.ts` data payload 补全简称/联系人字段；`d1Pull.ts` 改为 `...c.data` 全量还原 | `c1897277` |

### 🔴 询报价双向同步修复（TASK-32）

| Task | 内容 | 提交 |
|------|------|------|
| 32 | 新增 `pushLocalToD1()`，删除 `length===0` 短路；页面加载变为：拉 D1 → 推本地存量 → 合并展示 | `70a24e7d` |

### 🟡 客户表单 UX 优化（TASK-31）

| Task | 内容 | 提交 |
|------|------|------|
| 31 | CustomerForm 分区 + 双列网格 + 联系人2折叠；CustomerModal 加 `max-h-[85vh] overflow-y-auto max-w-2xl` | `0eddbec3` |

### 🔵 询报价权限 + D1 共享数据（TASK-19，分两 commit）

| Task | 内容 | 提交 |
|------|------|------|
| 19A | 询报价权限门控：管理员面板新增权限项，侧边栏修正 permissionKey，InquiryPage 加登录/403 守卫 | `a818075b` |
| 19B | D1 共享数据：Worker `/api/inquiry` 路由，Next.js 代理，inquiry service/store 接入 D1 双写+拉取，schema.sql 新增 `'inquiry'` 类型 | `1df67dbf` |

> ⚠️ **线上 D1 需执行迁移**：见 [D1 迁移说明](#d1-迁移-document-表-type-约束) 节。

### 🔴 权限架构安全修复（TASK-41）

| Task | 内容 | 状态 |
|------|------|------|
| 41 | 修复普通用户登录后拥有全部权限的 Bug：双 ref 解耦初始化、AppSidebar fail closed、删除 API 默认赋权 fallback、删除 localStorage 覆盖 session 权限逻辑 | 待提交 |

---

## 当前系统架构

```
浏览器（Next.js 前端，Vercel）
  ├── localStorage          主数据存储（实时读写）
  ├── /api/documents        → Cloudflare Worker → D1（Document 表，type ≠ inquiry）
  ├── /api/inquiry          → Cloudflare Worker → D1（Document 表，type='inquiry', user_id='_shared_'，全团队共享）
  ├── /api/customers        → Cloudflare Worker → D1（Customer 表）
  └── /api/admin/[...path] → Cloudflare Worker → D1（Users 表，需 API_TOKEN）

Cloudflare Worker（udb.luocompany.net）
  ├── Bearer token 鉴权（API_TOKEN 共享密钥）
  ├── Document CRUD（INSERT OR REPLACE，幂等）
  ├── Inquiry CRUD（user_id='_shared_'，无用户过滤，团队共享读写）
  ├── Customer CRUD（INSERT OR REPLACE，幂等）
  └── Admin CRUD（用户管理，权限管理）

权限系统（TASK-41 修复后）
  ├── 管理员面板（AdminPage）可为每个用户分配各模块权限
  ├── inquiry 模块权限：moduleId='inquiry'，canAccess=true 方可进入
  ├── isAdmin=true 的用户自动拥有所有页面访问权（InquiryPage 守卫已处理）
  ├── MODULE_PERMISSIONS 列表：quotation, packing, invoice, purchase, inquiry, history, customer, ai-email
  ├── usePermissionInit：storageInitDone + lastSessionHash 双 ref，loading 阶段不再阻断 authenticated 阶段的 session 初始化
  ├── AppSidebar：fail closed — permissionUser 未就绪时不展示受保护菜单（旧设计是 fail open，导致登录后短暂拥有全部权限）
  └── 所有权限 API 路由：空权限返回 []，不再 fallback 赋默认权限

GitHub Actions CI
  ├── check job：lint + unit test + build（PR + push）
  └── e2e job：Playwright 针对生产站点（push to main）
```

---

## 重要配置说明

### 环境变量

**Vercel 环境变量**（Settings → Environment Variables）：
- `NEXTAUTH_SECRET` — NextAuth JWT 签名密钥
- `API_TOKEN` — 与 Cloudflare Worker secret 完全一致的共享密钥
- `NEXT_PUBLIC_API_BASE_URL` — `https://udb.luocompany.net`
- `DEEPSEEK_API_KEY` — AI 功能密钥

**Cloudflare Worker Secrets**（Dashboard → Workers → Settings → Variables）：
- `API_TOKEN` — 必须与 Vercel 的 `API_TOKEN` 完全一致

**GitHub Actions Secrets/Variables**（Settings → Secrets and variables → Actions）：
- Secrets: `E2E_USERNAME`, `E2E_PASSWORD`, `NEXTAUTH_SECRET`, `DEEPSEEK_API_KEY`
- Variables: `E2E_BASE_URL`（如 `https://luonet-vercel.vercel.app`）

> ⚠️ `API_TOKEN` 是自定义共享密钥，**不是** Cloudflare 控制台的 API Token。两端必须同步修改。

### 关键文件

| 文件 | 作用 |
|------|------|
| `src/worker.ts` | Cloudflare Worker 全部路由逻辑（含 /api/inquiry） |
| `src/utils/d1Sync.ts` | fire-and-forget 双写帮助函数 |
| `src/utils/d1Pull.ts` | 登录拉取 + 合并到 localStorage |
| `src/utils/d1Migration.ts` | 一次性批量迁移工具 |
| `src/hooks/useD1Sync.ts` | 登录后触发拉取的 React hook |
| `src/app/providers.tsx` | 全局注入 D1SyncInitializer |
| `src/features/admin/components/D1MigrationPanel.tsx` | 管理员迁移 UI |
| `src/app/api/inquiry/[[...path]]/route.ts` | inquiry Next.js 代理（验证 session + 权限后转发） |
| `src/features/inquiry/services/inquiry.service.ts` | inquiry localStorage CRUD + D1 sync 方法 |
| `src/features/inquiry/state/inquiry.store.ts` | inquiry Zustand store（写操作含 fire-and-forget D1 双写） |
| `src/features/admin/hooks/usePermissions.ts` | MODULE_PERMISSIONS 列表（含 inquiry） |
| `src/components/layout/AppSidebar.tsx` | 侧边栏导航（inquiry 绑定 canViewInquiry 权限） |
| `CODEX_TASKS.md` | 所有 Codex 执行规格（TASK-01 ~ TASK-19） |
| `AGENTS.md` | 项目规范，Codex 执行前必读 |
| `schema.sql` | D1 建表 SQL（type 约束已含 inquiry） |
| `migrations/002_add_inquiry_type.sql` | ⚠️ 线上 D1 迁移脚本（需手动执行一次） |
| `playwright.config.ts` | E2E 配置，读 `E2E_BASE_URL` 环境变量 |
| `.github/workflows/ci.yml` | CI 流水线 |

---

## 询报价登记功能（2026-06-20 新增）

### 功能概述

新增"询报价登记表"模块（`/inquiry`），用于登记客户询价、追踪各供应商报价进度、记录最终报给客户的版本全流程。已集成到侧边栏导航（`AppSidebar.tsx`）。

### 文件结构

```
src/
├── app/inquiry/page.tsx                         ← re-export
└── features/inquiry/
    ├── app/InquiryPage.tsx                      ← 页面入口
    ├── components/
    │   ├── InquiryTable.tsx                     ← 列表表格（可排序）
    │   ├── InquiryRow.tsx                       ← 单行（点击行 = 编辑，hover 显示删除）
    │   ├── InquiryQuoteStatusDisplay.tsx         ← 行内状态展示（只读，inline 文本）
    │   ├── InquiryFormModal.tsx                 ← 新增/编辑弹窗
    │   ├── InquiryQuoteStatus.tsx               ← 弹窗内供应商+已报价状态编辑器
    │   ├── SupplierStatusTag.tsx                ← 供应商标签（点击编辑）
    │   └── QuotedStatusList.tsx                 ← 已报价列表
    ├── hooks/useInquiryActions.ts               ← store action 封装
    ├── services/inquiry.service.ts              ← localStorage CRUD
    ├── state/inquiry.store.ts                   ← Zustand store
    ├── types/index.ts                           ← 类型定义
    └── utils/
        ├── inquiryUtils.ts                      ← 日期/编号/颜色工具函数
        └── inquirerOptions.ts                   ← 从 customer_management 生成询价人选项
```

### 数据结构（`types/index.ts`）

```ts
InquiryRecord {
  id, inquiryDate, inquiryNo, inquirer, customerNo,
  description, orderNo?,
  supplierStatuses: SupplierQuoteStatus[],
  quotedStatuses:   CustomerQuoteStatus[],
  createdAt, updatedAt
}

SupplierQuoteStatus { id, supplierShortName, quoteDate?, status: 'pending'|'quoted'|'unavailable'|'need_info' }
CustomerQuoteStatus { id, quoteDate, supplierShortName, version, type?: 'quoted'|'unavailable'|'supplemented' }
```

### 询价编号规则

- 格式：`C[YYmmDD][后缀]`，如 `C260621F`
- 后缀序列（`INQUIRY_SUFFIX_SEQUENCE`）：F G H J K … Z → ZA ZB … ZZ → ZZA …（全程跳过 I、O）
- 首字母 F 起，因为 A-E 为客户编号前缀，避免混淆
- 紧急单：`-U` 后缀（如 `C260621M-U`），生成编号时 `-U` 去掉后再参与槽位占用判断
- 弹窗中修改日期 → 自动更新编号（除非用户手动编辑过编号）

### 颜色规则

**行颜色（`getRecordColorState`，由 `quotedStatuses` 决定）：**

| 条件 | 颜色 |
|------|------|
| 有 `type=unavailable` 的已报价记录 | `text-gray-400` 灰 |
| 有任何其他已报价记录（quoted/supplemented） | `text-blue-600` 蓝 |
| 无已报价记录（仅询价中） | `text-pink-500` 粉 |

**供应商标签颜色（`getSupplierStatusClass`，由各自 status 决定）：**

| 状态 | 颜色 |
|------|------|
| `pending` | `text-pink-500` 粉红（名称，无日期） |
| `quoted` | `text-blue-600` 蓝色（名称+日期） |
| `need_info` | `text-yellow-500` 黄色（名称+日期） |
| `unavailable` | `text-gray-400` 灰色（名称+日期） |

### 日期格式约定

| 场景 | 格式 | 函数 |
|------|------|------|
| 存储 | `[6.20]` | `formatShortDate` |
| 表格列 / 已报价区域显示 | `6.20` | `stripDateBrackets` |
| 供应商标签内日期 | `(6.20)` | `roundDateBrackets` |
| modal 日期输入框 | `6.21`（显示）/ `YYYY-MM-DD`（内部） | `ymdToDisplay` / `displayToYmd` |

### 供应商状态/日期联动规则（`InquiryQuoteStatus.tsx`）

- `pending` → 日期输入框 disabled，切换到 pending 时清空日期
- 切换到非 pending 且日期为空 → 自动填入今天
- 在 pending 状态下填入日期 → 自动切换为 `quoted`
- "已补充信息" checkbox：仅在有供应商标记 `need_info` 时显示；勾选 = 写入 `type=supplemented` 的 CustomerQuoteStatus
- "已回复客户无法报价" checkbox：写入 `type=unavailable` 的 CustomerQuoteStatus

### Modal 关键设计

- **日期步进器**：← / → 按钮 + 键盘 ↑↓ 调整日期，Enter/Blur 提交文字
- **询价编号**：新增模式自动生成，编辑模式手动（`isInquiryNoManual` 标记）
- **紧急复选框**：勾选 = 编号追加 `-U`，取消 = 去掉 `-U`
- **询价人 datalist**：实时读取 `customer_management`，生成 `公司简称-联系人简称`（如 `LC-Roger`）
- **供应商/已报价编辑面板**：`<div>` 而非 `<form>`，避免嵌套 form 触发外层提交；Enter 键确认
- **订单编号字段**：仅编辑模式显示，用于记录询价转订单后的订单号（绿色 monospace 显示）
- **`replaceStatuses`**：编辑模式保存时原子替换供应商列表 + 已报价列表，防止并发写入不一致

### 已报价版本逻辑

- 版本字段从 `a,b,c…z` 自动递增（`getNextQuoteVersion`）
- 超过 26 条后：`aa, ab …`
- 可选供应商下拉列表 = 供应商中 `status=quoted` 且有 `quoteDate` 的项

### 数据存储（TASK-19 后）

- localStorage key：`inquiry_records`
- `inquiryService`（增删改查）+ Zustand store（`useInquiryStore`）管理
- **已接入 D1 双写**（fire-and-forget，写操作后台同步）
- **全团队共享**：D1 存储时固定 `user_id='_shared_'`，查询时不过滤 user_id，所有有权限的用户看同一份数据
- 页面进入时（权限验证通过后）自动拉取 D1 全量记录，与 localStorage 合并（D1 的 `updatedAt` 更新则以 D1 为准）
- localStorage 仍作为主写缓存，D1 为共享云端存储

---

## D1 迁移：Document 表 type 约束

### 背景

TASK-08 建表时 `Document.type` 的 CHECK 约束为：
```sql
CHECK(type IN ('quotation', 'confirmation', 'invoice', 'packing', 'purchase'))
```

TASK-19 新增 `'inquiry'` 类型，`schema.sql` 已更新，但 `CREATE TABLE IF NOT EXISTS` **不会修改已存在的线上表**。若不执行迁移，插入 inquiry 记录会报 `CHECK constraint failed`，Phase B 双写静默失败。

### 执行步骤（本地终端，一次性）

```bash
# 1. 先核查线上约束（可选，确认问题存在）
npx wrangler d1 execute mluonet-users \
  --command="SELECT sql FROM sqlite_master WHERE type='table' AND name='Document'" \
  --remote

# 2. 执行迁移（重建表，保留全量数据，约 30 秒）
npx wrangler d1 execute mluonet-users \
  --file=./migrations/002_add_inquiry_type.sql \
  --remote

# 3. 验证新约束
npx wrangler d1 execute mluonet-users \
  --command="SELECT sql FROM sqlite_master WHERE type='table' AND name='Document'" \
  --remote
```

迁移脚本（`migrations/002_add_inquiry_type.sql`）流程：
1. 建 `Document_v2`（含 `'inquiry'` 的 CHECK，无 FOREIGN KEY）
2. `INSERT INTO Document_v2 SELECT ... FROM Document`（COALESCE 处理旧字段空值）
3. `DROP TABLE Document`
4. `ALTER TABLE Document_v2 RENAME TO Document`
5. 重建全部索引

> ⚠️ 迁移过程中会有短暂数据库写锁，建议在低峰时段执行（秒级完成）。

---

## 后续方案

### 选项 A：新功能（优先推荐）

如果日常使用中有缺失的功能，优先补齐，业务价值最高。常见方向：

- **邮件发送**：从 app 内直接发报价单/发票 PDF 给客户（集成 Resend 或 Nodemailer）
- **客户统计**：按客户汇总成交金额、单据数量，Dashboard 展示
- **PDF 模板定制**：多套模板切换、自定义 Logo/页眉页脚
- **报表导出**：按时间段导出 Excel 汇总（已有 xlsx skill 可用）

### 选项 B：组件去重（中期技术债）

`src/components/` 和 `src/features/` 存在重复实现（如 `PaymentTermsSection` 在两处各有一份）。建议做法：
1. 先用 `grep` 列出所有重复组件
2. 以 `src/features/` 版本为准，将 `src/components/` 对应文件改为 re-export
3. 不直接删除，保留一个版本过渡

**风险**：中。改错路径会导致组件加载失败。建议每次只改一个组件，测试后提交。

### 选项 C：D1 分页读取（低优先级）

当前登录拉取用 `fetchAll()` 自动分页（每批 500 条）。数据量在几百条内基本感受不到延迟。只有当单个用户数据量超过 2000 条时才值得优化。

### 如何快速恢复工作

下次开新 Cowork 会话时，把以下信息告知 Claude：

```
项目：LC App（外贸工具），Next.js 14 + Cloudflare Worker + D1 + Vercel
进度：TASK-01~31 已完成（含 TASK-15-DRAFT 废弃草案），见 CODEX_TASKS.md 和 SESSION_SUMMARY.md
上次结束：客户表单 UX 优化（TASK-31）；D1 迁移已执行（002_add_inquiry_type.sql）
工作区：/Users/roger/website/luonet-vercel（已连接）
下一步：[告知想做的方向]
```

Codex 执行任务前会自动读 `AGENTS.md`，所有任务规格在 `CODEX_TASKS.md`。

---

---

## 同步机制说明（TASK-43 最终架构）

### 写入路径（localStorage → D1）

各单据保存时调 `d1SyncDocument(action, payload)`（`src/utils/d1Sync.ts`），内部：
1. 立即写入本地待提交队列 `d1_pending_syncs`（localStorage）
2. 异步发起 POST/PUT/DELETE → `/api/documents`（Next.js 代理，注入 user_id + Bearer token）
3. 成功则从队列移除；失败则留队，等下次 `flushPendingQueue()` 重试

### 读取路径（D1 → localStorage，历史页刷新时）

`pullAllFromD1()`（`src/utils/d1Pull.ts`）流程：
1. `flushPendingQueue()` — 重试所有未成功写入，确保 D1 有最新数据
2. 取当前仍未成功的 `pendingIds`
3. 并行拉取全部类型（quotation/invoice/packing/purchase + customer/supplier/consignee）
4. `mergeIntoStorage` — D1 为权威：D1 有则以 D1 为准；D1 无且不在 pendingIds 则视为其他设备已删；仍在 pendingIds 则保留本地等下次重试

### 触发时机

| 时机 | 触发来源 |
|------|----------|
| 登录成功 | `usePermissionInit` 内 `pullAllFromD1()` |
| 进入历史页 | `HistoryPage` 挂载 useEffect |
| 点击刷新按钮 | `handleSyncRefresh`（先 pull 再 refreshKey++，带旋转动画） |

### 涉及文件

| 文件 | 职责 |
|------|------|
| `src/utils/d1Sync.ts` | 写入队列、flushPendingQueue、getPendingIds、删除 ID 追踪 |
| `src/utils/d1Pull.ts` | pushLocalDocsToD1、拉取、flush、mergeIntoStorage（D1 权威） |
| `src/features/history/app/HistoryPage.tsx` | 挂载/visibilitychange 触发同步、handleSyncRefresh |
| `src/features/packing/services/packingHistoryService.ts` | 装箱单 create/update/delete 的 d1Sync |
| `src/features/invoice/services/invoice.service.ts` | 发票 update 路径的 d1Sync |
| `src/utils/quotationHistory.ts` | 报价/确认书 create/update/delete（原有） |
| `src/utils/purchaseHistory.ts` | 采购单 create/update/delete（原有） |

### TASK-44 新增内容

| 机制 | 说明 |
|------|------|
| `pushLocalDocsToD1` | pull 前检查本地各类型，将 D1 缺失的记录补推上去（参照登记表 pushLocalToD1） |
| 删除 ID 追踪 | `d1_deleted_doc_ids`：本机/远端删除的 ID 存入此表，push 时跳过，防止复活 |
| visibilitychange 触发 | 页面挂载 + 标签回到前台时立即同步，无固定轮询 |

---

---

## TASK-45：单据写入 500 错误修复（Worker INSERT 缺少 created_at/updated_at）

### 根本原因

Migration 002（`002_add_inquiry_type.sql`）重建了 `Document` 表，新表的 `created_at` / `updated_at` 字段为 `NOT NULL` 但无 `DEFAULT`。Worker 原有 `handleCreateDocument` INSERT 语句未提供这两列，导致所有单据写入均被 SQLite 拒绝（HTTP 500）。这是跨设备同步完全失效的根本原因——D1 从未收到任何文档。

### 修复内容

**`src/worker.ts` → `handleCreateDocument`**：INSERT 扩展为 11 列，补充 `created_at`（优先取 `body.created_at`，保留原始创建时间）和 `updated_at`（始终取当前时间）。

**`src/app/api/documents/[[...path]]/route.ts`（代理路由加固）**：`workerResp.json()` 加 try-catch，Worker 返回非 JSON 时返回 502 + 错误详情，不再抛出未处理异常。

**`src/utils/d1Sync.ts`（诊断日志）**：`executeOp` 成功时打印 `[d1Sync] ✓`，失败时打印 HTTP 状态和响应体。

**`src/utils/d1Pull.ts`（时序修复 + 诊断日志）**：`pushLocalDocsToD1` 调用后增加第二次 `await flushPendingQueue()`，确保补推的 fire-and-forget 请求在主 pull 前全部完成；新增 D1 各类型记录数日志。

### 部署说明（待用户手动执行）

`src/worker.ts` 需手动提交并部署：

```bash
cd /Users/roger/website/luonet-vercel
git add src/worker.ts
git commit -m "fix(worker): INSERT Document 补充 created_at/updated_at (TASK-45)"
npx wrangler deploy
```

其余文件（route.ts、d1Sync.ts、d1Pull.ts）随 Vercel git push 自动部署。

---

## TASK-46：修复询报价编辑模式下询价编号/日期被覆盖

### 根本原因

`InquiryFormModal.tsx` 中两个 `useEffect` 同一渲染周期内竞态：Effect 1 设置 `inquiryNo = record.inquiryNo`（原始编号）并将 `isInquiryNoManual` 置 `true`；Effect 2 在同一周期内读到 stale 状态（`isInquiryNoManual = false`、`dateInput = 今天`），生成今天日期的新编号并作为最后一次 setState 写入，覆盖 Effect 1 的结果。下次再打开同一记录，`getDateInputValueFromInquiryNo` 从被污染的 `inquiryNo` 解析出今天日期，`inquiryDate` 也跟着错误。

### 修复内容

**`src/features/inquiry/components/InquiryFormModal.tsx`** — Effect 2 加 `mode === 'edit'` 守卫，同时将 `mode` 加入 deps：

```typescript
useEffect(() => {
  if (!isOpen || isInquiryNoManual || mode === 'edit') return;
  const base = generateNextInquiryNo(dateInputToDate(dateInput), existingNos);
  setInquiryNo(isUrgent ? `${base}-U` : base);
}, [dateInput, existingNos, isInquiryNoManual, isOpen, isUrgent, mode]);
```

编辑模式下询价编号不再自动生成；新增模式修改日期时仍自动同步编号，行为不变。已通过 `npx tsc --noEmit` + `npm run build` 验证并提交。

---

---

## TASK-47：询报价筛选重构 + 导入/导出

### 筛选 UI 重构

去掉副标题，筛选控件改为**内联向左展开**（与标题同行，不再另起一行）。时间筛选改为 `7D / 1M / 3M / 1Y`，状态筛选保留 `未报价 / 已报价 / 无法报价 / 已成单`（移除「需信息」），点击已选项即取消（无「全部」按钮）。底部浮动「新增询价」（冗余）替换为「导入 / 导出」。

### 筛选 Bug 修复

**`已报价` 混入 `无法报价` 记录**：一条记录可同时有普通报价条目（`type` 为空）和 `{type: 'unavailable'}` 条目，旧逻辑 `some(type !== 'unavailable')` 导致两个筛选器同时命中。新逻辑：`已报价` = 有至少一个 `type` 为空或 `'quoted'` 的条目 **且** 无任何 `unavailable` 条目。

### 导入/导出

**导出**：`inquiryService.getAll()` 全量序列化为 JSON，浏览器下载（`inquiry_YYYY-MM-DD.json`）。

**导入**：隐藏 file input，解析 JSON 后逐条与本地合并（ID 不存在则新增并 `syncToD1`；ID 存在且导入版本更新则覆盖并 `updateInD1`；否则跳过），写入 store 并弹出汇总提示。操作幂等：重复导入相同文件不产生重复记录。

---

## TASK-48：「询价已关闭」状态 + 表单紧凑化 + 历史数据导入（2026-2）

### 新增 closed 状态

`CustomerQuoteType` 新增 `'closed'`。`InquiryQuoteStatus` 在「无法报价」checkbox 右侧并排增加「询价已关闭」checkbox，各自带日期输入。`InquiryQuoteStatusDisplay` 卡片展示灰色 `询价关闭(m.d)`。`getRecordColorState` 将 `closed` 归入灰色；`useInquiryFilter` 中 `unavailable` 筛选包含 `closed`，`customer_quoted` 排除 `closed`。

### 编辑弹窗紧凑化 + 交互优化

`InquiryFormModal` 顶部身份条改为 `< 日期 > · 询价编号 · 询价人 [□紧急]`，「询价人」字段从独立行移入，表单减少一行高度，datalist 自动补全保留。

**询价人选项**：datalist 选项来源合并为客户管理联系人 ∪ 现有询价记录中已出现的询价人，去重排序后展示。

**日期只读（编辑模式）**：编辑模式下日期已在新建时确认，去掉左右箭头和输入交互，改为纯文本展示；新建模式保持原有箭头 + 键盘调整。

**身份信息条两行化（小屏优化）**：原单行布局在小屏（375px）下询价人几乎没有显示空间。改为卡片内两行：第一行显示「日期 · 询价编号 · 紧急」，第二行（border-t 分隔）显示「询价人」独占全宽，所有屏幕尺寸下询价人均有足够输入空间。

**内容简述列回退逻辑**：中小屏（< lg）下客户编号列隐藏，内容简述列在 description 为空时回退显示 customerNo；大屏（lg+）客户编号有独立列，内容简述为空则留空，避免重复展示。

**列宽调整（小/中屏）**：询报价状态列内容最密集，原来与内容简述等宽不合理。调整后小屏：编号 22% / 描述 28% / 状态 42% / 操作 8%；中屏：编号 15% / 询价人 13% / 描述 27% / 状态 38% / 操作 7%，各断点列宽均和为 100%。

**询价人改用 select**：原 `<input>` + `<datalist>` 在 iOS Safari 不支持弹出选择器。有历史询价人时改用原生 `<select>`（手机触发系统底部选择器），无历史数据时退回文本输入；编辑模式若当前值不在列表中临时注入为选项，保证显示正确。

### 历史数据解析（2026-2）

python-docx 解析 `协同-1询价登记表(2026-2).docx`，输出 `inquiry_import_2026-2.json`（401 条，4.1～6.22），含供应商状态、已报客户版本、无法报价标记，可直接从询报价页面「导入」。

---

## 2026-06-23 改动记录

### 询报价筛选状态数字标（Badge）

**需求**：筛选栏中「未报价/已报价/无法报价/已成单」四个 chip 被选中时，右上角显示该状态的记录数量，颜色与状态对应。

**颜色规则**：

| 状态 | Chip 激活色 | 数字标色 |
|------|------------|---------|
| 未报价 | `bg-pink-500` | `bg-pink-500` |
| 已报价 | `bg-blue-600` | `bg-blue-600` |
| 无法报价 | `bg-yellow-500` | `bg-yellow-500` |
| 已成单 | `bg-green-600` | `bg-green-600` |

**数字来源**：全量 `records`（不受时间/关键字等其他筛选项影响），通过 `countByStatus()` 函数按各状态逻辑统计。

**改动文件**：

| 文件 | 改动 |
|------|------|
| `src/features/inquiry/components/InquiryFilterBar.tsx` | 新增 `InquiryRecord[]` prop、`countByStatus()` 函数；`Chip` 新增 `badge`/`badgeColor` prop；`statusOptions` 各项配置对应颜色；未报价 chip 激活色由蓝改为粉红 |
| `src/features/inquiry/app/InquiryPage.tsx` | `<InquiryFilterBar>` 传入 `records={records}` |

---

### 首页「今日」统计按权限过滤

**需求**：首页 `StatsCards`（今日·报价单/销售确认/财务发票/箱单发票/采购订单）仅对有对应模块权限的用户显示相关项，无权限的项直接不渲染。

**逻辑**：利用 `PermissionMap.documentTypePermissions[type]` 过滤 `STAT_ITEMS`，若全部项均无权限则整个 bar 返回 `null`。

**改动文件**：

| 文件 | 改动 |
|------|------|
| `src/features/dashboard/components/StatsCards.tsx` | 新增 `permissionMap?: PermissionMap` prop；`visibleItems` 按 `documentTypePermissions` 过滤；全部无权限时 `return null` |
| `src/features/dashboard/app/DashboardPage.tsx` | `<StatsCards>` 传入 `permissionMap={permissionMap}` |

---

### 采购订单页面 textarea 向上跳动修复

**根本原因**：`PurchaseForm` 中四个 textarea 使用了 `rows={4}` / `rows={2}` HTML 属性，同时又使用 `useAutoResizeTextareas` Hook。Hook 执行时先将 `style.height = 'auto'`（此时 scrollHeight 以**内容高度**为准，不是 rows 属性高度），再将高度设为 `scrollHeight`。当内容只有 1 行时，textarea 从 `rows={4}` 的 ~104px 骤缩至 ~44px，导致下方内容向上跳动。

**修复方案**：删除四个 textarea 的 `rows` 属性，改用 Tailwind `min-h-` CSS 类保证最小高度：

| textarea | 原 rows | 新最小高度 |
|----------|---------|-----------|
| `projectSpecificationRef`（项目规格） | `rows={4}` | `min-h-[96px]` |
| `paymentTermsRef`（付款条件） | `rows={2}` | `min-h-[64px]` |
| `deliveryInfoRef`（关于交货） | `rows={4}` | `min-h-[96px]` |
| `orderNumbersRef`（客户订单号码） | `rows={4}` | `min-h-[96px]` |

这样 textarea 只会随内容**增高**，不会因 Hook 执行而收缩，跳动消失。

**改动文件**：

| 文件 | 改动 |
|------|------|
| `src/features/purchase/components/PurchaseForm.tsx` | 四个 textarea 删除 `rows` 属性，className 追加对应 `min-h-` 类 |

---

*最后更新：2026-06-23（筛选数字标、今日统计权限过滤、采购订单跳动修复）*
