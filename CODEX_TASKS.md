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
