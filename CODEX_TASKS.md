# CODEX_TASKS.md — MLUONET 优化任务规格

本文件供 Codex（或其他 AI 编码代理）直接执行。每个任务均包含：背景、涉及文件、精确改动、验证命令。

执行前请先阅读 `AGENTS.md` 了解项目规范。每个任务完成后运行指定的验证命令，确认通过再提交。

---

## TASK-01：从 wrangler.toml 移除明文 API_TOKEN

**优先级**：🔴 紧急（安全）
**估时**：5 分钟
**风险**：极低，仅改配置文件

### 背景

`wrangler.toml` 中有明文 `API_TOKEN = "Kqm0uVxJuVRkJ1GUoAwT4SrfvYAbaVbcwV6jQ8hY"`，已提交到 git 历史，token 已泄露。需要：
1. 从文件中删除明文值
2. 改用 Cloudflare secret 存储

### 改动

**文件**：`wrangler.toml`

找到以下内容：
```toml
[vars]
API_TOKEN = "Kqm0uVxJuVRkJ1GUoAwT4SrfvYAbaVbcwV6jQ8hY"
MAIN_SITE_URL = "https://luocompany.net"
```

替换为：
```toml
[vars]
# API_TOKEN 已迁移到 Cloudflare secret（执行：npx wrangler secret put API_TOKEN）
MAIN_SITE_URL = "https://luocompany.net"
```

同时找到：
```toml
[env.production]
workers_dev = false
vars = { MAIN_SITE_URL = "https://luocompany.net" }
```

替换为：
```toml
[env.production]
workers_dev = false
vars = { MAIN_SITE_URL = "https://luocompany.net" }
# 注意：API_TOKEN 通过 Cloudflare secret 注入，不在此文件配置
```

### 验证

```bash
grep -n "API_TOKEN" wrangler.toml
# 预期：只剩注释行，没有明文 token 值
```

### 部署后操作（人工执行）

```bash
# 先用新 token 设置 Cloudflare secret，再删除旧 token
npx wrangler secret put API_TOKEN
# 输入新生成的随机 token（建议用 openssl rand -hex 32 生成）
npx wrangler deploy
```

---

## TASK-02：给 /api/generate 加 session 认证

**优先级**：🔴 紧急（安全）
**估时**：15 分钟
**风险**：低。只在入口加认证检查，不改业务逻辑

### 背景

`/api/generate` 是调用 DeepSeek API 的路由，当前无任何认证，任何人知道 URL 即可消耗 API 额度。

### 改动

**文件**：`src/app/api/generate/route.ts`

在文件顶部 import 区域添加（现有 import 后追加）：
```ts
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
```

在 `export async function POST(request: NextRequest) {` 函数体的第一行（`const controller = new AbortController();` 之前）插入：
```ts
  // 认证检查：未登录用户不得调用 AI 邮件生成
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json(
      { error: '请先登录后再使用 AI 邮件助手' },
      { status: 401 }
    );
  }
```

### 最终文件结构（前 20 行）

```ts
import { NextRequest, NextResponse } from 'next/server';
import { generateMail } from '@/lib/deepseek';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  // 认证检查：未登录用户不得调用 AI 邮件生成
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json(
      { error: '请先登录后再使用 AI 邮件助手' },
      { status: 401 }
    );
  }

  // 设置响应超时
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);
  // ... 以下保持不变
```

### 验证

```bash
# 1. 类型检查
npx tsc --noEmit

# 2. 构建检查
npm run build

# 3. 手动测试（本地启动后）：
# curl -X POST http://localhost:3000/api/generate \
#   -H "Content-Type: application/json" \
#   -d '{"content":"test","language":"zh","type":"formal","mode":"mail"}'
# 预期：返回 401 {"error":"请先登录后再使用 AI 邮件助手"}
```

---

## TASK-03：修复 validatePassword bcrypt 分支

**优先级**：🟠 高（功能 Bug）
**估时**：10 分钟
**风险**：低。只修复一个 return false，不改接口

### 背景

`src/lib/d1-client.ts` 的 `validatePassword` 方法在遇到 bcrypt 哈希密码时直接 `return false`，导致所有使用 bcrypt 存储密码的用户**无法通过「修改密码」验证旧密码**。

### 改动

**文件**：`src/lib/d1-client.ts`

在文件顶部添加 import（如果尚未有 bcryptjs import）：
```ts
import bcrypt from 'bcryptjs';
```

找到 `validatePassword` 方法（约第 243 行）：
```ts
  async validatePassword(userId: string, currentPassword: string): Promise<boolean> {
    const user = await this.getUserById(userId);
    if (!user) return false;

    // 支持明文密码和bcrypt哈希
    if (currentPassword === user.password) {
      return true;
    }

    // 如果是bcrypt哈希，这里可以添加验证逻辑
    // 目前暂时跳过bcrypt验证，直接返回false
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      // 这里应该使用bcrypt.compare，但为了简化，暂时跳过
      return false;
    }

    return false;
  }
```

替换为：
```ts
  async validatePassword(userId: string, currentPassword: string): Promise<boolean> {
    const user = await this.getUserById(userId);
    if (!user || !user.password || !currentPassword) return false;

    // bcrypt 哈希密码：使用 bcrypt.compare 验证
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      try {
        return await bcrypt.compare(currentPassword, user.password);
      } catch {
        return false;
      }
    }

    // 明文密码（旧账户兼容）：直接比较
    return currentPassword === user.password;
  }
```

### 验证

```bash
npx tsc --noEmit
# 预期：无类型错误
```

---

## TASK-04：修复 check:production 脚本路径

**优先级**：🟡 中（工具修复）
**估时**：2 分钟
**风险**：极低

### 背景

`package.json` 中 `check:production` 指向 `scripts/pre-production-check.js`，但该文件不存在，实际文件是 `scripts/pre-release-check.js`。

### 改动

**文件**：`package.json`

找到：
```json
"check:production": "node scripts/pre-production-check.js",
"check:production:full": "node scripts/pre-production-check.js --full",
```

替换为：
```json
"check:production": "node scripts/pre-release-check.js",
"check:production:full": "node scripts/pre-release-check.js --full",
```

### 验证

```bash
npm run check:production
# 预期：脚本正常运行，不报 "Cannot find module" 错误
```

---

## TASK-05：恢复 ESLint 构建检查

**优先级**：🟡 中（代码质量）
**估时**：30 分钟（需先修复 lint 错误）
**风险**：中。需先修复现有 lint 问题再开启，否则构建中断

### 背景

`next.config.mjs` 中设置了 `eslint: { ignoreDuringBuilds: true }`，导致 lint 错误不阻断构建，掩盖代码质量问题。

### 执行步骤

**步骤 1**：先查看现有 lint 问题数量
```bash
npm run lint 2>&1 | tail -20
```

**步骤 2**：批量修复（通常是 unused imports、any 类型等）
```bash
npm run lint -- --fix
```

**步骤 3**：手动修复剩余无法自动修复的问题（逐个处理 lint 报告中的错误）

**步骤 4**：确认 lint 干净后，修改配置

**文件**：`next.config.mjs`

找到：
```js
eslint: {
  ignoreDuringBuilds: true,
},
```

替换为：
```js
eslint: {
  ignoreDuringBuilds: false,
},
```

### 验证

```bash
npm run lint     # 无错误
npm run build    # 构建通过
```

---

## TASK-06：修复 silent-refresh 服务端 window 访问

**优先级**：🟡 中（逻辑 Bug）
**估时**：20 分钟
**风险**：中。涉及认证流程，改完需测试登录

### 背景

`src/lib/auth.ts` 的 `authorize` 函数在服务端执行，但 `silent-refresh` 分支里访问了 `localStorage`（第 39 行），服务端没有 `window`，该分支完全无效，静默刷新时总是走默认分支（错误地将用户设为管理员）。

### 改动

**文件**：`src/lib/auth.ts`

找到 `silent-refresh` 分支（约第 33~72 行）：
```ts
const isSilentRefresh = credentials.password === 'silent-refresh';

if (isSilentRefresh) {
  console.log('检测到silent-refresh请求:', credentials.username);

  // 对于silent-refresh，从本地缓存获取用户信息
  if (typeof window !== 'undefined') {
    try {
      const userCache = localStorage.getItem('userCache');
      // ... 使用缓存
    } catch (error) { ... }
  }

  // 如果缓存中没有数据，返回默认用户信息
  return {
    id: credentials.username,
    email: "",
    name: credentials.username,
    username: credentials.username,
    isAdmin: true, // ⚠️ 默认为管理员，实际应该从session获取
    image: null,
    permissions: [],
    status: true
  };
}
```

替换为（从远程重新拉取用户信息，不依赖客户端缓存）：
```ts
const isSilentRefresh = credentials.password === 'silent-refresh';

if (isSilentRefresh) {
  console.log('silent-refresh: 从远程重新获取用户信息:', credentials.username);
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://udb.luocompany.net'}/api/admin/users?username=${encodeURIComponent(credentials.username)}`,
      {
        headers: {
          'X-User-ID': 'system',
          'X-User-Name': 'system',
          'X-User-Admin': 'true',
        }
      }
    );
    if (response.ok) {
      const userData = await response.json();
      return {
        id: userData.id,
        email: userData.email || '',
        name: userData.username,
        username: userData.username,
        isAdmin: !!userData.isAdmin,
        image: null,
        permissions: userData.permissions || [],
        status: userData.status !== false,
      };
    }
  } catch (error) {
    console.error('silent-refresh: 远程获取用户信息失败', error);
  }
  // 远程获取失败时拒绝刷新，强制重新登录
  throw new Error('会话刷新失败，请重新登录');
}
```

### 验证

```bash
npx tsc --noEmit
# 然后本地测试：
# 1. 正常登录 → 刷新页面 → 不被踢出
# 2. 普通用户登录后，确认不会意外获得管理员权限
```

---

## TASK-07：添加 GitHub Actions CI 流水线

**优先级**：🟡 中（基础设施）
**估时**：15 分钟
**风险**：极低，只新增文件

### 背景

目前没有 CI，靠手动跑 `pre-release` 保障质量。添加 GitHub Actions，每次 push 和 PR 自动检查。

### 改动

**新建文件**：`.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  check:
    name: Quality Check
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Check selectors
        run: npm run check:selectors

      - name: Run tests
        run: npm run test -- --ci --passWithNoTests

      - name: Lint
        run: npm run lint

      - name: Build
        run: npm run build
        env:
          DEEPSEEK_API_KEY: ${{ secrets.DEEPSEEK_API_KEY }}
          NEXTAUTH_SECRET: ${{ secrets.NEXTAUTH_SECRET }}
          NEXT_PUBLIC_API_BASE_URL: https://udb.luocompany.net
          NEXT_PUBLIC_APP_URL: https://luocompany.net
```

同时新建 `.github/workflows/` 目录（如不存在）。

### GitHub Secrets 配置（人工操作）

在 GitHub 仓库 Settings → Secrets and variables → Actions 中添加：
- `DEEPSEEK_API_KEY`：DeepSeek API 密钥
- `NEXTAUTH_SECRET`：NextAuth 签名密钥

### 验证

```bash
# 本地验证 YAML 格式
cat .github/workflows/ci.yml
# 推送后在 GitHub Actions 页面查看 workflow 是否触发
```

---

## TASK-08：扩展 D1 Schema（数据库迁移第一步）

**优先级**：🟢 长期
**估时**：30 分钟（只改 schema，不改前端）
**风险**：低。只新增表，不修改现有表

### 背景

业务单据目前存 localStorage（5MB 上限，无多设备同步）。第一步：在 D1 新增业务表，为后续迁移做准备。

### 改动

**文件**：`schema.sql`

在文件末尾追加：

```sql
-- ============================================================
-- 业务数据表（Phase 4 数据库迁移）
-- 当前业务数据仍主要存浏览器 localStorage
-- 这些表为服务端迁移做准备，暂不影响现有功能
-- ============================================================

-- 业务单据统一表
CREATE TABLE IF NOT EXISTS Document (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('quotation', 'confirmation', 'invoice', 'packing', 'purchase')),
  doc_no TEXT NOT NULL,
  customer_name TEXT,
  total_amount REAL,
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'deleted')),
  data TEXT NOT NULL,                              -- JSON 全量数据
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_doc_user_type ON Document(user_id, type);
CREATE INDEX IF NOT EXISTS idx_doc_customer ON Document(customer_name);
CREATE INDEX IF NOT EXISTS idx_doc_no ON Document(doc_no);
CREATE INDEX IF NOT EXISTS idx_doc_created ON Document(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_doc_status ON Document(status);

-- 客户数据表
CREATE TABLE IF NOT EXISTS Customer (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('customer', 'supplier', 'consignee')),
  name TEXT NOT NULL,
  code TEXT,                                        -- 客户编号
  email TEXT,
  phone TEXT,
  address TEXT,
  data TEXT NOT NULL DEFAULT '{}',                 -- JSON 扩展字段
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'archived')),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_customer_user_type ON Customer(user_id, type);
CREATE INDEX IF NOT EXISTS idx_customer_name ON Customer(name);
CREATE INDEX IF NOT EXISTS idx_customer_status ON Customer(status);

-- 客户事件表（时间轴 + 跟进记录）
CREATE TABLE IF NOT EXISTS CustomerEvent (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK(event_type IN ('timeline', 'followup', 'document', 'note')),
  title TEXT,
  content TEXT NOT NULL,
  event_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES Customer(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES User(id)
);

CREATE INDEX IF NOT EXISTS idx_event_customer ON CustomerEvent(customer_id, event_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_user ON CustomerEvent(user_id);
CREATE INDEX IF NOT EXISTS idx_event_type ON CustomerEvent(event_type);
```

### 部署（人工执行）

```bash
npx wrangler d1 execute mluonet-users --file schema.sql
# 验证新表已创建：
npx wrangler d1 execute mluonet-users --command "SELECT name FROM sqlite_master WHERE type='table';"
```

---

## 执行顺序和提交规范

### 推荐提交顺序

```bash
# TASK-01 + TASK-04（配置修复，一次提交）
git add wrangler.toml package.json
git commit -m "fix: 移除 wrangler.toml 明文 API_TOKEN，修复 check:production 脚本路径"

# TASK-02（安全修复）
git add src/app/api/generate/route.ts
git commit -m "security: /api/generate 添加 NextAuth session 认证"

# TASK-03（Bug 修复）
git add src/lib/d1-client.ts
git commit -m "fix: validatePassword 支持 bcrypt 哈希验证"

# TASK-06（认证修复）
git add src/lib/auth.ts
git commit -m "fix: silent-refresh 改为从远程拉取用户信息，移除服务端 window 访问"

# TASK-07（CI）
git add .github/
git commit -m "ci: 添加 GitHub Actions 流水线（check + test + lint + build）"

# TASK-05（需先修完 lint 错误）
git add next.config.mjs src/
git commit -m "chore: 恢复 ESLint 构建检查"

# TASK-08（数据库扩展）
git add schema.sql
git commit -m "feat(db): 新增 Document、Customer、CustomerEvent 业务数据表"
```

### 每个任务完成后必跑

```bash
npx tsc --noEmit    # 类型检查
npm run test        # 单元测试
npm run build       # 构建验证（TASK-05 完成后）
```

---

## 不在此次范围的工作（后续 Phase）

- Worker 管理接口从 `X-User-*` header 改为 HMAC 签名（复杂度高，单独 PR）
- Playwright 端到端测试（需要专门的测试环境配置）
- localStorage → D1 数据迁移前端层（依赖 TASK-08 完成后的 API 路由新增）
- `src/components` 与 `src/features` 重复代码清理（分批推进，不急）

---

## TASK-09：Worker 管理接口改用 API_TOKEN Bearer 验证

**优先级**：🔴 紧急（安全）
**估时**：20 分钟
**风险**：低。只改 Worker 认证逻辑，不改业务逻辑

### 背景

Worker 的 7 个管理接口目前信任 `X-User-ID / X-User-Name / X-User-Admin` 请求头，任何人向 `udb.luocompany.net` 发请求时伪造 `X-User-Admin: true` 即可获得管理员权限。需替换为 `Authorization: Bearer <API_TOKEN>` 验证（API_TOKEN 已作为 Cloudflare secret 存储）。

### 改动

**文件**：`src/worker.ts`

**第 1 步**：扩展 `Env` 接口，新增 `API_TOKEN`

找到：
```ts
export interface Env {
  USERS_DB: D1Database;
  DB: D1Database;
}
```

替换为：
```ts
export interface Env {
  USERS_DB: D1Database;
  DB: D1Database;
  API_TOKEN: string;
}
```

**第 2 步**：在 `corsHeaders` 常量之后、`export default` 之前，插入 Bearer 验证辅助函数：

```ts
/** 验证请求携带的 Bearer token 是否与 Cloudflare secret 一致 */
function verifyBearerToken(request: Request, env: Env): boolean {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return false;
  return auth.slice(7) === env.API_TOKEN;
}
```

**第 3 步**：替换全部 7 个管理函数中的 X-User-* 认证块。

每个函数开头都有类似下面的认证段：
```ts
// 检查认证 - 使用session头信息
const sessionUserId = request.headers.get('X-User-ID');
const userName = request.headers.get('X-User-Name');
const isAdmin = request.headers.get('X-User-Admin') === 'true';

if (!sessionUserId || !userName) {
  return new Response(
    JSON.stringify({ error: '未授权访问' }),
    { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
  );
}
```

将以上认证段（含 `const sessionUserId / userName / isAdmin` 三行 + `if (!sessionUserId || !userName)` 块）统一替换为：

```ts
if (!verifyBearerToken(request, env)) {
  return new Response(
    JSON.stringify({ error: '未授权访问' }),
    { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
  );
}
```

需替换的函数（共 7 个）：
- `handleGetUsers`
- `handleGetUser`
- `handleUpdateUser`
- `handleCreateUser`（还需保留 `isAdmin` 判断——见下方注意）
- `handleUpdatePermissions`
- `handleBatchUpdatePermissions`
- `handleDeleteUser`（如有）
- `handleDeletePermission`（如有）

**⚠️ 注意 handleCreateUser 特殊处理**：该函数在认证段之后还有一个 `if (!isAdmin)` 检查。删除认证段后，同时删除这个 isAdmin 检查（因为 Bearer token 本身已代表来自受信任的服务端，管理员身份由调用方的 NextAuth session 保证）：

找到并删除：
```ts
// 检查是否是管理员
if (!isAdmin) {
  return new Response(
    JSON.stringify({ error: '只有管理员可以创建用户' }),
    { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
  );
}
```

**⚠️ 注意 handleUpdatePermissions**：函数中还有 `console.log('用户认证信息:', { sessionUserId, userName, isAdmin });`，删除 X-User-* 认证段后，同步删除这行 console.log（否则变量未定义会报错）。

### 验证

```bash
npx tsc --noEmit
# 预期：无类型错误

# 部署 Worker 后手动验证（在本地 Mac 终端）：
# 无 token → 401
curl -s -o /dev/null -w "%{http_code}" \
  https://udb.luocompany.net/api/admin/users

# 带正确 token → 200
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer <你的API_TOKEN>" \
  https://udb.luocompany.net/api/admin/users
```

### 部署（人工执行）

```bash
npx wrangler deploy
```

---

## TASK-10：Next.js 管理 API 代理（浏览器 → Vercel → Worker）

**优先级**：🔴 紧急（安全，配合 TASK-09）
**估时**：30 分钟
**风险**：中。涉及调用链重构，改完需测试管理后台的增删改查

### 背景

完成 TASK-09 后，Worker 管理接口只接受 Bearer token，浏览器（`api-config.ts`）直接调 Worker 的路径失效。需要：
1. 新建 Next.js 代理路由 `/api/admin/[...path]`，由 Next.js 持有 Bearer token 并转发
2. 更新客户端调用，将 Worker 直连改为本地代理
3. 更新服务端 auth 路由，将 X-User-* 改为 Bearer token

**前置条件**：TASK-09 已完成并部署。

### 改动

---

#### 改动 1：新建文件 `src/app/api/admin/[...path]/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const WORKER_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://udb.luocompany.net';

function workerHeaders(): HeadersInit {
  const token = process.env.API_TOKEN;
  if (!token) throw new Error('API_TOKEN env var not set');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

async function proxyAdmin(request: NextRequest, pathSegments: string[]): Promise<NextResponse> {
  // 1. 验证 NextAuth session
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  if (!session.user.isAdmin) {
    return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
  }

  // 2. 构造 Worker URL
  const url = new URL(request.url);
  const workerUrl = `${WORKER_BASE}/api/admin/${pathSegments.join('/')}${url.search}`;

  // 3. 转发请求（带 Bearer token）
  const body =
    request.method !== 'GET' && request.method !== 'HEAD'
      ? await request.text()
      : undefined;

  let workerResp: Response;
  try {
    workerResp = await fetch(workerUrl, {
      method: request.method,
      headers: workerHeaders(),
      body,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Worker 请求失败' }, { status: 502 });
  }

  const data = await workerResp.json();
  return NextResponse.json(data, { status: workerResp.status });
}

type RouteParams = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  return proxyAdmin(req, (await params).path);
}
export async function POST(req: NextRequest, { params }: RouteParams) {
  return proxyAdmin(req, (await params).path);
}
export async function PUT(req: NextRequest, { params }: RouteParams) {
  return proxyAdmin(req, (await params).path);
}
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  return proxyAdmin(req, (await params).path);
}
```

---

#### 改动 2：`src/lib/api-config.ts`

将 `API_ENDPOINTS.USERS` 中所有指向 Worker 的 URL 改为本地代理路径，并简化 `apiRequest`（不再需要拼接 X-User-* 头）。

找到：
```ts
export const API_ENDPOINTS = {
  USERS: {
    CHANGE_PASSWORD: `${API_BASE_URL}/users/change-password`,
    LIST: `${API_BASE_URL}/api/admin/users`,
    CREATE: `${API_BASE_URL}/api/admin/users`,
    GET: (id: string) => `${API_BASE_URL}/api/admin/users/${id}`,
    UPDATE: (id: string) => `${API_BASE_URL}/api/admin/users/${id}`,
    DELETE: (id: string) => `${API_BASE_URL}/api/admin/users/${id}`,
    PERMISSIONS: (id: string) => `${API_BASE_URL}/api/admin/users/${id}/permissions`,
    BATCH_PERMISSIONS: (id: string) => `${API_BASE_URL}/api/admin/users/${id}/permissions/batch`,
  },
```

替换为：
```ts
export const API_ENDPOINTS = {
  USERS: {
    CHANGE_PASSWORD: `${API_BASE_URL}/users/change-password`,
    LIST: '/api/admin/users',                                             // ← 通过 Next.js 代理
    CREATE: '/api/admin/users',
    GET: (id: string) => `/api/admin/users/${id}`,
    UPDATE: (id: string) => `/api/admin/users/${id}`,
    DELETE: (id: string) => `/api/admin/users/${id}`,
    PERMISSIONS: (id: string) => `/api/admin/users/${id}/permissions`,
    BATCH_PERMISSIONS: (id: string) => `/api/admin/users/${id}/permissions/batch`,
  },
```

找到 `apiRequest` 函数：
```ts
export async function apiRequest(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // 获取用户信息
  const userInfo = await getUserInfo();

  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // 如果有用户信息，添加认证头
  if (userInfo) {
    // 使用用户信息作为认证
    defaultOptions.headers = {
      ...defaultOptions.headers,
      'X-User-ID': userInfo.id,
      'X-User-Name': userInfo.username,
      'X-User-Admin': userInfo.isAdmin ? 'true' : 'false',
    };
  }

  // 处理相对URL（本地API路由）
  const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;

  return fetch(fullUrl, defaultOptions);
}
```

替换为：
```ts
export async function apiRequest(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // 代理路由使用相对路径，直连路由使用完整 URL
  const fullUrl = url.startsWith('http')
    ? url
    : `${typeof window !== 'undefined' ? window.location.origin : ''}${url}`;

  return fetch(fullUrl, defaultOptions);
}
```

---

#### 改动 3：`src/app/api/auth/get-latest-permissions/route.ts`

该 Next.js 路由在服务端调用 Worker，改为读 `API_TOKEN` env 变量并用 Bearer token，同时改为从 NextAuth session 读用户名（不再依赖 X-User-* 请求头）。

找到函数开头：
```ts
export async function POST(request: NextRequest) {
  try {
    // 从请求头获取用户信息
    const userId = request.headers.get('X-User-ID');
    const userName = request.headers.get('X-User-Name');
    let isAdmin = request.headers.get('X-User-Admin') === 'true';

    if (!userId || !userName) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }
```

替换为：
```ts
export async function POST(request: NextRequest) {
  try {
    // 从 NextAuth session 读取用户身份（不信任客户端头）
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }
    const userId = session.user.id || session.user.username || '';
    const userName = session.user.username || session.user.name || '';
    let isAdmin = !!session.user.isAdmin;
```

找到调用 Worker 的 `fetch`（第 24~34 行）：
```ts
      const backendResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://udb.luocompany.net'}/api/admin/users?username=${encodeURIComponent(userName)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId,
          'X-User-Name': userName,
          'X-User-Admin': isAdmin ? 'true' : 'false',
        },
        cache: 'no-store',
        next: { revalidate: 0 }
      });
```

替换为：
```ts
      const workerBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://udb.luocompany.net';
      const backendResponse = await fetch(`${workerBase}/api/admin/users?username=${encodeURIComponent(userName)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.API_TOKEN || ''}`,
        },
        cache: 'no-store',
        next: { revalidate: 0 }
      });
```

---

#### 改动 4：`src/lib/auth.ts`（silent-refresh Bearer token）

找到 silent-refresh 中调用 Worker 的 fetch（TASK-06 已改为远程拉取，现在更新 headers）：
```ts
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://udb.luocompany.net'}/api/admin/users?username=${encodeURIComponent(credentials.username)}`,
      {
        headers: {
          'X-User-ID': 'system',
          'X-User-Name': 'system',
          'X-User-Admin': 'true',
        }
      }
    );
```

替换为：
```ts
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://udb.luocompany.net'}/api/admin/users?username=${encodeURIComponent(credentials.username)}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.API_TOKEN || ''}`,
        }
      }
    );
```

---

#### 改动 5：`src/lib/permissions.ts`

找到调用 `/api/auth/get-latest-permissions` 的 fetch（约第 497~506 行）：
```ts
      const response = await fetch('/api/auth/get-latest-permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': session.user.id || session.user.username || '',
          'X-User-Name': session.user.username || session.user.name || '',
          'X-User-Admin': session.user.isAdmin ? 'true' : 'false'
        },
        cache: 'no-store'
      });
```

替换为（移除 X-User-* 头，服务端路由改为从 session 读取身份）：
```ts
      const response = await fetch('/api/auth/get-latest-permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store'
      });
```

---

### Vercel 环境变量（人工操作）

在 Vercel 控制台 → Project → Settings → Environment Variables 中添加（不含 `NEXT_PUBLIC_` 前缀，保证不暴露给浏览器）：

```
API_TOKEN = <与 Cloudflare secret 相同的值>
```

### 验证

```bash
npx tsc --noEmit
npm run build

# 本地测试（npm run dev 后）：
# 1. 登录后访问 /admin → 用户列表正常加载
# 2. 创建用户 → 成功
# 3. 修改权限 → 成功
# 4. 未登录时直接 fetch /api/admin/users → 返回 401
```

---

## 执行顺序

```
TASK-09（改 Worker）→ 部署 Worker（npx wrangler deploy）
  → TASK-10（改 Next.js）→ 在 Vercel 添加 API_TOKEN env var → 触发 Vercel 重新部署
  → 验证管理后台功能正常
```

**每个任务完成后必跑：**
```bash
npx tsc --noEmit
npm run build
```

---

## TASK-11：Worker Document CRUD API + Next.js 代理路由

**优先级**：🟠 高（Phase 4 数据迁移基础）
**估时**：45 分钟
**风险**：低。只新增接口，不修改任何现有功能，前端暂不切换

### 背景

D1 中已有 `Document` 表。本任务在 Worker 新增 5 个 Document CRUD 端点，并在 Next.js 新建代理路由。前端暂不改动（TASK-13 再迁移）。

---

### 改动 1：`src/worker.ts` — 新增路由分发

在主 `fetch` 函数内，`return new Response('Not Found', ...)` 之前插入以下路由（Document 相关）：

```ts
    // Document API
    if (path === '/api/documents' && request.method === 'GET') {
      return handleListDocuments(request, env);
    }
    if (path === '/api/documents' && request.method === 'POST') {
      return handleCreateDocument(request, env);
    }
    if (path.startsWith('/api/documents/') && path.split('/').length === 4 && request.method === 'GET') {
      return handleGetDocument(request, env);
    }
    if (path.startsWith('/api/documents/') && path.split('/').length === 4 && request.method === 'PUT') {
      return handleUpdateDocument(request, env);
    }
    if (path.startsWith('/api/documents/') && path.split('/').length === 4 && request.method === 'DELETE') {
      return handleDeleteDocument(request, env);
    }
```

---

### 改动 2：`src/worker.ts` — 新增 Document 处理函数

在文件末尾（现有函数之后）追加以下全部函数：

```ts
// ─── Document CRUD ───────────────────────────────────────────

async function handleListDocuments(request: Request, env: Env): Promise<Response> {
  if (!verifyBearerToken(request, env)) {
    return new Response(JSON.stringify({ error: '未授权访问' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
  const url = new URL(request.url);
  const userId = url.searchParams.get('user_id');
  const type   = url.searchParams.get('type');
  const limit  = Math.min(parseInt(url.searchParams.get('limit')  || '200'), 500);
  const offset = parseInt(url.searchParams.get('offset') || '0');

  if (!userId) {
    return new Response(JSON.stringify({ error: 'user_id 必填' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
  try {
    const conditions: string[] = ["user_id = ?", "status = 'active'"];
    const params: unknown[] = [userId];
    if (type) { conditions.push('type = ?'); params.push(type); }
    params.push(limit, offset);

    const sql = `SELECT * FROM Document WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    const { results } = await env.USERS_DB.prepare(sql).bind(...params).all<Record<string, unknown>>();

    const documents = results.map(row => ({ ...row, data: JSON.parse(row.data as string) }));
    return new Response(JSON.stringify({ documents }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: '服务器错误' }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

async function handleGetDocument(request: Request, env: Env): Promise<Response> {
  if (!verifyBearerToken(request, env)) {
    return new Response(JSON.stringify({ error: '未授权访问' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
  const url = new URL(request.url);
  const id     = url.pathname.split('/')[3];
  const userId = url.searchParams.get('user_id');

  try {
    const row = await env.USERS_DB.prepare(
      "SELECT * FROM Document WHERE id = ? AND status = 'active'"
    ).bind(id).first<Record<string, unknown>>();

    if (!row) {
      return new Response(JSON.stringify({ error: '单据不存在' }), {
        status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    if (userId && row.user_id !== userId) {
      return new Response(JSON.stringify({ error: '无权访问' }), {
        status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    return new Response(JSON.stringify({ ...row, data: JSON.parse(row.data as string) }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: '服务器错误' }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

async function handleCreateDocument(request: Request, env: Env): Promise<Response> {
  if (!verifyBearerToken(request, env)) {
    return new Response(JSON.stringify({ error: '未授权访问' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
  try {
    const body = await request.json() as {
      user_id: string; type: string; doc_no: string;
      customer_name?: string; total_amount?: number; currency?: string; data: unknown;
    };
    const { user_id, type, doc_no, customer_name, total_amount, currency, data } = body;

    if (!user_id || !type || !doc_no || data === undefined) {
      return new Response(JSON.stringify({ error: 'user_id、type、doc_no、data 必填' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    const id  = crypto.randomUUID();
    const now = new Date().toISOString();

    await env.USERS_DB.prepare(`
      INSERT INTO Document (id, user_id, type, doc_no, customer_name, total_amount, currency, data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, user_id, type, doc_no,
      customer_name ?? null,
      total_amount ?? null,
      currency ?? 'USD',
      JSON.stringify(data),
      now, now
    ).run();

    return new Response(JSON.stringify({ id, created_at: now }), {
      status: 201, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: '服务器错误' }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

async function handleUpdateDocument(request: Request, env: Env): Promise<Response> {
  if (!verifyBearerToken(request, env)) {
    return new Response(JSON.stringify({ error: '未授权访问' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
  try {
    const url    = new URL(request.url);
    const id     = url.pathname.split('/')[3];
    const userId = url.searchParams.get('user_id');
    const body   = await request.json() as {
      doc_no?: string; customer_name?: string;
      total_amount?: number; currency?: string; data?: unknown;
    };

    const existing = await env.USERS_DB.prepare(
      "SELECT * FROM Document WHERE id = ? AND status = 'active'"
    ).bind(id).first<Record<string, unknown>>();

    if (!existing) {
      return new Response(JSON.stringify({ error: '单据不存在' }), {
        status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    if (userId && existing.user_id !== userId) {
      return new Response(JSON.stringify({ error: '无权修改' }), {
        status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    const now = new Date().toISOString();
    await env.USERS_DB.prepare(`
      UPDATE Document SET
        doc_no        = COALESCE(?, doc_no),
        customer_name = COALESCE(?, customer_name),
        total_amount  = COALESCE(?, total_amount),
        currency      = COALESCE(?, currency),
        data          = COALESCE(?, data),
        updated_at    = ?
      WHERE id = ?
    `).bind(
      body.doc_no ?? null,
      body.customer_name ?? null,
      body.total_amount ?? null,
      body.currency ?? null,
      body.data !== undefined ? JSON.stringify(body.data) : null,
      now, id
    ).run();

    return new Response(JSON.stringify({ success: true, updated_at: now }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: '服务器错误' }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

async function handleDeleteDocument(request: Request, env: Env): Promise<Response> {
  if (!verifyBearerToken(request, env)) {
    return new Response(JSON.stringify({ error: '未授权访问' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
  try {
    const url    = new URL(request.url);
    const id     = url.pathname.split('/')[3];
    const userId = url.searchParams.get('user_id');

    const existing = await env.USERS_DB.prepare(
      "SELECT user_id FROM Document WHERE id = ? AND status = 'active'"
    ).bind(id).first<{ user_id: string }>();

    if (!existing) {
      return new Response(JSON.stringify({ error: '单据不存在' }), {
        status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    if (userId && existing.user_id !== userId) {
      return new Response(JSON.stringify({ error: '无权删除' }), {
        status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    await env.USERS_DB.prepare(
      "UPDATE Document SET status = 'deleted', updated_at = ? WHERE id = ?"
    ).bind(new Date().toISOString(), id).run();

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: '服务器错误' }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}
```

---

### 改动 3：新建文件 `src/app/api/documents/[[...path]]/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const WORKER_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://udb.luocompany.net';

function workerHeaders(): HeadersInit {
  const token = process.env.API_TOKEN;
  if (!token) throw new Error('API_TOKEN env var not set');
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
}

async function proxyDocuments(
  request: NextRequest,
  pathSegments: string[]
): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const userId = session.user.id || session.user.username || '';
  const url = new URL(request.url);

  // 构造 Worker URL，始终注入 user_id 保证数据隔离
  const workerPath = pathSegments.length > 0
    ? `/api/documents/${pathSegments.join('/')}`
    : '/api/documents';
  url.searchParams.set('user_id', userId);
  const workerUrl = `${WORKER_BASE}${workerPath}?${url.searchParams.toString()}`;

  let body: string | undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const raw = await request.json().catch(() => ({}));
    // 强制注入 user_id，防止客户端伪造
    body = JSON.stringify({ ...raw, user_id: userId });
  }

  let workerResp: Response;
  try {
    workerResp = await fetch(workerUrl, {
      method: request.method,
      headers: workerHeaders(),
      body,
    });
  } catch {
    return NextResponse.json({ error: 'Worker 请求失败' }, { status: 502 });
  }

  const data = await workerResp.json();
  return NextResponse.json(data, { status: workerResp.status });
}

type RouteParams = { params: Promise<{ path?: string[] }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  return proxyDocuments(req, (await params).path ?? []);
}
export async function POST(req: NextRequest, { params }: RouteParams) {
  return proxyDocuments(req, (await params).path ?? []);
}
export async function PUT(req: NextRequest, { params }: RouteParams) {
  return proxyDocuments(req, (await params).path ?? []);
}
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  return proxyDocuments(req, (await params).path ?? []);
}
```

---

### 验证

```bash
npx tsc --noEmit
npm run build
npx wrangler deploy

# 部署后在本地 Mac 测试（替换 TOKEN 和 USER_ID）：

# 列出文档（应返回空数组）
curl -s -H "Authorization: Bearer <TOKEN>" \
  "https://udb.luocompany.net/api/documents?user_id=<USER_ID>&type=quotation"

# 创建文档
curl -s -X POST \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"<USER_ID>","type":"quotation","doc_no":"QT-001","data":{"test":true}}' \
  https://udb.luocompany.net/api/documents
# 预期：{"id":"...","created_at":"..."}
```

### 提交

```bash
git add src/worker.ts src/app/api/documents/
git commit -m "feat(api): Document CRUD API（Worker + Next.js 代理）"
```

---

## TASK-12：Worker Customer CRUD API + Next.js 代理路由

**优先级**：🟠 高
**估时**：30 分钟
**风险**：低。只新增接口，不修改任何现有功能

### 改动 1：`src/worker.ts` — 新增路由分发

在 Document 路由块之后（`return new Response('Not Found', ...)` 之前）插入：

```ts
    // Customer API
    if (path === '/api/customers' && request.method === 'GET') {
      return handleListCustomers(request, env);
    }
    if (path === '/api/customers' && request.method === 'POST') {
      return handleCreateCustomer(request, env);
    }
    if (path.startsWith('/api/customers/') && path.split('/').length === 4 && request.method === 'GET') {
      return handleGetCustomer(request, env);
    }
    if (path.startsWith('/api/customers/') && path.split('/').length === 4 && request.method === 'PUT') {
      return handleUpdateCustomer(request, env);
    }
    if (path.startsWith('/api/customers/') && path.split('/').length === 4 && request.method === 'DELETE') {
      return handleDeleteCustomer(request, env);
    }
```

---

### 改动 2：`src/worker.ts` — 新增 Customer 处理函数

在 Document 函数块之后追加：

```ts
// ─── Customer CRUD ───────────────────────────────────────────

async function handleListCustomers(request: Request, env: Env): Promise<Response> {
  if (!verifyBearerToken(request, env)) {
    return new Response(JSON.stringify({ error: '未授权访问' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
  const url    = new URL(request.url);
  const userId = url.searchParams.get('user_id');
  const type   = url.searchParams.get('type');
  const limit  = Math.min(parseInt(url.searchParams.get('limit')  || '500'), 1000);
  const offset = parseInt(url.searchParams.get('offset') || '0');

  if (!userId) {
    return new Response(JSON.stringify({ error: 'user_id 必填' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
  try {
    const conditions: string[] = ["user_id = ?", "status = 'active'"];
    const params: unknown[] = [userId];
    if (type) { conditions.push('type = ?'); params.push(type); }
    params.push(limit, offset);

    const sql = `SELECT * FROM Customer WHERE ${conditions.join(' AND ')} ORDER BY name ASC LIMIT ? OFFSET ?`;
    const { results } = await env.USERS_DB.prepare(sql).bind(...params).all<Record<string, unknown>>();

    const customers = results.map(row => ({ ...row, data: JSON.parse(row.data as string) }));
    return new Response(JSON.stringify({ customers }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: '服务器错误' }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

async function handleGetCustomer(request: Request, env: Env): Promise<Response> {
  if (!verifyBearerToken(request, env)) {
    return new Response(JSON.stringify({ error: '未授权访问' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
  const url    = new URL(request.url);
  const id     = url.pathname.split('/')[3];
  const userId = url.searchParams.get('user_id');

  try {
    const row = await env.USERS_DB.prepare(
      "SELECT * FROM Customer WHERE id = ? AND status = 'active'"
    ).bind(id).first<Record<string, unknown>>();

    if (!row) {
      return new Response(JSON.stringify({ error: '客户不存在' }), {
        status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    if (userId && row.user_id !== userId) {
      return new Response(JSON.stringify({ error: '无权访问' }), {
        status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    return new Response(JSON.stringify({ ...row, data: JSON.parse(row.data as string) }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: '服务器错误' }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

async function handleCreateCustomer(request: Request, env: Env): Promise<Response> {
  if (!verifyBearerToken(request, env)) {
    return new Response(JSON.stringify({ error: '未授权访问' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
  try {
    const body = await request.json() as {
      user_id: string; type: string; name: string;
      code?: string; email?: string; phone?: string; address?: string; data?: unknown;
    };
    const { user_id, type, name, code, email, phone, address, data } = body;

    if (!user_id || !type || !name) {
      return new Response(JSON.stringify({ error: 'user_id、type、name 必填' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    const id  = crypto.randomUUID();
    const now = new Date().toISOString();

    await env.USERS_DB.prepare(`
      INSERT INTO Customer (id, user_id, type, name, code, email, phone, address, data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, user_id, type, name,
      code    ?? null,
      email   ?? null,
      phone   ?? null,
      address ?? null,
      JSON.stringify(data ?? {}),
      now, now
    ).run();

    return new Response(JSON.stringify({ id, created_at: now }), {
      status: 201, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: '服务器错误' }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

async function handleUpdateCustomer(request: Request, env: Env): Promise<Response> {
  if (!verifyBearerToken(request, env)) {
    return new Response(JSON.stringify({ error: '未授权访问' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
  try {
    const url    = new URL(request.url);
    const id     = url.pathname.split('/')[3];
    const userId = url.searchParams.get('user_id');
    const body   = await request.json() as {
      name?: string; code?: string; email?: string;
      phone?: string; address?: string; data?: unknown;
    };

    const existing = await env.USERS_DB.prepare(
      "SELECT user_id FROM Customer WHERE id = ? AND status = 'active'"
    ).bind(id).first<{ user_id: string }>();

    if (!existing) {
      return new Response(JSON.stringify({ error: '客户不存在' }), {
        status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    if (userId && existing.user_id !== userId) {
      return new Response(JSON.stringify({ error: '无权修改' }), {
        status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    const now = new Date().toISOString();
    await env.USERS_DB.prepare(`
      UPDATE Customer SET
        name       = COALESCE(?, name),
        code       = COALESCE(?, code),
        email      = COALESCE(?, email),
        phone      = COALESCE(?, phone),
        address    = COALESCE(?, address),
        data       = COALESCE(?, data),
        updated_at = ?
      WHERE id = ?
    `).bind(
      body.name    ?? null,
      body.code    ?? null,
      body.email   ?? null,
      body.phone   ?? null,
      body.address ?? null,
      body.data !== undefined ? JSON.stringify(body.data) : null,
      now, id
    ).run();

    return new Response(JSON.stringify({ success: true, updated_at: now }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: '服务器错误' }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

async function handleDeleteCustomer(request: Request, env: Env): Promise<Response> {
  if (!verifyBearerToken(request, env)) {
    return new Response(JSON.stringify({ error: '未授权访问' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
  try {
    const url    = new URL(request.url);
    const id     = url.pathname.split('/')[3];
    const userId = url.searchParams.get('user_id');

    const existing = await env.USERS_DB.prepare(
      "SELECT user_id FROM Customer WHERE id = ? AND status = 'active'"
    ).bind(id).first<{ user_id: string }>();

    if (!existing) {
      return new Response(JSON.stringify({ error: '客户不存在' }), {
        status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    if (userId && existing.user_id !== userId) {
      return new Response(JSON.stringify({ error: '无权删除' }), {
        status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    await env.USERS_DB.prepare(
      "UPDATE Customer SET status = 'archived', updated_at = ? WHERE id = ?"
    ).bind(new Date().toISOString(), id).run();

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: '服务器错误' }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}
```

---

### 改动 3：新建文件 `src/app/api/customers/[[...path]]/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const WORKER_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://udb.luocompany.net';

function workerHeaders(): HeadersInit {
  const token = process.env.API_TOKEN;
  if (!token) throw new Error('API_TOKEN env var not set');
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
}

async function proxyCustomers(
  request: NextRequest,
  pathSegments: string[]
): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const userId = session.user.id || session.user.username || '';
  const url = new URL(request.url);

  const workerPath = pathSegments.length > 0
    ? `/api/customers/${pathSegments.join('/')}`
    : '/api/customers';
  url.searchParams.set('user_id', userId);
  const workerUrl = `${WORKER_BASE}${workerPath}?${url.searchParams.toString()}`;

  let body: string | undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const raw = await request.json().catch(() => ({}));
    body = JSON.stringify({ ...raw, user_id: userId });
  }

  let workerResp: Response;
  try {
    workerResp = await fetch(workerUrl, {
      method: request.method,
      headers: workerHeaders(),
      body,
    });
  } catch {
    return NextResponse.json({ error: 'Worker 请求失败' }, { status: 502 });
  }

  const data = await workerResp.json();
  return NextResponse.json(data, { status: workerResp.status });
}

type RouteParams = { params: Promise<{ path?: string[] }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  return proxyCustomers(req, (await params).path ?? []);
}
export async function POST(req: NextRequest, { params }: RouteParams) {
  return proxyCustomers(req, (await params).path ?? []);
}
export async function PUT(req: NextRequest, { params }: RouteParams) {
  return proxyCustomers(req, (await params).path ?? []);
}
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  return proxyCustomers(req, (await params).path ?? []);
}
```

---

### 验证

```bash
npx tsc --noEmit
npm run build
npx wrangler deploy

# 创建客户测试：
curl -s -X POST \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"<USER_ID>","type":"customer","name":"Test Co.","email":"test@example.com"}' \
  https://udb.luocompany.net/api/customers
# 预期：{"id":"...","created_at":"..."}

# 列出客户：
curl -s -H "Authorization: Bearer <TOKEN>" \
  "https://udb.luocompany.net/api/customers?user_id=<USER_ID>"
```

### 提交

```bash
git add src/worker.ts src/app/api/customers/
git commit -m "feat(api): Customer CRUD API（Worker + Next.js 代理）"
```

---

## 执行顺序

```
TASK-11 → 部署 Worker → 验证 Document API
TASK-12 → 部署 Worker → 验证 Customer API
（TASK-13：前端写入改走 API，后续单独规划）
```

**每个任务完成后必跑：**
```bash
npx tsc --noEmit && npm run build
```

---

## TASK-13：前端 localStorage → D1 双写（第一阶段）

**优先级**：🟡 中（功能扩展）
**估时**：30 分钟
**风险**：低。localStorage 始终是主存储，D1 写入为后台 fire-and-forget，失败时仅打印警告，不影响现有 UX。

### 背景

TASK-11/12 已在 Worker + Next.js 建立了 Document/Customer CRUD API。
本任务在前端现有 localStorage 写入点旁边添加异步 D1 同步调用，实现双写。
**读取路径不改变**（仍从 localStorage 读取），避免引入任何功能回归。

D1 写入路径：浏览器 `fetch('/api/documents')` → Next.js proxy（注入 `user_id`、Bearer token）→ Worker → D1。

### 涉及文件

| 文件 | 操作 |
|------|------|
| `src/utils/d1Sync.ts` | 新建（fire-and-forget 帮助函数） |
| `src/utils/quotationHistory.ts` | 修改（3 处：update、create、delete） |
| `src/utils/invoiceHistory.ts` | 修改（2 处：add、delete） |
| `src/utils/packingHistory.ts` | 修改（3 处：update、invoiceNo 匹配 upsert、create） |
| `src/utils/purchaseHistory.ts` | 修改（3 处：update、create、delete） |
| `src/features/customer/services/customerService.ts` | 修改（2 处：save、delete） |

---

### 步骤一：新建 `src/utils/d1Sync.ts`

创建以下文件，完整内容如下：

```ts
/**
 * Fire-and-forget D1 同步帮助函数。
 * 永不抛出异常，localStorage 始终是主存储。
 * 通过 Next.js 代理（/api/documents、/api/customers）发送请求，
 * 代理负责注入 user_id（从 NextAuth session 读取）和 Bearer token。
 */

export type D1DocType = 'quotation' | 'confirmation' | 'invoice' | 'packing' | 'purchase';

export interface D1DocumentPayload {
  id: string;
  type: D1DocType;
  doc_no: string;
  customer_name?: string;
  total_amount?: number;
  currency?: string;
  data: unknown;
}

/** 同步单条文档到 D1（create / update / delete），不等待结果。 */
export function d1SyncDocument(
  action: 'create' | 'update' | 'delete',
  payload: D1DocumentPayload
): void {
  if (typeof window === 'undefined') return;
  void (async () => {
    try {
      if (action === 'delete') {
        await fetch(`/api/documents/${payload.id}`, { method: 'DELETE' });
      } else if (action === 'update') {
        await fetch(`/api/documents/${payload.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
    } catch (err) {
      console.warn('[d1Sync] document sync failed (localStorage unchanged):', err);
    }
  })();
}

export interface D1CustomerPayload {
  id: string;
  type: 'customer' | 'supplier' | 'consignee';
  name: string;
  code?: string;
  email?: string;
  phone?: string;
  address?: string;
  data?: unknown;
}

/** 同步单条客户到 D1（create / update / delete），不等待结果。 */
export function d1SyncCustomer(
  action: 'create' | 'update' | 'delete',
  payload: D1CustomerPayload
): void {
  if (typeof window === 'undefined') return;
  void (async () => {
    try {
      if (action === 'delete') {
        await fetch(`/api/customers/${payload.id}`, { method: 'DELETE' });
      } else if (action === 'update') {
        await fetch(`/api/customers/${payload.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
    } catch (err) {
      console.warn('[d1Sync] customer sync failed (localStorage unchanged):', err);
    }
  })();
}
```

---

### 步骤二：修改 `src/utils/quotationHistory.ts`

**2a. 在文件顶部添加 import**（在 `import { getDefaultNotes }` 那行之后）：

```ts
import { d1SyncDocument } from './d1Sync';
```

**2b. 在 update 路径 return 之前添加同步调用**

找到以下代码（update 路径，`existingId` 存在且找到记录的分支末尾，`return updatedHistory;` 之前的事件 dispatch 之后）：

```ts
        // 触发自定义事件，通知Dashboard页面更新
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('customStorageChange', {
            detail: { key: STORAGE_KEY }
          }));
        }

        return updatedHistory;
      } else {
        console.log(`[QuotationHistory] 未找到现有记录，ID: ${existingId}，将创建新记录`);
      }
```

替换为：

```ts
        // 触发自定义事件，通知Dashboard页面更新
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('customStorageChange', {
            detail: { key: STORAGE_KEY }
          }));
        }

        // D1 双写（fire-and-forget）
        d1SyncDocument('update', {
          id: existingId,
          type,
          doc_no: updatedHistory.quotationNo || '',
          customer_name: updatedHistory.customerName,
          total_amount: totalAmount,
          currency: data.currency,
          data: dataWithVisibleCols,
        });

        return updatedHistory;
      } else {
        console.log(`[QuotationHistory] 未找到现有记录，ID: ${existingId}，将创建新记录`);
      }
```

**2c. 在 create 路径 return 之前添加同步调用**

找到以下代码（create 路径末尾，`return newHistory;` 之前的事件 dispatch 之后）：

```ts
    // 触发自定义事件，通知Dashboard页面更新
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('customStorageChange', {
        detail: { key: STORAGE_KEY }
      }));
    }

    return newHistory;
  } catch (error) {
    console.error('Error saving quotation history:', error);
```

替换为：

```ts
    // 触发自定义事件，通知Dashboard页面更新
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('customStorageChange', {
        detail: { key: STORAGE_KEY }
      }));
    }

    // D1 双写（fire-and-forget）
    d1SyncDocument('create', {
      id: newId,
      type,
      doc_no: newHistory.quotationNo || '',
      customer_name: newHistory.customerName,
      total_amount: totalAmount,
      currency: data.currency,
      data: dataWithVisibleCols,
    });

    return newHistory;
  } catch (error) {
    console.error('Error saving quotation history:', error);
```

**2d. 在 `deleteQuotationHistory` 中添加同步调用**

找到：

```ts
export const deleteQuotationHistory = (id: string): boolean => {
  try {
    const history = getQuotationHistory();
    const filtered = history.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    return false;
  }
};
```

替换为：

```ts
export const deleteQuotationHistory = (id: string): boolean => {
  try {
    const history = getQuotationHistory();
    const filtered = history.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    d1SyncDocument('delete', { id, type: 'quotation', doc_no: '', data: null });
    return true;
  } catch (error) {
    return false;
  }
};
```

---

### 步骤三：修改 `src/utils/invoiceHistory.ts`

**3a. 在文件顶部添加 import**（在第一行 `import { InvoiceHistory }` 之后）：

```ts
import { d1SyncDocument } from './d1Sync';
```

**3b. 修改 `addInvoiceHistory`**

找到：

```ts
export const addInvoiceHistory = (data: InvoiceHistory): boolean => {
  try {
    const history = getInvoiceHistory();
    history.unshift(data);
    return saveInvoiceHistory(history);
  } catch (error) {
    console.error('Error adding invoice history:', error);
    return false;
  }
};
```

替换为：

```ts
export const addInvoiceHistory = (data: InvoiceHistory): boolean => {
  try {
    const history = getInvoiceHistory();
    history.unshift(data);
    const saved = saveInvoiceHistory(history);
    if (saved) {
      d1SyncDocument('create', {
        id: data.id,
        type: 'invoice',
        doc_no: data.invoiceNo,
        customer_name: data.customerName,
        total_amount: data.totalAmount,
        currency: data.currency,
        data,
      });
    }
    return saved;
  } catch (error) {
    console.error('Error adding invoice history:', error);
    return false;
  }
};
```

**3c. 修改 `deleteInvoiceHistory`**

找到：

```ts
export const deleteInvoiceHistory = (id: string): boolean => {
  try {
    const history = getInvoiceHistory();
    const filtered = history.filter(item => item.id !== id);
    return saveInvoiceHistory(filtered);
  } catch (error) {
    console.error('Error deleting invoice history:', error);
    return false;
  }
};
```

替换为：

```ts
export const deleteInvoiceHistory = (id: string): boolean => {
  try {
    const history = getInvoiceHistory();
    const filtered = history.filter(item => item.id !== id);
    const saved = saveInvoiceHistory(filtered);
    if (saved) {
      d1SyncDocument('delete', { id, type: 'invoice', doc_no: '', data: null });
    }
    return saved;
  } catch (error) {
    console.error('Error deleting invoice history:', error);
    return false;
  }
};
```

---

### 步骤四：修改 `src/utils/packingHistory.ts`

**4a. 在文件顶部 `import { getLocalStorageJSON }` 之后添加 import**：

```ts
import { d1SyncDocument } from './d1Sync';
```

**4b. 在 existingId 找到记录的 return 之前添加同步（update 路径）**

找到（existingId 匹配分支，事件 dispatch 之后、`return updatedHistory;` 之前）：

```ts
        // 触发自定义事件，通知Dashboard页面更新
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('customStorageChange', {
            detail: { key: STORAGE_KEY }
          }));
        }

        return updatedHistory;
      }
    }

    // 🆕 检查是否已存在相同发票号的记录
```

替换为：

```ts
        // 触发自定义事件，通知Dashboard页面更新
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('customStorageChange', {
            detail: { key: STORAGE_KEY }
          }));
        }

        // D1 双写（fire-and-forget）
        d1SyncDocument('update', {
          id: existingId,
          type: 'packing',
          doc_no: updatedHistory.invoiceNo || updatedHistory.orderNo || '',
          customer_name: updatedHistory.consigneeName,
          total_amount: totalAmount,
          currency: data.currency,
          data: dataWithVisibleCols,
        });

        return updatedHistory;
      }
    }

    // 🆕 检查是否已存在相同发票号的记录
```

**4c. 在 invoiceNo 匹配的 upsert 分支 return 之前添加同步**

找到（invoiceNo 匹配分支末尾，事件 dispatch 之后、`return updatedHistory.find(...)` 之前）：

```ts
        // 触发自定义事件，通知Dashboard页面更新
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('customStorageChange', {
            detail: { key: STORAGE_KEY }
          }));
        }

        return updatedHistory.find(item => item.id === existingPacking.id) || null;
```

替换为：

```ts
        // 触发自定义事件，通知Dashboard页面更新
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('customStorageChange', {
            detail: { key: STORAGE_KEY }
          }));
        }

        // D1 双写（fire-and-forget）
        d1SyncDocument('update', {
          id: existingPacking.id,
          type: 'packing',
          doc_no: data.invoiceNo || data.orderNo || '',
          customer_name: data.consignee.name,
          total_amount: totalAmount,
          currency: data.currency,
          data: dataWithVisibleCols,
        });

        return updatedHistory.find(item => item.id === existingPacking.id) || null;
```

**4d. 在 create 路径 return 之前添加同步**

找到（packingHistory create 路径末尾，事件 dispatch 之后、`return newHistory;` 之前）：

```ts
    // 触发自定义事件，通知Dashboard页面更新
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('customStorageChange', {
        detail: { key: STORAGE_KEY }
      }));
    }

    return newHistory;
  } catch (error) {
    console.error('Error saving packing history:', error);
```

替换为：

```ts
    // 触发自定义事件，通知Dashboard页面更新
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('customStorageChange', {
        detail: { key: STORAGE_KEY }
      }));
    }

    // D1 双写（fire-and-forget）
    d1SyncDocument('create', {
      id: newId,
      type: 'packing',
      doc_no: newHistory.invoiceNo || newHistory.orderNo || '',
      customer_name: newHistory.consigneeName,
      total_amount: totalAmount,
      currency: data.currency,
      data: dataWithVisibleCols,
    });

    return newHistory;
  } catch (error) {
    console.error('Error saving packing history:', error);
```

**4e. 修改 `deletePackingHistory`**

找到：

```ts
export const deletePackingHistory = (id: string): boolean => {
  try {
    const history = getPackingHistory();
    const filtered = history.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    return false;
  }
};
```

替换为：

```ts
export const deletePackingHistory = (id: string): boolean => {
  try {
    const history = getPackingHistory();
    const filtered = history.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    d1SyncDocument('delete', { id, type: 'packing', doc_no: '', data: null });
    return true;
  } catch (error) {
    return false;
  }
};
```

---

### 步骤五：修改 `src/utils/purchaseHistory.ts`

**5a. 在文件顶部（`import { getLocalStorageJSON }` 行之后）添加 import**：

```ts
import { d1SyncDocument } from './d1Sync';
```

**5b. 在 existingId 找到记录的分支末尾添加同步（update 路径）**

找到（update 路径：existingId 匹配，事件 dispatch 之后、`return updatedHistory;` 之前）：

```ts
        // 触发自定义事件，通知Dashboard页面更新
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('customStorageChange', {
            detail: { key: STORAGE_KEY }
          }));
        }

        return updatedHistory;
      }
    }

    // 如果没有提供ID或找不到记录，创建新记录
```

替换为：

```ts
        // 触发自定义事件，通知Dashboard页面更新
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('customStorageChange', {
            detail: { key: STORAGE_KEY }
          }));
        }

        // D1 双写（fire-and-forget）
        d1SyncDocument('update', {
          id: existingId,
          type: 'purchase',
          doc_no: updatedHistory.orderNo || '',
          customer_name: updatedHistory.supplierName,
          total_amount: totalAmount,
          currency: data.currency,
          data,
        });

        return updatedHistory;
      }
    }

    // 如果没有提供ID或找不到记录，创建新记录
```

**5c. 在 create 路径 return 之前添加同步**

找到（purchase create 路径末尾，事件 dispatch 之后、`return newHistory;` 之前）：

```ts
    // 触发自定义事件，通知Dashboard页面更新
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('customStorageChange', {
        detail: { key: STORAGE_KEY }
      }));
    }

    return newHistory;
  } catch (error) {
    console.error('Error saving purchase history:', error);
```

替换为：

```ts
    // 触发自定义事件，通知Dashboard页面更新
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('customStorageChange', {
        detail: { key: STORAGE_KEY }
      }));
    }

    // D1 双写（fire-and-forget）
    d1SyncDocument('create', {
      id: newId,
      type: 'purchase',
      doc_no: newHistory.orderNo || '',
      customer_name: newHistory.supplierName,
      total_amount: totalAmount,
      currency: data.currency,
      data,
    });

    return newHistory;
  } catch (error) {
    console.error('Error saving purchase history:', error);
```

**5d. 修改 `deletePurchaseHistory`**

找到：

```ts
export const deletePurchaseHistory = (id: string): boolean => {
  try {
    const history = getPurchaseHistory();
    const filtered = history.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    return false;
  }
};
```

替换为：

```ts
export const deletePurchaseHistory = (id: string): boolean => {
  try {
    const history = getPurchaseHistory();
    const filtered = history.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    d1SyncDocument('delete', { id, type: 'purchase', doc_no: '', data: null });
    return true;
  } catch (error) {
    return false;
  }
};
```

---

### 步骤六：修改 `src/features/customer/services/customerService.ts`

**6a. 在文件顶部（已有 import 行之后）添加 import**：

```ts
import { d1SyncCustomer } from '@/utils/d1Sync';
```

**6b. 修改 `saveCustomer` 函数**

找到：

```ts
    localStorage.setItem('customer_management', JSON.stringify(updatedCustomers));
    console.log('客户数据保存成功:', customer);
  } catch (error) {
    console.error('保存客户数据失败:', error);
    throw error;
  }
}
```

替换为：

```ts
    localStorage.setItem('customer_management', JSON.stringify(updatedCustomers));
    console.log('客户数据保存成功:', customer);

    // D1 双写（fire-and-forget）
    d1SyncCustomer(existingIndex >= 0 ? 'update' : 'create', {
      id: customer.id,
      type: 'customer',
      name: customer.name,
      email: customer.email || undefined,
      phone: customer.phone || undefined,
      address: customer.address || undefined,
      data: { company: customer.company },
    });
  } catch (error) {
    console.error('保存客户数据失败:', error);
    throw error;
  }
}
```

**6c. 修改 `deleteCustomer` 函数**

找到：

```ts
    localStorage.setItem('customer_management', JSON.stringify(updatedCustomers));

    console.log('客户删除成功:', customerId);
  } catch (error) {
    console.error('删除客户失败:', error);
    throw error;
  }
}
```

替换为：

```ts
    localStorage.setItem('customer_management', JSON.stringify(updatedCustomers));
    console.log('客户删除成功:', customerId);

    // D1 双写（fire-and-forget）
    d1SyncCustomer('delete', { id: customerId, type: 'customer', name: '' });
  } catch (error) {
    console.error('删除客户失败:', error);
    throw error;
  }
}
```

---

### 验证

```bash
npx tsc --noEmit
npm run build
```

TypeScript 编译必须 0 错误，build 必须成功。

### 手动冒烟测试（部署后）

1. 登录系统，打开报价模块，保存一份报价
2. 打开浏览器开发者工具 Network 标签
3. 确认有一个 `POST /api/documents` 请求，状态 200
4. 在 D1 管理界面（Cloudflare Dashboard → D1 → mluonet-users → Execute query）执行：
   ```sql
   SELECT id, type, doc_no, customer_name, status FROM Document ORDER BY created_at DESC LIMIT 5;
   ```
   确认有新行插入

### 提交

```bash
git add src/utils/d1Sync.ts \
        src/utils/quotationHistory.ts \
        src/utils/invoiceHistory.ts \
        src/utils/packingHistory.ts \
        src/utils/purchaseHistory.ts \
        src/features/customer/services/customerService.ts
git commit -m "feat(sync): localStorage 双写 D1（第一阶段，fire-and-forget）"
```

---

## 执行顺序汇总

```
TASK-11 ✅ → TASK-12 ✅ → TASK-13（本任务）
```

后续规划（不在本文件范围内）：
- **TASK-14**：切换读取路径，优先从 D1 读取，localStorage 降为离线 fallback
- **Playwright E2E**：覆盖登录、PDF 生成、导入导出流程

---

## TASK-14：D1 数据初始化（历史记录 + 客户批量迁移）

**优先级**：🟡 中（TASK-15 前置）
**估时**：25 分钟
**风险**：低。Worker 改动仅影响创建时冲突处理；前端迁移工具是独立按钮，不改任何现有读写流程。

### 背景

TASK-13 实现了新数据的双写，但用户历史上已保存在 localStorage 的数据未同步到 D1。
本任务：
1. 将 Worker 的 Document/Customer create 改为 `INSERT OR REPLACE`（幂等，支持重复执行）
2. 新增迁移工具函数 `migrateAllToD1()`，读取全部 localStorage 数据批量 POST 到 D1
3. 在管理员页面添加迁移面板 UI（仅管理员可见）

### 涉及文件

| 文件 | 操作 |
|------|------|
| `src/worker.ts` | 修改 2 处 INSERT（幂等化） |
| `src/utils/d1Migration.ts` | 新建（迁移工具函数） |
| `src/features/admin/components/D1MigrationPanel.tsx` | 新建（迁移 UI 组件） |
| `src/features/admin/app/AdminPage.tsx` | 修改（引入迁移面板） |

---

### 步骤一：修改 `src/worker.ts`（2 处）

**1a.** 找到以下代码（`handleCreateDocument` 函数内）：

```ts
    await env.USERS_DB.prepare(`
      INSERT INTO Document (
        id, user_id, type, doc_no, customer_name, total_amount, currency, status, data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
```

替换为：

```ts
    await env.USERS_DB.prepare(`
      INSERT OR REPLACE INTO Document (
        id, user_id, type, doc_no, customer_name, total_amount, currency, status, data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
```

**1b.** 找到以下代码（`handleCreateCustomer` 函数内）：

```ts
    await env.USERS_DB.prepare(`
      INSERT INTO Customer (
        id, user_id, type, name, code, email, phone, address, data, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
```

替换为：

```ts
    await env.USERS_DB.prepare(`
      INSERT OR REPLACE INTO Customer (
        id, user_id, type, name, code, email, phone, address, data, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
```

---

### 步骤二：新建 `src/utils/d1Migration.ts`

完整文件内容如下：

```ts
/**
 * 一次性 localStorage → D1 批量迁移工具。
 * 通过 Next.js 代理（/api/documents、/api/customers）发送请求，
 * 代理自动注入 user_id 和 Bearer token。
 * INSERT OR REPLACE 保证幂等：可安全重复执行。
 */

import { getQuotationHistory } from '@/utils/quotationHistory';
import { getInvoiceHistory } from '@/utils/invoiceHistory';
import { getPackingHistory } from '@/utils/packingHistory';
import { getPurchaseHistory } from '@/utils/purchaseHistory';
import { getAllCustomers } from '@/features/customer/services/customerService';
import { getAllSuppliers } from '@/features/customer/services/supplierService';
import { getAllConsignees } from '@/features/customer/services/consigneeService';

export interface MigrationResult {
  documents: { success: number; failed: number; total: number };
  customers: { success: number; failed: number; total: number };
}

export interface MigrationProgress {
  phase: 'documents' | 'customers' | 'done';
  current: number;
  total: number;
}

/** 发送单次 POST，返回是否成功（不抛出异常）。 */
async function post(url: string, body: unknown): Promise<boolean> {
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    // 200/201 = success；409 conflict = already exists (INSERT OR REPLACE handles this)
    return resp.ok;
  } catch {
    return false;
  }
}

/** 每迁移 10 条暂停 100ms，避免 Worker 过载。 */
async function maybeYield(index: number): Promise<void> {
  if (index > 0 && index % 10 === 0) {
    await new Promise<void>((r) => setTimeout(r, 100));
  }
}

/**
 * 读取全部 localStorage 历史和客户数据，批量 POST 到 D1。
 * @param onProgress 进度回调，可用于更新 UI
 */
export async function migrateAllToD1(
  onProgress?: (p: MigrationProgress) => void,
): Promise<MigrationResult> {
  if (typeof window === 'undefined') {
    throw new Error('migrateAllToD1 must run in the browser');
  }

  const result: MigrationResult = {
    documents: { success: 0, failed: 0, total: 0 },
    customers: { success: 0, failed: 0, total: 0 },
  };

  // ── 收集全部单据 ────────────────────────────────────────────
  const quotations = getQuotationHistory();
  const invoices   = getInvoiceHistory();
  const packings   = getPackingHistory();
  const purchases  = getPurchaseHistory();

  type DocPayload = {
    id: string; type: string; doc_no: string;
    customer_name?: string; total_amount?: number; currency?: string; data: unknown;
  };

  const docs: DocPayload[] = [
    ...quotations.map((q) => ({
      id: q.id,
      type: q.type,
      doc_no: q.quotationNo || '',
      customer_name: q.customerName,
      total_amount: q.totalAmount,
      currency: q.currency,
      data: q.data,
    })),
    ...invoices.map((i) => ({
      id: i.id,
      type: 'invoice' as const,
      doc_no: i.invoiceNo || '',
      customer_name: i.customerName,
      total_amount: i.totalAmount,
      currency: i.currency,
      data: i,
    })),
    ...packings.map((p) => ({
      id: p.id,
      type: 'packing' as const,
      doc_no: p.invoiceNo || p.orderNo || '',
      customer_name: p.consigneeName,
      total_amount: p.totalAmount,
      currency: p.currency,
      data: p.data,
    })),
    ...purchases.map((p) => ({
      id: p.id,
      type: 'purchase' as const,
      doc_no: p.orderNo || '',
      customer_name: p.supplierName,
      total_amount: p.totalAmount,
      currency: p.currency,
      data: p.data,
    })),
  ];

  result.documents.total = docs.length;

  // ── 迁移单据 ────────────────────────────────────────────────
  for (let i = 0; i < docs.length; i++) {
    onProgress?.({ phase: 'documents', current: i + 1, total: docs.length });
    const ok = await post('/api/documents', docs[i]);
    if (ok) result.documents.success++;
    else result.documents.failed++;
    await maybeYield(i);
  }

  // ── 收集全部客户 ─────────────────────────────────────────────
  type CustomerPayload = {
    id: string; type: 'customer' | 'supplier' | 'consignee';
    name: string; email?: string; phone?: string; address?: string; data?: unknown;
  };

  const customers: CustomerPayload[] = [
    ...getAllCustomers().map((c) => ({
      id: c.id, type: 'customer' as const, name: c.name,
      email: c.email || undefined, phone: c.phone || undefined,
      address: c.address || undefined,
      data: { company: c.company },
    })),
    ...getAllSuppliers().map((s) => ({
      id: s.id, type: 'supplier' as const, name: s.name,
      email: s.email || undefined, phone: s.phone || undefined,
      address: s.address || undefined,
      data: { company: s.company },
    })),
    ...getAllConsignees().map((c) => ({
      id: c.id, type: 'consignee' as const, name: c.name,
      email: c.email || undefined, phone: c.phone || undefined,
      address: c.address || undefined,
      data: { company: c.company },
    })),
  ];

  result.customers.total = customers.length;

  // ── 迁移客户 ────────────────────────────────────────────────
  for (let i = 0; i < customers.length; i++) {
    onProgress?.({ phase: 'customers', current: i + 1, total: customers.length });
    const ok = await post('/api/customers', customers[i]);
    if (ok) result.customers.success++;
    else result.customers.failed++;
    await maybeYield(i);
  }

  onProgress?.({ phase: 'done', current: customers.length, total: customers.length });
  return result;
}
```

---

### 步骤三：新建 `src/features/admin/components/D1MigrationPanel.tsx`

完整文件内容如下：

```tsx
'use client';

import { useState, useCallback } from 'react';
import { Database, CloudUpload, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { migrateAllToD1, MigrationResult, MigrationProgress } from '@/utils/d1Migration';

type MigrationState = 'idle' | 'running' | 'done' | 'error';

export function D1MigrationPanel() {
  const [state, setState]       = useState<MigrationState>('idle');
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [result, setResult]     = useState<MigrationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleMigrate = useCallback(async () => {
    setState('running');
    setResult(null);
    setErrorMsg('');
    try {
      const res = await migrateAllToD1((p) => setProgress(p));
      setResult(res);
      setState('done');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '迁移失败');
      setState('error');
    }
  }, []);

  return (
    <div className="mt-8 p-5 border border-blue-100 dark:border-blue-900/40 rounded-xl bg-blue-50/50 dark:bg-blue-900/10">
      <div className="flex items-center gap-2 mb-1">
        <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <h2 className="text-base font-semibold text-gray-800 dark:text-white">云端数据迁移</h2>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        将当前浏览器本地历史记录（报价、发票、装箱、采购）和客户数据一次性同步到云端
        数据库。操作幂等，可安全重复执行。
      </p>

      {state === 'idle' && (
        <button
          onClick={handleMigrate}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white
                     bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <CloudUpload className="w-4 h-4" />
          开始迁移本地数据
        </button>
      )}

      {state === 'running' && (
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          {progress?.phase === 'documents'
            ? `正在迁移单据 ${progress.current} / ${progress.total}…`
            : progress?.phase === 'customers'
            ? `正在迁移客户 ${progress.current} / ${progress.total}…`
            : '处理中…'}
        </div>
      )}

      {state === 'done' && result && (
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium">
            <CheckCircle className="w-4 h-4" />
            迁移完成
          </div>
          <p className="text-gray-600 dark:text-gray-300">
            单据：{result.documents.success} 条成功 / {result.documents.failed} 条失败
            （共 {result.documents.total} 条）
          </p>
          <p className="text-gray-600 dark:text-gray-300">
            客户：{result.customers.success} 条成功 / {result.customers.failed} 条失败
            （共 {result.customers.total} 条）
          </p>
          <button
            onClick={handleMigrate}
            className="mt-2 text-xs text-blue-500 hover:underline"
          >
            再次执行
          </button>
        </div>
      )}

      {state === 'error' && (
        <div className="flex items-center gap-2 text-red-500 text-sm">
          <XCircle className="w-4 h-4" />
          {errorMsg}
          <button onClick={() => setState('idle')} className="ml-2 text-xs underline">
            重试
          </button>
        </div>
      )}
    </div>
  );
}
```

---

### 步骤四：修改 `src/features/admin/app/AdminPage.tsx`

**4a. 在 import 区块末尾（`import { User } from '../types';` 之后）添加**：

```ts
import { D1MigrationPanel } from '../components/D1MigrationPanel';
```

**4b. 在 `<UserList ... />` 之后，`{/* 弹窗 */}` 注释之前添加**：

找到：

```tsx
          {/* 用户列表 */}
          <UserList
            users={users}
            loading={loading}
            onCreateUser={() => setShowCreateModal(true)}
            onEditUser={handleEditUser}
          />
        </div>

        {/* 弹窗 */}
```

替换为：

```tsx
          {/* 用户列表 */}
          <UserList
            users={users}
            loading={loading}
            onCreateUser={() => setShowCreateModal(true)}
            onEditUser={handleEditUser}
          />

          {/* D1 数据迁移 */}
          <D1MigrationPanel />
        </div>

        {/* 弹窗 */}
```

---

### 验证

```bash
npx wrangler deploy
npx tsc --noEmit
npm run build
```

部署后登录管理员账户，访问 `/admin`，点击「开始迁移本地数据」按钮，确认进度更新正常，迁移完成后到 Cloudflare Dashboard → D1 查询确认数据已写入：

```sql
SELECT type, COUNT(*) as n FROM Document GROUP BY type;
SELECT type, COUNT(*) as n FROM Customer GROUP BY type;
```

### 提交

```bash
git add src/worker.ts \
        src/utils/d1Migration.ts \
        src/features/admin/components/D1MigrationPanel.tsx \
        src/features/admin/app/AdminPage.tsx
git commit -m "feat(migration): D1 历史数据一次性迁移工具（INSERT OR REPLACE + 管理员 UI）"
```

---

## TASK-15-DRAFT：读取路径切换 D1 Primary（可选，高风险，已放弃未执行）

**优先级**：🟢 低（TASK-14 完成且数据确认完整后再执行）
**估时**：40 分钟
**风险**：中高。改变读取路径会影响所有页面加载。必须有完整的 D1 数据（TASK-14 执行后）才能切换。

### 背景

TASK-13 双写、TASK-14 初始化迁移后，D1 已有全量数据。
本任务将 `getQuotationHistory()` 等读取函数改为优先从 D1 API 读取，localStorage 降为离线 fallback。

### 设计原则

1. 新增 `src/utils/d1Reader.ts`：提供 `fetchDocumentsFromD1(type)` 和 `fetchCustomersFromD1(type)` 函数
2. 每个 `get*History()` 函数改为：先尝试 D1，失败或离线时 fallback 到 localStorage
3. D1 读取结果**不写回 localStorage**（避免数据循环）
4. 所有组件必须处理 async 读取（可能需要 Suspense 或 loading 状态）

### 涉及文件（草案）

| 文件 | 改动说明 |
|------|---------|
| `src/utils/d1Reader.ts` | 新建，封装 GET /api/documents 和 GET /api/customers |
| `src/utils/quotationHistory.ts` | `getQuotationHistory()` 改为 async，优先 D1 |
| `src/utils/invoiceHistory.ts` | `getInvoiceHistory()` 改为 async |
| `src/utils/packingHistory.ts` | `getPackingHistory()` 改为 async |
| `src/utils/purchaseHistory.ts` | `getPurchaseHistory()` 改为 async |
| `src/features/customer/services/customerService.ts` | `getAllCustomers()` 改为 async |
| 所有调用 `get*History()` 的组件/页面 | 添加 await 和 loading 状态 |

> ⚠️ **执行前检查清单**：
> 1. TASK-14 已执行，D1 数据已确认完整
> 2. 在测试账户的 D1 中 `SELECT COUNT(*) FROM Document` 数量与 localStorage 条数一致
> 3. 准备好回滚方案（改动放在单独分支，不影响 main）

### 验证

```bash
npx tsc --noEmit
npm run build
# 打开历史页面，确认数据正常显示
# 断网状态下打开页面，确认 localStorage fallback 生效
```

### 提交

```bash
git add src/utils/d1Reader.ts \
        src/utils/quotationHistory.ts \
        src/utils/invoiceHistory.ts \
        src/utils/packingHistory.ts \
        src/utils/purchaseHistory.ts \
        src/features/customer/services/customerService.ts
git commit -m "feat(read): 读取路径切换到 D1 primary，localStorage 降为离线 fallback"
```

---

## 全局任务优先级汇总

| 任务 | 状态 | 说明 |
|------|------|------|
| TASK-01 ~ TASK-12 | ✅ | 安全、Bug、CI、Schema、API 全部完成 |
| TASK-13 | ✅ | 前端双写 D1（写入点） |
| TASK-14 | 🔲 待执行 | 一次性历史迁移 + Worker upsert |
| TASK-15 | 🔲 可选 | 读取切换 D1（高风险，TASK-14 后再议） |

---

## TASK-15：D1 → localStorage 登录拉取同步（多设备数据一致）

**优先级**：🟡 中
**估时**：20 分钟
**风险**：低。不改任何现有读写逻辑，只在登录后后台合并一次数据。

### 背景

TASK-13 双写 + TASK-14 一次性迁移之后，D1 已有全量数据。
本任务在用户登录后，后台从 D1 拉取数据并**合并**到 localStorage，实现多设备同步：
- 设备 A 创建的单据，登录设备 B 后自动出现在历史列表
- 读取路径不变（仍从 localStorage 读）；合并只在登录时发生一次
- 合并策略：D1 的记录若比 localStorage 中的更新（`updated_at` 更新），则覆盖；本地更新的保留

### 涉及文件

| 文件 | 操作 |
|------|------|
| `src/utils/d1Pull.ts` | 新建（拉取 + 合并函数） |
| `src/hooks/useD1Sync.ts` | 新建（React hook，登录后执行一次） |
| `src/app/providers.tsx` | 修改（注入 D1SyncInitializer 组件） |

---

### 步骤一：新建 `src/utils/d1Pull.ts`

```ts
/**
 * 从 D1 API 拉取数据并合并到 localStorage。
 * 合并规则：D1 更新时间 > localStorage → 覆盖；否则保留本地。
 * 仅在用户已登录时通过 /api/documents 和 /api/customers 代理调用。
 */

type D1Doc = {
  id: string;
  type: string;
  doc_no: string;
  customer_name: string | null;
  total_amount: number | null;
  currency: string;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type D1Customer = {
  id: string;
  type: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

async function fetchAll<T>(
  url: string,
  key: string,
): Promise<T[]> {
  const results: T[] = [];
  let offset = 0;
  const limit = 500;
  while (true) {
    const resp = await fetch(`${url}&limit=${limit}&offset=${offset}`);
    if (!resp.ok) break;
    const json = await resp.json();
    const items: T[] = json[key] ?? [];
    results.push(...items);
    if (items.length < limit) break;
    offset += limit;
  }
  return results;
}

function mergeIntoStorage<T extends { id: string; updatedAt?: string; updated_at?: string }>(
  storageKey: string,
  incoming: T[],
): void {
  const raw = localStorage.getItem(storageKey);
  const existing: T[] = raw ? JSON.parse(raw) : [];
  const map = new Map<string, T>(existing.map((item) => [item.id, item]));

  for (const item of incoming) {
    const local = map.get(item.id);
    if (!local) {
      map.set(item.id, item);
    } else {
      const localTime = new Date(local.updatedAt ?? local.updated_at ?? 0).getTime();
      const remoteTime = new Date(item.updatedAt ?? item.updated_at ?? 0).getTime();
      if (remoteTime > localTime) {
        map.set(item.id, item);
      }
    }
  }

  const merged = Array.from(map.values()).sort((a, b) => {
    const ta = new Date((a as any).createdAt ?? (a as any).created_at ?? 0).getTime();
    const tb = new Date((b as any).createdAt ?? (b as any).created_at ?? 0).getTime();
    return tb - ta;
  });

  localStorage.setItem(storageKey, JSON.stringify(merged));
}

function docToQuotationHistory(doc: D1Doc) {
  return {
    id: doc.id,
    type: doc.type as 'quotation' | 'confirmation',
    quotationNo: doc.doc_no || '',
    customerName: doc.customer_name || '',
    totalAmount: doc.total_amount || 0,
    currency: doc.currency || 'USD',
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
    data: doc.data,
  };
}

function docToInvoiceHistory(doc: D1Doc) {
  return {
    id: doc.id,
    invoiceNo: doc.doc_no || '',
    customerName: doc.customer_name || '',
    totalAmount: doc.total_amount || 0,
    currency: doc.currency || 'USD',
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
    // data field stored as full InvoiceHistory; extract inner data if present
    data: (doc.data as any).data ?? doc.data,
  };
}

function docToPackingHistory(doc: D1Doc) {
  const d = doc.data as any;
  return {
    id: doc.id,
    consigneeName: doc.customer_name || '',
    invoiceNo: doc.doc_no || d?.invoiceNo || '',
    orderNo: d?.orderNo || '',
    totalAmount: doc.total_amount || 0,
    currency: doc.currency || 'USD',
    documentType: d?.documentType || 'packing',
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
    data: doc.data,
  };
}

function docToPurchaseHistory(doc: D1Doc) {
  return {
    id: doc.id,
    supplierName: doc.customer_name || '',
    orderNo: doc.doc_no || '',
    totalAmount: doc.total_amount || 0,
    currency: doc.currency || 'USD',
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
    data: doc.data,
  };
}

function d1CustomerToLocal(c: D1Customer, type: 'customer' | 'supplier' | 'consignee') {
  return {
    id: c.id,
    name: c.name,
    email: c.email || '',
    phone: c.phone || '',
    address: c.address || '',
    company: (c.data as any)?.company || '',
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
}

/**
 * 拉取全部 D1 数据并合并到 localStorage。
 * 失败时静默（不影响现有功能）。
 */
export async function pullAllFromD1(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    // ── 单据 ────────────────────────────────────────────────
    const [quotations, confirmations, invoices, packings, purchases] = await Promise.all([
      fetchAll<D1Doc>('/api/documents?type=quotation', 'documents'),
      fetchAll<D1Doc>('/api/documents?type=confirmation', 'documents'),
      fetchAll<D1Doc>('/api/documents?type=invoice', 'documents'),
      fetchAll<D1Doc>('/api/documents?type=packing', 'documents'),
      fetchAll<D1Doc>('/api/documents?type=purchase', 'documents'),
    ]);

    mergeIntoStorage(
      'quotation_history',
      [...quotations, ...confirmations].map(docToQuotationHistory),
    );
    mergeIntoStorage('invoice_history', invoices.map(docToInvoiceHistory));
    mergeIntoStorage('packing_history', packings.map(docToPackingHistory));
    mergeIntoStorage('purchase_history', purchases.map(docToPurchaseHistory));

    // ── 客户 ────────────────────────────────────────────────
    const [customers, suppliers, consignees] = await Promise.all([
      fetchAll<D1Customer>('/api/customers?type=customer', 'customers'),
      fetchAll<D1Customer>('/api/customers?type=supplier', 'customers'),
      fetchAll<D1Customer>('/api/customers?type=consignee', 'customers'),
    ]);

    mergeIntoStorage('customer_management', customers.map((c) => d1CustomerToLocal(c, 'customer')));
    mergeIntoStorage('supplier_management', suppliers.map((c) => d1CustomerToLocal(c, 'supplier')));
    mergeIntoStorage('consignee_management', consignees.map((c) => d1CustomerToLocal(c, 'consignee')));

    console.log('[d1Pull] 同步完成');
  } catch (err) {
    console.warn('[d1Pull] 同步失败（不影响现有功能）:', err);
  }
}
```

---

### 步骤二：新建 `src/hooks/useD1Sync.ts`

```ts
/**
 * 用户登录后执行一次 D1 → localStorage 同步。
 * 使用模块级 flag 确保同一浏览器会话只同步一次。
 */
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { pullAllFromD1 } from '@/utils/d1Pull';

let syncDone = false;

export function useD1Sync(): void {
  const { status } = useSession();

  useEffect(() => {
    if (status !== 'authenticated') return;
    if (syncDone) return;
    syncDone = true;

    // 延迟 1s，避免与首屏渲染竞争
    const timer = setTimeout(() => {
      pullAllFromD1().catch(() => {/* 静默 */});
    }, 1000);

    return () => clearTimeout(timer);
  }, [status]);
}
```

---

### 步骤三：修改 `src/app/providers.tsx`

**3a. 在现有 import 行之后添加 import**（在 `import { usePermissionInit }` 之后）：

```ts
import { useD1Sync } from '@/hooks/useD1Sync';
```

**3b. 在 `PermissionInitializer` 组件之后添加新组件**

找到：

```tsx
// ✅ 全局权限初始化组件
function PermissionInitializer() {
  usePermissionInit();
  return null; // 这个组件不渲染任何内容，只负责初始化
}
```

替换为：

```tsx
// ✅ 全局权限初始化组件
function PermissionInitializer() {
  usePermissionInit();
  return null;
}

// ✅ 登录后从 D1 拉取数据到 localStorage（多设备同步）
function D1SyncInitializer() {
  useD1Sync();
  return null;
}
```

**3c. 在 `<PermissionInitializer />` 之后插入新组件**

找到：

```tsx
          <PermissionInitializer />
          {children}
```

替换为：

```tsx
          <PermissionInitializer />
          <D1SyncInitializer />
          {children}
```

---

### 验证

```bash
npx tsc --noEmit
npm run build
```

部署后：
1. 在设备 A 保存一份报价（双写到 D1）
2. 在设备 B 登录（不同浏览器/无痕模式）
3. 约 1 秒后刷新历史页面，确认设备 A 创建的记录出现在列表中

### 提交

```bash
git add src/utils/d1Pull.ts src/hooks/useD1Sync.ts src/app/providers.tsx
git commit -m "feat(sync): 登录时从 D1 拉取数据合并到 localStorage（多设备同步）"
```

---

## TASK-16：Playwright E2E 测试套件

**优先级**：🟡 中（质量保障）
**估时**：45 分钟
**风险**：极低，只新增文件，不改动业务代码

### 背景

`package.json` 已有 `"test:e2e": "playwright test"` 脚本，但 `@playwright/test` 未安装，也没有 `playwright.config.ts` 和 `e2e/` 目录。本任务补全这些缺失：

- 安装依赖
- 配置 Playwright（目标 URL、storageState 复用登录态）
- 全局 setup：登录一次，保存 Cookie/localStorage 到 `e2e/.auth/user.json`
- 四个核心测试文件：登录、Dashboard、报价单保存（含 D1 双写断言）、历史页

测试凭据通过环境变量注入（`E2E_BASE_URL`、`E2E_USERNAME`、`E2E_PASSWORD`），不硬编码。

### 涉及文件（全部新增）

```
playwright.config.ts
e2e/global-setup.ts
e2e/auth.spec.ts
e2e/dashboard.spec.ts
e2e/quotation-save.spec.ts
e2e/history.spec.ts
e2e/.auth/.gitkeep          ← 仅 .gitkeep，实际 user.json 由 gitignore 排除
```

同时修改：
- `package.json` — 追加 `@playwright/test` 到 devDependencies
- `.gitignore` — 追加 `e2e/.auth/`

### 步骤 1：安装依赖

```bash
npm install -D @playwright/test
npx playwright install chromium --with-deps
```

### 步骤 2：`playwright.config.ts`（项目根目录）

```ts
import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  globalSetup: './e2e/global-setup.ts',

  use: {
    baseURL: BASE_URL,
    storageState: 'e2e/.auth/user.json',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
```

### 步骤 3：`e2e/global-setup.ts`

```ts
import { chromium, FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL ?? 'http://localhost:3000';
  const username = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;

  if (!username || !password) {
    throw new Error(
      'E2E_USERNAME and E2E_PASSWORD must be set.\n' +
      'Example: E2E_USERNAME=roger E2E_PASSWORD=secret npx playwright test'
    );
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(baseURL + '/');
  await page.fill('#username', username);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');

  // 等待跳转到 dashboard
  await page.waitForURL('**/dashboard', { timeout: 15_000 });

  // 保存认证状态（Cookie + localStorage）
  const authDir = path.join(process.cwd(), 'e2e', '.auth');
  fs.mkdirSync(authDir, { recursive: true });
  await page.context().storageState({ path: path.join(authDir, 'user.json') });

  await browser.close();
}

export default globalSetup;
```

### 步骤 4：`e2e/auth.spec.ts`

```ts
import { test, expect } from '@playwright/test';

test.describe('认证流程', () => {
  // 此测试不依赖已登录状态，单独处理
  test.use({ storageState: { cookies: [], origins: [] } });

  test('未登录访问 /dashboard 应重定向到登录页', async ({ page }) => {
    await page.goto('/dashboard');
    // 应被重定向到根路径或包含登录表单
    await expect(page.locator('#username')).toBeVisible({ timeout: 10_000 });
  });

  test('填写正确凭据后跳转到 dashboard', async ({ page }) => {
    const username = process.env.E2E_USERNAME!;
    const password = process.env.E2E_PASSWORD!;

    await page.goto('/');
    await page.fill('#username', username);
    await page.fill('#password', password);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard', { timeout: 15_000 });
    await expect(page).toHaveURL(/dashboard/);
  });

  test('填写错误密码显示错误信息', async ({ page }) => {
    await page.goto('/');
    await page.fill('#username', 'nonexistent_user_xyz');
    await page.fill('#password', 'wrong_password_xyz');
    await page.click('button[type="submit"]');

    // 错误信息出现，页面留在登录页
    await expect(page.locator('text=用户名或密码错误')).toBeVisible({ timeout: 8_000 });
    await expect(page).toHaveURL(/^\//); // 仍在根路径
  });
});
```

### 步骤 5：`e2e/dashboard.spec.ts`

```ts
import { test, expect } from '@playwright/test';

test.describe('Dashboard 页面', () => {
  test('已登录用户可访问 dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    // 确认没有被重定向回登录页
    await expect(page).not.toHaveURL(/^\/?$/);
    // Dashboard 应包含至少一个导航链接
    await expect(page.locator('a[href*="quotation"], a[href*="invoice"], nav')).toHaveCount({ minimum: 1 } as any);
  });

  test('dashboard 页面基础元素可见', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    // 页面应有可见内容（不是空白页）
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(10);
  });
});
```

### 步骤 6：`e2e/quotation-save.spec.ts`

测试重点：点击保存后，前端触发 D1 双写（`POST /api/documents`），验证请求被发出且返回 200。

```ts
import { test, expect } from '@playwright/test';

test.describe('报价单保存 + D1 双写', () => {
  test('保存报价单 → 触发 POST /api/documents', async ({ page }) => {
    // 拦截 D1 双写请求（fire-and-forget，在点击保存后异步发出）
    const d1RequestPromise = page.waitForRequest(
      req => req.url().includes('/api/documents') && req.method() === 'POST',
      { timeout: 15_000 }
    );

    await page.goto('/quotation');
    await page.waitForLoadState('networkidle');

    // 填写客户名称（第一个文本输入框通常是客户名称字段）
    // 使用 label 文字定位（FormField 渲染 label 标签）
    const customerInput = page.locator('label:has-text("客户名称") ~ * input, label:has-text("客户名称") + * input').first();
    await customerInput.fill('E2E Test Customer');

    // 点击保存按钮（新记录时 title 为 "保存新记录"）
    await page.locator('button[title="保存新记录"], button[title="保存修改"]').click();

    // 断言 D1 双写请求被触发
    const d1Req = await d1RequestPromise;
    expect(d1Req.method()).toBe('POST');
    expect(d1Req.url()).toContain('/api/documents');

    // 等待响应并断言状态码
    const d1Resp = await d1Req.response();
    expect(d1Resp).not.toBeNull();
    // 允许 200（create）或 409（已存在但幂等）
    expect([200, 201, 409]).toContain(d1Resp!.status());
  });

  test('保存后 localStorage 包含新记录', async ({ page }) => {
    await page.goto('/quotation');
    await page.waitForLoadState('networkidle');

    // 清空现有历史以便计数
    await page.evaluate(() => {
      const existing = JSON.parse(localStorage.getItem('quotation_history') || '[]');
      // 记录保存前数量
      (window as any).__beforeCount = existing.length;
    });

    const customerInput = page.locator('label:has-text("客户名称") ~ * input, label:has-text("客户名称") + * input').first();
    await customerInput.fill('E2E LocalStorage Test');

    await page.locator('button[title="保存新记录"], button[title="保存修改"]').click();

    // 等待 toast 出现（保存成功提示）
    await expect(page.locator('text=保存成功')).toBeVisible({ timeout: 8_000 });

    // 验证 localStorage 记录数 +1
    const afterCount = await page.evaluate(() => {
      const list = JSON.parse(localStorage.getItem('quotation_history') || '[]');
      return list.length;
    });
    const beforeCount = await page.evaluate(() => (window as any).__beforeCount ?? 0);
    expect(afterCount).toBeGreaterThan(beforeCount);
  });
});
```

### 步骤 7：`e2e/history.spec.ts`

```ts
import { test, expect } from '@playwright/test';

test.describe('历史记录页', () => {
  test('能访问历史页且不报错', async ({ page }) => {
    await page.goto('/history');
    await page.waitForLoadState('networkidle');
    // 不被重定向回登录页
    await expect(page).not.toHaveURL(/^\/?$/);
    // 无 JavaScript 崩溃（检查 console）
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    // 等待短暂时间收集错误
    await page.waitForTimeout(1_000);
    // 过滤掉已知的非致命警告（D1 pull 可能因测试环境无法访问而报错）
    const fatalErrors = errors.filter(e =>
      !e.includes('D1') && !e.includes('fetch') && !e.includes('network')
    );
    expect(fatalErrors).toHaveLength(0);
  });

  test('历史页包含页面标题或空状态文字', async ({ page }) => {
    await page.goto('/history');
    await page.waitForLoadState('networkidle');
    // 应渲染出可读内容
    const bodyText = await page.locator('body').innerText();
    // 至少含有"历史"或"记录"等关键词，或空状态提示
    expect(bodyText).toMatch(/历史|记录|暂无|empty/i);
  });
});
```

### 步骤 8：`e2e/.auth/.gitkeep`

```bash
mkdir -p e2e/.auth
touch e2e/.auth/.gitkeep
```

### 步骤 9：更新 `.gitignore`

在 `.gitignore` 末尾追加：

```
# Playwright auth state
e2e/.auth/user.json
e2e/.auth/*.json
/playwright-report/
/test-results/
```

### 步骤 10：更新 `package.json`

在 `devDependencies` 中追加 `@playwright/test`（版本由 `npm install -D` 决定，写入后 commit）。

同时在 `scripts` 中追加（如果尚不存在）：

```json
"test:e2e:ui": "playwright test --ui",
"test:e2e:headed": "playwright test --headed"
```

### 验证命令

```bash
# 类型检查：playwright.config.ts 和 e2e/ 目录应无 TS 错误
npx tsc --noEmit

# 语法预检（不实际执行测试）
npx playwright test --list

# 实际运行（需要本地 dev server 或 .env.e2e 配置 E2E_BASE_URL）
# E2E_BASE_URL=https://your-vercel-url E2E_USERNAME=xxx E2E_PASSWORD=yyy npx playwright test
```

### 运行说明

本地运行需先启动 dev server：

```bash
# 终端 1
npm run dev

# 终端 2
E2E_USERNAME=<用户名> E2E_PASSWORD=<密码> npm run test:e2e
```

针对 Vercel 生产环境：

```bash
E2E_BASE_URL=https://luonet-vercel.vercel.app \
E2E_USERNAME=<用户名> \
E2E_PASSWORD=<密码> \
npm run test:e2e
```

CI 中在 GitHub Actions secrets 中设置 `E2E_BASE_URL`、`E2E_USERNAME`、`E2E_PASSWORD`，在 `.github/workflows/e2e.yml` 中 `env:` 块引用。

### 提交

```bash
git add playwright.config.ts e2e/ .gitignore package.json package-lock.json
git commit -m "test(e2e): 添加 Playwright E2E 测试套件（登录/Dashboard/报价单保存/历史页）"
```

---

## TASK-17：GitHub Actions E2E 集成

**优先级**：🟡 中（CI 完整性）
**估时**：15 分钟
**风险**：极低，仅改 CI 配置文件

### 背景

TASK-07 添加了 `ci.yml`，覆盖单元测试 + 构建。TASK-16 添加了 Playwright E2E 测试，但尚未挂入 CI。本任务在 `ci.yml` 增加一个 `e2e` job，仅在 push 到 main 后运行（针对已部署的 Vercel 生产 URL），并在失败时上传 Playwright HTML 报告作为 artifact。

**运行策略**：
- `check` job：每次 PR + push 都跑（lint / unit test / build）
- `e2e` job：仅 push 到 main 后跑，`needs: check`，针对 `E2E_BASE_URL` 指向的生产站点

PR 上不跑 E2E，因为 Vercel preview URL 每次不同，无法静态配置；如需 PR E2E，可在另一个 issue 中用 Vercel GitHub Integration Webhook 实现。

### 涉及文件

```
.github/workflows/ci.yml    ← 追加 e2e job
```

不改动其他文件。

### 改动：`.github/workflows/ci.yml`

在现有 `check` job 之后追加以下 `e2e` job：

```yaml
  e2e:
    name: E2E Tests (production)
    runs-on: ubuntu-latest
    needs: check
    # 仅在 push 到主分支时运行（不跑 PR），因为需要已部署的站点
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    timeout-minutes: 10

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright Chromium
        run: npx playwright install chromium --with-deps

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          E2E_BASE_URL: ${{ vars.E2E_BASE_URL }}
          E2E_USERNAME: ${{ secrets.E2E_USERNAME }}
          E2E_PASSWORD: ${{ secrets.E2E_PASSWORD }}

      - name: Upload Playwright report (on failure)
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report-${{ github.run_id }}
          path: playwright-report/
          retention-days: 7
```

完整 `ci.yml`（替换整个文件）：

```yaml
name: CI

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  check:
    name: Quality Check
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Check selectors
        run: npm run check:selectors

      - name: Run tests
        run: npm run test -- --ci --passWithNoTests

      - name: Lint
        run: npm run lint

      - name: Build
        run: npm run build
        env:
          DEEPSEEK_API_KEY: ${{ secrets.DEEPSEEK_API_KEY }}
          NEXTAUTH_SECRET: ${{ secrets.NEXTAUTH_SECRET }}
          NEXT_PUBLIC_API_BASE_URL: https://udb.luocompany.net
          NEXT_PUBLIC_APP_URL: https://luocompany.net

  e2e:
    name: E2E Tests (production)
    runs-on: ubuntu-latest
    needs: check
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    timeout-minutes: 10

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright Chromium
        run: npx playwright install chromium --with-deps

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          E2E_BASE_URL: ${{ vars.E2E_BASE_URL }}
          E2E_USERNAME: ${{ secrets.E2E_USERNAME }}
          E2E_PASSWORD: ${{ secrets.E2E_PASSWORD }}

      - name: Upload Playwright report (on failure)
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report-${{ github.run_id }}
          path: playwright-report/
          retention-days: 7
```

### GitHub 仓库配置（人工操作，Codex 无法代劳）

执行前需在 GitHub 仓库设置中添加：

**Settings → Secrets and variables → Actions → Variables（公开变量）**：
- `E2E_BASE_URL` = `https://luonet-vercel.vercel.app`（或实际 Vercel 域名）

**Settings → Secrets and variables → Actions → Secrets（加密）**：
- `E2E_USERNAME` = E2E 测试账号用户名
- `E2E_PASSWORD` = E2E 测试账号密码

建议为 E2E 单独创建一个只读测试账号，不使用管理员账号。

### 验证命令

```bash
# 语法检查 YAML 格式
npx js-yaml .github/workflows/ci.yml > /dev/null && echo "YAML OK"

# 本地模拟（仅确认文件结构正确）
cat .github/workflows/ci.yml | grep -E "name:|needs:|if:"
```

### 提交

```bash
git add .github/workflows/ci.yml
git commit -m "ci: 添加 Playwright E2E job（push to main 后针对生产站点运行）"
```

---

---

## TASK-18：新建 AppLayout + AppSidebar 组件系统 ✅ 已完成

**优先级**：🟡 高
**实际耗时**：3~4 小时
**状态**：完成。验证：`npx tsc --noEmit` 通过（layout 文件无错误）。

### 实际产出

新建文件（`src/components/layout/`）：
- `AppSidebar.tsx` — 固定 200px 侧边栏，图标+文字，基于 `usePermissionStore` 过滤权限菜单项，支持桌面端常驻 + 平板 overlay
- `AppTopBar.tsx` — 顶部栏，面包屑导航 + 用户头像 dropdown（含修改密码、主题切换、预加载、管理后台、退出）
- `AppBottomActionBar.tsx` — 底部固定操作栏，接收 `ActionButton[]`，支持 primary/secondary/ghost 三种样式及 loading 状态
- `AppLayout.tsx` — 组合容器，含 Suspense 包裹（修复 `useSearchParams()` 警告）
- `MobileBottomTab.tsx` — 手机端底部 Tab 栏（5 核心入口）
- `index.ts` — 统一导出

**风险**：低（新增文件，不改动现有功能）

### 背景

当前所有功能页通过 Dashboard 中转导航（Hub-and-Spoke），导致切换模块至少需要 2 次点击。此任务新建固定侧边栏布局系统，供 TASK-19 迁移各页面使用。

### 新建文件

```
src/components/layout/
  AppSidebar.tsx          ← 左侧导航栏
  AppTopBar.tsx           ← 顶部栏（面包屑 + 用户菜单）
  AppBottomActionBar.tsx  ← 底部固定操作栏（保存/预览/导出等）
  AppLayout.tsx           ← 组合布局容器
  MobileBottomTab.tsx     ← 手机端底部 Tab 栏
  index.ts                ← 统一导出
```

### AppSidebar 规格

```tsx
// 桌面端（≥1024px）：固定左侧，宽 200px，图标 + 文字，始终展开
// 平板端（768-1023px）：宽 200px，通过汉堡菜单触发 overlay 显示
// 手机端（<768px）：隐藏（由 MobileBottomTab 替代）

interface SidebarItem {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  dividerBefore?: boolean;   // 是否在此项前加分隔线
  permissionKey?: string;    // usePermissionStore 中的 key，无则始终显示
}

const NAV_ITEMS: SidebarItem[] = [
  { id: 'dashboard',    label: '首页',     path: '/dashboard',              icon: LayoutDashboard },
  { id: 'quotation',    label: '报价单',   path: '/quotation',              icon: FileText,      dividerBefore: true, permissionKey: 'canCreateQuotation' },
  { id: 'confirmation', label: '销售确认', path: '/quotation?tab=confirmation', icon: FileCheck, permissionKey: 'canCreateConfirmation' },
  { id: 'packing',      label: '箱单发票', path: '/packing',                icon: Package,       permissionKey: 'canCreatePacking' },
  { id: 'invoice',      label: '财务发票', path: '/invoice',                icon: Receipt,       permissionKey: 'canCreateInvoice' },
  { id: 'purchase',     label: '采购订单', path: '/purchase',               icon: ShoppingCart,  permissionKey: 'canCreatePurchase' },
  { id: 'history',      label: '单据历史', path: '/history',                icon: Archive,       dividerBefore: true, permissionKey: 'canViewHistory' },
  { id: 'customer',     label: '客户管理', path: '/customer',               icon: Users,         permissionKey: 'canManageCustomers' },
  { id: 'mail',         label: 'AI邮件',   path: '/mail',                   icon: Mail,          dividerBefore: true },
];

// 激活规则：usePathname().startsWith(item.path.split('?')[0])
// 激活样式：bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium
// 普通样式：text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50
// 分隔线：border-t border-gray-200 dark:border-gray-700 mt-1 pt-1
// 权限过滤：从 usePermissionStore 读取 permissions，过滤无权限项
```

### AppTopBar 规格

```tsx
interface AppTopBarProps {
  breadcrumbs: { label: string; path?: string }[];  // 最后一项无 path
  user: { name: string; isAdmin: boolean; email?: string | null };
  onLogout: () => void;
  onMenuClick?: () => void;  // 平板/手机端触发侧边栏
}

// 高度 h-14，sticky top-0 z-40
// 背景：bg-white dark:bg-[#1c1c1e] shadow-sm dark:shadow-gray-800/30
// 左侧：
//   - 手机/平板端：汉堡菜单按钮（Menu 图标）
//   - Logo 图片（32px，参考现有 Header.tsx 的 LOGO_CONFIG）
//   - 面包屑（桌面端显示完整路径，手机端只显最后一级）
// 右侧：用户头像 dropdown（完整复用现有 Header.tsx 中的 dropdown 逻辑）
//   包含：个人信息/修改密码、主题切换、预加载资源、管理后台（admin）、退出登录
```

### AppBottomActionBar 规格

```tsx
interface ActionButton {
  key: string;
  label: string;
  onClick: () => void;
  variant: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  icon?: LucideIcon;
}

interface AppBottomActionBarProps {
  actions: ActionButton[];
  leftSlot?: React.ReactNode;  // 如自动保存状态文字
}

// sticky bottom-0，z-30
// 高度 h-14
// 背景：bg-white dark:bg-[#1c1c1e] border-t border-gray-200 dark:border-gray-700
// 左侧：leftSlot（如有）
// 右侧：actions 按钮（右对齐，间距 gap-2）
// 按钮样式：
//   primary   → bg-blue-600 hover:bg-blue-700 text-white
//   secondary → border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200
//   ghost     → text-gray-500 hover:text-gray-700
// Mobile：底部预留 MobileBottomTab 高度（pb-[48px]）
```

### AppLayout 规格

```tsx
interface AppLayoutProps {
  breadcrumbs: { label: string; path?: string }[];
  user: { name: string; isAdmin: boolean; email?: string | null };
  onLogout: () => void;
  children: React.ReactNode;
  bottomActions?: ActionButton[];
  bottomLeftSlot?: React.ReactNode;
}

// 整体结构：
export function AppLayout({ breadcrumbs, user, onLogout, children, bottomActions, bottomLeftSlot }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* 桌面端固定侧边栏 */}
      <AppSidebar className="hidden lg:flex" />
      {/* 平板/手机 overlay 侧边栏 */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
          <AppSidebar className="fixed left-0 top-0 h-full z-50 lg:hidden" onClose={() => setSidebarOpen(false)} />
        </>
      )}
      {/* 主内容区 */}
      <div className="flex flex-col flex-1 lg:ml-[200px] min-h-screen overflow-hidden">
        <AppTopBar breadcrumbs={breadcrumbs} user={user} onLogout={onLogout} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
        {bottomActions && bottomActions.length > 0 && (
          <AppBottomActionBar actions={bottomActions} leftSlot={bottomLeftSlot} />
        )}
        <MobileBottomTab />
      </div>
    </div>
  );
}
```

### MobileBottomTab 规格

```tsx
// 仅在 <768px 显示（hidden md:hidden，lg:hidden）
// 高度 h-12，固定底部
// 显示 5 个核心入口：首页 / 报价单 / 历史 / 客户 / 邮件
// 激活高亮同 AppSidebar
```

### 验证

```bash
npx tsc --noEmit
# 确认无 TS 类型错误，新文件均正确导出
```

---

## TASK-19：迁移各功能页到 AppLayout ✅ 已完成

**优先级**：🟡 高（依赖 TASK-18 完成）
**实际耗时**：3~4 小时
**状态**：完成。验证：`npx tsc --noEmit` 通过（playwright 环境缺包的既有报错与本次无关）；`npm run lint` 通过；`npm run build` 因 Google Font DNS 失败（网络环境限制，非代码问题）。

### 实际产出

**新建文件：**
- `src/hooks/useAppUser.ts` — 合并 `usePermissionStore` + `useSession` 的共用用户 hook

**已迁移页面（全部）：**
- `src/features/dashboard/app/DashboardPage.tsx`
- `src/features/quotation/app/QuotationPage.tsx`
- `src/features/history/app/HistoryPage.tsx`
- `src/features/invoice/app/InvoicePage.tsx`
- `src/features/packing/app/PackingPage.tsx`
- `src/features/purchase/app/PurchasePage.tsx`
- `src/features/customer/app/CustomerPage.tsx`
- `src/features/mail/app/MailPage.tsx`

**各页主要改动：**
- 删除旧 `Header` / `Footer` / 返回按钮 import 和渲染
- 包裹 `AppLayout`，传入 `breadcrumbs` / `user` / `onLogout`
- Quotation / History / Invoice / Packing / Purchase 的主操作按钮迁入 `bottomActions`
- Customer / Mail 使用无 `bottomActions` 的 AppLayout
- HistoryPage 保留内容区 subheader（搜索框 + 刷新），导入/导出/批量删除迁入 `bottomActions`
- 修正 `AppTopBar` 与 `useAppUser` 双重 `signOut()` 问题，退出逻辑统一由 `onLogout` 回调处理
- `PurchaseHeader`（卡片内子组件：标题 + History 跳转 + Settings）保留不动，不是页面级导航

**未迁移（按要求）：**
- `/admin` 页面保持原有布局

### 背景（原始需求）

将所有功能页从「Header + 内容 + Footer」模式迁移到 AppLayout，移除页面内的返回按钮和顶部操作按钮，统一由侧边栏导航 + 底部操作栏替代。

### 前置说明（先做这一步）

代码审查发现功能页（QuotationPage/HistoryPage 等）不持有 session，但 AppLayout 需要 `user` + `onLogout`。**先新建共用 hook**，所有页面统一调用：

**新建 `src/hooks/useAppUser.ts`：**

```ts
'use client';

import { useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { usePermissionStore } from '@/lib/permissions';

export function useAppUser() {
  // 优先从 permissionStore 取（登录后最快同步），fallback 到 session
  const permUser = usePermissionStore((state) => state.user);
  const { data: session } = useSession();

  const user = {
    name: permUser?.username || session?.user?.name || session?.user?.username || '用户',
    isAdmin: permUser?.isAdmin ?? session?.user?.isAdmin ?? false,
    email: permUser?.email || session?.user?.email || null,
  };

  const handleLogout = useCallback(async () => {
    usePermissionStore.getState().clearUser();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('userCache');
    }
    await signOut();
  }, []);

  return { user, handleLogout };
}
```

### 迁移清单

按此顺序执行，**每步完成后运行 `npx tsc --noEmit`**，确认通过再继续。

---

#### ① DashboardPage（`src/features/dashboard/app/DashboardPage.tsx`）

```tsx
// 1. 新增 import
import { AppLayout } from '@/components/layout';

// 2. 移除 import { Header } from '@/components/Header'
//    移除 import { Footer } from '@/components/Footer'

// 3. 现有的 user / handleLogout 逻辑保持不变
//    （DashboardPage 已有完整的 useSession + usePermissionStore 处理）

// 4. 将返回值改为：
return (
  <AppLayout
    breadcrumbs={[{ label: '首页' }]}
    user={{
      name: user?.username || session?.user?.name || '用户',
      isAdmin: user?.isAdmin ?? false,
      email: user?.email || null,
    }}
    onLogout={handleLogout}
  >
    <div className="w-full max-w-none px-2 sm:px-4 lg:px-6 xl:px-8 2xl:px-12 py-6">
      <DashboardSuccessMessage ... />
      {/* TASK-20 将在此处新增 <StatsCards /> */}
      <DashboardModules ... />
      <DashboardDocuments ... />
    </div>
  </AppLayout>
);

// 5. 保留 isPermissionLoading 时的 loading spinner（在 AppLayout 之外提前返回，不变）
```

---

#### ② QuotationPage（`src/features/quotation/app/QuotationPage.tsx`）

QuotationPage 有两处操作按钮，处理方式不同：

**卡片头部的图标按钮**（~行 601-624，Save/Excel icon）：**保留**，不移动。这些是紧贴表单的快捷入口，合理。

**卡片底部的主操作区**（~行 889-978，Generate/Preview/Excel 大按钮）：**删除此整块 `<div>` 并迁移到 bottomActions**。

**Back 链接**（~行 554-565）：**整行删除**，侧边栏导航替代。

```tsx
// 1. 新增 imports
import { AppLayout, type ActionButton } from '@/components/layout';
import { useAppUser } from '@/hooks/useAppUser';

// 2. 在组件顶部添加
const { user, handleLogout } = useAppUser();

// 3. 删除：<Link href={...}>Back</Link>（约行 554-565）

// 4. 删除：卡片底部操作区整块（约行 889-978）：
//    从 {/* 操作按钮区域 */} 的 <div className="px-4 sm:px-6 py-4 border-t...">
//    到对应的 </div>，连同进度条区域一并删除

// 5. 将 generate/preview/excel 绑到 bottomActions：
const isEditMode = pathname?.includes('/edit/') || pathname?.includes('/copy/') || !!editId;

const bottomActions: ActionButton[] = [
  {
    key: 'generate',
    label: isGenerating ? 'Generating...' : isEditMode ? 'Save & Generate' : `Generate ${activeTab === 'quotation' ? 'Quotation' : 'Order'}`,
    onClick: handleGenerate,
    variant: 'primary',
    loading: isGenerating,
    loadingLabel: 'Generating...',
    icon: Download,
  },
  {
    key: 'preview',
    label: isPreviewing ? 'Previewing...' : 'Preview',
    onClick: handlePreview,
    variant: 'secondary',
    loading: isPreviewing,
    disabled: isPreviewing || isGenerating,
    icon: Eye,
  },
  {
    key: 'excel',
    label: 'Excel',
    onClick: handleExportExcel,
    variant: 'secondary',
    icon: FileSpreadsheet,
  },
];

// 6. breadcrumbs：
const breadcrumbs = [
  { label: '首页', path: '/dashboard' },
  { label: activeTab === 'quotation' ? '报价单' : '销售确认' },
  { label: isEditMode ? '编辑' : '新建' },
];

// 7. 整体返回值改为：
return (
  <AppLayout
    breadcrumbs={breadcrumbs}
    user={user}
    onLogout={handleLogout}
    bottomActions={bottomActions}
    bottomLeftSlot={
      // 可选：显示自动保存状态
      editId ? <span className="text-sm text-gray-400">ID: {editId}</span> : undefined
    }
  >
    {/* 保留 loading spinner 提前返回，不变 */}
    <div className="w-full max-w-none px-2 sm:px-4 lg:px-6 py-3 sm:py-6">
      {/* Tab 切换 */}
      {/* 主卡片 - 内部不变，但卡片底部操作区已删除 */}
    </div>
  </AppLayout>
);

// 8. 删除 import { Footer } / import { ArrowLeft } / import Link（若仅用于返回按钮）
//    注意：Link 还用于卡片内 History 跳转链接，检查后再决定是否保留 import
```

---

#### ③ HistoryPage（`src/features/history/app/HistoryPage.tsx`）

HistoryHeader 包含：**返回按钮 + 搜索框 + 刷新/导入/导出/批量删除按钮**。

处理策略：
- **返回按钮**：删除（侧边栏替代）
- **搜索框 + 刷新**：保留在内容区顶部的精简 subheader 内
- **导入/导出/批量删除**：迁移到 AppLayout bottomActions

```tsx
// 1. 新增 imports
import { AppLayout, type ActionButton } from '@/components/layout';
import { useAppUser } from '@/hooks/useAppUser';

// 2. 在组件顶部添加
const { user, handleLogout } = useAppUser();

// 3. 不再使用 HistoryHeader，改用以下 subheader（直接内联到返回值中）：
//    subheader 只保留：搜索框 + 刷新按钮
// （HistoryHeader.tsx 文件暂不删除，后续可清理）

// 4. bottomActions：
const bottomActions: ActionButton[] = [
  {
    key: 'import',
    label: '导入',
    onClick: onImport,
    variant: 'secondary',
    icon: Upload,
  },
  {
    key: 'export',
    label: '导出',
    onClick: onExport,
    variant: 'secondary',
    icon: Download,
  },
  ...(selectedCount > 0 ? [{
    key: 'delete',
    label: isDeleting ? '删除中...' : `删除选中 (${selectedCount})`,
    onClick: onBatchDelete,
    variant: 'primary' as const,
    loading: isDeleting,
    disabled: isDeleting,
  }] : []),
];

// 5. 返回值结构：
return (
  <AppLayout
    breadcrumbs={[{ label: '首页', path: '/dashboard' }, { label: '单据历史' }]}
    user={user}
    onLogout={handleLogout}
    bottomActions={bottomActions}
  >
    {/* 内容区搜索 subheader（取代 HistoryHeader） */}
    <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1c1c1e] px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="搜索客户名称、单据号..."
          value={filters.search}
          onChange={(e) => setFilters({ search: e.target.value })}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        />
        {filters.search && (
          <button onClick={() => setFilters({ search: '' })} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="h-4 w-4 text-gray-400" />
          </button>
        )}
      </div>
      <button onClick={onRefresh} className="p-2 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800">
        <RefreshCw className="h-4 w-4 text-gray-500" />
      </button>
    </div>
    {/* 原有 HistoryTabs 和内容 */}
    <HistoryTabs ... />
    ...
  </AppLayout>
);
```

---

#### ④ InvoicePage / PackingPage / PurchasePage

三个页面都有 Footer，部分有顶部返回按钮。模式与 QuotationPage 类似：

```tsx
// 每个页面添加：
import { AppLayout, type ActionButton } from '@/components/layout';
import { useAppUser } from '@/hooks/useAppUser';
const { user, handleLogout } = useAppUser();

// 移除：import { Footer } / Footer 组件
// 移除：顶部返回 Link（若有）
// 将底部保存/生成/预览等按钮迁移到 bottomActions

// Invoice breadcrumbs:
// [{ label: '首页', path: '/dashboard' }, { label: '财务发票' }, { label: isEdit ? '编辑' : '新建' }]

// Packing breadcrumbs:
// [{ label: '首页', path: '/dashboard' }, { label: '箱单发票' }, { label: isEdit ? '编辑' : '新建' }]

// Purchase breadcrumbs:
// [{ label: '首页', path: '/dashboard' }, { label: '采购订单' }, { label: isEdit ? '编辑' : '新建' }]
```

---

#### ⑤ CustomerPage / MailPage

相对简单，无底部操作按钮，只需：
- 移除 Footer / 返回按钮
- 包裹 AppLayout（无 bottomActions）

```tsx
// CustomerPage breadcrumbs: [{ label: '首页', path: '/dashboard' }, { label: '客户管理' }]
// MailPage breadcrumbs:     [{ label: '首页', path: '/dashboard' }, { label: 'AI邮件助手' }]
```

---

### 注意事项

- `DocumentLayout.tsx` 仅被 `QuotationPageRefactored.tsx` 引用（该文件不是活跃页面），**忽略，不处理**
- Admin 页面（`/admin`）**不迁移**
- 迁移后统一删除各页面中无用的 `import { Header }` / `import { Footer }` / `import { ArrowLeft }`
- DashboardPage 的权限 loading spinner（`if (isPermissionLoading) return ...`）**保留在 AppLayout 外面**（提前 return）

### 验证

```bash
npx tsc --noEmit
npm run build
# 手动验证（每页）：
# 1. 侧边栏当前页高亮正确
# 2. 面包屑路径正确
# 3. 底部操作按钮功能正常（保存/生成/预览/导出）
# 4. 深色模式颜色正常
# 5. 手机端底部 Tab 可见，不与操作栏重叠
npm run test:e2e
```

---

## TASK-20：Dashboard 今日统计卡片 ✅ 已完成

**优先级**：🟢 中
**实际耗时**：< 1 小时
**状态**：完成。验证：`eslint` 0 error；`tsc --noEmit` 和 `npm run build` 被既有环境问题阻塞（缺 `@playwright/test` / Google Font DNS），业务代码无新错误。

### 实际产出

**新建文件：**
- `src/features/dashboard/components/StatsCards.tsx` — 5 张今日统计卡片，按类型配色（蓝/绿/紫/青/橙），点击跳转 `/history?type=xxx&time=today`，loading 时显示 animate-pulse 占位

**修改文件：**
- `src/features/dashboard/hooks/useDashboardDocuments.ts` — 新增 `todayCounts`，基于有权限的全量单据 + `setHours(0,0,0,0)` 计算，不受 Dashboard 时间筛选影响，从 hook 返回值导出
- `src/features/dashboard/app/DashboardPage.tsx` — 从 hook 取 `todayCounts`，在 `DashboardSuccessMessage` 后、`DashboardModules` 前插入 `<StatsCards counts={todayCounts} loading={!mounted || isPermissionLoading} />`

### 背景

Dashboard 首页增加今日各类单据数量统计卡片，让用户一眼看到工作量概览，点击跳转对应历史记录。

### STEP 1：新建 StatsCards 组件

**新建 `src/features/dashboard/components/StatsCards.tsx`：**

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { FileText, FileCheck, Receipt, Package, ShoppingCart } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface StatItem {
  type: 'quotation' | 'confirmation' | 'invoice' | 'packing' | 'purchase';
  label: string;
  tag: string;
  icon: LucideIcon;
  colorClass: string;
  textColorClass: string;
  tagClass: string;
}

const STAT_ITEMS: StatItem[] = [
  { type: 'quotation',    label: '报价单',   tag: 'QTN', icon: FileText,     colorClass: 'bg-blue-50 dark:bg-blue-900/20',    textColorClass: 'text-blue-600 dark:text-blue-400',    tagClass: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300' },
  { type: 'confirmation', label: '销售确认', tag: 'SC',  icon: FileCheck,    colorClass: 'bg-green-50 dark:bg-green-900/20',  textColorClass: 'text-green-600 dark:text-green-400',  tagClass: 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-300' },
  { type: 'invoice',      label: '财务发票', tag: 'INV', icon: Receipt,      colorClass: 'bg-purple-50 dark:bg-purple-900/20', textColorClass: 'text-purple-600 dark:text-purple-400', tagClass: 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300' },
  { type: 'packing',      label: '箱单发票', tag: 'PL',  icon: Package,      colorClass: 'bg-teal-50 dark:bg-teal-900/20',   textColorClass: 'text-teal-600 dark:text-teal-400',   tagClass: 'bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-300' },
  { type: 'purchase',     label: '采购订单', tag: 'PO',  icon: ShoppingCart, colorClass: 'bg-orange-50 dark:bg-orange-900/20', textColorClass: 'text-orange-600 dark:text-orange-400', tagClass: 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-300' },
];

export interface StatCounts {
  quotation: number;
  confirmation: number;
  invoice: number;
  packing: number;
  purchase: number;
}

interface StatsCardsProps {
  counts: StatCounts;
  loading?: boolean;
}

export function StatsCards({ counts, loading = false }: StatsCardsProps) {
  const router = useRouter();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
      {STAT_ITEMS.map(({ type, label, tag, icon: Icon, colorClass, textColorClass, tagClass }) => (
        <button
          key={type}
          type="button"
          onClick={() => router.push(`/history?type=${type}&time=today`)}
          className={`${colorClass} rounded-xl p-4 text-left hover:shadow-md transition-shadow cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500`}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <Icon className={`h-4 w-4 shrink-0 ${textColorClass}`} />
            <span className="text-sm text-gray-500 dark:text-gray-400 truncate">{label}</span>
          </div>
          {loading ? (
            <div className="h-8 w-10 rounded bg-gray-200 dark:bg-gray-700 animate-pulse mb-2" />
          ) : (
            <div className={`text-3xl font-bold ${textColorClass} mb-2 tabular-nums`}>
              {counts[type]}
            </div>
          )}
          <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold ${tagClass}`}>
            {tag}
          </span>
        </button>
      ))}
    </div>
  );
}
```

### STEP 2：数据接入

**先查看 `src/features/dashboard/hooks/useDashboardDocuments.ts`：**

检查该 hook 的签名，判断是否支持传入固定 `timeFilter`。然后按以下方案选一：

**方案 A（推荐）：hook 已接受 initialTimeFilter 参数或可扩展**

在 `useDashboardDocuments` 中增加一个独立的固定 `today` 计数（不受用户切换影响）：
在 hook 内部，额外维护 `todayCounts`，始终用 `time=today` 过滤 `recentDocuments` 计算。

```ts
// 在 useDashboardDocuments hook 内，现有 documentCounts 下方增加：
const todayCounts = useMemo<StatCounts>(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayDocs = recentDocuments.filter(
    (doc) => new Date(doc.createdAt).getTime() >= today.getTime()
  );
  return {
    quotation:    todayDocs.filter(d => d.type === 'quotation').length,
    confirmation: todayDocs.filter(d => d.type === 'confirmation').length,
    invoice:      todayDocs.filter(d => d.type === 'invoice').length,
    packing:      todayDocs.filter(d => d.type === 'packing').length,
    purchase:     todayDocs.filter(d => d.type === 'purchase').length,
  };
}, [recentDocuments]);

// hook 返回值中加入 todayCounts
return { ..., todayCounts };
```

**方案 B（兜底）：如果 hook 改动复杂**

直接在 DashboardPage 用现有 `recentDocuments`（完整列表，timeFilter 不影响拉取范围）本地计算：

```tsx
// DashboardPage.tsx 内：
const todayCounts = useMemo<StatCounts>(() => {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const ts = start.getTime();
  const filter = (type: string) =>
    recentDocuments.filter(d => d.type === type && new Date(d.createdAt).getTime() >= ts).length;
  return { quotation: filter('quotation'), confirmation: filter('confirmation'),
           invoice: filter('invoice'), packing: filter('packing'), purchase: filter('purchase') };
}, [recentDocuments]);
```

### STEP 3：插入到 DashboardPage

**修改 `src/features/dashboard/app/DashboardPage.tsx`：**

```tsx
// 1. 新增 import
import { StatsCards } from '@/features/dashboard/components/StatsCards';

// 2. 取得 todayCounts（见 STEP 2，从 hook 或本地计算）

// 3. AppLayout 内容区，在 DashboardSuccessMessage 之后、DashboardModules 之前插入：
<AppLayout ...>
  <div className="w-full max-w-none px-2 sm:px-4 lg:px-6 xl:px-8 2xl:px-12 py-6">
    <DashboardSuccessMessage ... />
    <StatsCards counts={todayCounts} loading={!mounted || isPermissionLoading} />
    <DashboardModules ... />
    <DashboardDocuments ... />
  </div>
</AppLayout>
```

### 验证

```bash
npx tsc --noEmit
# 手动验证：
# 1. 5 张卡片显示，颜色与单据类型一致（蓝/绿/紫/青/橙）
# 2. 数字显示今日数量，切换最近文档时间筛选时卡片数字不变
# 3. 点击卡片跳转到 /history?type=xxx&time=today
# 4. 加载中显示 animate-pulse 灰色占位块
# 5. 深色模式颜色正常
```

---

## TASK-21 ✅：修复侧边栏权限过滤

**状态**：已完成

### 问题

`AppSidebar.tsx` 的 `visibleItems` 过滤逻辑在 `permissionUser` 为 `null`（权限尚未加载）时，`?? false` 导致所有带 `permissionKey` 的项全被过滤掉，只剩 `首页` 和 `AI邮件` 两项（无 `permissionKey`）。

### 修改文件

**`src/components/layout/AppSidebar.tsx`**

```tsx
// 新增 isLoading 订阅
const isLoading = usePermissionStore((state) => state.isLoading);

const visibleItems = NAV_ITEMS.filter((item) => {
  if (!item.permissionKey) return true;
  // 权限加载中或 user 未就绪时，显示全部项目（避免闪烁消失）
  if (isLoading || !permissionUser) return true;
  // 管理员看全部
  if (permissionUser.isAdmin) return true;
  const moduleId = PERMISSION_MODULE_MAP[item.permissionKey];
  if (!moduleId) return true;
  return permissionUser.permissions?.some(
    (permission) => permission.moduleId === moduleId && permission.canAccess
  ) ?? false;
});
```

---

## TASK-22 ✅：StatsCards 改为 slim 单行横排

**状态**：已完成

### 问题

原 StatsCards 用 `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5` 大卡布局，在宽屏实际渲染为 2-3 列，占据视口将近一半高度（约 340px），大数字"0"信息密度极低。

### 修改文件

**`src/features/dashboard/components/StatsCards.tsx`**（完全重写）

- 从大卡网格改为单行横排 slim bar，高度约 50px
- 最左侧「今日」标签，5 项用竖线分隔
- 每项：图标 + 名称（sm+可见）+ 数字（右对齐，加粗彩色）
- 点击跳转 `/history?type=xxx&time=today` 保持不变
- 加载中显示 animate-pulse 占位

---

## TASK-23 ✅：Dashboard 布局更新 CODEX_TASKS.md

**状态**：已完成

TASK-21 + TASK-22 完成后，Dashboard 首屏内容层级为：
1. slim 今日统计栏（~50px，一行）
2. 快速创建模块按钮（不变）
3. 搜索 + 近期单据（不需要滚动即可见）

无需改动 DashboardPage.tsx，布局顺序和 padding 已合理。

---

## 里程碑：数据管线完成（TASK-09 ~ TASK-15）

| 层次 | 实现 | 文件 |
|------|------|------|
| **写入** | localStorage 主写 + D1 fire-and-forget | `d1Sync.ts` |
| **迁移** | 管理员一键批量迁移历史数据 | `d1Migration.ts`, `D1MigrationPanel` |
| **API** | Document / Customer CRUD 全套 | `worker.ts`, `/api/documents`, `/api/customers` |
| **读取** | 登录时从 D1 拉取合并到 localStorage | `d1Pull.ts`, `useD1Sync.ts` |
| **鉴权** | Bearer token（Worker）+ NextAuth session（Next.js 代理）| `worker.ts`, `/api/admin/[...path]` |

---

## TASK-24 ✅：修复侧边栏「销售确认」点击后 Tab 不切换

**状态**：已完成

### 根本原因

`useInitQuotation.ts` 有两个 `useEffect`：

1. **Mount effect**（`[]` 依赖）：读 `?tab=` → 调 `setTab` → 有 `initialized.current` 守卫，只跑一次
2. **searchParams 监听 effect**（`[searchParams]` 依赖）：原本只做了 `window.history.replaceState`，**没有调 `setTab`**

当用户从侧边栏点击「销售确认」（导航到 `/quotation?tab=confirmation`）时，App Router 不会 unmount/remount QuotationPage，只触发 `searchParams` 变化。第 1 个 effect 不重跑（守卫），第 2 个 effect 重跑但没同步 store → `activeTab` 停留在 'quotation'。

### 修改文件

**`src/features/quotation/hooks/useInitQuotation.ts`**

```ts
// 修改前（只更新 URL，不同步 store）：
useEffect(() => {
  const tab = getTabFromSearchParams(searchParams || undefined);
  if (typeof window !== 'undefined' && tab) {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState(null, '', url.toString());
  }
}, [searchParams]);

// 修改后（先同步 store，再更新 URL）：
useEffect(() => {
  const tab = getTabFromSearchParams(searchParams || undefined);
  // 同步到 store（处理侧边栏 /quotation?tab=confirmation 导航）
  setTab(tab);
  // 更新URL参数以持久化tab状态
  if (typeof window !== 'undefined' && tab) {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState(null, '', url.toString());
  }
}, [searchParams, setTab]);
```

### 验证

```bash
npx eslint src/features/quotation/hooks/useInitQuotation.ts
# 期望：0 error（2 warnings 为既有问题，与本次无关）
# 手动验证：
# 1. 侧边栏点击「销售确认」→ 右侧内容切换到 Order Confirmation tab
# 2. 侧边栏点击「报价单」→ 右侧内容切换到 Quotation tab
# 3. 页面内点击 tab 按钮仍正常切换
```

---

## TASK-25：侧边栏加 Logo，用户菜单移至左下角

**优先级**：🟡 体验优化
**估时**：30 分钟
**风险**：低，纯 UI 重构，不影响业务逻辑

### 背景

当前问题：
1. Sidebar 左上角只有纯文字「LC App / MLUONET」，缺少 Logo 图标
2. 用户头像 / 菜单在 TopBar 右上角，TopBar 因此显得拥挤
3. 期望：Sidebar 左上角显示 Logo + 文字，用户菜单移到 Sidebar 左下角，TopBar 只保留面包屑

### 涉及文件

| 操作 | 文件 |
|------|------|
| **新建** | `src/components/layout/AppUserMenu.tsx` |
| **修改** | `src/components/layout/AppTopBar.tsx` |
| **修改** | `src/components/layout/AppSidebar.tsx` |
| **修改** | `src/components/layout/AppLayout.tsx` |
| **修改** | `src/components/layout/index.ts` |

---

### STEP 1：新建 `src/components/layout/AppUserMenu.tsx`

将 AppTopBar 中的用户下拉菜单完整提取为独立组件，增加 `placement` prop 控制弹出方向。

```tsx
'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronDown, ChevronUp, Download, LogOut, Palette, Settings, User,
} from 'lucide-react';
import { Avatar } from '@/components/Avatar';
import { PermissionRefreshButton } from '@/components/PermissionRefreshButton';
import { ThemeCompactToggle } from '@/components/ThemeToggle';
import { apiRequestWithError, API_ENDPOINTS } from '@/lib/api-config';
import { preloadManager } from '@/utils/preloadUtils';

export interface AppUserMenuProps {
  user: { name: string; isAdmin: boolean; email?: string | null };
  onLogout: () => void | Promise<void>;
  /** 'top-right' → 向下弹（TopBar）；'bottom-left' → 向上弹（Sidebar 底部）*/
  placement?: 'top-right' | 'bottom-left';
  className?: string;
}

export function AppUserMenu({ user, onLogout, placement = 'top-right', className = '' }: AppUserMenuProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState<'profile' | null>(null);
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadProgress, setPreloadProgress] = useState(0);
  const [preloadStage, setPreloadStage] = useState('');
  const [isPreloaded, setIsPreloaded] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const submenuHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  const checkPreloadStatus = useCallback(() => {
    const status = preloadManager.getPreloadStatus();
    setIsPreloading(status.isPreloading);
    setPreloadProgress(status.progress);
    setIsPreloaded(preloadManager.isPreloaded());
  }, []);

  const openProfileSubmenu = useCallback(() => {
    if (submenuHideTimerRef.current) { clearTimeout(submenuHideTimerRef.current); submenuHideTimerRef.current = null; }
    setOpenSubmenu('profile');
  }, []);

  const scheduleCloseProfileSubmenu = useCallback(() => {
    if (showChangePassword) return;
    if (submenuHideTimerRef.current) clearTimeout(submenuHideTimerRef.current);
    submenuHideTimerRef.current = setTimeout(() => setOpenSubmenu(null), 200);
  }, [showChangePassword]);

  useEffect(() => { return () => { if (submenuHideTimerRef.current) clearTimeout(submenuHideTimerRef.current); }; }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false); setOpenSubmenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    checkPreloadStatus();
    const interval = setInterval(checkPreloadStatus, 1000);
    return () => clearInterval(interval);
  }, [checkPreloadStatus]);

  useEffect(() => {
    const cb = (progress: number, stage?: string) => {
      setPreloadProgress(progress);
      if (stage) setPreloadStage(stage);
      if (progress > 0) setIsPreloading(true);
      if (progress >= 100) { setIsPreloading(false); setPreloadStage(''); setIsPreloaded(true); }
    };
    preloadManager.onProgress(cb);
    return () => preloadManager.offProgress(cb);
  }, []);

  const handleChangePassword = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordError(null); setPasswordSuccess(null);
    const { currentPassword, newPassword, confirmPassword } = passwordForm;
    if (!currentPassword || !newPassword || !confirmPassword) { setPasswordError('请完整填写所有字段'); return; }
    if (newPassword !== confirmPassword) { setPasswordError('新密码与确认密码不一致'); return; }
    if (newPassword.length < 6) { setPasswordError('新密码长度至少6位'); return; }
    setPasswordLoading(true);
    try {
      await apiRequestWithError(API_ENDPOINTS.USERS.CHANGE_PASSWORD, {
        method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }),
      });
      setPasswordSuccess('密码修改成功');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => { setShowChangePassword(false); setPasswordSuccess(null); }, 1500);
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : '修改密码失败');
    } finally { setPasswordLoading(false); }
  };

  const handlePreload = async () => {
    if (isPreloading) return;
    setIsPreloading(true); setPreloadProgress(0); setPreloadStage('准备中...');
    const cb = (progress: number, stage?: string) => { setPreloadProgress(progress); if (stage) setPreloadStage(stage); };
    preloadManager.onProgress(cb);
    try { await preloadManager.preloadAllResources(); setIsPreloaded(true); }
    catch (error) { console.error('预加载失败:', error); }
    finally { setIsPreloading(false); setPreloadStage(''); preloadManager.offProgress(cb); setShowDropdown(false); }
  };

  const isBottomLeft = placement === 'bottom-left';
  const dropdownPos = isBottomLeft ? 'bottom-full left-0 mb-2' : 'right-0 top-full mt-2';
  const submenuPos = isBottomLeft
    ? 'left-full top-0 ml-1'
    : 'right-0 top-full mt-1 sm:right-full sm:top-0 sm:mt-0 sm:-translate-x-[2px]';
  const ChevronIcon = isBottomLeft ? ChevronUp : ChevronDown;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setShowDropdown((v) => !v)}
        className={`flex items-center gap-2 rounded-md transition-colors focus:outline-none hover:bg-gray-100 dark:hover:bg-gray-800/50 ${isBottomLeft ? 'w-full px-2 py-2' : 'p-1.5'}`}
        aria-label="用户菜单"
      >
        <Avatar name={user.name} />
        {isBottomLeft && (
          <span className="min-w-0 flex-1 truncate text-left text-sm font-medium text-gray-700 dark:text-gray-200">
            {user.name}
          </span>
        )}
        <ChevronIcon className={`h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200 dark:text-gray-400 ${showDropdown ? 'rotate-180' : ''}`} />
      </button>

      {showDropdown && (
        <div
          className={`absolute z-[9999] w-auto min-w-[11rem] rounded-xl bg-white shadow-lg ring-1 ring-black ring-opacity-5 animate-in fade-in-0 zoom-in-95 dark:bg-[#2c2c2e] dark:ring-white/10 ${dropdownPos}`}
          onMouseLeave={scheduleCloseProfileSubmenu}
          onMouseEnter={() => { if (openSubmenu) openProfileSubmenu(); }}
        >
          <div className="relative py-1">
            <button
              type="button" onMouseEnter={openProfileSubmenu} onClick={openProfileSubmenu}
              className="relative flex w-full items-center px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800/50"
            >
              <User className="mr-2 h-4 w-4" />个人信息
              {openSubmenu === 'profile' && (
                <span className="absolute inset-y-0 right-full w-2" onMouseEnter={openProfileSubmenu} onMouseLeave={scheduleCloseProfileSubmenu} />
              )}
            </button>

            {openSubmenu === 'profile' && (
              <div
                onMouseEnter={openProfileSubmenu} onMouseLeave={scheduleCloseProfileSubmenu}
                className={`absolute w-auto min-w-[14rem] rounded-xl bg-white p-3 shadow-xl ring-1 ring-black/5 dark:bg-[#2c2c2e] dark:ring-white/10 ${submenuPos}`}
              >
                <div className="space-y-2.5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="max-w-[9.5rem] truncate text-sm font-semibold leading-tight text-gray-900 dark:text-white">{user.name}</span>
                      <button type="button" onClick={() => { setShowChangePassword((v) => !v); setPasswordError(null); setPasswordSuccess(null); }}
                        className="text-[11px] text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                        {showChangePassword ? '收起' : '修改密码'}
                      </button>
                    </div>
                    {user.email && <div className="truncate text-xs text-gray-500 dark:text-gray-400">{user.email}</div>}
                  </div>
                  <div className={showChangePassword ? 'block' : 'hidden'}>
                    <form onSubmit={handleChangePassword} className="space-y-2">
                      {passwordError && <div className="text-[11px] text-red-600 dark:text-red-400">{passwordError}</div>}
                      {passwordSuccess && <div className="text-[11px] text-green-600 dark:text-green-400">{passwordSuccess}</div>}
                      {(['currentPassword', 'newPassword', 'confirmPassword'] as const).map((field, i) => (
                        <input key={field} type="password"
                          placeholder={['当前密码', '新密码（至少6位）', '确认新密码'][i]}
                          value={passwordForm[field]}
                          onChange={(e) => setPasswordForm({ ...passwordForm, [field]: e.target.value })}
                          className="w-[12rem] rounded border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                          autoComplete={i === 0 ? 'current-password' : 'new-password'} required />
                      ))}
                      <div className="flex items-center gap-2">
                        <button type="submit" disabled={passwordLoading}
                          className={`rounded px-2.5 py-1 text-xs text-white ${passwordLoading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}>
                          {passwordLoading ? '提交中...' : '保存'}
                        </button>
                        <button type="button"
                          onClick={() => { setShowChangePassword(false); setPasswordError(null); setPasswordSuccess(null); setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); }}
                          className="rounded border border-gray-300 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800/50">
                          取消
                        </button>
                      </div>
                    </form>
                  </div>
                  <div className="border-t border-gray-200 pt-1 dark:border-gray-700">
                    <div className="mb-1.5 flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
                      <div className="flex items-center"><Palette className="mr-1.5 h-3.5 w-3.5" /><span>主题设置</span></div>
                      <ThemeCompactToggle />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="px-1 py-1"><PermissionRefreshButton /></div>

            <div className="relative">
              <button type="button" onClick={handlePreload} disabled={isPreloading}
                className={`relative flex w-full items-center overflow-hidden px-4 py-2 text-sm transition-colors duration-200 ${isPreloading ? 'cursor-not-allowed text-gray-400 dark:text-gray-500' : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800/50'}`}>
                {isPreloading && <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-blue-100 transition-all duration-300 ease-out dark:from-blue-900/10 dark:to-blue-800/20" />}
                {isPreloading && <div className="absolute inset-0 bg-gradient-to-r from-blue-200 to-blue-300 transition-all duration-300 ease-out dark:from-blue-700/40 dark:to-blue-600/50" style={{ width: `${Math.max(0, Math.min(100, preloadProgress))}%` }} />}
                {isPreloading && <div className="absolute inset-0 border-r-2 border-blue-400 transition-all duration-300 ease-out dark:border-blue-300" style={{ width: `${Math.max(0, Math.min(100, preloadProgress))}%` }} />}
                <div className="relative z-10 flex w-full items-center">
                  <Download className={`mr-2 h-4 w-4 ${isPreloading ? 'animate-pulse' : ''}`} />
                  <span className="flex-1 text-left">
                    {isPreloading ? (<span className="flex flex-col"><span className="text-sm font-medium">预加载中 {preloadProgress}%</span>{preloadStage && <span className="truncate text-xs text-gray-500 dark:text-gray-400">{preloadStage}</span>}</span>)
                      : isPreloaded ? '资源已预加载 (100%)' : '预加载资源'}
                  </span>
                </div>
              </button>
            </div>

            {user.isAdmin && (
              <button type="button" onClick={() => { router.push('/admin'); setShowDropdown(false); }}
                className="flex w-full items-center px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800/50">
                <Settings className="mr-2 h-4 w-4" />管理后台
              </button>
            )}

            <button type="button" onClick={() => { onLogout(); setShowDropdown(false); }}
              className="flex w-full items-center px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800/50">
              <LogOut className="mr-2 h-4 w-4" />退出登录
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

### STEP 2：替换 `src/components/layout/AppTopBar.tsx`

移除所有用户下拉相关 state / handler / JSX，只保留汉堡菜单 + 移动端 Logo + 面包屑。

```tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight, Menu } from 'lucide-react';
import { LOGO_CONFIG } from '@/lib/logo-config';

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface AppTopBarProps {
  breadcrumbs: BreadcrumbItem[];
  onMenuClick?: () => void;
  // user / onLogout 保留签名兼容性，移至 AppSidebar 底部
  user?: { name: string; isAdmin: boolean; email?: string | null };
  onLogout?: () => void | Promise<void>;
}

export function AppTopBar({ breadcrumbs, onMenuClick }: AppTopBarProps) {
  const currentBreadcrumb = breadcrumbs[breadcrumbs.length - 1];

  return (
    <header className="sticky top-0 z-40 h-14 bg-white shadow-sm dark:bg-[#1c1c1e] dark:shadow-gray-800/30">
      <div className="flex h-full items-center gap-3 px-3 sm:px-4 lg:px-6">
        {onMenuClick && (
          <button type="button" onClick={onMenuClick}
            className="rounded-md p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800/50 dark:hover:text-white lg:hidden"
            aria-label="打开导航">
            <Menu className="h-5 w-5" />
          </button>
        )}
        {/* 移动端 Logo（桌面端 Logo 在 Sidebar 头部）*/}
        <Image src={LOGO_CONFIG.web.logo} alt="LC App Logo" width={28} height={28} priority className="shrink-0 object-contain lg:hidden" />

        <nav className="min-w-0 flex-1" aria-label="当前位置">
          <ol className="hidden min-w-0 items-center gap-1 text-sm text-gray-500 dark:text-gray-400 md:flex">
            {breadcrumbs.map((item, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1">
                  {item.path && !isLast ? (
                    <Link href={item.path} className="truncate transition-colors hover:text-gray-900 dark:hover:text-white">{item.label}</Link>
                  ) : (
                    <span className={`truncate ${isLast ? 'font-medium text-gray-900 dark:text-white' : ''}`}>{item.label}</span>
                  )}
                  {!isLast && <ChevronRight className="h-4 w-4 shrink-0" />}
                </li>
              );
            })}
          </ol>
          <div className="truncate text-sm font-medium text-gray-900 dark:text-white md:hidden">
            {currentBreadcrumb?.label || 'LC App'}
          </div>
        </nav>
      </div>
    </header>
  );
}
```

---

### STEP 3：替换 `src/components/layout/AppSidebar.tsx`

头部：Logo 图片 + "LC App" 文字；底部：用户菜单区块。

```tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Archive, FileCheck, FileText, LayoutDashboard, Mail, Package, Receipt, ShoppingCart, Users, X, type LucideIcon } from 'lucide-react';
import { usePermissionStore } from '@/lib/permissions';
import { LOGO_CONFIG } from '@/lib/logo-config';
import { AppUserMenu } from './AppUserMenu';

export interface SidebarItem {
  id: string; label: string; path: string; icon: LucideIcon;
  dividerBefore?: boolean; permissionKey?: string;
}

interface AppSidebarProps {
  className?: string; onClose?: () => void;
  user?: { name: string; isAdmin: boolean; email?: string | null };
  onLogout?: () => void | Promise<void>;
}

export const NAV_ITEMS: SidebarItem[] = [
  { id: 'dashboard', label: '首页', path: '/dashboard', icon: LayoutDashboard },
  { id: 'quotation', label: '报价单', path: '/quotation', icon: FileText, dividerBefore: true, permissionKey: 'canCreateQuotation' },
  { id: 'confirmation', label: '销售确认', path: '/quotation?tab=confirmation', icon: FileCheck, permissionKey: 'canCreateConfirmation' },
  { id: 'packing', label: '箱单发票', path: '/packing', icon: Package, permissionKey: 'canCreatePacking' },
  { id: 'invoice', label: '财务发票', path: '/invoice', icon: Receipt, permissionKey: 'canCreateInvoice' },
  { id: 'purchase', label: '采购订单', path: '/purchase', icon: ShoppingCart, permissionKey: 'canCreatePurchase' },
  { id: 'history', label: '单据历史', path: '/history', icon: Archive, dividerBefore: true, permissionKey: 'canViewHistory' },
  { id: 'customer', label: '客户管理', path: '/customer', icon: Users, permissionKey: 'canManageCustomers' },
  { id: 'mail', label: 'AI邮件', path: '/mail', icon: Mail, dividerBefore: true },
];

const PERMISSION_MODULE_MAP: Record<string, string> = {
  canCreateQuotation: 'quotation', canCreateConfirmation: 'quotation', canCreatePacking: 'packing',
  canCreateInvoice: 'invoice', canCreatePurchase: 'purchase', canViewHistory: 'history', canManageCustomers: 'customer',
};

function isItemActive(item: SidebarItem, pathname: string, tab: string | null) {
  if (item.id === 'confirmation') return pathname.startsWith('/quotation') && tab === 'confirmation';
  if (item.id === 'quotation') return pathname.startsWith('/quotation') && tab !== 'confirmation';
  return pathname.startsWith(item.path.split('?')[0]);
}

export function AppSidebar({ className = '', onClose, user, onLogout }: AppSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
  const permissionUser = usePermissionStore((state) => state.user);
  const isLoading = usePermissionStore((state) => state.isLoading);

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.permissionKey) return true;
    if (isLoading || !permissionUser) return true;
    if (permissionUser.isAdmin) return true;
    const moduleId = PERMISSION_MODULE_MAP[item.permissionKey];
    if (!moduleId) return true;
    return permissionUser.permissions?.some((p) => p.moduleId === moduleId && p.canAccess) ?? false;
  });

  return (
    <aside className={`fixed left-0 top-0 z-30 flex h-screen w-[200px] flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-[#1c1c1e] ${className}`}>
      {/* 头部：Logo + 应用名 */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-700">
        <div className="flex min-w-0 items-center gap-2.5">
          <Image src={LOGO_CONFIG.web.logo} alt="LC App" width={28} height={28} priority className="shrink-0 object-contain" />
          <span className="truncate text-sm font-semibold text-gray-900 dark:text-white">LC App</span>
        </div>
        {onClose && (
          <button type="button" onClick={onClose}
            className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-gray-200 lg:hidden"
            aria-label="关闭导航">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* 导航列表 */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = isItemActive(item, pathname, tab);
          return (
            <div key={item.id} className={item.dividerBefore ? 'mt-1 border-t border-gray-200 pt-1 dark:border-gray-700' : undefined}>
              <Link href={item.path} onClick={onClose}
                className={`flex h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors ${active ? 'bg-blue-50 font-medium text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800/50'}`}>
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            </div>
          );
        })}
      </nav>

      {/* 底部：用户菜单 */}
      {user && onLogout && (
        <div className="shrink-0 border-t border-gray-200 px-3 py-3 dark:border-gray-700">
          <AppUserMenu user={user} onLogout={onLogout} placement="bottom-left" />
        </div>
      )}
    </aside>
  );
}
```

---

### STEP 4：修改 `src/components/layout/AppLayout.tsx`

**把 `user` / `onLogout` 透传给 `AppSidebar`，`AppTopBar` 不再需要这两个 prop。**

找到：
```tsx
      <Suspense fallback={null}>
        <AppSidebar className="hidden lg:flex" />
      </Suspense>
```
替换为：
```tsx
      <Suspense fallback={null}>
        <AppSidebar className="hidden lg:flex" user={user} onLogout={onLogout} />
      </Suspense>
```

找到：
```tsx
          <Suspense fallback={null}>
            <AppSidebar
              className="z-50 lg:hidden"
              onClose={() => setSidebarOpen(false)}
            />
          </Suspense>
```
替换为：
```tsx
          <Suspense fallback={null}>
            <AppSidebar
              className="z-50 lg:hidden"
              onClose={() => setSidebarOpen(false)}
              user={user}
              onLogout={onLogout}
            />
          </Suspense>
```

找到：
```tsx
        <AppTopBar
          breadcrumbs={breadcrumbs}
          user={user}
          onLogout={onLogout}
          onMenuClick={() => setSidebarOpen(true)}
        />
```
替换为：
```tsx
        <AppTopBar
          breadcrumbs={breadcrumbs}
          onMenuClick={() => setSidebarOpen(true)}
        />
```

---

### STEP 5：修改 `src/components/layout/index.ts`

在末尾追加一行：
```ts
export { AppUserMenu, type AppUserMenuProps } from './AppUserMenu';
```

---

### 验证

```bash
npx eslint src/components/layout/AppUserMenu.tsx \
           src/components/layout/AppTopBar.tsx \
           src/components/layout/AppSidebar.tsx \
           src/components/layout/AppLayout.tsx
# 期望：0 error

npx tsc --noEmit 2>&1 | grep -v "e2e\|playwright"
# 期望：0 error（只有既有 e2e 的 @playwright/test 缺包警告）

# 手动验证：
# 1. 桌面端 Sidebar 左上角：Logo 图片 + "LC App" 文字
# 2. Sidebar 左下角：头像 + 用户名 + 向上弹出菜单（含退出、修改密码、主题、管理后台）
# 3. TopBar 只保留面包屑，不再显示右上角头像
# 4. 移动端：点汉堡 → 侧边抽屉出现 → 底部有用户菜单
```

---

## TASK-26 ✅：管理后台迁移到 AppLayout 框架

**优先级**：🟡 中
**状态**：已完成

### 背景

`/admin` 页面原本使用独立的 `AdminHeader` + `Footer` + 全屏 `min-h-screen` 外壳，与其他功能页的 AppLayout（侧边栏 + TopBar）风格不一致。

### 改动文件

**`src/features/admin/app/AdminPage.tsx`**
- 顶部加 `'use client';`
- 移除 `AdminHeader`、`Footer`、`signOut` 导入
- 新增 `AppLayout` from `@/components/layout` 和 `useAppUser` from `@/hooks/useAppUser`
- 组件内加 `const { user, handleLogout } = useAppUser();`，删除原 `handleLogout` 函数
- 早返回（loading / 权限不足 / error）保持原有 `min-h-screen` 全屏样式不变
- 主 `return` 改为：
  ```tsx
  <AppLayout
    breadcrumbs={[
      { label: '首页', path: '/dashboard' },
      { label: '管理后台' },
    ]}
    user={user}
    onLogout={handleLogout}
  >
    {/* 内容区 */}
  </AppLayout>
  ```

**`src/app/admin/users/[id]/page.tsx`**
- 同样迁移到 AppLayout
- 面包屑：首页 → 管理后台 → 用户详情
- 移除独立的"返回"按钮（面包屑导航已覆盖）
- useEffect 内 `setTimeout` 改为带清理的写法（`clearTimeout`）

### 验证

```bash
npx eslint src/features/admin/app/AdminPage.tsx src/app/admin/users/\[id\]/page.tsx
# 期望：0 errors（1 warning：pre-existing any，可忽略）
```

手动验证：访问 `/admin`，确认左侧显示侧边栏、顶部面包屑为「首页 / 管理后台」、用户菜单在左下角。

---

## TASK-27 ✅：TopBar 加入快捷工具（计算器 / 日期计算器）

**状态**：已完成

### 背景

原 `Footer.tsx` 中部有计算器（蓝）和日期计算器（绿）两个工具图标；Footer 已无任何页面引用，工具移至 TopBar 右侧统一呈现。

### 改动文件

- **新建** `src/components/layout/AppQuickTools.tsx`：自管理 showCalculator / showDateCalculator state + refs，渲染两个图标按钮及弹窗
- **修改** `AppTopBar.tsx`：在面包屑 `<nav>` 右侧加 `<AppQuickTools />`
- **修改** `src/components/layout/index.ts`：导出 `AppQuickTools`

### 验证

```bash
npx eslint src/components/layout/AppQuickTools.tsx src/components/layout/AppTopBar.tsx
```

---

## TASK-28 ✅：全面清理废弃文件 + CustomerDetailPage 迁移 AppLayout

**状态**：已完成（文件删除需手动执行 git rm）

### 背景

随着 TASK-25～27 的推进，以下文件已无任何 import 引用，属于死代码：

| 文件 | 废弃原因 |
|------|----------|
| `src/components/Footer.tsx` | TASK-26 后无页面引用 |
| `src/components/Header.tsx` | 早期遗留，已被 AppLayout 体系替代 |
| `src/components/admin/AdminHeader.tsx` | TASK-26 后无引用 |
| `src/features/quotation/app/QuotationPageRefactored.tsx` | 内部草稿，无路由挂载 |

另外 `CustomerDetailPage` 仍使用独立 `min-h-screen` 布局，已补充迁移。

### 手动执行（git rm）

```bash
git rm src/components/Footer.tsx
git rm src/components/Header.tsx
git rm src/components/admin/AdminHeader.tsx
git rm src/features/quotation/app/QuotationPageRefactored.tsx
git commit -m "chore: remove unused Footer, Header, AdminHeader, QuotationPageRefactored"
```

### 代码改动（已写入）

**`src/features/customer/app/CustomerDetailPage.tsx`**
- 移除独立 header div + ArrowLeft 返回按钮
- 改用 `AppLayout`，面包屑：首页 → 客户管理 → {customerName}
- 使用 `useAppUser` 获取 user / handleLogout

### 验证

```bash
npx eslint src/features/customer/app/CustomerDetailPage.tsx
# 0 errors

# 确认废弃文件无引用
grep -r "Footer\|AdminHeader\|QuotationPageRefactored" src --include="*.tsx" --include="*.ts" \
  | grep -v "Footer.tsx\|AdminHeader.tsx\|QuotationPageRefactored.tsx"
# 期望：无输出
```

---

## TASK-29：客户管理扩展联系人字段 + 询价人下拉选取

**优先级**：🟠 高（功能扩展）
**估时**：30 分钟
**风险**：低。类型扩展向后兼容（新字段均为可选），询价人字段降级为自由输入

### 背景

客户管理（`src/features/customer`）现有 `Customer` 类型缺少公司简称和多联系人支持。
询报价登记的「询价人」字段目前是自由文本，需改为从客户管理动态选取，值格式为 `公司简称-联系人简称`（如 `LC-Roger`）。

客户管理 localStorage key 为 `customer_management`，存储 `Customer[]`。

---

### 改动 1：扩展 Customer 类型

**文件**：`src/features/customer/types/index.ts`

在 `Customer` 接口的 `company: string;` 行**之后**插入：

```typescript
  companyShortName?: string;   // 公司简称（用于询价人标识）
  contact1ShortName?: string;  // 联系人1简称（对应现有 name 字段）
  contact2Name?: string;       // 联系人2姓名
  contact2ShortName?: string;  // 联系人2简称
  contact2Phone?: string;      // 联系人2电话
  contact2Email?: string;      // 联系人2邮箱
```

在 `CustomerFormData` 接口的 `company: string;` 行**之后**插入**完全相同**的六行（类型保持 `?: string`）。

同时确认客户保存逻辑（`src/features/customer/hooks/useCustomerActions.ts` 的 `saveCustomer`）会把这些新字段透传进 `Customer` 对象；否则表单可输入但不会持久化，询价人下拉也无法读取。

---

### 改动 2：CustomerForm 组件新增字段

**文件**：`src/features/customer/components/CustomerForm.tsx`

在「公司」字段的 `</div>` 关闭标签之后、按钮组 `<div className="flex justify-end` 之前，插入：

```tsx
      {/* 公司简称 */}
      <div>
        <label htmlFor="companyShortName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          公司简称
        </label>
        <input
          type="text"
          id="companyShortName"
          value={formData.companyShortName ?? ''}
          onChange={(e) => onInputChange('companyShortName', e.target.value)}
          className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          placeholder="如：LC"
        />
      </div>

      {/* 联系人1简称 */}
      <div>
        <label htmlFor="contact1ShortName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          联系人1简称
          <span className="ml-1 text-xs text-gray-400 font-normal">（对应上方「名称」）</span>
        </label>
        <input
          type="text"
          id="contact1ShortName"
          value={formData.contact1ShortName ?? ''}
          onChange={(e) => onInputChange('contact1ShortName', e.target.value)}
          className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          placeholder="如：Roger"
        />
      </div>

      {/* 联系人2 */}
      <fieldset className="border border-gray-200 dark:border-gray-600 rounded-md p-3 space-y-3">
        <legend className="text-sm font-medium text-gray-600 dark:text-gray-300 px-1">
          联系人2（可选）
        </legend>
        <div>
          <label htmlFor="contact2Name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            姓名
          </label>
          <input
            type="text"
            id="contact2Name"
            value={formData.contact2Name ?? ''}
            onChange={(e) => onInputChange('contact2Name', e.target.value)}
            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label htmlFor="contact2ShortName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            简称
          </label>
          <input
            type="text"
            id="contact2ShortName"
            value={formData.contact2ShortName ?? ''}
            onChange={(e) => onInputChange('contact2ShortName', e.target.value)}
            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="如：Mary"
          />
        </div>
        <div>
          <label htmlFor="contact2Phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            电话
          </label>
          <input
            type="tel"
            id="contact2Phone"
            value={formData.contact2Phone ?? ''}
            onChange={(e) => onInputChange('contact2Phone', e.target.value)}
            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label htmlFor="contact2Email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            邮箱
          </label>
          <input
            type="email"
            id="contact2Email"
            value={formData.contact2Email ?? ''}
            onChange={(e) => onInputChange('contact2Email', e.target.value)}
            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </fieldset>
```

---

### 改动 3：更新 useCustomerForm 初始状态

**文件**：`src/features/customer/hooks/useCustomerForm.ts`

找到初始化 `CustomerFormData` 的对象字面量（含 `company: ''` 的那处），在 `company: '',` 之后追加：

```typescript
  companyShortName: '',
  contact1ShortName: '',
  contact2Name: '',
  contact2ShortName: '',
  contact2Phone: '',
  contact2Email: '',
```

如果该初始值对象出现多处（reset / initialValue 等），逐一追加相同内容。

---

### 改动 4：新建询价人选项工具函数

**新建文件**：`src/features/inquiry/utils/inquirerOptions.ts`

```typescript
import { getLocalStorageJSON } from '@/utils/safeLocalStorage';
import type { Customer } from '@/features/customer/types';

/**
 * 从客户管理 localStorage 实时读取询价人选项。
 * 仅包含同时配置了「公司简称」和至少一个「联系人简称」的客户。
 * 返回格式：公司简称-联系人简称，如 ["LC-Roger", "LC-Mary"]
 */
export function getInquirerOptions(): string[] {
  if (typeof window === 'undefined') return [];

  const customers = getLocalStorageJSON<Customer[]>('customer_management', []);
  const options: string[] = [];

  for (const c of customers) {
    if (!c.companyShortName) continue;
    if (c.contact1ShortName) {
      options.push(`${c.companyShortName}-${c.contact1ShortName}`);
    }
    if (c.contact2ShortName) {
      options.push(`${c.companyShortName}-${c.contact2ShortName}`);
    }
  }

  return [...new Set(options)].sort();
}
```

---

### 改动 5：InquiryFormModal 询价人改为 datalist 选择

**文件**：`src/features/inquiry/components/InquiryFormModal.tsx`

**步骤 5a** — 在文件顶部 import 区（现有 import 列表末尾）追加：

```typescript
import { getInquirerOptions } from '../utils/inquirerOptions';
```

**步骤 5b** — 在组件内的 `useState` 声明区，在现有 state 之后追加：

```typescript
const [inquirerOptions, setInquirerOptions] = useState<string[]>([]);
```

**步骤 5c** — 在初始化基本字段的 `useEffect`（依赖 `[existingNos, isOpen, mode, record]`）里，在 `setLocalQuoted(...)` 那行之后、`}, [...]` 结束之前，插入：

```typescript
    setInquirerOptions(getInquirerOptions());
```

**步骤 5d** — 找到询价人 `<input>`：

```tsx
              <input
                value={inquirer}
                onChange={(e) => setInquirer(e.target.value)}
                className={FIELD_CLS}
                placeholder="LC-Roger"
                required
              />
```

替换为：

```tsx
              <input
                list="inquirer-datalist"
                value={inquirer}
                onChange={(e) => setInquirer(e.target.value)}
                className={FIELD_CLS}
                placeholder="LC-Roger（可从客户管理选取）"
                required
              />
              {inquirerOptions.length > 0 && (
                <datalist id="inquirer-datalist">
                  {inquirerOptions.map((opt) => (
                    <option key={opt} value={opt} />
                  ))}
                </datalist>
              )}
```

---

### 验证

```bash
npx tsc --noEmit
# 预期：无 inquiry 或 customer 相关类型错误

# 功能验证步骤：
# 1. 进入「客户管理」→ 新增客户
#    - 公司（公司名称）：Luo Company
#    - 公司简称：LC
#    - 名称（联系人1）：Roger
#    - 联系人1简称：Roger
#    → 保存
# 2. 进入「询报价登记」→「新增询价」
#    - 点击「询价人」输入框，下拉出现 "LC-Roger"
#    - 选取后值正确保存
# 3. 客户无简称时不出现在下拉
# 4. 联系人2有简称时产生额外选项
# 5. 仍可手动输入不在列表中的值（datalist 不限制自由输入）
```

### 提交

```bash
git add \
  src/features/customer/types/index.ts \
  src/features/customer/components/CustomerForm.tsx \
  src/features/customer/hooks/useCustomerForm.ts \
  src/features/inquiry/utils/inquirerOptions.ts \
  src/features/inquiry/components/InquiryFormModal.tsx
git commit -m "feat: 客户管理新增公司简称和联系人2字段，询价人改为下拉选取（公司简称-联系人简称）"
```

---

## TASK-30：询报价权限控制 + D1 共享数据

**优先级**：🔴 高（功能完整性）
**估时**：60 分钟
**风险**：中。Phase A 极低风险；Phase B 新增 Worker 路由和代理，不改动现有路由

### 背景与问题

询报价登记（`/inquiry`）目前存在三个问题：

1. **侧边栏权限绑定错误**：`AppSidebar.tsx` 中 `inquiry` 条目的 `permissionKey` 误设为 `canCreatePurchase`，导致侧边栏显示/隐藏错误地联动采购单权限。
2. **管理员无法分配权限**：`usePermissions.ts` 的 `MODULE_PERMISSIONS` 列表中没有 `inquiry`，管理员在 `/admin` 面板中看不到询报价权限项，无法为用户开启。
3. **数据不共享**：询报价记录存在 localStorage（按设备/账号隔离），有权限的其他用户无法看到。目标是：**有 `inquiry` 权限的用户看到全部记录，与创建者无关**。

### 解决方案

- **Phase A（权限门控，3 个文件）**：修正侧边栏映射 + 管理员面板 + 页面守卫
- **Phase B（共享 D1 数据，5 个文件）**：新增 Worker 路由 `/api/inquiry`（存储时 `user_id='_shared_'`，查询时不过滤 user_id） + Next.js 代理 + Service 层双写 + 页面启动时从 D1 拉取合并

---

### Phase A：权限门控

#### A-1 修改 `src/features/admin/hooks/usePermissions.ts`

在 `MODULE_PERMISSIONS` 数组中，**在 `purchase` 之后、`history` 之前**插入：

```ts
{ id: 'inquiry', name: '询报价登记', icon: '🔍' },
```

修改后数组为：
```ts
export const MODULE_PERMISSIONS = [
  { id: 'quotation',  name: '报价单',    icon: '📋' },
  { id: 'packing',   name: '装箱单',    icon: '📦' },
  { id: 'invoice',   name: '发票',      icon: '🧾' },
  { id: 'purchase',  name: '采购单',    icon: '🛒' },
  { id: 'inquiry',   name: '询报价登记', icon: '🔍' },
  { id: 'history',   name: '历史记录',  icon: '📚' },
  { id: 'customer',  name: '客户管理',  icon: '👥' },
  { id: 'ai-email',  name: 'AI邮件',   icon: '🤖' },
];
```

#### A-2 修改 `src/components/layout/AppSidebar.tsx`

**改动 1**：修正 `inquiry` 条目的 `permissionKey`：

找到：
```ts
  {
    id: 'inquiry',
    label: '询报价登记',
    path: '/inquiry',
    icon: Search,
    permissionKey: 'canCreatePurchase',
  },
```

替换为：
```ts
  {
    id: 'inquiry',
    label: '询报价登记',
    path: '/inquiry',
    icon: Search,
    permissionKey: 'canViewInquiry',
  },
```

**改动 2**：在 `PERMISSION_MODULE_MAP` 中添加映射：

找到：
```ts
const PERMISSION_MODULE_MAP: Record<string, string> = {
  canCreateQuotation: 'quotation',
  canCreateConfirmation: 'quotation',
  canCreatePacking: 'packing',
  canCreateInvoice: 'invoice',
  canCreatePurchase: 'purchase',
  canViewHistory: 'history',
  canManageCustomers: 'customer',
};
```

替换为：
```ts
const PERMISSION_MODULE_MAP: Record<string, string> = {
  canCreateQuotation: 'quotation',
  canCreateConfirmation: 'quotation',
  canCreatePacking: 'packing',
  canCreateInvoice: 'invoice',
  canCreatePurchase: 'purchase',
  canViewInquiry: 'inquiry',
  canViewHistory: 'history',
  canManageCustomers: 'customer',
};
```

#### A-3 修改 `src/features/inquiry/app/InquiryPage.tsx`

在文件顶部新增 import：
```ts
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
```

在 `InquiryPage` 组件函数内、现有 state 声明之前插入权限守卫逻辑：

```tsx
export function InquiryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { user, handleLogout } = useAppUser();
  // ... 其余现有 state 声明 ...

  // ── 权限守卫 ──────────────────────────────────────────
  const [permissionChecked, setPermissionChecked] = useState(false);
  const hasInquiryAccess = useMemo(() => {
    if (!session?.user) return false;
    if (session.user.isAdmin) return true;
    return (session.user.permissions ?? []).some(
      (p: { moduleId: string; canAccess: boolean }) =>
        p.moduleId === 'inquiry' && p.canAccess
    );
  }, [session]);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') { router.push('/'); return; }
    setPermissionChecked(true);
  }, [status, router]);

  // 权限检查未完成时显示 loading
  if (!permissionChecked || status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
      </div>
    );
  }

  // 无权限时显示 403
  if (permissionChecked && !hasInquiryAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-black">
        <div className="rounded-xl bg-white p-8 text-center shadow-lg dark:bg-gray-900">
          <div className="mb-4 text-6xl">🚫</div>
          <h1 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">权限不足</h1>
          <p className="mb-6 text-gray-600 dark:text-gray-400">您没有询报价登记的访问权限</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  // ── 以下为原有 return JSX ────────────────────────────
```

同时在文件顶部加入：
```ts
import { useMemo } from 'react';  // 如果未导入
```

**Phase A 验证：**
```bash
npx tsc --noEmit
# 进入管理员面板，确认"询报价登记"权限项出现在用户权限列表中
# 为测试账号开启 inquiry 权限，确认侧边栏正确显示/隐藏
# 直接访问 /inquiry（无权限时）确认出现 403 页面
```

**Phase A 提交：**
```bash
git add src/features/admin/hooks/usePermissions.ts \
        src/components/layout/AppSidebar.tsx \
        src/features/inquiry/app/InquiryPage.tsx
git commit -m "feat(inquiry): 添加权限门控（管理员面板 + 侧边栏映射 + 页面守卫）"
```

---

### Phase B：D1 共享数据

#### 数据模型设计

询报价记录复用现有 `Document` 表，约定：

| Document 字段 | 询报价含义 |
|---------------|-----------|
| `id` | `InquiryRecord.id` |
| `user_id` | 固定为 `'_shared_'`（表示全团队共享）|
| `type` | 固定为 `'inquiry'` |
| `doc_no` | `InquiryRecord.inquiryNo` |
| `customer_name` | `InquiryRecord.customerNo` |
| `total_amount` | 固定为 `0` |
| `currency` | 固定为 `'CNY'` |
| `data` | `JSON.stringify(InquiryRecord)`（完整记录） |

查询时 `WHERE type = 'inquiry'`，**不过滤 user_id**，取全部记录。

#### B-1 修改 `src/worker.ts`

在现有路由分发区（`if (path.startsWith('/api/admin'))`… 之类的块）**之前**，插入询报价路由：

```ts
// ── 询报价路由（共享数据，不过滤 user_id）────────────────
if (path.startsWith('/api/inquiry')) {
  return handleInquiryRequest(request, path, env);
}
```

在文件末尾（其他 handle 函数之后）新增：

```ts
async function handleInquiryRequest(
  request: Request,
  path: string,
  env: Env
): Promise<Response> {
  const d1 = new D1Client(env.USERS_DB);

  // GET /api/inquiry — 返回全部询报价记录
  if (request.method === 'GET' && path === '/api/inquiry') {
    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get('limit') || '500'), 500);
    const offset = Number(url.searchParams.get('offset') || '0');

    const result = await env.USERS_DB.prepare(
      `SELECT * FROM Document WHERE type = 'inquiry' ORDER BY doc_no DESC LIMIT ? OFFSET ?`
    ).bind(limit, offset).all();

    const records = (result.results || []).map((row: any) => ({
      id: row.id,
      inquiryNo: row.doc_no,
      customerNo: row.customer_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      ...(() => { try { return JSON.parse(row.data || '{}'); } catch { return {}; } })(),
    }));

    return jsonResponse({ records, total: records.length });
  }

  // POST /api/inquiry — 新增或替换
  if (request.method === 'POST' && path === '/api/inquiry') {
    const body = await request.json() as any;
    const id = body.id;
    const now = new Date().toISOString();
    const data = JSON.stringify(body);

    await env.USERS_DB.prepare(
      `INSERT OR REPLACE INTO Document
       (id, user_id, type, doc_no, customer_name, total_amount, currency, status, data, created_at, updated_at)
       VALUES (?, '_shared_', 'inquiry', ?, ?, 0, 'CNY', 'active', ?, ?, ?)`
    ).bind(
      id,
      body.inquiryNo ?? '',
      body.customerNo ?? '',
      data,
      body.createdAt ?? now,
      now
    ).run();

    return jsonResponse({ success: true, id });
  }

  // PUT /api/inquiry/:id — 更新
  const putMatch = path.match(/^\/api\/inquiry\/([^/]+)$/);
  if (request.method === 'PUT' && putMatch) {
    const id = putMatch[1];
    const body = await request.json() as any;
    const now = new Date().toISOString();
    const data = JSON.stringify(body);

    await env.USERS_DB.prepare(
      `UPDATE Document SET doc_no=?, customer_name=?, data=?, updated_at=?
       WHERE id=? AND type='inquiry'`
    ).bind(
      body.inquiryNo ?? '',
      body.customerNo ?? '',
      data,
      now,
      id
    ).run();

    return jsonResponse({ success: true, id });
  }

  // DELETE /api/inquiry/:id — 删除
  const delMatch = path.match(/^\/api\/inquiry\/([^/]+)$/);
  if (request.method === 'DELETE' && delMatch) {
    const id = delMatch[1];
    await env.USERS_DB.prepare(
      `DELETE FROM Document WHERE id=? AND type='inquiry'`
    ).bind(id).run();
    return jsonResponse({ success: true });
  }

  return jsonResponse({ error: 'Not Found' }, 404);
}
```

> 注意：`jsonResponse` 是 worker.ts 中已有的辅助函数，直接复用。

#### B-2 新增 `src/app/api/inquiry/[[...path]]/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const WORKER_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://udb.luocompany.net';

function getWorkerHeaders(): HeadersInit {
  const token = process.env.API_TOKEN;
  if (!token) throw new Error('API_TOKEN env var not set');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

async function proxyInquiryRequest(
  request: NextRequest,
  pathSegments: string[] = []
): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  // 检查 inquiry 权限（管理员直接通过）
  const isAdmin = session.user.isAdmin === true;
  const hasInquiry = isAdmin || (session.user.permissions ?? []).some(
    (p: any) => p.moduleId === 'inquiry' && p.canAccess
  );
  if (!hasInquiry) {
    return NextResponse.json({ error: '无询报价权限' }, { status: 403 });
  }

  const url = new URL(request.url);
  const workerPath = pathSegments.length > 0
    ? `/api/inquiry/${pathSegments.join('/')}`
    : '/api/inquiry';
  const workerUrl = `${WORKER_BASE}${workerPath}${url.search}`;

  let body: string | undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD' && request.method !== 'DELETE') {
    body = await request.text();
  }

  let workerResp: Response;
  try {
    workerResp = await fetch(workerUrl, {
      method: request.method,
      headers: getWorkerHeaders(),
      body,
    });
  } catch (error) {
    console.error('Inquiry proxy request failed:', error);
    return NextResponse.json({ error: 'Worker 请求失败' }, { status: 502 });
  }

  const data = await workerResp.json();
  return NextResponse.json(data, { status: workerResp.status });
}

type RouteParams = { params: { path?: string[] } };

export async function GET(req: NextRequest, { params }: RouteParams) {
  return proxyInquiryRequest(req, params.path || []);
}
export async function POST(req: NextRequest, { params }: RouteParams) {
  return proxyInquiryRequest(req, params.path || []);
}
export async function PUT(req: NextRequest, { params }: RouteParams) {
  return proxyInquiryRequest(req, params.path || []);
}
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  return proxyInquiryRequest(req, params.path || []);
}
```

#### B-3 修改 `src/features/inquiry/services/inquiry.service.ts`

在现有 localStorage CRUD 之外，新增 D1 同步方法：

```ts
import { getLocalStorageJSON, setLocalStorage } from '@/utils/safeLocalStorage';
import type { InquiryRecord } from '../types';

const STORAGE_KEY = 'inquiry_records';
const API_BASE = '/api/inquiry';

export const inquiryService = {
  // ── localStorage CRUD（原有，不变）──────────────────────
  getAll(): InquiryRecord[] {
    return getLocalStorageJSON<InquiryRecord[]>(STORAGE_KEY, []);
  },
  save(records: InquiryRecord[]): void {
    setLocalStorage(STORAGE_KEY, records);
  },
  add(record: InquiryRecord): InquiryRecord[] {
    const records = this.getAll();
    const updated = [...records, record];
    this.save(updated);
    return updated;
  },
  update(id: string, patch: Partial<InquiryRecord>): InquiryRecord[] {
    const records = this.getAll().map((record) =>
      record.id === id
        ? { ...record, ...patch, updatedAt: new Date().toISOString() }
        : record
    );
    this.save(records);
    return records;
  },
  remove(id: string): InquiryRecord[] {
    const records = this.getAll().filter((record) => record.id !== id);
    this.save(records);
    return records;
  },

  // ── D1 同步（fire-and-forget）──────────────────────────
  /** 拉取 D1 全量询报价记录（用于登录/页面加载后合并到 localStorage）*/
  async pullFromD1(): Promise<InquiryRecord[]> {
    try {
      const res = await fetch(`${API_BASE}?limit=500`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data.records) ? data.records : [];
    } catch {
      return [];
    }
  },

  /** 写入单条记录到 D1（fire-and-forget，不 await）*/
  syncToD1(record: InquiryRecord): void {
    void (async () => {
      try {
        await fetch(API_BASE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record),
        });
      } catch { /* silent */ }
    })();
  },

  /** 更新 D1 中的记录（fire-and-forget）*/
  updateInD1(record: InquiryRecord): void {
    void (async () => {
      try {
        await fetch(`${API_BASE}/${record.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record),
        });
      } catch { /* silent */ }
    })();
  },

  /** 从 D1 删除（fire-and-forget）*/
  deleteFromD1(id: string): void {
    void (async () => {
      try {
        await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
      } catch { /* silent */ }
    })();
  },

  /** 合并 D1 记录到 localStorage（updated_at 更新的以 D1 为准）*/
  mergeFromD1(d1Records: InquiryRecord[]): InquiryRecord[] {
    const local = this.getAll();
    const localMap = new Map(local.map((r) => [r.id, r]));

    for (const d1 of d1Records) {
      const loc = localMap.get(d1.id);
      if (!loc || new Date(d1.updatedAt) > new Date(loc.updatedAt)) {
        localMap.set(d1.id, d1);
      }
    }

    const merged = Array.from(localMap.values()).sort(
      (a, b) => b.inquiryNo.localeCompare(a.inquiryNo)
    );
    this.save(merged);
    return merged;
  },
};
```

#### B-4 修改 `src/features/inquiry/state/inquiry.store.ts`

在每个写操作（`addRecord`、`updateRecord`、`removeRecord`、`replaceStatuses`）完成 localStorage 写入后，追加 D1 fire-and-forget 调用。

在 store 顶部 import 中追加：
```ts
import { inquiryService } from '../services/inquiry.service';
```
（如已有则跳过，但需确认用的是同一 service）

**`addRecord` 修改**：在 `set({ records: updated });` 之后追加：
```ts
inquiryService.syncToD1(record);
```

**`updateRecord` 修改**：在 `set({ records: updated });` 之后追加：
```ts
const updatedRecord = updated.find((r) => r.id === id);
if (updatedRecord) inquiryService.updateInD1(updatedRecord);
```

**`removeRecord` 修改**：在 `set({ records: updated });` 之后追加：
```ts
inquiryService.deleteFromD1(id);
```

**`replaceStatuses` 修改**：在 `set({ records });` 之后追加：
```ts
const target = records.find((r) => r.id === recordId);
if (target) inquiryService.updateInD1(target);
```

**各供应商级别操作**（`addSupplier`、`updateSupplier`、`removeSupplier`、`addQuotedStatus`、`updateQuotedStatus`、`removeQuotedStatus`）：
在每个操作的 `set({ records });` 之后追加：
```ts
const target = records.find((r) => r.id === recordId);
if (target) inquiryService.updateInD1(target);
```

#### B-5 修改 `src/features/inquiry/app/InquiryPage.tsx`

在 `useEffect(() => { useInquiryStore.getState().init(); }, []);` 之后，新增 D1 拉取 effect：

```tsx
// ── D1 拉取（页面加载后合并共享数据）─────────────────────
useEffect(() => {
  if (!hasInquiryAccess) return; // 权限守卫通过后才拉取
  let cancelled = false;
  inquiryService.pullFromD1().then((d1Records) => {
    if (cancelled || d1Records.length === 0) return;
    const merged = inquiryService.mergeFromD1(d1Records);
    useInquiryStore.setState({ records: merged });
  });
  return () => { cancelled = true; };
}, [hasInquiryAccess]);
```

在文件顶部新增 import（如未导入）：
```ts
import { inquiryService } from '../services/inquiry.service';
```

---

### 验证步骤

```bash
# 1. 类型检查
npx tsc --noEmit

# 2. 部署 Worker（新增 /api/inquiry 路由）
npx wrangler deploy

# 3. 浏览器验证：
#    a. 管理员进入 /admin → 用户权限弹窗 → 确认"询报价登记"权限项出现
#    b. 为用户 A 开启 inquiry 权限，为用户 B 不开启
#    c. 用户 A 登录 → 侧边栏显示"询报价登记" → 可访问 /inquiry
#    d. 用户 B 登录 → 侧边栏隐藏"询报价登记" → 直接访问 /inquiry 显示权限不足
#    e. 用户 A 创建一条询报价记录
#    f. 同样有 inquiry 权限的用户 C 登录 → 进入 /inquiry → 能看到用户 A 创建的记录
```

### 提交

```bash
# Phase A 已单独提交（见上）

# Phase B
git add src/worker.ts \
        src/app/api/inquiry/ \
        src/features/inquiry/services/inquiry.service.ts \
        src/features/inquiry/state/inquiry.store.ts \
        src/features/inquiry/app/InquiryPage.tsx
git commit -m "feat(inquiry): D1 共享数据（全员可见 + fire-and-forget 双写）"
```

---

## TASK-31：客户表单布局优化（分区 + 双列 + 联系人2折叠）

**优先级**：🟡 中（体验优化）
**估时**：30 分钟
**风险**：低。纯 UI 重构，不改任何字段、类型定义或数据逻辑

### 背景与问题

当前 `CustomerForm.tsx` 把所有字段垂直堆叠，导致：
1. 表单过长，需大量滚动
2. 公司信息和联系人信息无视觉分区
3. 联系人2 永远展开占用大量空间（通常不填）
4. "名称"字段指向联系人1姓名，但紧跟在"地址"后面，语义位置混乱
5. 供应商/收货人的表单和客户完全一样，但它们不需要简称字段

### 目标设计

#### 客户（entityType === 'customers'）

```
── 公司信息 ──────────────────────────────────────────
公司全称 *（2/3 宽）    简称（1/3 宽，如：LC）
地址（全宽）

── 联系人1 ───────────────────────────────────────────
姓名 *（1/2 宽）        简称（1/2 宽，如：Roger）
邮箱（1/2 宽）          电话（1/2 宽）

▶ 联系人2（可选，默认折叠，点击展开）
  姓名（1/2 宽）        简称（1/2 宽，如：Mary）
  邮箱（1/2 宽）        电话（1/2 宽）
─────────────────────────────────────────────────────
                              [ 取消 ]  [ 保存 ]
```

#### 供应商 / 收货人（entityType !== 'customers'）

```
公司名称 *（全宽）
地址（全宽）
联系人姓名 *（1/2 宽）  邮箱（1/2 宽）
电话（全宽）
─────────────────────────────────────────────────────
                              [ 取消 ]  [ 保存 ]
```

### 涉及文件

| 文件 | 改动说明 |
|------|---------|
| `src/features/customer/components/CustomerForm.tsx` | 主要重构 |
| `src/features/customer/components/CustomerModal.tsx` | 内容区加 `overflow-y-auto max-h-[85vh]` 防小屏截断 |

### 具体实现（`CustomerForm.tsx`）

#### 1. 新增 showContact2 状态

```tsx
const [showContact2, setShowContact2] = useState(false);
```

初始化逻辑：编辑模式下如果 `formData.contact2Name` 或 `formData.contact2ShortName` 有值，则初始展开：

```tsx
// 初始化时检查
useState(() => {
  if (formData.contact2Name || formData.contact2ShortName) {
    setShowContact2(true);
  }
});
```

或用 `useEffect`:
```tsx
useEffect(() => {
  if (formData.contact2Name || formData.contact2ShortName) {
    setShowContact2(true);
  }
}, []); // 仅挂载时
```

#### 2. 客户表单 JSX 结构

```tsx
{/* ── 公司信息 ── */}
<div>
  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">公司信息</p>
  <div className="grid grid-cols-3 gap-3 mb-3">
    <div className="col-span-2">
      <label>公司全称 <span className="text-red-500">*</span></label>
      <input field="company" required />
    </div>
    <div>
      <label>简称</label>
      <input field="companyShortName" placeholder="如：LC" />
    </div>
  </div>
  <div>
    <label>地址</label>
    <input field="address" />
  </div>
</div>

{/* ── 联系人1 ── */}
<div>
  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">联系人1</p>
  <div className="grid grid-cols-2 gap-3 mb-3">
    <div>
      <label>姓名 <span className="text-red-500">*</span></label>
      <input field="name" required />
    </div>
    <div>
      <label>简称</label>
      <input field="contact1ShortName" placeholder="如：Roger" />
    </div>
  </div>
  <div className="grid grid-cols-2 gap-3">
    <div>
      <label>邮箱</label>
      <input field="email" type="email" />
    </div>
    <div>
      <label>电话</label>
      <input field="phone" type="tel" />
    </div>
  </div>
</div>

{/* ── 联系人2 折叠 ── */}
<div>
  <button
    type="button"
    onClick={() => setShowContact2(v => !v)}
    className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 py-1"
  >
    <span>{showContact2 ? '▼' : '▶'}</span>
    <span>联系人2（可选）</span>
  </button>
  {showContact2 && (
    <div className="mt-2 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label>姓名</label>
          <input field="contact2Name" />
        </div>
        <div>
          <label>简称</label>
          <input field="contact2ShortName" placeholder="如：Mary" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label>邮箱</label>
          <input field="contact2Email" type="email" />
        </div>
        <div>
          <label>电话</label>
          <input field="contact2Phone" type="tel" />
        </div>
      </div>
    </div>
  )}
</div>
```

#### 3. 供应商/收货人 JSX 结构

```tsx
{/* 当 entityType !== 'customers' 时 */}
<div>
  <label>公司名称 <span className="text-red-500">*</span></label>
  <input field="company" required />
</div>
<div>
  <label>地址</label>
  <input field="address" />
</div>
<div className="grid grid-cols-2 gap-3">
  <div>
    <label>联系人姓名 <span className="text-red-500">*</span></label>
    <input field="name" required />
  </div>
  <div>
    <label>邮箱</label>
    <input field="email" type="email" />
  </div>
</div>
<div>
  <label>电话</label>
  <input field="phone" type="tel" />
</div>
```

#### 4. `CustomerModal.tsx` 改动

```tsx
// 内容容器加 overflow-y-auto max-h-[85vh]
<div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md
                overflow-y-auto max-h-[85vh]">
```

### 样式规范

- 分区标题：`text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2`
- 所有 input：复用现有 className（`mt-1 block w-full border border-gray-300 ...`）
- 按钮行：保持 `flex justify-end space-x-2` 不变
- 暗色模式：标签用 `dark:text-gray-300`，分区标题用 `dark:text-gray-500`

### 验证

```bash
npx tsc --noEmit
npm run lint -- --file src/features/customer/components/CustomerForm.tsx

# 手动检查：
# 1. 添加客户：字段分区正确，联系人2 默认折叠，展开后字段正常
# 2. 编辑有联系人2数据的客户：联系人2 自动展开
# 3. 添加供应商/收货人：只显示简化表单
# 4. 暗色模式外观正常
```

### 提交

```bash
git add src/features/customer/components/CustomerForm.tsx \
        src/features/customer/components/CustomerModal.tsx
git commit -m "feat(customer): 表单布局优化（分区 + 双列网格 + 联系人2折叠）"
```

---

## TASK-32：修复询报价共享数据——本地记录推送 D1

**优先级**：🔴 高（Bug 修复）
**估时**：15 分钟
**风险**：极低。只加一个推送步骤，不改任何写入逻辑

### 问题根因

两个 bug 叠加，导致有权限的用户看不到其他人的询报价记录：

**Bug 1（`InquiryPage.tsx` 第 51 行）**
```ts
if (cancelled || d1Records.length === 0) return;
```
D1 为空时直接跳过所有同步，本地已有的数据永远推不上去。

**Bug 2（缺少推送步骤）**
页面加载只执行 `pullFromD1`，从未把本地存量记录推到 D1。
TASK-30 上线前创建的记录只存在于创建者的 localStorage，其他用户拉取时 D1 里没有，看不到。

### 修复方案

**双向同步**：加载时先拉 D1，把本地比 D1 新（或 D1 里没有）的记录推上去，再合并显示。

### 涉及文件

| 文件 | 改动 |
|------|------|
| `src/features/inquiry/services/inquiry.service.ts` | 新增 `pushLocalToD1(d1Records)` 方法 |
| `src/features/inquiry/app/InquiryPage.tsx` | 去掉 `length === 0` 判断，加推送调用 |

---

### 改动一：`inquiry.service.ts`

在 `mergeFromD1` 方法之后、对象字面量结束的 `}` 之前，新增：

```ts
/**
 * 把本地比 D1 新（或 D1 里没有）的记录推送到 D1（fire-and-forget）。
 * 在 pullFromD1 之后调用，确保存量数据对所有有权限的用户可见。
 */
pushLocalToD1(d1Records: InquiryRecord[]): void {
  const d1Map = new Map(d1Records.map((r) => [r.id, r]));
  const local = this.getAll();
  for (const localRecord of local) {
    const d1Record = d1Map.get(localRecord.id);
    if (!d1Record) {
      // D1 里不存在，直接推
      this.syncToD1(localRecord);
    } else {
      const localTime = new Date(localRecord.updatedAt).getTime();
      const d1Time = new Date(d1Record.updatedAt).getTime();
      if (Number.isFinite(localTime) && localTime > d1Time) {
        // 本地更新，覆盖 D1
        this.updateInD1(localRecord);
      }
    }
  }
},
```

---

### 改动二：`InquiryPage.tsx`

找到以下代码块（权限通过后的 D1 同步 effect）：

```ts
// 原来
void inquiryService.pullFromD1().then((d1Records) => {
  if (cancelled || d1Records.length === 0) return;
  const merged = inquiryService.mergeFromD1(d1Records);
  useInquiryStore.setState({ records: merged });
});
```

替换为：

```ts
// 修复后
void inquiryService.pullFromD1().then((d1Records) => {
  if (cancelled) return;
  // 把本地存量记录推送到 D1（D1 没有的 或 本地更新的）
  inquiryService.pushLocalToD1(d1Records);
  // 合并 D1 记录到本地显示（D1 更新则以 D1 为准）
  const merged = inquiryService.mergeFromD1(d1Records);
  useInquiryStore.setState({ records: merged });
});
```

变更要点：
1. 删除 `d1Records.length === 0` 的 return（D1 为空也要执行推送）
2. 在 `mergeFromD1` 之前调用 `inquiryService.pushLocalToD1(d1Records)`

---

### 验证

```bash
npx tsc --noEmit
npm run lint -- --file src/features/inquiry/services/inquiry.service.ts \
               --file src/features/inquiry/app/InquiryPage.tsx

# 手动验证：
# 1. 用户 A（有 inquiry 权限）打开 /inquiry → 看到自己的记录，本地记录自动推送到 D1
# 2. 用户 B（有 inquiry 权限）打开 /inquiry → 能看到用户 A 的记录
# 3. 用户 B 编辑一条记录 → 用户 A 刷新页面后也能看到修改
# 4. 无 inquiry 权限的用户 → 显示 403，无法访问
```

### 提交

```bash
git add src/features/inquiry/services/inquiry.service.ts \
        src/features/inquiry/app/InquiryPage.tsx
git commit -m "fix(inquiry): 双向同步修复——页面加载时推送本地存量记录到 D1"
```

---

## TASK-33：修复客户数据 D1 字段丢失（简称/联系人2 不同步）

**优先级**：🔴 高（Bug 修复，影响多设备同步）
**估时**：15 分钟
**风险**：极低。只改两处字段映射，不动任何类型或 UI

### 根因

**Bug A — `customerService.ts` 双写 payload 不完整**

`saveCustomer` 调用 `d1SyncCustomer` 时 `data` 只包含 `company`：
```ts
// 当前（错误）
data: { company: customer.company },
```

导致 `companyShortName`、`contact1ShortName`、`contact2Name/ShortName/Phone/Email`
全部只存在 localStorage，永远不会写入 D1。

**Bug B — `d1Pull.ts` `d1CustomerToLocal` 恢复字段不完整**

```ts
// 当前（错误）
const company = typeof c.data.company === 'string' ? c.data.company : '';
return {
  id: c.id, name: c.name, email: c.email || '',
  phone: c.phone || '', address: c.address || '',
  company,              // ← 只还原 company，其余字段全丢
  createdAt: c.created_at, updatedAt: c.updated_at,
};
```

换设备登录时，D1 拉取的客户数据被 `d1CustomerToLocal` 截断，简称和联系人2信息丢失。

---

### 涉及文件

| 文件 | 改动说明 |
|------|---------|
| `src/features/customer/services/customerService.ts` | `saveCustomer` 中 `data` payload 补全所有字段 |
| `src/utils/d1Pull.ts` | `d1CustomerToLocal` 改为 spread `c.data`，还原全部字段 |

---

### 改动一：`customerService.ts`

找到 `saveCustomer` 函数中的 `d1SyncCustomer` 调用，将 `data` 字段从：
```ts
data: { company: customer.company },
```
改为：
```ts
data: {
  company: customer.company,
  companyShortName: customer.companyShortName,
  contact1ShortName: customer.contact1ShortName,
  contact2Name: customer.contact2Name,
  contact2ShortName: customer.contact2ShortName,
  contact2Phone: customer.contact2Phone,
  contact2Email: customer.contact2Email,
},
```

---

### 改动二：`d1Pull.ts`

找到 `d1CustomerToLocal` 函数，替换整个函数体：

```ts
// 修复前
function d1CustomerToLocal(c: D1Customer, _type: 'customer' | 'supplier' | 'consignee') {
  const company = typeof c.data.company === 'string' ? c.data.company : '';
  return {
    id: c.id,
    name: c.name,
    email: c.email || '',
    phone: c.phone || '',
    address: c.address || '',
    company,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
}

// 修复后
function d1CustomerToLocal(c: D1Customer, _type: 'customer' | 'supplier' | 'consignee') {
  return {
    id: c.id,
    name: c.name,
    email: c.email || '',
    phone: c.phone || '',
    address: c.address || '',
    // 展开 data JSON 中存储的全部字段
    // （company、companyShortName、contact1ShortName、contact2*、未来的 contacts[] 等）
    ...c.data,
    // D1 表的时间戳列优先（比 data JSON 里的更可靠）
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
}
```

---

### 验证

```bash
npx tsc --noEmit
npm run lint -- --file src/features/customer/services/customerService.ts \
               --file src/utils/d1Pull.ts

# 手动验证（需要两台设备或两个浏览器）：
# 1. 设备 A：编辑一个客户，填入公司简称、联系人1简称、联系人2信息 → 保存
# 2. 设备 B（同账号登录）：进入客户管理 → 该客户的简称和联系人2信息应完整显示
```

### 提交

```bash
git add src/features/customer/services/customerService.ts \
        src/utils/d1Pull.ts
git commit -m "fix(customer): D1 双写补全简称/联系人字段，d1Pull 还原全部 data 字段"
```

---

## TASK-34：客户联系人改为动态多人数组

**优先级**：🟡 中（新功能，TASK-33 完成后再执行）
**估时**：60 分钟
**风险**：中。需修改类型 + 表单 UI + 双写 + 拉取 + 询价人选项，需充分测试

### 背景

当前联系人2硬编码（`contact2Name/ShortName/Phone/Email`），无法添加第3个联系人。
目标：支持任意数量的附加联系人，存储为 `contacts: Contact[]` 数组。

联系人1（主联系人）保持原有字段（`name` / `email` / `phone` / `contact1ShortName`），
D1 `Customer` 表的 `name/email/phone` 列继续存联系人1信息，兼容旧数据。

### 新类型设计

#### `src/features/customer/types/index.ts`

新增 `Contact` 接口：
```ts
export interface Contact {
  id: string;         // nanoid 或 crypto.randomUUID()
  name: string;       // 姓名（必填）
  shortName?: string; // 简称（可选）
  email?: string;
  phone?: string;
}
```

更新 `Customer`：
```ts
export interface Customer {
  id: string;
  name: string;             // 联系人1全名（对应 D1 name 列）
  email: string;            // 联系人1邮箱
  phone: string;            // 联系人1电话
  address: string;
  company: string;
  companyShortName?: string;
  contact1ShortName?: string;
  contacts?: Contact[];     // 新增：附加联系人（联系人2、3、4…）
  // 以下字段保留用于旧数据迁移（不再写入新记录）
  contact2Name?: string;
  contact2ShortName?: string;
  contact2Phone?: string;
  contact2Email?: string;
  createdAt: string;
  updatedAt: string;
}
```

更新 `CustomerFormData`：
```ts
export interface CustomerFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  company: string;
  companyShortName?: string;
  contact1ShortName?: string;
  contacts: Contact[];   // 替代 contact2* 字段
}
```

---

### 各文件改动要点

#### `src/features/customer/hooks/useCustomerForm.ts`

- `initialFormData` 的 `contacts` 默认为 `[]`，删除 `contact2*` 字段
- `setFormDataForEdit` 从 editingCustomer 读取时：
  - 若有 `contacts[]` → 直接使用
  - 若无 `contacts[]` 但有旧 `contact2Name` → 迁移为 `contacts[{ id, name: contact2Name, shortName: contact2ShortName, phone: contact2Phone, email: contact2Email }]`

#### `src/features/customer/hooks/useCustomerActions.ts`

`saveCustomer` 构建 `newCustomer` 时：
```ts
const newCustomer: Customer = {
  // ... 现有字段
  contacts: customerData.contacts,   // 替代 contact2*
  // 不再写 contact2Name/contact2ShortName/contact2Phone/contact2Email
};
```

#### `src/features/customer/services/customerService.ts`

`d1SyncCustomer` 的 `data` payload：
```ts
data: {
  company: customer.company,
  companyShortName: customer.companyShortName,
  contact1ShortName: customer.contact1ShortName,
  contacts: customer.contacts ?? [],
  // 不再写 contact2* 字段
},
```

#### `src/features/customer/components/CustomerForm.tsx`

替换"联系人2（可选）"固定 fieldset，改为动态列表：

```tsx
{/* 附加联系人（动态，仅客户）*/}
{entityType === 'customers' && (
  <div className="space-y-3">
    {contacts.map((contact, index) => (
      <div key={contact.id} className="rounded-md border border-gray-200 dark:border-gray-600 p-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
            联系人{index + 2}
          </span>
          <button type="button" onClick={() => removeContact(contact.id)}
            className="text-xs text-red-400 hover:text-red-600">删除</button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label>姓名</label><input value={contact.name} onChange={...} /></div>
          <div><label>简称</label><input value={contact.shortName ?? ''} onChange={...} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label>邮箱</label><input type="email" value={contact.email ?? ''} onChange={...} /></div>
          <div><label>电话</label><input type="tel" value={contact.phone ?? ''} onChange={...} /></div>
        </div>
      </div>
    ))}
    <button type="button" onClick={addContact}
      className="w-full py-2 text-sm text-blue-600 border border-dashed border-blue-300 rounded-md hover:bg-blue-50">
      + 添加联系人
    </button>
  </div>
)}
```

联系人 state 在 `CustomerForm.tsx` 内部管理（`useState<Contact[]>`），
通过新增 prop `onContactsChange: (contacts: Contact[]) => void` 向上传递变更。

`CustomerModal.tsx` 增加 `onContactsChange` prop 透传。
`CustomerPage.tsx` / `useCustomerForm.ts` 在 `formData` 里维护 `contacts`。

#### `src/utils/d1Pull.ts`

`d1CustomerToLocal` 已在 TASK-33 修复（spread `c.data`），新增迁移逻辑：

```ts
// 在 spread c.data 之后，对旧数据做 contact2* → contacts[] 迁移
const result = { id: c.id, name: c.name, email: c.email || '', ...c.data, createdAt: c.created_at, updatedAt: c.updated_at };

// 旧数据迁移：contact2* → contacts[]
if (!result.contacts && result.contact2Name) {
  result.contacts = [{
    id: crypto.randomUUID(),
    name: result.contact2Name as string,
    shortName: result.contact2ShortName as string | undefined,
    phone: result.contact2Phone as string | undefined,
    email: result.contact2Email as string | undefined,
  }];
}
return result;
```

#### `src/features/inquiry/utils/inquirerOptions.ts`

同时支持旧格式和新格式：
```ts
for (const c of customers) {
  if (!c.companyShortName) continue;
  // 联系人1
  if (c.contact1ShortName) options.push(`${c.companyShortName}-${c.contact1ShortName}`);
  // 新格式：contacts[]
  for (const contact of c.contacts ?? []) {
    if (contact.shortName) options.push(`${c.companyShortName}-${contact.shortName}`);
  }
  // 旧格式兼容（没有 contacts[] 才读 contact2ShortName）
  if (!c.contacts && c.contact2ShortName) {
    options.push(`${c.companyShortName}-${c.contact2ShortName}`);
  }
}
```

---

### 验证

```bash
npx tsc --noEmit
npm run lint -- --file src/features/customer/types/index.ts \
               --file src/features/customer/hooks/useCustomerForm.ts \
               --file src/features/customer/hooks/useCustomerActions.ts \
               --file src/features/customer/services/customerService.ts \
               --file src/features/customer/components/CustomerForm.tsx \
               --file src/utils/d1Pull.ts \
               --file src/features/inquiry/utils/inquirerOptions.ts

# 手动验证：
# 1. 添加新客户 → 填写公司简称 → 添加3个联系人 → 保存 → 数据显示正确
# 2. 编辑有旧 contact2* 数据的客户 → 自动迁移为 contacts[0] 显示
# 3. 询报价模块"询价人"下拉 → 所有联系人简称均出现
# 4. 换设备登录 → 联系人数据完整同步
```

### 提交

```bash
git add src/features/customer/types/index.ts \
        src/features/customer/hooks/useCustomerForm.ts \
        src/features/customer/hooks/useCustomerActions.ts \
        src/features/customer/services/customerService.ts \
        src/features/customer/components/CustomerForm.tsx \
        src/utils/d1Pull.ts \
        src/features/inquiry/utils/inquirerOptions.ts
git commit -m "feat(customer): 联系人改为动态数组，兼容旧 contact2* 数据迁移"
```

---

## TASK-35 ✅：Worker 部署 + CI 自动化

### 背景

`src/worker.ts` 的 `/api/inquiry` 路由（TASK-19B）从未被部署到线上 Cloudflare Worker。
线上 Worker 仍是旧版本，导致所有 GET/POST `/api/inquiry` 请求均返回 404：
- `pullFromD1` 静默返回 `[]` → 无法拉取他人记录
- `syncToD1` 静默失败 → 新增记录只存 localStorage，换设备后消失

CI 中也缺少 wrangler deploy 步骤，每次修改 Worker 都要手动部署。

### 目标

1. 立即部署当前 Worker 到 Cloudflare
2. CI 在每次 push main 后自动部署 Worker

### 执行步骤

#### Phase A：立即部署（终端手动执行）

```bash
cd /Users/roger/website/luonet-vercel
npx wrangler deploy
```

验证：
```bash
# 检查 /api/inquiry 路由是否正常（需替换 token）
curl -s -H "Authorization: Bearer <API_TOKEN>" https://udb.luocompany.net/api/inquiry | head -c 200
```

#### Phase B：CI 自动化（已由 Claude 写入 .github/workflows/ci.yml）

新增 `deploy-worker` job：
- `needs: check`（lint+build 通过后才部署）
- 使用 `CLOUDFLARE_API_TOKEN` secret（需在 GitHub repo 的 Settings → Secrets 中添加）
- `e2e` job 改为 `needs: [check, deploy-worker]`（Worker 部署后再跑 E2E）

GitHub Secret 配置：
- 进入 Cloudflare Dashboard → My Profile → API Tokens
- 创建 Token，权限：`Cloudflare Workers:Edit`
- 在 GitHub Repo → Settings → Secrets → Actions → New secret
- Name: `CLOUDFLARE_API_TOKEN`，Value: 上面的 token

### 提交

```bash
git add .github/workflows/ci.yml
git commit -m "ci: 新增 Cloudflare Worker 自动部署步骤"
```

### 验证

1. 打开询报价登记页 → 添加一条记录 → 浏览器 DevTools Network 确认 POST `/api/inquiry` 返回 201
2. 换另一台设备/账号登录 → 刷新页面 → 能看到该记录

---

## TASK-36 ✅：修复询报价编辑双写竞态 + Worker PUT 改为 upsert

### 背景与根因

编辑询报价记录时，`InquiryFormModal.handleSubmit` 会**连续触发两次 `updateInD1`**：

```
replaceStatuses(record.id, suppliers, quoted)   // PUT 1：旧描述 + 新供应商状态
onSubmit(payload, ...)                           // PUT 2：新描述 + 旧供应商状态（被忽略）
```

两个 PUT 几乎同时进入 Next.js proxy，proxy 内部 `await getServerSession()` 是异步的，
PUT 2（新描述）可能先到达 D1，PUT 1（旧描述）后到，最终 D1 里残留旧值。

附加问题：Worker PUT 用 `UPDATE ... WHERE id = ?`，如果记录不在 D1（如部署前创建的旧数据），
`changes === 0` → 返回 404 → 客户端静默忽略 → 数据永远只存在 localStorage。

### 修复目标

1. **编辑时只触发一次 D1 写入**（合并 basic + suppliers + quotedStatuses）
2. **Worker PUT 改为 upsert**（`INSERT OR REPLACE`），与 POST 保持一致

---

### Phase A：前端合并写入（3 个文件）

#### 1. `src/features/inquiry/state/inquiry.store.ts`

将 `updateRecord` 的 patch 类型从 `Partial<InquiryBasicInput>` 改为 `Partial<InquiryRecord>`：

```ts
// Before:
updateRecord: (id: string, patch: Partial<InquiryBasicInput>) => void;

// After:
updateRecord: (id: string, patch: Partial<InquiryRecord>) => void;
```

实现体无需改动（已接受 `Partial<InquiryRecord>`）。

#### 2. `src/features/inquiry/components/InquiryFormModal.tsx`

删除 `handleSubmit` 里单独的 `replaceStatuses` 调用：

```ts
// Before:
const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
  // ...
  if (mode === 'edit' && record) {
    replaceStatuses(record.id, localSuppliers, localQuoted);  // ← 删除这两行
  }
  onSubmit(payload, localSuppliers, localQuoted);
};

// After:
const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
  // ...
  onSubmit(payload, localSuppliers, localQuoted);
};
```

同时删除 `replaceStatuses` 的 useInquiryStore 订阅（第 80 行）：
```ts
// 删除：
const replaceStatuses = useInquiryStore((state) => state.replaceStatuses);
```

#### 3. `src/features/inquiry/app/InquiryPage.tsx`

`handleSubmit` 编辑分支改为一次性写入 basic + statuses：

```ts
// Before:
if (editingRecord) {
  updateRecordBasic(editingRecord.id, values);
}

// After:
if (editingRecord) {
  updateRecord(editingRecord.id, {
    ...values,
    supplierStatuses: suppliers,
    quotedStatuses: quoted,
  });
}
```

顶部 hooks 改为：
```ts
// Before:
const { createRecord, updateRecordBasic, removeRecord } = useInquiryActions();

// After：去掉 updateRecordBasic，改用 store 的 updateRecord
const { createRecord, removeRecord } = useInquiryActions();
const updateRecord = useInquiryStore((state) => state.updateRecord);
```

---

### Phase B：Worker PUT 改为 upsert（`src/worker.ts`）

找到 `handleInquiryRequest` 的 PUT 处理段（约 1408 行），将 `UPDATE` 改为 `INSERT OR REPLACE`：

```ts
// Before:
const result = await env.USERS_DB.prepare(`
  UPDATE Document
  SET doc_no = ?, customer_name = ?, data = ?, updated_at = ?
  WHERE id = ? AND type = 'inquiry'
`).bind(
  inquiryNo,
  customerNo,
  data,
  now,
  id
).run();

if (result.meta.changes === 0) return jsonResponse({ error: '询报价记录不存在' }, 404);
return jsonResponse({ success: true, id });

// After:
const existingRow = await env.USERS_DB.prepare(
  `SELECT created_at FROM Document WHERE id = ? AND type = 'inquiry'`
).bind(id).first<{ created_at: string }>();

const createdAt = existingRow?.created_at ?? now;

await env.USERS_DB.prepare(`
  INSERT OR REPLACE INTO Document
    (id, user_id, type, doc_no, customer_name, total_amount, currency, status, data, created_at, updated_at)
  VALUES (?, '_shared_', 'inquiry', ?, ?, 0, 'CNY', 'active', ?, ?, ?)
`).bind(
  id,
  inquiryNo,
  customerNo,
  data,
  createdAt,
  now
).run();

return jsonResponse({ success: true, id });
```

> 注：先 SELECT `created_at` 是为了保留原始创建时间；若记录不存在则用 `now` 作为创建时间（等同于新建）。

---

### 验证步骤

```bash
npx tsc --noEmit
npm run lint -- --file src/features/inquiry/state/inquiry.store.ts \
               --file src/features/inquiry/components/InquiryFormModal.tsx \
               --file src/features/inquiry/app/InquiryPage.tsx \
               --file src/worker.ts
```

功能验证：
1. 新增询报价 → 打开 DevTools Network → POST `/api/inquiry` 返回 201
2. 编辑记录（修改描述 + 供应商状态）→ Network 只出现**一次** PUT → 返回 200
3. 页面刷新 → 描述和供应商状态均为编辑后的值
4. 换设备/账号登录 → 刷新 → 看到最新内容

### 提交

```bash
# Phase A：前端
git add src/features/inquiry/state/inquiry.store.ts \
        src/features/inquiry/components/InquiryFormModal.tsx \
        src/features/inquiry/app/InquiryPage.tsx
git commit -m "fix(inquiry): 合并编辑时双写为单次原子 updateInD1"

# Phase B：Worker
git add src/worker.ts
git commit -m "fix(worker): 询报价 PUT 改为 upsert，消除 0-changes 静默失败"

# 部署 Worker
npx wrangler deploy
```

---

## TASK-37 ✅：修复询报价删除——跨端同步软删除

### 背景

**TASK-36** 之后发现删除记录只在本机有效，其他设备刷新后记录仍然存在。

根本原因：
1. `mergeFromD1` 只会新增/更新记录，从不移除本地已有记录
2. 旧的硬删除（D1 DELETE）让 D1 彻底失去该记录，其他端无法感知删除事件
3. `mergeFromD1` 见到"D1 没有但本地有"的记录会保留，导致删除无法跨端传播

### 修复内容（已直接实现，无需 Codex 执行）

#### 1. 软删除：`src/worker.ts`

- **DELETE handler**：改为 `UPDATE status = 'deleted'`（不再物理删除）
- **GET handler**：返回 `status='active'` + 近 30 天内 `status='deleted'` 的记录（含 `status` 字段），让其他端能感知删除事件

#### 2. 客户端类型：`src/features/inquiry/types/index.ts`

- `InquiryRecord` 新增 `status?: 'active' | 'deleted'`

#### 3. 删除防回流：`src/features/inquiry/services/inquiry.service.ts`

- `remove(id)`：写入 `inquiry_deleted_ids`（id → deletedAt），防止 D1 旧版本重新拉回
- `mergeFromD1`：
  - 见到 `d1Record.status === 'deleted'` → 从 localMap 移除 + 写入 deletedIds（跨端删除同步）
  - 跳过 deletedIds 中的 D1 记录（防止被旧版本覆盖）
  - 自动清理 30 天前的 deletedIds 条目
- `pushLocalToD1`：跳过 D1 已软删除的记录，防止本地旧版本覆盖回 D1

### 提交记录

```
a7a35b50 fix(inquiry): 删除后写入 deletedIds，mergeFromD1 不再从 D1 拉回已删记录
acb5bc0a fix(inquiry): 软删除同步至所有端（D1 status=deleted + mergeFromD1 跨端清除）
```

### 部署

```bash
rm -f .git/HEAD.lock
npx wrangler deploy
```

### 验证

1. Device A 删除一条询报价记录 → 本机立即消失
2. Device B（同账号或有权限账号）刷新页面 → 该记录也消失
3. Device A 刷新 → 记录仍然消失（不被 D1 拉回）

---

## TASK-38：询报价页面定时轮询（30 秒自动同步）✅

### 背景

当前 D1 拉取只在页面**加载时执行一次**。其他用户的新增/编辑/删除操作无法即时出现在已打开的页面上，需手动刷新才能看到。

目标：每 30 秒自动重新拉取 D1，合并最新状态并更新界面，页面隐藏时暂停轮询节省请求。新增/编辑弹窗打开期间必须暂停同步，避免 30 秒轮询覆盖正在录入的本地表单状态。

### 涉及文件

- `src/features/inquiry/app/InquiryPage.tsx`（唯一改动）

### 改动规格

将现有 D1 同步 useEffect 改为以下结构：

```tsx
useEffect(() => {
  if (!permissionChecked || !hasInquiryAccess || isModalOpen) return;

  const POLL_INTERVAL_MS = 30_000;
  let cancelled = false;

  // 抽取同步逻辑为可复用函数
  async function syncFromD1() {
    if (isModalOpenRef.current) return;
    const d1Records = await inquiryService.pullFromD1();
    if (cancelled || isModalOpenRef.current) return;
    inquiryService.pushLocalToD1(d1Records);
    const merged = inquiryService.mergeFromD1(d1Records);
    useInquiryStore.setState({ records: merged });
    setLastSyncedAt(new Date());
  }

  // 立即执行一次
  void syncFromD1();

  // 页面可见时轮询，隐藏时暂停
  const interval = setInterval(() => {
    if (document.visibilityState === 'visible') {
      void syncFromD1();
    }
  }, POLL_INTERVAL_MS);

  // 页面从隐藏变回可见时立即补一次同步
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      void syncFromD1();
    }
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    cancelled = true;
    clearInterval(interval);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}, [hasInquiryAccess, isModalOpen, permissionChecked]);
```

同时在组件顶部添加状态：

```tsx
const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
const isModalOpenRef = useRef(false);
```

弹窗状态同步到 ref，用于拦截已经发出但尚未返回的 D1 请求：

```tsx
useEffect(() => {
  isModalOpenRef.current = isModalOpen;
}, [isModalOpen]);
```

在页面标题区域添加同步时间显示（紧跟 `<p>` 描述文字后）：

```tsx
{lastSyncedAt && (
  <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
    最后同步：{lastSyncedAt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
  </p>
)}
```

### 验证步骤

```bash
npx tsc --noEmit
npm run lint -- --file src/features/inquiry/app/InquiryPage.tsx
```

功能验证：
1. 打开询报价页，等待约 30 秒，观察"最后同步"时间自动更新
2. 在另一台设备新增一条记录 → 本页面 30 秒内自动出现（无需刷新）
3. 切换到其他浏览器 Tab → 返回 → 立即触发一次同步
4. DevTools Network 确认每 30 秒出现一次 GET `/api/inquiry` 请求
5. 打开"新增询价"或"编辑询价"弹窗后，30 秒轮询暂停，不覆盖正在录入的内容
6. 弹窗关闭后，自动同步恢复

### 提交

```bash
git add src/features/inquiry/app/InquiryPage.tsx
git commit -m "feat(inquiry): 30 秒定时轮询 + 页面可见时立即同步"
```

### 后续保护提交

- `663d6cab` `fix(inquiry): 编辑弹窗打开时暂停自动同步`

---

## TASK-39：询报价筛选与排序 ✅

### 背景

当前表格仅支持按询价编号升/降序切换，无任何筛选能力。记录增多后，用户需要快速定位特定客户、特定报价状态、特定时间段的记录。

### 筛选维度

| 维度 | 类型 | 选项 |
|------|------|------|
| 时间范围 | 4 个 Chip | 全部 / 近7天 / 近30天 / 近90天 |
| 报价状态 | 6 个 Chip | 全部 / 等待供应商 / 未报客户 / 已报客户 / 无法报价 / 已成单 |
| 客户编号 | Select 下拉 | 全部客户 + 动态取自当前记录集 |
| 询价人 | Select 下拉 | 全部询价人 + 动态取自当前记录集 |
| 排序方向 | 表头按钮 | 按询价编号 asc/desc（现有，保留移入 hook） |

### 状态逻辑

报价状态筛选判断如下：

| Key | 判断条件 |
|-----|---------|
| `all` | 无过滤 |
| `supplier_pending` | `supplierStatuses.some(s => !s.status \|\| s.status === 'pending')` |
| `customer_pending` | `quotedStatuses.length === 0` |
| `customer_quoted` | `quotedStatuses.some(s => s.type !== 'unavailable')` |
| `unavailable` | `quotedStatuses.some(s => s.type === 'unavailable')` |
| `has_order` | `!!record.orderNo` |

时间范围：从 `inquiryNo` 解析日期（使用现有 `getDateInputValueFromInquiryNo`），比较 `Date.now()` 差值。

### 涉及文件

新增：
- `src/features/inquiry/hooks/useInquiryFilter.ts`
- `src/features/inquiry/components/InquiryFilterBar.tsx`

修改：
- `src/features/inquiry/components/InquiryTable.tsx`
- `src/features/inquiry/app/InquiryPage.tsx`

---

### 文件1：`src/features/inquiry/hooks/useInquiryFilter.ts`（新建）

```ts
import { useMemo, useState } from 'react';
import type { InquiryRecord } from '../types';
import { getDateInputValueFromInquiryNo } from '../utils/inquiryUtils';

export type TimeRange = 'all' | '7d' | '30d' | '90d';
export type QuoteStatusFilter =
  | 'all'
  | 'supplier_pending'
  | 'customer_pending'
  | 'customer_quoted'
  | 'unavailable'
  | 'has_order';

export interface InquiryFilterState {
  timeRange: TimeRange;
  customerNo: string;
  inquirer: string;
  quoteStatus: QuoteStatusFilter;
  sortDir: 'asc' | 'desc';
}

const DEFAULT_FILTER: InquiryFilterState = {
  timeRange: 'all',
  customerNo: '',
  inquirer: '',
  quoteStatus: 'all',
  sortDir: 'desc',
};

export function useInquiryFilter(records: InquiryRecord[]) {
  const [filter, setFilter] = useState<InquiryFilterState>(DEFAULT_FILTER);

  const customers = useMemo(
    () => [...new Set(records.map((r) => r.customerNo))].sort(),
    [records]
  );

  const inquirers = useMemo(
    () => [...new Set(records.map((r) => r.inquirer))].sort(),
    [records]
  );

  const filteredAndSorted = useMemo(() => {
    const now = Date.now();
    const daysMs = (d: number) => d * 24 * 60 * 60 * 1000;

    return records
      .filter((r) => {
        // 时间范围
        if (filter.timeRange !== 'all') {
          const dateStr = getDateInputValueFromInquiryNo(r.inquiryNo);
          const recTime = new Date(dateStr).getTime();
          const days = filter.timeRange === '7d' ? 7 : filter.timeRange === '30d' ? 30 : 90;
          if (now - recTime > daysMs(days)) return false;
        }
        // 客户
        if (filter.customerNo && r.customerNo !== filter.customerNo) return false;
        // 询价人
        if (filter.inquirer && r.inquirer !== filter.inquirer) return false;
        // 报价状态
        switch (filter.quoteStatus) {
          case 'supplier_pending':
            return r.supplierStatuses.some((s) => !s.status || s.status === 'pending');
          case 'customer_pending':
            return r.quotedStatuses.length === 0;
          case 'customer_quoted':
            return r.quotedStatuses.some((s) => s.type !== 'unavailable');
          case 'unavailable':
            return r.quotedStatuses.some((s) => s.type === 'unavailable');
          case 'has_order':
            return !!r.orderNo;
          default:
            return true;
        }
      })
      .sort((a, b) =>
        filter.sortDir === 'desc'
          ? b.inquiryNo.localeCompare(a.inquiryNo)
          : a.inquiryNo.localeCompare(b.inquiryNo)
      );
  }, [records, filter]);

  const activeCount = [
    filter.timeRange !== 'all',
    !!filter.customerNo,
    !!filter.inquirer,
    filter.quoteStatus !== 'all',
  ].filter(Boolean).length;

  const reset = () => setFilter(DEFAULT_FILTER);

  return {
    filter,
    setFilter,
    filteredAndSorted,
    customers,
    inquirers,
    activeCount,
    reset,
  };
}
```

---

### 文件2：`src/features/inquiry/components/InquiryFilterBar.tsx`（新建）

Props 接口：

```ts
interface InquiryFilterBarProps {
  filter: InquiryFilterState;
  setFilter: (f: InquiryFilterState) => void;
  customers: string[];
  inquirers: string[];
  activeCount: number;
  filteredCount: number;
  totalCount: number;
  onReset: () => void;
}
```

UI 结构（3 行，全部收于一个 `rounded-xl border bg-white` 卡片内）：

**第1行：时间范围 Chips**

```
时间  [全部]  [近7天]  [近30天]  [近90天]
```

**第2行：报价状态 Chips**

```
状态  [全部]  [等待供应商]  [未报客户]  [已报客户]  [无法报价]  [已成单]
```

- 等待供应商 Chip 对应 `supplier_pending`
- 未报客户 → `customer_pending`
- 已报客户 → `customer_quoted`（蓝色高亮选中时）
- 无法报价 → `unavailable`（灰色高亮）
- 已成单 → `has_order`（绿色高亮）

**第3行：下拉 + 汇总**

```
[全部客户 ▼]  [全部询价人 ▼]        共 12/38 条  [重置筛选]
```

- 当 `filteredCount === totalCount` 时只显示 "共 N 条"；有筛选时显示 "共 N/M 条"
- 重置按钮仅在 `activeCount > 0` 时显示
- 所有 Chip 的 active 样式：选中时 `bg-blue-600 text-white`，未选中 `bg-white text-gray-600 border border-gray-200 hover:bg-gray-50`
- 报价状态的特殊颜色：`customer_quoted` 选中 `bg-blue-600`；`unavailable` 选中 `bg-gray-500`；`has_order` 选中 `bg-green-600`；其余统一 `bg-blue-600`

实现 helper：

```ts
function chip(
  label: string,
  active: boolean,
  onClick: () => void,
  activeColor = 'bg-blue-600 text-white'
) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? activeColor
          : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
      }`}
    >
      {label}
    </button>
  );
}
```

Select 样式：

```
h-7 rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200
```

---

### 文件3：`src/features/inquiry/components/InquiryTable.tsx`（修改）

**修改 Props 接口**，移除内部 `sortDir` 状态，改由外部传入：

```ts
interface InquiryTableProps {
  records: InquiryRecord[];           // 已筛选已排序
  sortDir: 'asc' | 'desc';
  onSortToggle: () => void;
  onEditRecord: (record: InquiryRecord) => void;
  onDeleteRecord: (recordId: string) => void;
  emptyMessage?: string;              // 默认 "暂无询报价记录"
  emptySubMessage?: string;
}
```

删除组件内 `const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')` 和内部 sort 逻辑（`sorted` useMemo）。

表格直接遍历 `records`（已是排序后结果）：

```tsx
{records.map((record) => (
  <InquiryRow key={record.id} record={record} onEdit={onEditRecord} onDelete={onDeleteRecord} />
))}
```

表头排序按钮改为：

```tsx
<button type="button" onClick={onSortToggle} ...>
  询价编号
  {sortDir === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
</button>
```

空状态使用传入的 `emptyMessage` / `emptySubMessage`，默认值：

```ts
emptyMessage = '暂无询报价记录'
emptySubMessage = '点击"新增询价"后，会在这里登记供应商询价和客户报价状态。'
```

---

### 文件4：`src/features/inquiry/app/InquiryPage.tsx`（修改）

新增 import：

```ts
import { useInquiryFilter } from '../hooks/useInquiryFilter';
import { InquiryFilterBar } from '../components/InquiryFilterBar';
```

在组件内初始化 hook（放在现有 `records`、`updateRecord` 等 hooks 之后）：

```ts
const { filter, setFilter, filteredAndSorted, customers, inquirers, activeCount, reset } =
  useInquiryFilter(records);
```

JSX 中在 `<InquiryTable>` 前插入 `<InquiryFilterBar>`：

```tsx
<InquiryFilterBar
  filter={filter}
  setFilter={setFilter}
  customers={customers}
  inquirers={inquirers}
  activeCount={activeCount}
  filteredCount={filteredAndSorted.length}
  totalCount={records.length}
  onReset={reset}
/>
<InquiryTable
  records={filteredAndSorted}
  sortDir={filter.sortDir}
  onSortToggle={() =>
    setFilter({ ...filter, sortDir: filter.sortDir === 'desc' ? 'asc' : 'desc' })
  }
  onEditRecord={openEditModal}
  onDeleteRecord={handleDeleteRecord}
  emptyMessage={activeCount > 0 ? '没有符合条件的记录' : '暂无询报价记录'}
  emptySubMessage={
    activeCount > 0
      ? '尝试调整筛选条件，或点击"重置筛选"查看全部。'
      : '点击"新增询价"后，会在这里登记供应商询价和客户报价状态。'
  }
/>
```

---

### 验证步骤

```bash
npx tsc --noEmit
npm run lint -- \
  --file src/features/inquiry/hooks/useInquiryFilter.ts \
  --file src/features/inquiry/components/InquiryFilterBar.tsx \
  --file src/features/inquiry/components/InquiryTable.tsx \
  --file src/features/inquiry/app/InquiryPage.tsx
```

功能验证：
1. 进入询报价页 → FilterBar 渲染在标题卡片下方、表格上方
2. 点击"近30天" → 只显示近30天记录，共 N/M 条 正确显示
3. 点击"已报客户" → 只显示有客户报价（蓝色行）的记录
4. 下拉选择某客户 → 记录过滤到该客户
5. 多个筛选叠加 → 结果正确交集（AND 逻辑）
6. 点击"重置筛选" → 全部恢复，按钮消失
7. 筛选后结果为0 → 显示"没有符合条件的记录"
8. 排序按钮切换 asc/desc → 依旧正常

### 提交

```bash
git add \
  src/features/inquiry/hooks/useInquiryFilter.ts \
  src/features/inquiry/components/InquiryFilterBar.tsx \
  src/features/inquiry/components/InquiryTable.tsx \
  src/features/inquiry/app/InquiryPage.tsx
git commit -m "feat(inquiry): 筛选栏 — 时间/客户/询价人/报价状态多维筛选"
```

---

## TASK-40：询报价表格布局优化 + 紧凑微调 ✅

### 背景

当前表格存在以下可读性问题：
1. "日期"列独立占位，但日期已编码于询价编号（C260619F → 6.19），浪费列宽
2. "客户编号"不截断，超长引用号（如 `NORDLUCHS-11110/V/0110/RFQ/2026`）撑破布局
3. "询报价状态"初版尝试拆成两行后，实际行高过高，列表密度下降
4. 无关键字搜索，定位某条记录须靠下拉筛选
5. 筛选区常驻占用首屏高度，上方标题区和筛选区需要进一步融合
6. 成单后的订单编号独占一行，进一步撑高询价编号列
7. 不同屏幕下列宽分配不合理：大屏客户编号显示不足，中屏/小屏仍占用关键宽度

### 目标改动

| 改动 | 效果 |
|------|------|
| 合并日期+询价编号为一列 | 节省一列宽度 |
| 客户编号截断+tooltip | 布局稳定，全称可悬停查看 |
| 状态列恢复单行，`/` 改蓝色 | 保持原有阅读习惯，同时增强供应商/客户报价分隔 |
| FilterBar 新增关键字搜索 | 快速定位，无需逐级下拉 |
| 筛选区改为漏斗图标展开/收起 | 默认首屏更紧凑，有筛选条件时显示数量角标 |
| 表格行高收紧，内容简述单行截断 | 列表可视记录数更多 |
| 订单编号与小日期同一行显示 | 成单记录不再额外撑高 |
| 响应式列显示与列宽 | 大屏显示更宽客户编号；中屏隐藏客户编号；小屏隐藏询价人和客户编号 |

### 涉及文件

修改：
- `src/features/inquiry/hooks/useInquiryFilter.ts`
- `src/features/inquiry/components/InquiryFilterBar.tsx`
- `src/features/inquiry/components/InquiryTable.tsx`
- `src/features/inquiry/components/InquiryRow.tsx`
- `src/features/inquiry/components/InquiryQuoteStatusDisplay.tsx`
- `src/features/inquiry/app/InquiryPage.tsx`

---

### 文件1：`src/features/inquiry/hooks/useInquiryFilter.ts`

在 `InquiryFilterState` 中新增 `keyword: string`：

```ts
export interface InquiryFilterState {
  timeRange: TimeRange;
  customerNo: string;
  inquirer: string;
  quoteStatus: QuoteStatusFilter;
  sortDir: 'asc' | 'desc';
  keyword: string;   // ← 新增
}

const DEFAULT_FILTER: InquiryFilterState = {
  timeRange: 'all',
  customerNo: '',
  inquirer: '',
  quoteStatus: 'all',
  sortDir: 'desc',
  keyword: '',       // ← 新增
};
```

在 `filteredAndSorted` useMemo 的过滤链中，紧接时间范围过滤后插入关键字过滤：

```ts
// 关键字搜索：匹配询价编号 / 客户编号 / 内容简述
if (filter.keyword.trim()) {
  const kw = filter.keyword.trim().toLowerCase();
  const match =
    record.inquiryNo.toLowerCase().includes(kw) ||
    record.customerNo.toLowerCase().includes(kw) ||
    (record.description ?? '').toLowerCase().includes(kw);
  if (!match) return false;
}
```

在 `activeCount` 数组中新增一项：

```ts
Boolean(filter.keyword.trim()),
```

---

### 文件2：`src/features/inquiry/components/InquiryFilterBar.tsx`

最终实现：`InquiryFilterBar` 只负责筛选面板内容，不再自带外层卡片；外层卡片和展开/收起由 `InquiryPage` 管理。

Props 增加可选 `id?: string`，用于父级漏斗按钮的 `aria-controls`：

```ts
interface InquiryFilterBarProps {
  id?: string;
  filter: InquiryFilterState;
  setFilter: (filter: InquiryFilterState) => void;
  customers: string[];
  inquirers: string[];
  activeCount: number;
  filteredCount: number;
  totalCount: number;
  onReset: () => void;
}
```

第3行（客户/询价人下拉所在行）最前方插入搜索框，作为第一个元素：

```tsx
<input
  type="search"
  value={filter.keyword}
  onChange={(e) => setFilter({ ...filter, keyword: e.target.value })}
  placeholder="搜索编号 / 客户 / 简述…"
  className={
    'h-7 min-w-[160px] flex-1 rounded-lg border border-gray-200 bg-white px-3 ' +
    'text-xs text-gray-700 placeholder:text-gray-400 outline-none ' +
    'focus:border-blue-400 focus:ring-1 focus:ring-blue-200 ' +
    'dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:placeholder:text-gray-500 ' +
    'dark:focus:border-blue-500'
  }
/>
```

该行完整结构变为（按顺序）：搜索框 → 客户下拉 → 询价人下拉 → 右对齐的统计+重置。搜索框有 `flex-1` 自适应宽度，其余元素宽度不变。

面板自身使用紧凑布局：

```tsx
<div id={id} className="border-t border-gray-100 pt-2 dark:border-gray-800">
```

---

### 文件3：`src/features/inquiry/components/InquiryTable.tsx`

删除"日期"列 `<th>`：

```tsx
// 删除整个 <th> 日期 </th>
```

表格列顺序变为：询价编号（含日期） / 询价人 / 客户编号 / 内容简述 / 询报价状态 / 操作。

最终使用 `table-fixed` 和响应式宽度，避免内容把列撑破：

```tsx
<table className="min-w-full table-fixed divide-y divide-gray-100 dark:divide-gray-800">
```

列显示规则：

| 屏幕 | 显示列 | 说明 |
|------|--------|------|
| 小屏 `< md` | 询价编号 / 内容简述 / 询报价状态 / 操作 | 隐藏询价人、客户编号 |
| 中屏 `md ~ lg` | 询价编号 / 询价人 / 内容简述 / 询报价状态 / 操作 | 隐藏客户编号 |
| 大屏 `>= lg` | 全部列 | 客户编号列加宽，可显示两行 |

关键列宽：

```tsx
// 询价编号
className="w-[24%] ... md:w-[16%] lg:w-[10%]"

// 询价人：小屏隐藏，中屏显示
className="hidden w-[16%] ... md:table-cell lg:w-[12%]"

// 客户编号：中小屏隐藏，大屏显示
className="hidden ... lg:table-cell lg:w-[24%] xl:w-[26%]"

// 内容简述
className="w-[34%] ... md:w-[32%] lg:w-[22%]"

// 询报价状态
className="w-[34%] ... md:w-[30%] lg:w-[28%] xl:w-[26%]"
```

---

### 文件4：`src/features/inquiry/components/InquiryRow.tsx`

**① 删除"日期"独立 `<td>`**，原日期列整个 td 移除。

**② 修改"询价编号" `<td>`**，改为上下两行：第一行询价编号；第二行小号日期 + 订单编号（如有）。

```tsx
<td className="w-[24%] px-3 py-2 text-sm md:w-[16%] lg:w-[10%]">
  <div className="flex flex-col gap-0 leading-tight">
    <span className={`whitespace-nowrap font-mono leading-4 ${mainTextClass}`}>
      {record.inquiryNo}
    </span>
    <span className="flex items-center gap-1.5 text-[11px] leading-4 text-gray-400 dark:text-gray-500">
      <span>{stripDateBrackets(record.inquiryDate)}</span>
      {record.orderNo && (
        <span className="inline-flex items-center rounded-full bg-green-50 px-1.5 py-0 text-[11px] font-medium leading-4 text-green-700 ring-1 ring-green-200 dark:bg-green-950/40 dark:text-green-400 dark:ring-green-800">
          {record.orderNo}
        </span>
      )}
    </span>
  </div>
</td>
```

注：成单记录的 `orderNo` 不再单独占一行，放在小日期后方同一行，避免撑高行高。

询价人列按屏幕显示：

```tsx
<td className="hidden w-[16%] whitespace-nowrap px-3 py-2 text-sm md:table-cell lg:w-[12%]">
  <span className={mainTextClass}>{record.inquirer}</span>
</td>
```

**③ 修改"客户编号" `<td>`**，中小屏隐藏，大屏显示且允许两行：

```tsx
<td className="hidden px-3 py-2 text-sm lg:table-cell lg:w-[24%] xl:w-[26%]">
  <span
    className={`line-clamp-2 max-w-none break-words leading-4 ${mainTextClass}`}
    title={record.customerNo}
  >
    {record.customerNo}
  </span>
</td>
```

**④ 修改"内容简述" `<td>`**，最终改为单行截断：

```tsx
<td className="w-[34%] px-3 py-2 text-sm md:w-[32%] lg:w-[22%]">
  <p className={`max-w-none truncate ${mainTextClass}`} title={record.description}>
    {record.description}
  </p>
</td>
```

**⑤ 表格行距收紧**：各列 `py-3` 收紧为 `py-2`，删除按钮 `p-1.5` 收紧为 `p-1`。

**⑥ 状态列按断点分配宽度**：

```tsx
<td className="w-[34%] px-3 py-2 md:w-[30%] lg:w-[28%] xl:w-[26%]">
  <InquiryQuoteStatusDisplay record={record} />
</td>
```

---

### 文件5：`src/features/inquiry/components/InquiryQuoteStatusDisplay.tsx`

初版曾将供应商/客户报价拆成两行，但实际行高过高。最终实现恢复为原来的**单行显示**，仅把供应商与客户报价之间的 `/` 改为蓝色：

```tsx
return (
  <p className="block truncate text-xs font-medium leading-4">
    {record.supplierStatuses.map((supplier, index) => {
      const colorClass = getSupplierStatusClass(supplier);
      const label = supplier.quoteDate
        ? `${supplier.supplierShortName}${roundDateBrackets(supplier.quoteDate)}`
        : supplier.supplierShortName;
      return (
        <span key={supplier.id}>
          <span className={colorClass}>{label}</span>
          {index < record.supplierStatuses.length - 1 && <span className="text-gray-300">,</span>}
        </span>
      );
    })}

    <span className="px-0.5 text-blue-600 dark:text-blue-400">/</span>

    {regularStatuses.map((status, index) => (
      <span key={status.id}>
        <span className={rowColor}>
          {stripDateBrackets(status.quoteDate)}{status.supplierShortName}{status.version}
        </span>
        {index < regularStatuses.length - 1 && <span className="text-gray-300">,</span>}
      </span>
    ))}
  </p>
);
```

`supplementedStatus` 与 `unavailableStatus` 仍沿用原逻辑追加在同一行，逗号分隔。

---

### 文件6：`src/features/inquiry/app/InquiryPage.tsx`

上方标题区、同步时间、筛选入口、新增按钮融合到同一张卡片内。

新增状态：

```ts
const [isFilterOpen, setIsFilterOpen] = useState(false);
```

新增收起状态下的结果摘要：

```ts
const resultSummary =
  filteredAndSorted.length === records.length
    ? `共 ${records.length} 条`
    : `共 ${filteredAndSorted.length}/${records.length} 条`;
```

新增漏斗图标按钮：

```tsx
<button
  type="button"
  onClick={() => setIsFilterOpen((open) => !open)}
  aria-label={isFilterOpen ? '收起筛选' : '展开筛选'}
  aria-expanded={isFilterOpen}
  aria-controls="inquiry-filter-panel"
>
  <Filter className="h-4 w-4" />
  {activeCount > 0 && <span>{activeCount}</span>}
</button>
```

筛选面板改为条件渲染：

```tsx
{isFilterOpen && (
  <InquiryFilterBar
    id="inquiry-filter-panel"
    ...
  />
)}
```

---

### 验证步骤

```bash
npx tsc --noEmit
npm run lint -- \
  --file src/features/inquiry/hooks/useInquiryFilter.ts \
  --file src/features/inquiry/app/InquiryPage.tsx \
  --file src/features/inquiry/components/InquiryFilterBar.tsx \
  --file src/features/inquiry/components/InquiryTable.tsx \
  --file src/features/inquiry/components/InquiryRow.tsx \
  --file src/features/inquiry/components/InquiryQuoteStatusDisplay.tsx
```

功能验证：
1. 表格"日期"列消失，询价编号列下方出现小号日期（如 `6.19`）
2. 长客户编号被截断，鼠标悬停显示完整值
3. 询报价状态保持单行显示，供应商状态与客户报价之间的 `/` 为蓝色
4. FilterBar 默认收起，点击漏斗按钮后展开，再次点击收起
5. 有筛选条件时，漏斗按钮右上角显示 `activeCount` 数字角标
6. FilterBar 第三行左侧出现搜索框；输入 "BRS" → 只显示 BRS 相关记录
7. 关键字算入 `activeCount`，"重置筛选"会同时清空搜索框
8. 成单记录的订单编号显示在小日期后方，同一行展示
9. 大屏客户编号列显示且更宽，可展示两行内容
10. 中屏客户编号列隐藏，内容简述/询报价状态获得更多宽度
11. 小屏询价人、客户编号列隐藏，保留关键业务列
12. `tsc --noEmit` 无报错

### 提交

```bash
git add \
  src/features/inquiry/hooks/useInquiryFilter.ts \
  src/features/inquiry/components/InquiryFilterBar.tsx \
  src/features/inquiry/components/InquiryTable.tsx \
  src/features/inquiry/components/InquiryRow.tsx \
  src/features/inquiry/components/InquiryQuoteStatusDisplay.tsx \
  src/features/inquiry/app/InquiryPage.tsx
git commit -m "feat(inquiry): 表格布局优化与紧凑筛选"
```

### 实际落地提交

- `91653d30` `feat(inquiry): 表格布局优化 — 合并日期列/截断客户号/状态两行/关键字搜索`
- `ad1f57dc` `feat(inquiry): 收紧询报价列表布局`
- `0753cc7f` `v26.6.21.0.9`：筛选区改为漏斗图标展开/收起
- `989d9204` `style(inquiry): 调整订单号显示位置`
- `7f18ee08` `style(inquiry): 优化表格响应式列宽`

### 最终状态摘要

本任务最终不是简单的"状态两行显示"，而是基于实际使用反馈做了多次收敛：

1. 保留日期列合并、客户编号截断、关键字搜索这些有效改动。
2. 撤回状态列两行方案，恢复原单行状态，只把 `/` 改为蓝色。
3. 筛选区默认收起，用漏斗按钮展开，减少首屏占用。
4. 表格行高整体压缩，订单编号与日期同一行显示，避免成单行额外变高。
5. 表格列按屏幕宽度响应式隐藏/显示：小屏隐藏询价人与客户编号，中屏隐藏客户编号，大屏显示更宽客户编号。

---

## TASK-41：修复权限架构——普通用户登录后拥有全部权限的 Bug ✅ 已完成

**优先级**：🔴 紧急（安全）
**估时**：30 分钟
**风险**：中（涉及认证核心流程，改完须全量手动验证登录→权限显示）

### 背景与根因

当前表现：普通用户登录后，在点击"刷新权限"之前，侧边栏显示所有菜单项（即拥有所有权限）。点击刷新后才显示正确的受限菜单。

根因分析（三个 Bug，需全部修复）：

**Bug 1（根本原因）：`usePermissionInit.ts` 中 `initRef` 阻断了 session 初始化**

`initRef.current` 在 `status === 'loading'` 阶段被设为 `true`（目的是防止重复调用 `initializeUserFromStorage`），但顶部的守卫 `if (initRef.current) return` 在随后的 `status === 'authenticated'` 阶段同样触发提前退出，导致 `setUserFromSession(session.user)` **永远不会被调用**。

结果：Zustand store 的 `permissionUser` 永远是 `null`（除非 localStorage 有缓存）。

**Bug 2（直接表现原因）：`AppSidebar.tsx` "fail open" 设计**

```tsx
if (isLoading || !permissionUser) return true; // 显示全部项目
```

`permissionUser === null` → 所有需要权限的菜单项全部展示。

**Bug 3（次要）：API 路由中错误的默认权限 fallback**

`force-refresh-session/route.ts` 和 `get-latest-permissions/route.ts` 在后端没有返回权限时，都硬编码了 fallback，给普通用户赋予 quotation + history 默认权限。空权限就该是空权限，不应自动赋权。

**为什么"刷新权限"后正常**：refresh 流程把正确权限写入 `localStorage.userCache` 后 reload。reload 后 `initRef.current` 重置为 `false`，loading 阶段 `initializeUserFromStorage()` 读到正确缓存并写入 store，侧边栏才显示正确。

---

### 改动 1：`src/hooks/usePermissionInit.ts`

**核心逻辑**：把"防止重复做 storage init"和"防止重复做 session init"分开，用两个独立 ref，彻底解开互相阻断的问题。

将整个文件替换为以下内容：

```typescript
import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { usePermissionStore } from '@/lib/permissions';
import { logPermission } from '@/utils/permissionLogger';

// 模块级：防止并发初始化
let globalInitInProgress = false;

export const usePermissionInit = () => {
  const { data: session, status } = useSession();
  const { setUserFromSession, initializeUserFromStorage, clearUser } = usePermissionStore();

  // storage init 独立 ref：只防止 loading 阶段重复调用 initializeUserFromStorage
  const storageInitDone = useRef(false);
  // session hash ref：防止对同一 session 数据重复调用 setUserFromSession
  const lastSessionHash = useRef('');

  useEffect(() => {
    const run = async () => {
      // 正在初始化时跳过（防并发）
      if (globalInitInProgress) return;

      if (status === 'loading') {
        // loading 阶段：只尝试一次从缓存恢复
        if (!storageInitDone.current) {
          storageInitDone.current = true;
          try {
            const initialized = initializeUserFromStorage();
            if (initialized && process.env.NODE_ENV === 'development') {
              logPermission('loading 阶段：从本地缓存初始化权限成功');
            }
          } catch (err) {
            console.error('从缓存初始化失败:', err);
          }
        }
        return;
      }

      if (status === 'unauthenticated') {
        clearUser();
        return;
      }

      // authenticated 阶段：从真实 session 初始化（不受 storageInitDone 影响）
      if (!session?.user) return;

      const currentHash = JSON.stringify({
        id: session.user.id,
        username: session.user.username,
        permissions: session.user.permissions ?? [],
      });

      // 同一 session 内容不重复处理
      if (lastSessionHash.current === currentHash) return;

      globalInitInProgress = true;
      try {
        lastSessionHash.current = currentHash;
        setUserFromSession(session.user);
        if (process.env.NODE_ENV === 'development') {
          logPermission('authenticated 阶段：从 session 初始化权限完成');
        }
      } catch (err) {
        console.error('session 权限初始化失败:', err);
      } finally {
        globalInitInProgress = false;
      }
    };

    run();
  }, [session, status]);
};
```

---

### 改动 2：`src/components/layout/AppSidebar.tsx`

将 `visibleItems` 过滤逻辑中 "权限加载中或 user 未就绪时显示全部" 改为 **fail closed**（不展示需要权限的项目）。

找到：
```tsx
  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.permissionKey) return true;
    // 权限加载中或 user 未就绪时，显示全部项目（避免闪烁消失）
    if (isLoading || !permissionUser) return true;
    // 管理员看全部
    if (permissionUser.isAdmin) return true;
    const moduleId = PERMISSION_MODULE_MAP[item.permissionKey];
    if (!moduleId) return true;
    return permissionUser.permissions?.some(
      (permission) => permission.moduleId === moduleId && permission.canAccess
    ) ?? false;
  });
```

替换为：
```tsx
  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.permissionKey) return true;
    // 权限尚未就绪时：fail closed，不展示受权限保护的菜单项
    if (isLoading || !permissionUser) return false;
    // 管理员看全部
    if (permissionUser.isAdmin) return true;
    const moduleId = PERMISSION_MODULE_MAP[item.permissionKey];
    if (!moduleId) return true;
    return permissionUser.permissions?.some(
      (permission) => permission.moduleId === moduleId && permission.canAccess
    ) ?? false;
  });
```

---

### 改动 3：`src/app/api/auth/force-refresh-session/route.ts`

删除"没有权限时使用默认权限"的 fallback 逻辑（第 98–115 行）。

找到并删除整个 if 块：
```typescript
    // 如果没有获取到权限，使用默认权限
    if (permissions.length === 0) {
      console.log('权限刷新API: 使用默认权限');
      if (isAdmin) {
        permissions = [
          { id: 'default-quotation', moduleId: 'quotation', canAccess: true },
          { id: 'default-packing', moduleId: 'packing', canAccess: true },
          { id: 'default-invoice', moduleId: 'invoice', canAccess: true },
          { id: 'default-purchase', moduleId: 'purchase', canAccess: true },
          { id: 'default-history', moduleId: 'history', canAccess: true }
        ];
      } else {
        permissions = [
          { id: 'default-quotation', moduleId: 'quotation', canAccess: true },
          { id: 'default-history', moduleId: 'history', canAccess: true }
        ];
      }
    }
```

替换为（如果后端无法返回权限，直接返回 500，不默认赋权）：
```typescript
    // 后端返回了空权限时，直接使用空数组（用户确实没有任何权限）
    // 注意：不添加默认权限，空权限 = 无权访问任何受保护模块
    if (permissions.length === 0) {
      console.log('权限刷新API: 用户无已分配权限，返回空权限列表');
    }
```

---

### 改动 4：`src/app/api/auth/get-latest-permissions/route.ts`

同样删除 fallback 默认权限逻辑（第 114–140 行）：

找到并替换（保留 return 语句结构）：

找到：
```typescript
    // 如果没有从session获取到权限，使用默认权限
    if (permissions.length === 0) {
      // 为管理员用户提供默认权限
      if (isAdmin) {
        permissions = [
          { id: 'default-quotation', moduleId: 'quotation', canAccess: true },
          { id: 'default-packing', moduleId: 'packing', canAccess: true },
          { id: 'default-invoice', moduleId: 'invoice', canAccess: true },
          { id: 'default-purchase', moduleId: 'purchase', canAccess: true },
          { id: 'default-history', moduleId: 'history', canAccess: true }
        ];
      } else {
        // 为普通用户提供基本权限
        permissions = [
          { id: 'default-quotation', moduleId: 'quotation', canAccess: true },
          { id: 'default-history', moduleId: 'history', canAccess: true }
        ];
      }
    }

    // 确保至少有一些基本权限，避免权限检查失败
    if (permissions.length === 0) {
      permissions = [
        { id: 'fallback-quotation', moduleId: 'quotation', canAccess: true },
        { id: 'fallback-history', moduleId: 'history', canAccess: true }
      ];
    }
```

替换为：
```typescript
    // 空权限 = 用户确实没有任何权限，不添加默认值
    if (permissions.length === 0) {
      console.log('权限API: 用户无已分配权限，返回空权限列表');
    }
```

---

### 改动 5：`src/lib/permissions.ts` — `setUserFromSession` 中移除 localStorage 缓存恢复逻辑

`setUserFromSession` 中有一段在 `sessionPermissions.length === 0` 时从 localStorage 恢复旧权限的代码，这会导致新登录的用户被错误地赋予旧缓存中的权限。JWT session 是权威来源，不应被 localStorage 覆盖。

找到（在 `setUserFromSession` 函数内，`if (permissionsChanged && process.env.NODE_ENV === 'development')` 块里）：
```typescript
      // ✅ 优化：如果session中没有权限数据，尝试从缓存恢复
      if (sessionPermissions.length === 0 && typeof window !== 'undefined') {
        try {
          const userCache = localStorage.getItem('userCache');
          if (userCache) {
            const cacheData = JSON.parse(userCache);
            const isRecent = cacheData.timestamp && (Date.now() - cacheData.timestamp) < 24 * 60 * 60 * 1000;
            
            if (isRecent && cacheData.permissions && Array.isArray(cacheData.permissions)) {
              // 使用缓存数据更新用户信息
              user.permissions = cacheData.permissions;
              
              logPermission('Session无权限数据，从缓存恢复权限', {
                permissionsCount: cacheData.permissions.length
              });
            }
          }
        } catch (error) {
          logPermissionError('从缓存恢复权限失败', error);
        }
      }
```

直接删除这段代码（连同上方的 `if (permissionsChanged && process.env.NODE_ENV === 'development')` 块中对应的内容）。

具体操作：找到整个 `if (permissionsChanged && process.env.NODE_ENV === 'development')` 块：

```typescript
    // ✅ 优化：只有在权限数据真正变化时才输出详细日志
    if (permissionsChanged && process.env.NODE_ENV === 'development') {
      logPermission('检测到权限数据不一致，强制更新', {
        sessionPermissionsCount: sessionPermissions.length,
        storePermissionsCount: currentPermissions.length,
        userId: sessionUser.id
      });

      // ✅ 优化：如果session中没有权限数据，尝试从缓存恢复
      if (sessionPermissions.length === 0 && typeof window !== 'undefined') {
        try {
          const userCache = localStorage.getItem('userCache');
          if (userCache) {
            const cacheData = JSON.parse(userCache);
            const isRecent = cacheData.timestamp && (Date.now() - cacheData.timestamp) < 24 * 60 * 60 * 1000;
            
            if (isRecent && cacheData.permissions && Array.isArray(cacheData.permissions)) {
              // 使用缓存数据更新用户信息
              user.permissions = cacheData.permissions;
              
              logPermission('Session无权限数据，从缓存恢复权限', {
                permissionsCount: cacheData.permissions.length
              });
            }
          }
        } catch (error) {
          logPermissionError('从缓存恢复权限失败', error);
        }
      }
    }
```

替换为（仅保留日志，删除缓存恢复逻辑）：
```typescript
    // session 是权威来源，不从 localStorage 覆盖权限
    if (permissionsChanged && process.env.NODE_ENV === 'development') {
      logPermission('检测到权限数据变化，更新 store', {
        sessionPermissionsCount: sessionPermissions.length,
        storePermissionsCount: currentPermissions.length,
        userId: sessionUser.id
      });
    }
```

---

### 验证步骤（Codex 执行后，人工验证）

```bash
# 1. 构建检查
npm run build

# 2. 类型检查
npx tsc --noEmit
```

人工验证流程（须在浏览器中执行）：

1. **清除所有 localStorage**（DevTools → Application → Storage → Clear all）
2. 以普通用户（非管理员）登录
3. 登录后**立即**检查侧边栏——只应显示该用户被授权的模块，**不应显示全部**
4. 刷新页面，确认侧边栏菜单仍然正确
5. 以管理员登录，确认可以看到全部菜单
6. 在管理员面板修改某用户权限后，让该用户点击"刷新权限"，确认菜单变化正确

### 提交

```bash
git add \
  src/hooks/usePermissionInit.ts \
  src/components/layout/AppSidebar.tsx \
  src/app/api/auth/force-refresh-session/route.ts \
  src/app/api/auth/get-latest-permissions/route.ts \
  src/lib/permissions.ts
git commit -m "fix(auth): 修复普通用户登录后拥有全部权限的 Bug

- usePermissionInit: 拆分 storageInitDone/sessionHash 双 ref，
  彻底解开 loading 阶段 initRef 阻断 session 初始化的问题
- AppSidebar: fail closed — permissionUser 未就绪时不展示受保护菜单
- force-refresh-session + get-latest-permissions: 删除错误的默认权限 fallback
- setUserFromSession: 删除 localStorage 缓存覆盖 session 权限的逻辑"
```

### 实际落地

- 共改动 6 个文件：`usePermissionInit.ts`、`AppSidebar.tsx`、`permissions.ts`、`force-refresh-session/route.ts`、`get-latest-permissions/route.ts`、`update-session-permissions/route.ts`（同类旧路径补丁）
- `npx tsc --noEmit` + `npm run build` 均通过（存在项目既有 lint warnings，非本次引入）

---

## TASK-42：移除外网依赖——Google 字体 + 无效 Analytics 请求 ✅ 已完成

**优先级**：🟡 优化
**估时**：15 分钟
**风险**：极低，仅改字体和埋点逻辑，不影响业务功能

### 背景

本站在国内使用，需要移除或替换所有需要访问外网的资源，避免影响响应速度和开发体验。

经排查，发现两个实际问题：

**问题 1：`next/font/google` 引入 Inter 字体**
- 本地开发（`npm run dev`）启动时，Next.js 会向 `fonts.googleapis.com` 请求字体文件，国内直接超时
- Tailwind 已配置 `fontFamily.sans: ['Arial', 'Helvetica', 'sans-serif']`，Inter 对 UI 没有实际作用，删掉即可
- 注：生产环境（Vercel 构建）字体在构建阶段自托管，线上用户不受影响，但 Inter 对中文工具无价值

**问题 2：`analytics.ts` 每 30 秒发出失败的外网请求**
- `AnalyticsManager` 有一个 30 秒定时器，周期性调用 `sendToAnalyticsService()`
- 该函数在生产环境尝试：① 调用 `window.gtag()`（GA 脚本从未加载，永远 no-op）；② `fetch('/api/analytics')`（该路由不存在，返回 404）
- 每次 flush 都产生一次 404 请求，被 catch 吃掉，但浪费网络和 localStorage 空间

---

### 改动 1：`src/app/layout.tsx` — 移除 Google Fonts

**完整替换整个文件**（改动：删除 Inter 引入，body 改用 Tailwind 系统字体）：

```tsx
import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import ClientInitializer from '@/components/ClientInitializer';

// 强制动态渲染，确保 cookie 读取正确
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Luo & Company - 管理系统',
  description: 'Luo & Company 提供专业的报价单、销售确认单和发票管理系统，帮助企业管理业务流程，提高工作效率。',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="h-full" suppressHydrationWarning>
      <head>
        {/* 预置脚本：在水合前确保 class 一致，避免闪烁与不一致 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var themeConfig = localStorage.getItem('themeConfig');
                if (themeConfig) {
                  var config = JSON.parse(themeConfig);
                  if (config.mode === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                  if (config.buttonTheme === 'classic') {
                    document.documentElement.classList.add('classic-theme');
                  } else {
                    document.documentElement.classList.remove('classic-theme');
                  }
                }
              } catch (e) {
                console.error('主题预置脚本错误:', e);
              }
            `,
          }}
        />
      </head>
      <body className="min-h-screen" suppressHydrationWarning>
        <Providers>
          <ClientInitializer />
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

---

### 改动 2：`src/features/customer/services/analytics.ts` — 移除无效外部请求

找到 `sendToAnalyticsService` 方法，将其内容完全替换（保留方法签名，清空实现）：

找到：
```typescript
  // 发送到分析服务
  private sendToAnalyticsService(data: any): void {
    // 示例：发送到 Google Analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'customer_management_analytics', {
        custom_parameters: data
      });
    }

    // 示例：发送到自定义API
    fetch('/api/analytics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    }).catch(error => {
      console.error('Failed to send analytics data:', error);
    });
  }
```

替换为：
```typescript
  // 发送到分析服务（暂未配置外部分析服务，数据仅保存到本地）
  private sendToAnalyticsService(_data: any): void {
    // 内部工具，暂不集成外部分析服务
    // 如需接入，在此处实现（注意：Google Analytics 在国内不可用）
  }
```

---

### 改动 3（可选）：`tailwind.config.ts` — 完善中文字体栈

当前配置 `font-sans: ['Arial', 'Helvetica', 'sans-serif']`，`sans-serif` 通用族会自动使用系统中文字体（macOS: PingFang SC, Windows: Microsoft YaHei），已能正常显示。如希望显式指定中文字体顺序，可替换为：

找到：
```ts
      fontFamily: {
        sans: ['Arial', 'Helvetica', 'sans-serif'],
      },
```

替换为：
```ts
      fontFamily: {
        sans: [
          'PingFang SC',
          'Microsoft YaHei',
          'Noto Sans SC',
          'Arial',
          'Helvetica',
          'sans-serif',
        ],
      },
```

> 此改动为可选项，不改也不影响显示效果。

---

### 验证

```bash
# 构建和类型检查
npm run build
npx tsc --noEmit

# 本地开发验证（国内网络）：
npm run dev
# 预期：启动时不再有 fonts.googleapis.com 相关报错或超时
# 预期：浏览器 Network 面板中无 /api/analytics 404 请求
```

### 提交

```bash
git add \
  src/app/layout.tsx \
  src/features/customer/services/analytics.ts \
  tailwind.config.ts   # 仅如果执行了改动3
git commit -m "perf: 移除外网依赖 — Google Fonts 改系统字体，清除无效 Analytics 请求 (TASK-42)"
```

### 实际落地

- `src/app/layout.tsx`：移除 `next/font/google` Inter 引入，body 改用系统字体
- `src/features/customer/services/analytics.ts`：清空 `sendToAnalyticsService`，停止 gtag 调用和 `/api/analytics` 404 请求
- `tailwind.config.ts`：未改（中文字体栈可选，保持现状）
- `npx tsc --noEmit` + `npm run build` 均通过

---

## TASK-43：单据历史跨设备同步修复 ✅ 已完成

**优先级**：🔴 紧急（核心功能缺失）
**估时**：45 分钟
**风险**：中（涉及数据合并逻辑，改完须全量测试各单据类型的增删改）

### 背景与根因

各用户的单据记录（报价/发票/装箱/采购）应在同用户多端之间增删改同步，但目前存在以下缺口：

**同步缺口矩阵：**

| 操作 | 报价/确认 | 发票 | 装箱单 | 采购单 |
|------|-----------|------|--------|--------|
| 新建 | ✅ | ✅ | ❌ 漏 | ✅ |
| 修改 | ✅ | ❌ 漏 | ❌ 漏 | ✅ |
| 删除 | ✅ | ✅ | ❌ 漏 | ✅ |

**根因 1：装箱单 feature 用的是 `packingHistoryService.ts`（无 d1Sync），不是 `utils/packingHistory.ts`（有 d1Sync）**

**根因 2：发票 update 路径绕过了 d1Sync**
`invoice.service.ts` 的编辑路径直接调用 `saveInvoiceHistory()`（只写 localStorage），没有触发 `d1SyncDocument('update', ...)`

**根因 3：`mergeIntoStorage` 只做 add/update，从不移除记录**
设备 A 删除某条单据 → D1 里没了，但设备 B 的 localStorage 永远保留该记录

**根因 4：History 页不触发 D1 拉取**
页面只读 localStorage，设备 A 的改动必须等设备 B 重新登录才可见

---

### 改动 1：`src/utils/d1Pull.ts` — 修复 mergeIntoStorage 使删除可传播

**核心思路：** 
- `fetchAll` 区分"获取成功返回 0 条"和"请求失败"，用 `ok` 标记
- `mergeIntoStorage` 在 D1 拉取成功后，移除本地有、D1 没有的记录（表示已在另一端删除）
- 例外：本地记录在 2 分钟内刚创建的保留（为 D1 double-write 传播留窗口）

找到 `fetchAll` 函数，将整个函数替换为：

```typescript
async function fetchAll<T>(
  url: string,
  key: string,
): Promise<{ data: T[]; ok: boolean }> {
  const results: T[] = [];
  let offset = 0;
  const limit = 500;
  let ok = false;

  while (true) {
    const resp = await fetch(`${url}&limit=${limit}&offset=${offset}`);
    if (!resp.ok) break;
    ok = true;
    const json = await resp.json();
    const items: T[] = json[key] ?? [];
    results.push(...items);
    if (items.length < limit) break;
    offset += limit;
  }

  return { data: results, ok };
}
```

找到 `mergeIntoStorage` 函数，将整个函数替换为：

```typescript
function mergeIntoStorage<T extends LocalStorageItem>(
  storageKey: string,
  incoming: T[],
  d1Ok: boolean,
): void {
  // D1 请求失败时不动 localStorage，避免误删本地数据
  if (!d1Ok) return;

  const raw = localStorage.getItem(storageKey);
  const existing: T[] = raw ? JSON.parse(raw) : [];

  const incomingIds = new Set(incoming.map((item) => item.id));
  const now = Date.now();
  const TWO_MINUTES = 2 * 60 * 1000;

  // D1 记录为权威来源，先全部放入 map
  const map = new Map<string, T>(incoming.map((item) => [item.id, item]));

  // 保留本地有、D1 没有、但 2 分钟内刚创建的记录（double-write 可能还未到达 D1）
  for (const item of existing) {
    if (!incomingIds.has(item.id)) {
      const createdAt = new Date(item.createdAt ?? item.created_at ?? 0).getTime();
      if (now - createdAt < TWO_MINUTES) {
        map.set(item.id, item);
      }
      // 超过 2 分钟且 D1 没有 → 视为已在其他设备删除，不保留
    }
  }

  const merged = Array.from(map.values()).sort((a, b) => {
    const ta = new Date(a.createdAt ?? a.created_at ?? 0).getTime();
    const tb = new Date(b.createdAt ?? b.created_at ?? 0).getTime();
    return tb - ta;
  });

  localStorage.setItem(storageKey, JSON.stringify(merged));
}
```

找到 `pullAllFromD1` 函数中 `const [quotations, confirmations, invoices, packings, purchases] = await Promise.all([` 这段，将整个 Promise.all 和后续 mergeIntoStorage 调用替换为：

```typescript
    const [quotRes, confRes, invRes, packRes, purchRes] = await Promise.all([
      fetchAll<D1Doc>('/api/documents?type=quotation', 'documents'),
      fetchAll<D1Doc>('/api/documents?type=confirmation', 'documents'),
      fetchAll<D1Doc>('/api/documents?type=invoice', 'documents'),
      fetchAll<D1Doc>('/api/documents?type=packing', 'documents'),
      fetchAll<D1Doc>('/api/documents?type=purchase', 'documents'),
    ]);

    mergeIntoStorage(
      'quotation_history',
      [...quotRes.data, ...confRes.data].map(docToQuotationHistory),
      quotRes.ok && confRes.ok,
    );
    mergeIntoStorage('invoice_history', invRes.data.map(docToInvoiceHistory), invRes.ok);
    mergeIntoStorage('packing_history', packRes.data.map(docToPackingHistory), packRes.ok);
    mergeIntoStorage('purchase_history', purchRes.data.map(docToPurchaseHistory), purchRes.ok);
```

同样将 customers/suppliers/consignees 的 Promise.all 替换（只需更新变量名，逻辑一致）：

```typescript
    const [custRes, suppRes, consRes] = await Promise.all([
      fetchAll<D1Customer>('/api/customers?type=customer', 'customers'),
      fetchAll<D1Customer>('/api/customers?type=supplier', 'customers'),
      fetchAll<D1Customer>('/api/customers?type=consignee', 'customers'),
    ]);

    mergeIntoStorage('customer_management', custRes.data.map((c) => d1CustomerToLocal(c, 'customer')), custRes.ok);
    mergeIntoStorage('supplier_management', suppRes.data.map((c) => d1CustomerToLocal(c, 'supplier')), suppRes.ok);
    mergeIntoStorage('consignee_management', consRes.data.map((c) => d1CustomerToLocal(c, 'consignee')), consRes.ok);
```

---

### 改动 2：`src/features/packing/services/packingHistoryService.ts` — 补全三个 d1Sync 缺口

在文件顶部导入区（`import { PackingData, PackingHistory } from '../types';` 之后）添加：

```typescript
import { d1SyncDocument } from '@/utils/d1Sync';
```

找到 `savePackingHistory` 函数，在更新现有记录的 `localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));` 之后（existingId 分支）添加 d1Sync：

```typescript
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
        // D1 双写（fire-and-forget）
        d1SyncDocument('update', {
          id: existingId,
          type: 'packing',
          doc_no: data.invoiceNo || '',
          customer_name: data.consignee.name,
          total_amount: totalAmount,
          currency: data.currency,
          data,
        });
        return updatedHistory;
```

找到同函数中通过 invoiceNo 更新的 `localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));`（existingPacking 分支），同样在之后添加：

```typescript
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
        // D1 双写（fire-and-forget）
        const updated = updatedHistory.find(item => item.id === existingPacking.id);
        if (updated) {
          d1SyncDocument('update', {
            id: updated.id,
            type: 'packing',
            doc_no: data.invoiceNo || '',
            customer_name: data.consignee.name,
            total_amount: totalAmount,
            currency: data.currency,
            data,
          });
        }
        return updatedHistory.find(item => item.id === existingPacking.id) || null;
```

找到创建新记录的 `history.unshift(newHistory); localStorage.setItem(STORAGE_KEY, JSON.stringify(history));`，在其后添加：

```typescript
    history.unshift(newHistory);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    // D1 双写（fire-and-forget）
    d1SyncDocument('create', {
      id: newHistory.id,
      type: 'packing',
      doc_no: data.invoiceNo || '',
      customer_name: data.consignee.name,
      total_amount: totalAmount,
      currency: data.currency,
      data,
    });
    return newHistory;
```

找到 `deletePackingHistory` 函数，在 `localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredHistory));` 之后添加：

```typescript
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredHistory));
    // D1 删除（fire-and-forget）
    d1SyncDocument('delete', { id, type: 'packing', doc_no: '', data: null });
    return true;
```

---

### 改动 3：`src/features/invoice/services/invoice.service.ts` — 补全 update 路径的 d1Sync

在文件顶部导入区添加：

```typescript
import { d1SyncDocument } from '@/utils/d1Sync';
```

找到 `isEditMode && editId` 分支，`const saved = saveInvoiceHistory(updatedHistory);` 之后：

```typescript
        const saved = saveInvoiceHistory(updatedHistory);
        if (saved) {
          // D1 双写（fire-and-forget）
          const updatedItem = updatedHistory.find(item => item.id === editId);
          if (updatedItem) {
            d1SyncDocument('update', {
              id: editId,
              type: 'invoice',
              doc_no: data.invoiceNo,
              customer_name: data.to,
              total_amount: totalAmount,
              currency: data.currency,
              data: updatedItem,
            });
          }
          return { success: true, message: '保存成功' };
        }
```

找到 `existingInvoice` 分支（相同发票号更新），`const saved = saveInvoiceHistory(updatedHistory);` 之后：

```typescript
          const saved = saveInvoiceHistory(updatedHistory);
          if (saved) {
            // D1 双写（fire-and-forget）
            d1SyncDocument('update', {
              id: existingInvoice.id,
              type: 'invoice',
              doc_no: data.invoiceNo,
              customer_name: data.to,
              total_amount: totalAmount,
              currency: data.currency,
              data: { ...existingInvoice, data, updatedAt: new Date().toISOString() },
            });
            return { 
              success: true, 
              message: '保存成功',
              newEditId: existingInvoice.id
            };
          }
```

---

### 改动 4：`src/features/history/app/HistoryPage.tsx` — 页面挂载时拉取 D1

在文件顶部导入区添加：

```typescript
import { pullAllFromD1 } from '@/utils/d1Pull';
```

找到 `useEffect(() => { setMounted(true);` 这个 effect，在 `setMounted(true);` 之后添加 D1 拉取：

```typescript
  useEffect(() => {
    setMounted(true);
    
    // 页面挂载时从 D1 拉取最新数据（跨设备同步）
    pullAllFromD1()
      .then(() => {
        handleRefresh();
        // 触发自定义事件通知所有 key 已更新
        ['quotation_history', 'packing_history', 'invoice_history', 'purchase_history'].forEach(key => {
          window.dispatchEvent(new CustomEvent('customStorageChange', { detail: { key } }));
        });
      })
      .catch(() => {
        // 拉取失败时静默，继续显示本地数据
      });

    // 监听localStorage变化，自动刷新数据
```

---

### 验证

```bash
npm run build
npx tsc --noEmit
```

人工验证（两个浏览器/设备，同账号登录）：

1. **删除同步**：设备 A 删除一条报价单 → 设备 B 打开历史页 → 该条目不出现
2. **新建同步**：设备 A 新建一张采购单 → 设备 B 打开历史页 → 能看到该条目
3. **装箱单 create**：设备 A 保存装箱单 → 设备 B 历史页可见
4. **装箱单 delete**：设备 A 删装箱单 → 设备 B 历史页消失
5. **发票 update**：设备 A 编辑发票金额 → 设备 B 历史页显示新金额

### 提交

```bash
git add \
  src/utils/d1Pull.ts \
  src/features/packing/services/packingHistoryService.ts \
  src/features/invoice/services/invoice.service.ts \
  src/features/history/app/HistoryPage.tsx \
  CODEX_TASKS.md
git commit -m "feat(sync): 修复单据历史跨设备同步 — 补全装箱/发票 d1Sync，删除可传播，历史页触发 D1 拉取 (TASK-43)"
```

### 实际落地（第一轮）

- `src/utils/d1Pull.ts`：`fetchAll` 返回 `{ data, ok }`；`mergeIntoStorage` 增加 `d1Ok` 参数，D1 成功时移除本地超 2 分钟且 D1 没有的记录
- `src/features/packing/services/packingHistoryService.ts`：补齐 create/update（existingId 和 invoiceNo 两条路径）/delete 三处 d1SyncDocument 调用
- `src/features/invoice/services/invoice.service.ts`：补齐 editId 更新和 existingInvoice 覆盖更新两条路径的 d1SyncDocument('update', ...)
- `src/features/history/app/HistoryPage.tsx`：挂载时调 `pullAllFromD1()`，拉完后 handleRefresh
- `npx tsc --noEmit` + `npm run build` 均通过

---

### 补丁（2026-06-22）：写入队列 + 刷新按钮触发同步

**问题 1**：历史页内刷新按钮只重读 localStorage（increments refreshKey），不触发 D1 拉取，所以其他设备的新增数据在点刷新后看不到。

**问题 2**：`d1SyncDocument` 是 fire-and-forget，失败完全静默。若写入失败，D1 没有该记录，下次 merge 时本机数据被误删（"D1 没有 = 其他设备已删"的逻辑错误）。

**修复方案**：

#### `src/utils/d1Sync.ts` — 写入队列机制

完全重写，核心新增：

```typescript
const QUEUE_KEY = 'd1_pending_syncs';

// 操作发起时立即入队（localStorage d1_pending_syncs）
// 成功后出队；失败时保留，等待 flushPendingQueue() 重试

export async function flushPendingQueue(): Promise<void>
export function getPendingIds(): Set<string>
```

`d1SyncDocument` / `d1SyncCustomer` 改为：先入队 → 异步发起请求 → 成功出队 / 失败留队。每条操作有唯一 opId（`${id}-${action}-${timestamp}`），同记录同动作去重。

#### `src/utils/d1Pull.ts` — 先刷队列再拉取，D1 权威 merge 加队列保护

`pullAllFromD1` 流程：
1. `await flushPendingQueue()` — 重试所有未成功写入
2. `getPendingIds()` — 取仍未成功的 id（网络断开才会有）
3. 并行拉取所有类型数据
4. `mergeIntoStorage` 签名增加 `pendingIds` 参数：
   - D1 有的：以 D1 为准 ✓
   - D1 没有 + 不在 pendingIds：视为其他设备已删 → 移除
   - D1 没有 + 在 pendingIds：写入未到达 D1 → 保留本地

#### `src/features/history/app/HistoryPage.tsx` — 刷新按钮触发完整同步

新增 `handleSyncRefresh`（替换刷新按钮的 onClick）：

```typescript
const handleSyncRefresh = useCallback(async () => {
  if (isSyncing.current) return;
  isSyncing.current = true;
  setSyncing(true);
  try {
    await pullAllFromD1();
    handleRefresh();
    ['quotation_history', 'packing_history', 'invoice_history', 'purchase_history'].forEach(key => {
      window.dispatchEvent(new CustomEvent('customStorageChange', { detail: { key } }));
    });
  } finally {
    isSyncing.current = false;
    setSyncing(false);
  }
}, [handleRefresh]);
```

刷新按钮加旋转动画（`animate-spin`）+ disabled 防重复点击。

**提交**：
```bash
git add src/utils/d1Sync.ts src/utils/d1Pull.ts src/features/history/app/HistoryPage.tsx
git commit -m "fix(sync): 写入队列+重试机制，D1权威merge，刷新按钮触发同步拉取 (TASK-43补丁)"
```

**验证**：`npx tsc --noEmit` 通过

---

## TASK-44：单据跨设备同步重构 — 双向同步 + 轮询（参照登记表模式）✅ 已完成

**优先级**：🔴 紧急
**估时**：60 分钟
**风险**：中（涉及多个写路径，需完整测试各单据类型）

### 根本原因

当前单据同步是**单向 pull**，登记表同步是**双向 push+pull + 30s 轮询**。

| 特性 | 登记表 ✅ | 单据 ❌ |
|------|-----------|---------|
| 创建时写 D1 | fire-and-forget | fire-and-forget + 队列 |
| 写失败补救 | `pushLocalToD1` 轮询时补推 | 仅 flush 队列（不轮询）|
| D1→本地同步 | 30s 轮询 + `mergeFromD1` | 仅历史页挂载/刷新按钮 |
| 删除保护 | `inquiry_deleted_ids` | 无 |

结果：设备 A 创建单据 → `d1SyncDocument` 可能失败 → 队列不自动刷 → 设备 B pull 时 D1 空 → 看不到数据。

### 改造方案

参照 `src/features/inquiry/services/inquiry.service.ts` + `InquiryPage.tsx` 模式，为单据实现：
1. `pushLocalToD1`（本地有 D1 没有的 → 推上去）
2. 删除 ID 追踪（防止已删记录被重新推上去）
3. 历史页 30s 轮询（与登记表保持一致）

---

### 改动 1：`src/utils/d1Sync.ts` — 增加删除 ID 记录

在 `QUEUE_KEY` 常量之后添加：

```typescript
const DELETED_DOC_IDS_KEY = 'd1_deleted_doc_ids';

/** 记录本机已删除的文档 id，防止 pushLocalToD1 将其重新推上 D1 */
export function recordDeletedDocId(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const map: Record<string, string> = JSON.parse(localStorage.getItem(DELETED_DOC_IDS_KEY) || '{}');
    map[id] = new Date().toISOString();
    // 清理 30 天前的条目
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    for (const [k, v] of Object.entries(map)) {
      if (new Date(v).getTime() < cutoff) delete map[k];
    }
    localStorage.setItem(DELETED_DOC_IDS_KEY, JSON.stringify(map));
  } catch { /* ignore */ }
}

/** 返回本机已删除的文档 id 集合 */
export function getDeletedDocIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const map: Record<string, string> = JSON.parse(localStorage.getItem(DELETED_DOC_IDS_KEY) || '{}');
    return new Set(Object.keys(map));
  } catch { return new Set(); }
}
```

在 `d1SyncDocument` 函数体中，找到 `action === 'delete'` 的入队处，添加一行：

```typescript
  if (action === 'delete') {
    recordDeletedDocId(payload.id);  // ← 新增
  }
  enqueue(op);
  fireAndForget(op);
```

---

### 改动 2：`src/utils/d1Pull.ts` — 增加 pushLocalToD1 + mergeIntoStorage 记录远端删除

在文件顶部 import 之后，添加 `recordDeletedDocId` 和 `getDeletedDocIds` 的导入：

```typescript
import { flushPendingQueue, getPendingIds, recordDeletedDocId, getDeletedDocIds } from '@/utils/d1Sync';
```

在 `mergeIntoStorage` 函数中，当记录被判定为"远端已删除"时，记录其 ID（在 `// 不在队列且 D1 没有 → 视为已在其他设备删除，不保留` 注释处）：

```typescript
    // 不在队列且 D1 没有 → 视为已在其他设备删除，不保留
    recordDeletedDocId(item.id);   // ← 新增：防止下次 push 时重新推上去
```

在 `pullAllFromD1` 函数中，在 `const pendingIds = getPendingIds();` 之后，fetch 之前，添加 `pushLocalToD1` 调用：

```typescript
    const pendingIds = getPendingIds();
    const deletedIds = getDeletedDocIds();

    // ── 先推：本地有但 D1 可能没有的记录 ──────────────────────────
    // 注意：只推能转换为 D1DocumentPayload 的类型；客户不在此处理
    await pushLocalDocsToD1(deletedIds);
    // ─────────────────────────────────────────────────────────────

    const [quotRes, confRes, invRes, packRes, purchRes] = await Promise.all([...
```

在 `mergeIntoStorage` 函数**之前**（即 `function mergeIntoStorage` 之前），添加 `pushLocalDocsToD1` 函数：

```typescript
/**
 * 将本地各类型单据历史中 D1 尚未收录的记录推送到 D1。
 * 参照 inquiryService.pushLocalToD1 模式。
 * 只推 d1 尚未有（不在 d1Ids 内）、且本机未删除的记录。
 */
async function pushLocalDocsToD1(deletedIds: Set<string>): Promise<void> {
  if (typeof window === 'undefined') return;
  const pending = getPendingIds();

  // 读取各 key 的本地数据
  const quotLocal: Array<Record<string, unknown>> = JSON.parse(localStorage.getItem('quotation_history') || '[]');
  const invLocal: Array<Record<string, unknown>> = JSON.parse(localStorage.getItem('invoice_history') || '[]');
  const packLocal: Array<Record<string, unknown>> = JSON.parse(localStorage.getItem('packing_history') || '[]');
  const purchLocal: Array<Record<string, unknown>> = JSON.parse(localStorage.getItem('purchase_history') || '[]');

  // 并行拉取当前 D1 id 列表（只需 id，用 limit 小的查询）
  // 注意：这里 await 是为了拿到 D1 现有 id，再决定哪些需要推
  // 直接复用已知的 d1Ids（由调用方传入会更优，但 pushLocalDocsToD1 此处独立执行，需自行查询）
  const [qRes, cRes, iRes, pkRes, puRes] = await Promise.all([
    fetchAll<{ id: string }>('/api/documents?type=quotation', 'documents'),
    fetchAll<{ id: string }>('/api/documents?type=confirmation', 'documents'),
    fetchAll<{ id: string }>('/api/documents?type=invoice', 'documents'),
    fetchAll<{ id: string }>('/api/documents?type=packing', 'documents'),
    fetchAll<{ id: string }>('/api/documents?type=purchase', 'documents'),
  ]);

  const quotD1Ids = new Set([...qRes.data, ...cRes.data].map((d) => (d as any).id as string));
  const invD1Ids = new Set(iRes.data.map((d) => (d as any).id as string));
  const packD1Ids = new Set(pkRes.data.map((d) => (d as any).id as string));
  const purchD1Ids = new Set(puRes.data.map((d) => (d as any).id as string));

  const shouldPush = (id: string, d1Ids: Set<string>) =>
    !d1Ids.has(id) && !pending.has(id) && !deletedIds.has(id);

  for (const item of quotLocal) {
    const id = item.id as string;
    if (shouldPush(id, quotD1Ids)) {
      d1SyncDocument('create', {
        id,
        type: (item.type as string || 'quotation') as import('@/utils/d1Sync').D1DocType,
        doc_no: (item.quotationNo as string) || '',
        customer_name: item.customerName as string,
        total_amount: item.totalAmount as number,
        currency: (item.currency as string) || 'USD',
        data: item.data,
      });
    }
  }

  for (const item of invLocal) {
    const id = item.id as string;
    if (shouldPush(id, invD1Ids)) {
      d1SyncDocument('create', {
        id,
        type: 'invoice',
        doc_no: (item.invoiceNo as string) || '',
        customer_name: item.customerName as string,
        total_amount: item.totalAmount as number,
        currency: (item.currency as string) || 'USD',
        data: item,  // 全量存储供 docToInvoiceHistory 提取 data.data
      });
    }
  }

  for (const item of packLocal) {
    const id = item.id as string;
    if (shouldPush(id, packD1Ids)) {
      d1SyncDocument('create', {
        id,
        type: 'packing',
        doc_no: (item.invoiceNo as string) || '',
        customer_name: item.consigneeName as string,
        total_amount: item.totalAmount as number,
        currency: (item.currency as string) || 'USD',
        data: item.data,
      });
    }
  }

  for (const item of purchLocal) {
    const id = item.id as string;
    if (shouldPush(id, purchD1Ids)) {
      d1SyncDocument('create', {
        id,
        type: 'purchase',
        doc_no: (item.orderNo as string) || '',
        customer_name: item.supplierName as string,
        total_amount: item.totalAmount as number,
        currency: (item.currency as string) || 'USD',
        data: item.data,
      });
    }
  }
}
```

注意：`pushLocalDocsToD1` 内部调用了 `d1SyncDocument`，需要在文件顶部从 `d1Sync` 导入：

```typescript
import { flushPendingQueue, getPendingIds, recordDeletedDocId, getDeletedDocIds, d1SyncDocument } from '@/utils/d1Sync';
```

同时由于 `pushLocalDocsToD1` 内部也调用了 `fetchAll`，而 `fetchAll` 本来只在 `pullAllFromD1` 中使用，无需修改，因为 `pushLocalDocsToD1` 与 `mergeIntoStorage` 在同一文件中，`fetchAll` 可直接调用（同文件私有函数）。

---

### 改动 3：`src/features/history/app/HistoryPage.tsx` — 30s 轮询（参照登记表）

找到 `handleSyncRefresh` 的 `useCallback`，在其下方的 mount useEffect 中，在现有 `pullAllFromD1()` 之后，增加 30s 轮询：

**将 mount useEffect 替换为：**

```typescript
  useEffect(() => {
    setMounted(true);
    let cancelled = false;

    async function syncFromD1() {
      if (cancelled) return;
      await pullAllFromD1();
      if (cancelled) return;
      handleRefresh();
      ['quotation_history', 'packing_history', 'invoice_history', 'purchase_history'].forEach(key => {
        window.dispatchEvent(new CustomEvent('customStorageChange', { detail: { key } }));
      });
    }

    void syncFromD1();

    const POLL_INTERVAL_MS = 30_000;
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void syncFromD1();
      }
    }, POLL_INTERVAL_MS);

    // 监听 localStorage 变化
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key && (
        event.key.includes('quotation_history') ||
        event.key.includes('packing_history') ||
        event.key.includes('invoice_history') ||
        event.key.includes('purchase_history')
      )) {
        handleRefresh();
      }
    };

    const handleCustomStorageChange = (event: CustomEvent) => {
      if (event.detail?.key && (
        event.detail.key.includes('quotation_history') ||
        event.detail.key.includes('packing_history') ||
        event.detail.key.includes('invoice_history') ||
        event.detail.key.includes('purchase_history')
      )) {
        handleRefresh();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('customStorageChange', handleCustomStorageChange as EventListener);

    return () => {
      cancelled = true;
      setMounted(false);
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('customStorageChange', handleCustomStorageChange as EventListener);
    };
  }, [setMounted, handleRefresh]);
```

---

### 验证

```bash
npx tsc --noEmit
npm run build
```

人工验证（两端同账号）：

1. 设备 A 新建合同确认书 → 立刻到历史页（触发 flush + push） → 等 5s → 设备 B 历史页自动刷新（30s 轮询）或手动点刷新 → 能看到该条目
2. 设备 A 删除记录 → 设备 B 等待下次轮询 → 消失
3. 刷新按钮仍然正常工作（`handleSyncRefresh`）

### 提交

```bash
git add \
  src/utils/d1Sync.ts \
  src/utils/d1Pull.ts \
  src/features/history/app/HistoryPage.tsx \
  CODEX_TASKS.md
git commit -m "feat(sync): 单据双向同步重构 — pushLocalToD1 + 删除ID追踪 + 30s轮询 (TASK-44)"
```

### 实际落地

- `src/utils/d1Sync.ts`：新增 `recordDeletedDocId` / `getDeletedDocIds`，删除时自动记录 ID；`d1SyncDocument('delete', ...)` 调用时同步入 `d1_deleted_doc_ids`
- `src/utils/d1Pull.ts`：新增 `pushLocalDocsToD1(deletedIds)`，在每次 pull 前检查本地各类型历史，将 D1 缺失且不在待同步队列/已删除集合的记录推送到 D1；`mergeIntoStorage` 在移除远端已删记录时调用 `recordDeletedDocId`
- `src/features/history/app/HistoryPage.tsx`：改为 visibilitychange 触发同步（打开页面 + 标签回到前台立即同步，无轮询间隔），替代原 30s setInterval 方案
- `npx tsc --noEmit` + `npm run build` 均通过

---

## TASK-45：同浏览器多用户单据历史隔离 ✅ 已完成

### 背景

同一个浏览器中，如果用户 A 退出后用户 B 登录，单据历史 localStorage key 仍是全局 key：

- `quotation_history`
- `invoice_history`
- `packing_history`
- `purchase_history`
- `d1_pending_syncs`
- `d1_deleted_doc_ids`

这会导致两个严重问题：

1. 用户 B 可能在页面上看到用户 A 的本地历史记录。
2. `pushLocalToD1` 会把旧用户 localStorage 中的记录补推到当前登录用户的 D1 账号下，造成跨用户串数据。

### 改动

**文件：`src/utils/d1Sync.ts`**

- 新增 `d1_active_user_id`，记录当前浏览器本地单据缓存归属用户。
- 新增 `prepareD1DocumentSyncForUser(userId)`：
  - 当前用户与本地归属用户一致：保留缓存并同步。
  - 当前用户与本地归属用户不同：清空单据历史、待同步队列、删除 ID，再绑定新用户。
- 新增 `clearD1DocumentLocalState()`：
  - 清理四类单据历史。
  - 清理 `d1_pending_syncs`。
  - 清理 `d1_deleted_doc_ids`。
  - 清理 `d1_active_user_id`。
  - 派发 `customStorageChange`，刷新历史页/首页数据。

**文件：`src/hooks/useD1Sync.ts`**

- 移除单一 `syncDone` 逻辑，改为按用户 ID 同步。
- 登录状态为 authenticated 后，先调用 `prepareD1DocumentSyncForUser(userId)`，再执行 `pullAllFromD1()`。
- 同一浏览器会话中切换账号后会重新同步新用户数据。

**文件：`src/hooks/useAppUser.ts`**

- 退出登录时清理单据本地历史和 D1 同步状态，避免下一个登录用户继承旧用户缓存。

**文件：`src/features/dashboard/app/DashboardPage.tsx`**

- Dashboard 自定义退出逻辑同样调用 `clearD1DocumentLocalState()`。

**文件：`src/utils/d1Pull.ts`**

- `pushLocalDocsToD1` 增加保护：只有本地缓存已绑定当前用户后才允许补推，避免未知归属缓存被上传。
- 保留 TASK-44 后续修复：查询 D1 时使用 `status=all`，跨设备传播 deleted 状态，防止旧设备把已删除记录复活。

### 验证

```bash
npx tsc --noEmit
npm run build
```

人工验证：

1. 同一浏览器登录用户 A，确认历史页有 A 的记录。
2. 退出用户 A。
3. 登录用户 B，历史页不应显示用户 A 的本地记录。
4. 用户 B 新增/删除单据，不应影响用户 A 的 D1 数据。
5. 同账号跨设备新增、删除仍可通过历史页刷新/回前台同步。

---

## TASK-46：修复询报价编辑模式下询价编号和日期被当天数据覆盖 ✅ 已完成

**优先级**：🟡 高（数据正确性）
**估时**：5 分钟
**风险**：极低，仅改一行守卫条件

### 背景

在询报价登记中，打开某条已有记录进行编辑（例如填写"已报价"记录），保存后发现：

- **询价编号**变成了今天日期生成的新编号（如原来是 `C260615F`，变成了 `C260622G`）
- 再次打开该记录，**询价日期**也跟着变成今天

**根本原因**：`InquiryFormModal.tsx` 中两个 `useEffect` 在首次渲染时产生竞态：

1. **Effect 1**（deps: `existingNos, isOpen, mode, record`）：将 `inquiryNo` 设为 `record.inquiryNo`（原始编号），将 `isInquiryNoManual` 设为 `true`。
2. **Effect 2**（deps: `dateInput, existingNos, isInquiryNoManual, isOpen, isUrgent`）：在**同一渲染周期**内执行，读到的是 stale 状态（`isInquiryNoManual = false`、`dateInput = 今天`），因此跳过 early return，调用 `generateNextInquiryNo(今天日期, ...)` 生成新编号，**覆盖**了 Effect 1 刚写入的原始编号。

React 批量 setState 时，Effect 2 最后写入，优先级更高，原始编号丢失。

### 涉及文件

- `src/features/inquiry/components/InquiryFormModal.tsx`

### 改动

**定位**（约第 118–122 行）：

```typescript
useEffect(() => {
  if (!isOpen || isInquiryNoManual) return;
  const base = generateNextInquiryNo(dateInputToDate(dateInput), existingNos);
  setInquiryNo(isUrgent ? `${base}-U` : base);
}, [dateInput, existingNos, isInquiryNoManual, isOpen, isUrgent]);
```

**改为**（增加 `mode === 'edit'` 守卫，同时在 deps 中补充 `mode`）：

```typescript
useEffect(() => {
  if (!isOpen || isInquiryNoManual || mode === 'edit') return;
  const base = generateNextInquiryNo(dateInputToDate(dateInput), existingNos);
  setInquiryNo(isUrgent ? `${base}-U` : base);
}, [dateInput, existingNos, isInquiryNoManual, isOpen, isUrgent, mode]);
```

**说明**：
- 编辑模式（`mode === 'edit'`）下，询价编号始终由用户手动控制，不自动生成。
- 新增模式（`mode === 'create'`）行为不变：修改日期时自动更新编号。
- 这也修复了日期的二次污染：`inquiryNo` 保持原值 → 下次打开时 `getDateInputValueFromInquiryNo` 解析出正确日期 → `inquiryDate` 也正确。

### 验证

```bash
npx tsc --noEmit
npm run build
```

人工验证：
1. 打开一条已有询价记录进行编辑（如添加"已报价"记录）。
2. 点击"保存修改"后，检查该记录的询价编号和询价日期均未变化。
3. 新增询价模式下，修改日期后编号应仍自动同步。

```bash
git add src/features/inquiry/components/InquiryFormModal.tsx
git commit -m "fix(inquiry): 编辑模式下禁止自动覆盖询价编号 — useEffect 竞态导致 inquiryNo 被今日编号替换 (TASK-46)"
```

### 实际落地

- `src/features/inquiry/components/InquiryFormModal.tsx`：自动生成询价编号的 `useEffect` 增加 `mode === 'edit'` 守卫，编辑模式下不再自动生成/覆盖询价编号。
- 依赖数组补充 `mode`，保持 React effect 依赖完整。
- `npx tsc --noEmit` + `npm run build` 均通过。

---

## TASK-47 ✅：询报价页面筛选优化 + 导入/导出功能

### 背景

1. 筛选区域过于厚重；「已报价」筛选器混入「无法报价」记录。
2. 缺少数据导入/导出能力，无法备份或跨设备迁移询报价数据。

### 改动一：筛选 UI 重构（内联展开）

**`src/features/inquiry/app/InquiryPage.tsx`**
- 去掉副标题「记录客户询价、供应商报价进度和已报客户版本。」
- 筛选按钮点击后，筛选控件**向左内联展开**（与标题同行，无需额外行），关闭时恢复标题 + 同步时间 + 条数。
- 移除底部浮动的冗余「新增询价」按钮，底部栏改为「导入 / 导出」。

**`src/features/inquiry/components/InquiryFilterBar.tsx`**（重写为紧凑内联版）
- 时间筛选：`7D / 1M / 3M / 1Y`（点击已选项取消，无「全部」按钮）。
- 状态筛选：`未报价 / 已报价 / 无法报价 / 已成单`（移除「需信息」「等待供应商」「全部」）。
- 保留搜索框 + 询价人下拉，移除客户筛选下拉。
- 有激活筛选时显示「重置」按钮。

**`src/features/inquiry/hooks/useInquiryFilter.ts`**
- `TimeRange` 新增 `'1y'`，对应 365 天。
- 修复 `customer_quoted` 筛选逻辑：之前用 `some(type !== 'unavailable')`，遇到同时有普通报价条目和 `unavailable` 条目的记录会同时命中两个筛选器。新逻辑：`已报价` = 有至少一个 `type` 为空或 `'quoted'` 的条目 **且** 没有任何 `unavailable` 条目。

### 改动二：导入 / 导出

**`src/features/inquiry/app/InquiryPage.tsx`**

**导出**：
- 将 `inquiryService.getAll()` 全量记录序列化为 JSON，触发浏览器下载（文件名 `inquiry_YYYY-MM-DD.json`）。

**导入**：
- 隐藏 `<input type="file" accept=".json">` + `useRef` 触发。
- 解析 JSON，逐条与本地合并：本地无此 ID → 新增并 `syncToD1`；本地有但导入版本更新 → 覆盖并 `updateInD1`；否则跳过。
- 合并后写入 `inquiryService.save()` 并刷新 store，最后 `alert` 提示新增/更新数量。
- 导入失败（非 JSON 或格式错误）弹出错误提示。

### 验证

```bash
npx tsc --noEmit
```

人工验证：
1. 筛选按钮展开 → 内联显示筛选控件，无额外行。
2. 时间筛选「7D」点击激活，再次点击取消（回到全部）。
3. 「已报价」筛选不再混入「无法报价」记录。
4. 底部栏「导出」→ 下载 JSON 文件，内容为所有询报价记录。
5. 「导入」→ 选择刚导出的 JSON → 提示「新增 0 条，更新 0 条」（重复导入幂等）。

---

## TASK-48 ✅：「询价已关闭」状态 + 表单紧凑化 + 历史数据导入（2026-2）

### 背景

1. 询价被客户通知关闭（非无法报价，而是客户主动终止），需要单独标记。
2. 编辑弹窗字段较多，「询价人」单独占一行显得冗余。
3. 2026 年第二季度询价记录（4月～6月，共 401 条）需从 docx 导入。

### 改动一：「询价已关闭」状态

**`src/features/inquiry/types/index.ts`**
- `CustomerQuoteType` 新增 `'closed'`：`'quoted' | 'unavailable' | 'supplemented' | 'closed'`。

**`src/features/inquiry/components/InquiryQuoteStatus.tsx`**
- `regularStatuses` 排除 `closed` 类型（与 `unavailable`、`supplemented` 同级）。
- 派生 `closedStatus`，新增 `toggleClosed` / `updateClosedDate`，与「已回复客户无法报价」并排放在同一 `border-t` 区域内（`flex-wrap` 行）。

**`src/features/inquiry/components/InquiryQuoteStatusDisplay.tsx`**（列表卡片展示）
- `regularStatuses` 同步排除 `closed`。
- 新增 `closedStatus` 展示：灰色 `询价关闭(m.d)` 文字，与「无法报价」同样的视觉层级。

**`src/features/inquiry/utils/inquiryUtils.ts`**
- `getRecordColorState` 修正：`closed` 和 `unavailable` 一起归入灰色（`text-gray-400`）；同时修正第二条件从 `type !== 'unavailable'` 改为显式白名单 `!type || type === 'quoted' || type === 'supplemented'`，避免 `closed`/`supplemented` 等新类型意外触发蓝色。

**`src/features/inquiry/hooks/useInquiryFilter.ts`**
- `unavailable` 筛选：`type === 'unavailable' || type === 'closed'`（两者均出现在「无法报价」过滤桶）。
- `customer_quoted` 筛选：同步排除 `closed`（与 `unavailable` 对称）。

### 改动二：编辑弹窗紧凑化 + 交互优化

**`src/features/inquiry/components/InquiryFormModal.tsx`**
- 「询价人」字段从独立行移入顶部身份条，布局变为：`< 日期 > · 询价编号 · 询价人 [□紧急]`。
- 询价编号固定宽度 `w-24`，询价人 `flex-1` 填满剩余空间，保留 datalist 自动补全。
- 移除了单独的「询价人」label + input 字段行，表单减少一行高度。
- **询价人选项来源扩展**：datalist 由原来仅读客户管理联系人，改为同时合并现有询价记录中出现过的询价人（`existingRecords.map(r => r.inquirer)`），去重排序，确保无论客户管理是否配置都能选到历史使用过的询价人。deps 数组补充 `existingRecords`。
- **编辑模式日期只读**：编辑时日期在新建时已确认，去掉左右箭头和可编辑 input，改为 `<span>` 纯文本展示；新建模式保留完整的箭头 + 键盘（↑↓/Enter）调整交互。
- **身份信息条两行化（小屏优化）**：小屏（375px，约 295px 可用）下，单行布局在 create 模式因日期箭头 + 询价编号已占 300px+ 导致询价人无显示空间。改为卡片内两行：第一行「日期 · 询价编号 · 紧急」，第二行 `border-t` 分隔后「询价人」独占全宽；询价编号改为 `flex-1` 自适应宽度，所有尺寸下均可正常操作。

**`src/features/inquiry/components/InquiryRow.tsx`**（内容简述回退逻辑）
- 大屏（`lg+`，客户编号列可见）：内容简述列仅显示 `description`，为空则留空，避免与客户编号列重复。
- 中小屏（`< lg`，客户编号列隐藏）：内容简述列使用 `description?.trim() || customerNo` 回退，确保单元格不为空白。实现为两个 `<p>` 分别用 `hidden lg:block` / `lg:hidden` 按断点切换，断点与客户编号列显隐一致。

### 改动三：历史数据解析导入（2026-2）

- 使用 python-docx 解析 `协同-1询价登记表(2026-2).docx`（6 列表格，417 行，401 条有效数据，日期范围 4.1～6.22）。
- 处理边界情况：缺少 `/` 分隔符（自动插入）、`庾总(无库存)` 标记为 unavailable、`同C260415L/` 前缀剥除、`报价万成`（无日期前缀）赋 `[0.0]`、双询价编号取第一个（如 `C260507Q C260508F FL2665`）。
- 输出 `inquiry_import_2026-2.json`（401 条），统计：有订单号 26 条，已报客户 341 条，无法报价 76 条，待报价 60 条。

### 验证

```bash
npx tsc --noEmit
```

人工验证：
1. 编辑弹窗顶部一行显示日期 · 编号 · 询价人 · 紧急。
2. 询价已关闭 checkbox 出现在「已回复客户无法报价」右侧，勾选后列表卡片显示灰色「询价关闭(日期)」。
3. 「无法报价」筛选器能命中已关闭记录；「已报价」筛选器不命中已关闭记录。
4. 导入 `inquiry_import_2026-2.json` → 401 条新增。

---

## TASK-49 ✅：彻底修复询报价登记中小屏列宽溢出

### 背景

中屏、小屏下询报价登记列表仍出现列宽异常：

- 状态列被推到卡片右侧之外，只能看到右边缘的少量彩色文字。
- 小屏下「内容简述」占位正常，但「询报价状态 / 操作」实际落在横向溢出区域。
- 之前只处理 Tailwind 任意百分比类和 `colgroup`，但问题仍存在。

### 真实根因

问题不是单一的 Tailwind 百分比类未编译，而是三个因素叠加：

1. **表格使用 `min-w-full table-fixed`**
   `min-width: 100%` 只保证表格至少等于容器宽度；当单元格内容的不可换行最小宽度更大时，浏览器仍会把整张表撑宽。
   因此即使已经加了 `colgroup`，表格仍可能横向溢出。

2. **状态列是一整串不可换行文本**
   `InquiryQuoteStatusDisplay` 使用单行状态串，供应商状态 + `/` + 已报价/无法报价/已关闭状态会形成很长的不可换行内容。
   该内容会反向影响 table layout 的最小内容宽度。

3. **行内单元格缺少 `overflow-hidden / min-w-0 / max-w-full` 约束**
   编号、询价人、内容简述、状态、操作列内部都没有完整的收缩边界，中小屏下容易把列撑开。

截图中看到的“状态列只剩右侧彩色碎片”，实际是表格整体变宽后，状态列落在横向滚动区域右边，当前视口只看到它的边缘。

### 涉及文件

- `src/features/inquiry/components/InquiryTable.tsx`
- `src/features/inquiry/components/InquiryRow.tsx`
- `src/features/inquiry/components/InquiryQuoteStatusDisplay.tsx`

### 最终修复

#### 1. `InquiryTable.tsx`：固定表格宽度，保留 colgroup

将表格从：

```tsx
<table className="min-w-full table-fixed divide-y divide-gray-100 dark:divide-gray-800">
```

改为：

```tsx
<table className="w-full table-fixed divide-y divide-gray-100 dark:divide-gray-800">
```

说明：

- `w-full` 让 table 的实际宽度固定为容器宽度。
- `table-fixed + colgroup` 才能稳定按断点列宽分配。
- `min-w-full` 会允许内容继续撑宽，是这次中小屏异常的核心触发点。

断点列宽继续使用 `colgroup`：

| 断点 | 可见列 | 列宽 |
|------|--------|------|
| `< md` | 询价编号 / 内容简述 / 询报价状态 / 操作 | 22% / 18% / 52% / 8% |
| `md ~ lg` | 询价编号 / 询价人 / 内容简述 / 询报价状态 / 操作 | 15% / 13% / 22% / 43% / 7% |
| `lg+` | 询价编号 / 询价人 / 客户编号 / 内容简述 / 询报价状态 / 操作 | 10% / 12% / 24% / 22% / 28% / 4% |

同时给所有表头加 `overflow-hidden`，长表头使用 `truncate`；小屏/删除列不显示「操作」文字，避免占掉 8% 列宽。

#### 2. `InquiryRow.tsx`：所有单元格增加收缩边界

关键处理：

- 各 `<td>` 增加 `overflow-hidden`。
- 编号、询价人、内容简述使用 `block truncate`。
- flex 容器增加 `min-w-0`，避免内部 flex item 拒绝收缩。
- 客户编号由 `max-w-none` 改为 `max-w-full`。
- 状态列 `<td>` 增加 `overflow-hidden px-2 md:px-3`。
- 操作列小屏压缩为 `px-1`，避免 8% 列宽被 padding 吃掉。

#### 3. `InquiryQuoteStatusDisplay.tsx`：状态串限制在状态列内

状态展示保留单行紧凑风格，但增加完整宽度约束：

```tsx
<p className="m-0 block w-full max-w-full truncate whitespace-nowrap text-xs font-medium leading-4" title={statusTitle}>
```

同时生成完整 `statusTitle`：

- 供应商状态
- 已报价状态
- 已补充
- 无法报价
- 询价关闭

这样列表中显示为单行省略号，不再撑宽表格；鼠标悬浮仍可看到完整状态文本。

### 已确认清理

以下旧方案/残留不再出现在询报价表格链路中：

```bash
rg -n "inq-col|w-\\[[0-9]+%\\]|min-w-full table-fixed" src/features/inquiry src/app/globals.css -S
```

预期：无匹配。

### 验证

```bash
npx tsc --noEmit
npm run build
git diff --check
```

结果：

- `npx tsc --noEmit` 通过。
- `npm run build` 通过，仅有项目既有 lint warnings。
- `git diff --check` 通过。
- 本地浏览器访问 `/inquiry` 时因当前会话未登录，被中间件重定向到登录页；未能直接完成带真实数据的窄屏截图验证。

### 实际落地

- `InquiryTable.tsx`：`min-w-full` 改为 `w-full`，表头补充溢出约束，小屏隐藏删除列表头文字。
- `InquiryRow.tsx`：所有参与列宽计算的单元格补齐 `overflow-hidden / truncate / min-w-0 / max-w-full`。
- `InquiryQuoteStatusDisplay.tsx`：状态串限制在列内单行省略，并补充完整 `title`。

---

## TASK-50 ✅：客户管理页面全面优化

> 工作目录：`/Users/roger/website/luonet-vercel`
> 技术栈：Next.js 14 App Router · TypeScript 5 strict · Tailwind CSS 3 · localStorage primary · Cloudflare D1 backup

---

### 页面结构 ASCII 图

```
/customer  (CustomerPage.tsx)
┌─────────────────────────────────────────────────────────────────┐
│ AppLayout                                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Header Bar                                               │   │
│  │  [客户管理]            [🔄刷新]  [+ 添加]               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                   │
│  │ 总客户  │ │ 供应商  │ │ 收货人  │ │ 本月新增│  Stats Cards      │
│  │   12   │ │   5    │ │   3    │ │   2    │                   │
│  └────────┘ └────────┘ └────────┘ └────────┘                   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ CustomerTabs                                             │   │
│  │  [客户▼] [供应商] [收货人] [新增追踪]                    │   │
│  │──────────────────────────────────────────────────────────│   │
│  │ FilterChipBar (客户 tab 专用)                            │   │
│  │  [全部 12] [高活跃 3] [需跟进 5] [本月 2]               │   │
│  │  排序: [最近创建▼]  视图: [⊞][☰]  [🔍搜索...]          │   │
│  │──────────────────────────────────────────────────────────│   │
│  │ 内容区域 p-6                                             │   │
│  │  Grid模式: 卡片网格(头像+名称+联系+活跃度+操作按钮)     │   │
│  │  List模式: 表格(客户名|联系方式|活跃度|创建时间|操作)   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  CustomerModal (showModal=true 时覆盖)                          │
│  max-h-[85vh] overflow-y-auto max-w-2xl                         │
│  CustomerForm: 公司名/简称/联系人/邮件/电话/地址/联系人数组      │
└─────────────────────────────────────────────────────────────────┘

/customer/detail?id=X&name=Y  (CustomerDetailPage.tsx)
┌─────────────────────────────────────────────────────────────────┐
│ AppLayout  面包屑: 首页 > 客户管理 > [客户名]                    │
│  Tab Nav: [📅 时间轴]  [🕐 跟进记录]                            │
│  CustomerTimeline (报价/订单/自定义事件时间轴)                    │
│  FollowUpManager  (待处理/完成跟进 + 新增表单)                   │
└─────────────────────────────────────────────────────────────────┘
```

---

### 数据流泳道图

```
  用户操作      CustomerPage       useCustomerData    customerService    localStorage      D1 Cloud
     │               │                   │                  │                 │               │
     │  打开页面      │                   │                  │                 │               │
     │──────────────►│ useEffect ────────►│                  │                 │               │
     │               │                   │── getAllCustomers►│                 │               │
     │               │                   │                  │── getItem ──────►│               │
     │               │                   │◄── Customer[] ───│◄── JSON.parse ──│               │
     │◄── 渲染列表 ──│◄── setState ──────│                  │                 │               │
     │               │                   │                  │                 │               │
     │  点击添加      │                   │                  │                 │               │
     │──────────────►│ setShowModal=true  │                  │                 │               │
     │  填写提交      │                   │                  │                 │               │
     │──────────────►│ validateForm()     │                  │                 │               │
     │               │── saveCustomer() ─────────────────────►── setItem ──────►               │
     │               │── refreshData() ──►│                  │                 │               │
     │               │    (useAutoSync后台静默同步)           │                 │──────────────►│
     │               │                   │                  │                 │               │
     │  点击查看详情  │                   │                  │                 │               │
     │──────────────►│ router.push(/customer/detail?id=X)    │                 │               │
```

---

### 现存问题

1. `window.confirm()` 用于删除/重命名确认 — UX 差，无自定义样式
2. 活跃度在 CustomerList 每个卡片分别读 localStorage（O(n×2) IO）
3. CustomerPage.handleSearch 与 CustomerList 内部过滤双层冗余
4. 详情页 URL 用 customer.name 而非 ID，改名后链接失效
5. 详情页 (/customer/detail) 无客户基本信息展示区域
6. D1 同步状态完全不可见，静默失败
7. useCustomerData 和 CustomerPage 各有一层冗余 isClient state

---

### TASK-50-A：自定义删除确认对话框（替换 window.confirm）

**优先级：高**

**目标：** 用 React Modal 替换所有 `window.confirm()` 调用。

**新建文件：** `src/components/ui/ConfirmDialog.tsx`

```tsx
interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;   // whitespace-pre-line 显示换行
  confirmLabel?: string; // 默认"确认"
  variant?: 'danger' | 'default';  // danger=红色按钮
  onConfirm: () => void;
  onCancel: () => void;
}
```

样式要求：
- 遮罩 `fixed inset-0 bg-black/50 flex items-center justify-center z-50`
- 卡片 `bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl`
- danger 确认按钮：`bg-red-600 hover:bg-red-700 text-white`
- 支持 Escape 键取消
- 支持点击遮罩取消

**修改：** `src/features/customer/app/CustomerPage.tsx`

在 CustomerPageContent 中增加 confirm 状态：
```tsx
const [confirmState, setConfirmState] = useState<{
  open: boolean;
  title: string;
  description: string;
  variant: 'danger' | 'default';
  resolve: (ok: boolean) => void;
} | null>(null);

// 提供 showConfirm 工具函数
const showConfirm = useCallback((opts: {
  title: string;
  description: string;
  variant?: 'danger' | 'default';
}): Promise<boolean> => {
  return new Promise((resolve) => {
    setConfirmState({ open: true, ...opts, variant: opts.variant ?? 'default', resolve });
  });
}, []);
```

将 `showConfirm` 作为参数传给 `useCustomerActions(showConfirm)`。

**修改：** `src/features/customer/hooks/useCustomerActions.ts`

函数签名改为：
```ts
export function useCustomerActions(
  showConfirm: (opts: { title: string; description: string; variant?: 'danger' | 'default' }) => Promise<boolean>
)
```

将所有 `confirm(...)` 替换为 `await showConfirm(...)` 调用，`alert(...)` 替换为 toast 或 console.error（暂时保留 alert 可接受）。

**验收：** `grep -r "window.confirm\|window.alert" src/features/customer` 无结果。

---

### TASK-50-B：活跃度批量计算缓存

**优先级：中**

**目标：** 消除 CustomerList 渲染时 O(n) 次 localStorage 读取。

**修改：** `src/features/customer/services/timelineService.ts`

新增方法：
```ts
// TimelineService
static getCountsByCustomer(): Map<string, number> {
  const all = this.getAllEvents();
  const map = new Map<string, number>();
  for (const e of all) map.set(e.customerId, (map.get(e.customerId) ?? 0) + 1);
  return map;
}

// FollowUpService
static getCountsByCustomer(): Map<string, number> {
  const all = this.getAllFollowUps();
  const map = new Map<string, number>();
  for (const f of all) map.set(f.customerId, (map.get(f.customerId) ?? 0) + 1);
  return map;
}
```

**修改：** `src/features/customer/components/CustomerList.tsx`

```tsx
// 组件顶层一次性计算
const timelineCounts = useMemo(() => TimelineService.getCountsByCustomer(), []);
const followUpCounts = useMemo(() => FollowUpService.getCountsByCustomer(), []);

// 将 counts 传入 getCustomerActivity
function getCustomerActivity(customer: Customer, tlCount: number, fuCount: number) { ... }
```

**验收：** 渲染 50 个客户卡片，localStorage.getItem 只被调用 2 次（用 Performance Timeline 验证）。

---

### TASK-50-C：搜索逻辑去重 + 防抖

**优先级：中**

**修改：** `src/features/customer/app/CustomerPage.tsx`

```tsx
// handleSearch 只做 analytics，不过滤数据
const handleSearch = (query: string) => {
  setSearchQuery(query);
  analytics.trackSearch(query, customers.length);
};
```

**修改：** `src/features/customer/components/FilterChipBar.tsx`

search input 改用防抖：
```tsx
import { useState, useEffect } from 'react';

const [localQuery, setLocalQuery] = useState(searchQuery);
useEffect(() => {
  const timer = setTimeout(() => onSearchChange(localQuery), 300);
  return () => clearTimeout(timer);
}, [localQuery, onSearchChange]);

// input 绑定 localQuery，不绑定 searchQuery
<input value={localQuery} onChange={e => setLocalQuery(e.target.value)} ... />
```

**验收：** 连续输入 5 个字符只触发 1 次过滤重渲染（300ms 后）。

---

### TASK-50-D：详情页 URL 改用客户 ID

**优先级：低（功能正确性）**

**修改：** `src/features/customer/app/CustomerPage.tsx`

```tsx
const handleViewDetail = (customer: Customer) => {
  const displayName = customer.name.split('\n')[0] || customer.name;
  router.push(`/customer/detail?id=${encodeURIComponent(customer.id)}&name=${encodeURIComponent(displayName)}`);
};
```

**修改：** `src/features/customer/services/customerService.ts`

新增：
```ts
export const customerService = {
  ...existing methods,
  getCustomerById(id: string): Customer | null {
    const all = this.getAllCustomers();
    return all.find(c => c.id === id) ?? null;
  }
};
```

**修改：** `src/features/customer/app/CustomerDetailPage.tsx`

用 `customerService.getCustomerById(id)` 而非仅靠 URL 的 name 参数。

**验收：** 客户改名后，原有详情页 URL（携带旧名字）依然能加载正确客户信息。

---

### TASK-50-E：详情页增加基本信息卡片

**优先级：高（功能缺口）**

**新建：** `src/features/customer/components/CustomerInfoCard.tsx`

显示内容：
```
┌──────────────────────────────────────────────────────────┐
│  [头像]  公司名称（company 或 name首行）      [✏️ 编辑]  │
│          简称：companyShortName                           │
│  📧 email   📞 phone   📍 address                        │
│  联系人：联系人1(简称) · 联系人2(简称)                   │
└──────────────────────────────────────────────────────────┘
```

Props：
```tsx
interface CustomerInfoCardProps {
  customer: Customer;
  onEdit: () => void;
}
```

样式：`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6`

**修改：** `src/features/customer/app/CustomerDetailPage.tsx`

- 顶部（tab nav 上方）渲染 `<CustomerInfoCard>`
- 增加 `showEditModal` state
- 复用 `CustomerModal` + `CustomerForm` + `useCustomerForm` + `useCustomerActions`
- 编辑保存后刷新 customer 数据

**验收：** 详情页顶部正确显示客户所有字段；编辑保存后立即更新不需刷新页面。

---

### 不要改动

- `CustomerForm.tsx` 分区双列网格（TASK-31 完成）
- `CustomerModal` 的 `max-h-[85vh] overflow-y-auto max-w-2xl`
- `Contact[]` 动态增删逻辑（TASK-34 完成）
- localStorage 键名：`customer_management`、`customer_timeline_events`、`customer_followups`

### 验证命令

```bash
npx tsc --noEmit
npm run build
grep -r "window\.confirm\|window\.alert" src/features/customer  # 应无结果
```

### 实际落地

- 新增 `src/components/ui/ConfirmDialog.tsx`：统一确认弹窗，支持 danger/default、Escape 取消、点击遮罩取消。
- `src/features/customer/hooks/useCustomerActions.ts`：所有 `confirm(...)` 已替换为 `await showConfirm(...)`；保存/删除失败的 `alert` 改为 `console.error`。
- `src/features/customer/app/CustomerPage.tsx`：增加 `showConfirm` 状态流，删除/重命名确认改走 React 弹窗；详情页跳转改为 `id=${customer.id}`，`name` 仅用于显示。
- `src/features/customer/services/timelineService.ts`：新增 `getCountsByCustomer()`，并补充 `getEventsByCustomerIds()` / `getFollowUpsByCustomerIds()`，用于 ID 化后的旧数据兼容。
- `src/features/customer/components/CustomerList.tsx`：活跃度、需跟进、活跃排序改为使用批量 Map 统计；兼容旧数据中以客户名作为 key 的时间轴/跟进记录。
- `src/features/customer/components/FilterChipBar.tsx`：搜索框增加 300ms 防抖，输入过程中不立即触发父级过滤。
- `src/features/customer/app/CustomerDetailPage.tsx`：详情页按客户 ID 回读客户资料，旧链接按客户名兜底；顶部增加基本信息卡片；编辑保存后重新读取客户数据并即时刷新。
- 新增 `src/features/customer/components/CustomerInfoCard.tsx`：展示客户基础资料、联系方式、地址、联系人和编辑入口。
- `src/features/customer/hooks/useCustomerTimeline.ts`、`useCustomerFollowUp.ts`、`CustomerTimeline.tsx`、`FollowUpManager.tsx`：主 key 使用客户 ID，同时用客户名作为旧数据兼容别名。

### 验证结果

```bash
npx tsc --noEmit
rg -n "window\.confirm|window\.alert|\bconfirm\(" src/features/customer -S
```

结果：

- TypeScript 检查通过。
- 客户模块内已无 `window.confirm` / `window.alert` / 裸 `confirm(...)`。
- 尚未完成带登录态的浏览器手测，后续发布前建议在 `/customer` 与 `/customer/detail?id=...` 各走一遍添加、删除、编辑和详情页保存流程。

---

## TASK-51：修复 pdfHelpers.ts 静态 import 28MB embedded-resources

**背景**

`src/lib/embedded-resources.ts` 是构建时自动生成的 **28MB 文件**（两个 11MB 中文字体 + 印章图片的 base64）。  
`src/utils/pdfHelpers.ts` 第 6 行对其做了**静态 top-level import**，导致该 28MB 依赖被打包进所有引用 `pdfHelpers` 的页面 chunk，影响的路由包括：`/quotation`、`/packing`、`/invoice`、`/purchase`、`/history`。  
用户打开任何单据页面，浏览器都必须先下载并解析这 28MB，严重拖慢首屏可交互时间。

**目标**：将 `pdfHelpers.ts` 中对 `embeddedResources` 的引用改为**函数内部动态 import**，使其仅在真正生成 PDF 时才按需加载。

---

### 改动一：`src/utils/pdfHelpers.ts`

1. **删除**文件顶部的静态 import（第 6 行）：
   ```ts
   // 删除这行
   import { embeddedResources } from '@/lib/embedded-resources';
   ```

2. 找到所有使用 `embeddedResources` 的函数（约在 449、451、520、522 行，涉及印章获取逻辑），将这些函数改为 `async`，并在函数体内部动态 import：
   ```ts
   // 示例：原来的同步函数
   export function getStampBase64(stamp: 'shanghai' | 'hongkong'): string {
     if (stamp === 'shanghai') return embeddedResources.shanghaiStamp;
     return embeddedResources.hongkongStamp;
   }

   // 改为 async + 动态 import
   export async function getStampBase64(stamp: 'shanghai' | 'hongkong'): Promise<string> {
     const { embeddedResources } = await import('@/lib/embedded-resources');
     if (stamp === 'shanghai') return embeddedResources.shanghaiStamp;
     return embeddedResources.hongkongStamp;
   }
   ```

3. 对文件内**所有**直接读取 `embeddedResources.*` 的代码（不局限于上述两个函数，全文搜索确认无遗漏）均做同样处理。

---

### 改动二：修复所有调用方

`pdfHelpers.ts` 中受影响的函数签名从同步变为异步后，所有调用方需对应加 `await`：

- 搜索 `src/` 下所有 `import.*pdfHelpers` 或调用上述函数的位置
- 对每处调用加 `await`，确保调用方函数也是 `async`
- 重点检查：`PDFPreviewComponent.tsx`、`PDFPreviewModal.tsx`、各 PDF 生成器

---

### 验证命令

```bash
npx tsc --noEmit
# 确认 pdfHelpers.ts 顶部无 embeddedResources 静态 import
grep -n "^import.*embedded-resources" src/utils/pdfHelpers.ts  # 应无输出
npm run build
```

**验收标准**：TypeScript 无错误，构建成功，各 PDF 生成功能正常（报价单、箱单、发票、采购单均能生成）。

---

## TASK-52：ClientInitializer 移除 preloadImages / 字体预热延迟至 idle

**背景**

`src/components/ClientInitializer.tsx` 在 layout.tsx 根布局挂载，页面加载后 **300ms** 就触发以下动态 import 链：

```
ClientInitializer（300ms）
  → import imageLoader.ts
    → imageLoader 内部 import('@/lib/embedded-resources')  ← 下载 28MB
  → import globalFontRegistry.ts
    → loadFontDataOnce()  ← 下载中文字体
```

这些操作与首屏渲染争抢网络和 CPU，且完全不必要——图片和字体只在用户点击"生成 PDF"时才需要。

**目标**：移除 `preloadImages()` 调用；字体预热推迟到浏览器真正空闲时再执行。

---

### 改动：`src/components/ClientInitializer.tsx`

```ts
// 修改前（约第 28-38 行）
const { preloadFonts } = await import('../utils/fontLoader');
const { preloadImages } = await import('../utils/imageLoader');
const { initializeGlobalFonts } = await import('../utils/globalFontRegistry');

if (!cancelled) {
  await initializeGlobalFonts();
}

if (!cancelled) {
  await preloadImages();  // ← 删除这两行
}

// 修改后
const { initializeGlobalFonts } = await import('../utils/globalFontRegistry');

// 字体预热推迟到浏览器空闲（不阻塞渲染，timeout 8000ms 兜底）
if (!cancelled) {
  const runFontWarmup = () => {
    initializeGlobalFonts().catch(err => {
      console.warn('[ClientInitializer] 字体预热失败:', err);
    });
  };

  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void })
      .requestIdleCallback(runFontWarmup, { timeout: 8000 });
  } else {
    setTimeout(runFontWarmup, 5000);
  }
}
```

同时删除 `preloadFonts` 相关 import（如未在其他地方使用）。

---

### 验证命令

```bash
npx tsc --noEmit
npm run build
# 确认 ClientInitializer 内无 preloadImages 调用
grep -n "preloadImages" src/components/ClientInitializer.tsx  # 应无输出
```

**验收标准**：构建成功；打开应用后 Network 面板中，`embedded-resources` chunk 不再在页面加载后 300ms 内出现（仅在点击生成 PDF 时才出现）。

---

## TASK-53：主要路由改为 dynamic import（ssr: false）

**背景**

除 `customer/page.tsx` 外，所有路由 page.tsx 均为静态 import，导致每个路由 chunk 包含所有子组件（含 2000+ 行的 ItemsTableEnhanced 等重型组件），增大初始 JS 解析量，延迟首次可交互时间。

**目标**：对 6 个主要路由改为 `next/dynamic` + `ssr: false`，参照 customer/page.tsx 的已有实现。

---

### 改动：以下文件均按同一模式修改

需修改的文件：
- `src/app/quotation/page.tsx`
- `src/app/packing/page.tsx`
- `src/app/invoice/page.tsx`
- `src/app/purchase/page.tsx`
- `src/app/history/page.tsx`
- `src/app/inquiry/page.tsx`
- `src/app/admin/page.tsx`

**统一改法**（以 packing 为例，其他同理）：

```tsx
'use client';

import dynamic from 'next/dynamic';

const PackingPage = dynamic(
  () => import('@/features/packing').then(mod => ({ default: mod.PackingPage })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <span className="text-gray-600 dark:text-gray-400">加载中...</span>
        </div>
      </div>
    ),
  }
);

export default function PackingPageWrapper() {
  return <PackingPage />;
}
```

注意：
- `quotation/page.tsx` 当前直接 `export { default } from '...'`，改为上述包裹形式
- `admin/page.tsx` loading 文案用"加载管理面板..."
- `inquiry/page.tsx` loading 文案用"加载询报价登记..."
- dashboard 页面**不改**（它不含重型 PDF 依赖，且需要快速展示）

---

### 验证命令

```bash
npx tsc --noEmit
npm run build
```

**验收标准**：构建成功，各路由页面正常加载，loading 旋转动画正常显示。

---

## TASK-54：middleware.ts 清理生产环境 console.log

**背景**

`src/middleware.ts` 中多处 `console.log('[中间件]...')` 在生产环境每次请求都执行，Vercel Edge Runtime 中有轻微性能影响。

---

### 改动：`src/middleware.ts`

将所有 `console.log` 用 `if (process.env.NODE_ENV === 'development')` 包裹：

```ts
// 修改前
console.log('[中间件] 没有token，拒绝访问:', pathname);

// 修改后
if (process.env.NODE_ENV === 'development') {
  console.log('[中间件] 没有token，拒绝访问:', pathname);
}
```

文件内共 4 处 `console.log`，全部处理。

---

### 验证命令

```bash
npx tsc --noEmit
grep -n "console\.log" src/middleware.ts  # 每处都应被 NODE_ENV 判断包裹
```

---

## TASK-55：next.config.mjs 配置清理

**背景**

当前 `next.config.mjs` 中存在三处对 Vercel 部署有害或多余的配置：

1. `output: 'standalone'`：Vercel 自动处理部署产物，`standalone` 模式会产生额外文件并可能与 Vercel 的构建流程冲突
2. 手动 `splitChunks` 配置：Next.js 14 已内置最优分包策略，手动覆盖可能破坏默认优化（当前配置将所有 node_modules 打成一个 `vendors` chunk，反而可能变大）
3. `generateEtags: false`：关闭 ETag 会导致浏览器无法利用 304 缓存响应，增加不必要的重复下载

---

### 改动：`next.config.mjs`

**删除以下三项**：

```js
// 删除
output: 'standalone',

// 删除
generateEtags: false,

// 删除 webpack splitChunks 手动配置（约 85-110 行的 splitChunks 和 file-loader 规则）
// 保留 dev 环境的 watchOptions 配置即可
```

webpack 函数修改后保留形式：

```js
webpack: (config, { dev }) => {
  if (dev) {
    config.watchOptions = {
      poll: 1000,
      aggregateTimeout: 300,
    };
  }
  return config;
},
```

---

### 验证命令

```bash
npm run build
# 确认构建无警告，Vercel Preview 部署正常
```

---

## TASK-56：登录页移除 localStorage 绕过 session 跳转逻辑

**背景**

`src/app/page.tsx`（登录页）有一段 useEffect：当 `status === 'unauthenticated'` 时，检查 localStorage 中是否有 24 小时内的用户数据，若有则直接 `router.push('/dashboard')`。

这是错误逻辑：session 真正过期后，用户应该重新登录，而不是被 localStorage 的过期数据推入 dashboard，导致在 dashboard 遇到未认证状态再被重定向回来（额外的重定向往返），且存在安全隐患。

---

### 改动：`src/app/page.tsx`

找到以下 useEffect 并**整体删除**（仅删除 `status === 'unauthenticated'` 分支中检查 localStorage 的部分，保留 `status === 'authenticated'` 时的跳转）：

```ts
// 删除这段（大约在 useEffect 内 status === 'unauthenticated' 分支）
if (status === 'unauthenticated' && typeof window !== 'undefined') {
  try {
    const userInfo = localStorage.getItem('userInfo');
    const latestPermissions = localStorage.getItem('latestPermissions');
    const permissionsTimestamp = localStorage.getItem('permissionsTimestamp');
    
    if (userInfo && latestPermissions && permissionsTimestamp) {
      const userData = JSON.parse(userInfo);
      const isRecent = (Date.now() - parseInt(permissionsTimestamp)) < 24 * 60 * 60 * 1000;
      
      if (userData.username && isRecent) {
        router.push('/dashboard');
        return;
      }
    }
  } catch (error) {
    console.warn('检查本地用户信息失败:', error);
  }
}
```

保留 `status === 'authenticated'` 时跳转 dashboard 的逻辑，不动其他部分。

---

### 验证命令

```bash
npx tsc --noEmit
# 确认登录页无 localStorage 跳转逻辑
grep -n "latestPermissions\|permissionsTimestamp\|userInfo" src/app/page.tsx  # 应无输出
```

**验收标准**：session 过期后访问根路径，停留在登录页等待用户输入，不再自动跳转。
