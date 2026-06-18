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

## TASK-15：读取路径切换 D1 Primary（可选，高风险）

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

## 里程碑：数据管线完成（TASK-09 ~ TASK-15）

| 层次 | 实现 | 文件 |
|------|------|------|
| **写入** | localStorage 主写 + D1 fire-and-forget | `d1Sync.ts` |
| **迁移** | 管理员一键批量迁移历史数据 | `d1Migration.ts`, `D1MigrationPanel` |
| **API** | Document / Customer CRUD 全套 | `worker.ts`, `/api/documents`, `/api/customers` |
| **读取** | 登录时从 D1 拉取合并到 localStorage | `d1Pull.ts`, `useD1Sync.ts` |
| **鉴权** | Bearer token（Worker）+ NextAuth session（Next.js 代理）| `worker.ts`, `/api/admin/[...path]` |
