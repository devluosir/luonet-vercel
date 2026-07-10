# 会话摘要

> 供下次接续上下文用。按时间倒序，只保留最近若干条。

---

## 2026-07-10 — TASK-128 询报价增量同步

**状态**：已完成并上线（Worker 已 `wrangler deploy`）

### 做了什么

- **Worker**（`src/worker.ts`）：`GET /api/inquiry` 支持 `since` 查询参数，按 `updated_at >= since` 过滤；非法/缺失参数退化为整表拉取。
- **Service**（`inquiry.service.ts`）：`pullFromD1(since?)` 透传水位；`mergeFieldsOnly` 改写为 Map-based upsert（增量结果不会冲掉未变化的历史记录）。
- **Hook**（`useInquirySync.ts`）：拆分 `fullSync` / `incrementalSync`；轮询 30s→60s，整表兜底 5min→1h。
- **测试**：新增 `mergeFieldsOnly` 四场景单测（增量保留、软删除、TASK-124 pending 保护、字段级合并）。
- **部署**：Cloudflare Worker Version ID `1d8dc897-6961-4152-9172-5e81adf1f986`（`udb.luocompany.net`）。

### 影响模块

`/inquiry`、`/order`、`/purchase-registration`、`/purchase-order-table` 四个页面的后台同步。

### 验证方式

1. DevTools Network：`/api/inquiry` 在 meta 变化后应带 `?since=...`，响应体明显小于整表。
2. 采购部登记 / 采购订单表：历史记录完整，不因增量同步只剩几条。
3. 订单状态表编辑 `orderCustomerNo` 后，采购订单表仍能看到（TASK-124 回归）。

### 风险 / 注意

- Vercel 主站需 push 后自动部署，客户端增量逻辑才生效；Worker 与 Next.js 需**分别**部署。
- `incrementalSync` 不调用 `pushLocalToD1`（设计如此）；本地独有记录的推送只在 `fullSync` 整表路径发生。
- 相关 bug 记录：`bug_inquiry_sync_phantom_records`、`bug_inquiry_restricted_view_cache_corruption`、`bug_inquiry_merge_pending_protection`（TASK-124）。

### 未做 / 后续

- 观察 Vercel Fluid CPU 用量是否下降（需运行数日后对比）。
- 如需回滚 Worker：重新 deploy 上一版 worker 代码即可；客户端不传 `since` 时行为与旧版兼容。
