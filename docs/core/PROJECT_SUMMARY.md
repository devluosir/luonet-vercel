# MLUONET 项目总结

最后更新：2026-07-06

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

## 核心模块

| 模块 | 路由 | 状态 |
|------|------|------|
| Dashboard | `/dashboard` | 快速入口、最近文档、权限过滤 |
| 报价 / 销售确认 | `/quotation` | 本地历史为主，支持 PDF/Excel |
| 询报价登记 | `/inquiry` | 已接入 D1 `Document`，支持客户/联络人关联和批量关联 |
| 订单状态表 | `/order` | 基于询报价记录，支持订单状态、收货人关联和金额权限 |
| 装箱单 | `/packing` | 本地历史为主，支持 PDF 和唛头 |
| 财务发票 | `/invoice` | 本地历史为主，支持 PDF/Excel |
| 采购订单 | `/purchase` | 本地历史为主，支持供应商资料和草稿 |
| 客户管理 | `/customer` | D1 客户/供应商/收货人资料，支持联络人、分类、详情行内编辑、收货订单 |
| AI 邮件 | `/mail` | DeepSeek 邮件生成和回复 |
| 管理后台 | `/admin` | 用户、状态、管理员、模块权限 |
| 工具 | `/clock` 时区汇率、`/holidays` 全球假日、`/rmb`、IMPA 外链 | 受模块权限控制；时区汇率含时间 / 汇率 Tab，全球假日含详情展开和当前月份定位 |

## 数据现状

- 用户和权限：Cloudflare D1。
- 询报价登记：D1 `Document`。
- 客户/供应商/收货人：D1 `Customer` + `Contact`。
- 多数历史单据：浏览器 `localStorage`。
- PDF 静态资源：构建时嵌入 `src/lib/embedded-resources.ts`。

## 权限现状

权限唯一注册表是 `src/constants/permissionModules.ts`。

模块包括：

```text
quotation, packing, invoice, purchase,
inquiry, inquiry.batchEdit, order.financials,
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

1. Worker 管理接口仍依赖客户端 `X-User-*` 请求头，存在伪造风险。
2. `wrangler.toml` 仍有明文 token，应迁移到 Cloudflare secret 并轮换。
3. 多数业务历史仍在 `localStorage`，有容量和多设备同步风险。
4. `src/lib/d1-client.ts` 的 `validatePassword` bcrypt 分支和 `silent-refresh` 仍需后续处理。
5. `src/components` 与 `src/features` 仍有迁移中的重复边界。

更完整现状见 [CURRENT_STATE.md](CURRENT_STATE.md)。
