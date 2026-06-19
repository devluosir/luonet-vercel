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

## 本次完成的工作（TASK-01 ~ TASK-17）

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

---

## 当前系统架构

```
浏览器（Next.js 前端，Vercel）
  ├── localStorage          主数据存储（实时读写）
  ├── /api/documents        → Cloudflare Worker → D1（Document 表）
  ├── /api/customers        → Cloudflare Worker → D1（Customer 表）
  └── /api/admin/[...path] → Cloudflare Worker → D1（Users 表，需 API_TOKEN）

Cloudflare Worker（udb.luocompany.net）
  ├── Bearer token 鉴权（API_TOKEN 共享密钥）
  ├── Document CRUD（INSERT OR REPLACE，幂等）
  ├── Customer CRUD（INSERT OR REPLACE，幂等）
  └── Admin CRUD（用户管理，权限管理）

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
| `src/worker.ts` | Cloudflare Worker 全部路由逻辑 |
| `src/utils/d1Sync.ts` | fire-and-forget 双写帮助函数 |
| `src/utils/d1Pull.ts` | 登录拉取 + 合并到 localStorage |
| `src/utils/d1Migration.ts` | 一次性批量迁移工具 |
| `src/hooks/useD1Sync.ts` | 登录后触发拉取的 React hook |
| `src/app/providers.tsx` | 全局注入 D1SyncInitializer |
| `src/features/admin/components/D1MigrationPanel.tsx` | 管理员迁移 UI |
| `CODEX_TASKS.md` | 所有 Codex 执行规格（TASK-01 ~ TASK-17） |
| `AGENTS.md` | 项目规范，Codex 执行前必读 |
| `schema.sql` | D1 建表 SQL |
| `playwright.config.ts` | E2E 配置，读 `E2E_BASE_URL` 环境变量 |
| `.github/workflows/ci.yml` | CI 流水线 |

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
进度：TASK-01~17 已完成，见 CODEX_TASKS.md 和 SESSION_SUMMARY.md
上次结束：数据管线完整（双写+迁移+登录同步），E2E + CI 已配置
工作区：/Users/roger/website/luonet-vercel（已连接）
下一步：[告知想做的方向]
```

Codex 执行任务前会自动读 `AGENTS.md`，所有任务规格在 `CODEX_TASKS.md`。

---

*最后更新：2026-06-19*
