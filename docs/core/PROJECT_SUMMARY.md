# MLUONET 项目总结

最后更新：2026-07-09

## 项目定位

MLUONET / LC App 是 Luo & Company 内部业务管理系统，用于处理报价、销售确认、询报价登记、订单状态、装箱单、财务发票、采购订单、客户资料、权限管理和 AI 邮件助手。

它不是展示站，维护优先级是：业务稳定 > 数据兼容 > PDF/Excel 输出正确 > UI 打磨 > 重构。

## 当前技术栈

- Next.js 14 App Router
- React 18
- TypeScript 5
- Tailwind CSS 3
- Zustand
- NextAuth Credentials
- Cloudflare Worker + D1
- Vercel 部署
- DeepSeek Chat API

## 当前代码质量

- 2026-07-04 已完成全量 lint warning 清理，`npx next lint` 为 0 warnings / 0 errors。
- `npx tsc --noEmit` 通过。
- `npm run build` 通过。
- `no-explicit-any` 已清零；动态输入优先使用现有业务类型或 `unknown` + 类型收窄。
- `react-hooks/exhaustive-deps` 已清零；保留的局部 disable 均有中文原因说明，用于一次性初始化或防循环同步。
- 2026-07-06 已统一全局 Toast / ConfirmDialog、深色模式层级和主题系统；`npm run lint`、`npx tsc --noEmit`、`npm run build` 通过。
- 2026-07-09 P0：改密 bcrypt、登录限流、NEXTAUTH_SECRET 强制、AI 邮件模块权限校验、入口文档对齐。

## 核心模块

| 模块 | 路由 | 状态 |
|------|------|------|
| Dashboard | `/dashboard` | 快速入口、最近文档、权限过滤 |
| 报价 / 销售确认 | `/quotation` | 本地历史为主 + D1 双写，支持 PDF/Excel |
| 内销报价 | `/quotation?tab=domestic` | 独立入口，中文合同式 PDF |
| 询报价登记 | `/inquiry` | 已接入 D1 `Document`，支持客户/联络人关联和批量关联 |
| 订单状态表 | `/order` | 基于询报价记录，支持订单状态、收货人关联和金额权限 |
| 采购部登记 | `/purchase-registration` | 询报价过滤视图 |
| 采购订单表 | `/purchase-order-table` | 已成单过滤视图 |
| 装箱单 | `/packing` | 本地历史为主 + D1 双写，支持 PDF 和唛头 |
| 财务发票 | `/invoice` | 本地历史为主 + D1 双写，支持 PDF/Excel |
| 采购订单 | `/purchase` | 本地历史为主 + D1 双写，支持供应商资料和草稿 |
| 客户管理 | `/customer` | D1 客户/供应商/收货人资料，支持联络人、分类、详情行内编辑、收货订单 |
| AI 邮件 | `/mail` | DeepSeek 邮件生成和回复（需 `ai-email` 权限） |
| 管理后台 | `/admin` | 用户、状态、管理员、模块权限 |
| 工具 | `/clock` 时区汇率、`/holidays` 全球假日、`/rmb`、IMPA 外链 | 受模块权限控制 |

## 数据现状

- 用户和权限：Cloudflare D1。
- 询报价登记 / 采购部登记 / 采购订单表：D1 `Document`。
- 客户/供应商/收货人：D1 `Customer` + `Contact`。
- 多数历史单据：浏览器 `localStorage` 为主，登录后 D1 拉取合并（含本地补推）。
- PDF 静态资源：构建时嵌入 `src/lib/embedded-resources.ts`。

## 权限现状

权限唯一注册表是 `src/constants/permissionModules.ts`。

模块包括：

```text
quotation, packing, invoice, purchase,
inquiry, inquiry.batchEdit, order.financials,
purchaseRegistration, purchaseOrderTable,
history, customer,
ai-email, impa, clock, holidays, rmb
```

`admin` 不是普通 moduleId，由 `isAdmin` 控制后台访问。

## 当前文档结构

- `docs/core/CURRENT_STATE.md`：最新事实源。
- `docs/core/CHANGELOG.md`：变更历史。
- `CODEX_TASKS.md`：任务执行记录。
- `docs/features/`：模块文档。
- `docs/technical/`：技术专题。
- `docs/bugfixes/`：历史修复记录。

## 已知风险

1. 权限刷新链路仍复杂；`src/components` 与 `src/features` 仍有双轨边界。
2. 多数历史单据仍以 `localStorage` 为主；跨设备靠双写 + 登录拉取（不做旧历史批量迁移）。
3. 页面级守卫与历史配额写入已在 2026-07-09 P1 落地；middleware 仍不做 moduleId 拦截。

更完整现状见 [CURRENT_STATE.md](CURRENT_STATE.md)。
