# Current State

最后更新：2026-07-07
当前分支：`main`
当前提交：以 `git log -1 --oneline` 为准
应用版本：`1.2.0`（`package.json`）
最近发布 tag：`v1.2.0`

## 定位

LC App / MLUONET 是 Luo & Company 内部业务管理系统，不是展示站。核心工作流包括外贸报价、内销报价、销售确认、询报价登记、订单状态跟踪、采购部登记、采购订单表、装箱单、财务发票、采购订单、客户资料、权限管理和 AI 邮件助手。

维护优先级：业务稳定 > 数据兼容 > PDF/Excel 输出正确 > UI 打磨 > 重构。

## 技术与部署

- 前端：Next.js 14、React 18、TypeScript 5、Tailwind CSS 3。
- 主站：Vercel，香港 `hkg1` 区域。
- 用户和权限服务：Cloudflare Worker + D1，自定义域 `https://udb.luocompany.net`。
- AI 邮件：DeepSeek Chat API，通过 `/api/generate` 调用。
- PDF/Excel：前端生成；字体、头图、印章资源由 `scripts/embed-resources.js` 在构建时嵌入到 `src/lib/embedded-resources.ts`。

## 代码质量现状

截至 2026-07-04，已完成一轮全量 lint warning 清理：

- `@typescript-eslint/no-unused-vars`：清零。
- `@typescript-eslint/no-explicit-any`：清零；动态数据入口改为复用现有类型或 `unknown` + 类型收窄。
- `react-hooks/exhaustive-deps`：清零；一次性初始化和防循环同步场景使用局部 `eslint-disable-next-line` 并附中文原因说明。
- `npx tsc --noEmit`：通过。
- `npx next lint`：0 warnings / 0 errors。
- `npm run build`：通过。构建会重新生成 `src/lib/embedded-resources.ts`，该文件仍不应手工编辑。

## 路由与模块

| 路由 | 模块 | 当前状态 |
|------|------|----------|
| `/dashboard` | 首页 | 快速创建、最近文档、权限过滤入口 |
| `/quotation` | 外贸报价合同（报价单 / 销售确认） | 已合并为同一入口，页面顶部不再有 tab 按钮，改在设置面板内用 "Type: Quotation / Sales Confirmation" 切换；本地历史为主，支持 PDF/Excel、复制、编辑 |
| `/quotation?tab=domestic` | 内销报价合同 | 独立侧边栏入口，复用报价单页面与 `quotation_history` 存储 key，默认 CNY，中文录入表单和中文合同式 PDF，历史记录使用独立 `type='domestic'`，避免混入外贸报价单 |
| `/inquiry` | 询报价登记 | 已接入 D1 `Document`，支持客户/联络人关联、批量关联、筛选 |
| `/order` | 订单状态表 | 复用询报价记录，支持订单状态、金额权限和进行中筛选 |
| `/purchase-registration` | 采购部登记 | 复用询报价 D1 JSON 记录，只开放采购部描述、采购询报价状态和执行情况字段 |
| `/purchase-order-table` | 采购订单表 | 独立 D1 登记表，使用 `Document.type='purchase'` + `_shared_purchase_` 共享记录，不自动导入旧 `purchase_history` |
| `/packing` | 箱单发票 | 支持从销售确认导入，已切断装箱单 Consignee 反向污染客户库的保存动作 |
| `/invoice` | 财务发票 | 本地历史为主，支持导入、PDF/Excel、复制、编辑 |
| `/purchase` | 采购订单 | 本地历史为主，支持供应商资料、PDF、草稿 |
| `/history` | 单据历史 | 汇总本地历史，支持搜索、筛选、导入导出 |
| `/customer` | 客户管理 | 客户/供应商/收货人统一资料库，支持分类、卡片/列表视图、详情 |
| `/customer/detail` | 资料详情 | 客户/供应商/收货人详情；名称和地址支持行内编辑；客户详情显示联络人、统计、活动列表、跟进记录；收货人详情显示收货订单 |
| `/mail` | AI 邮件 | DeepSeek 邮件生成和回复 |
| `/admin` | 管理后台 | 用户管理、账号状态、管理员状态、模块权限 |
| `/clock` | 时区汇率 | 工具模块，受权限控制；包含时间轴城市联动和外币兑人民币换算 / 走势 |
| `/holidays` | 全球假日 | 工具模块，受权限控制；按月展示 2026 假日，支持详情展开和进入后定位当前月份 |
| `/rmb` | RMB 大写 | 工具模块，受权限控制 |
| 外部链接 | IMPA 物料 | 左侧入口打开 `https://impa.luocompany.com`，受 `impa` 权限控制 |

## 权限现状

唯一模块注册表：`src/constants/permissionModules.ts`。

当前模块：

```text
quotation
packing
invoice
purchase
inquiry
inquiry.batchEdit
order.financials
purchaseRegistration
purchaseOrderTable
history
customer
ai-email
impa
clock
holidays
rmb
```

说明：

- `quotation` 同时控制外贸报价单、内销报价单和销售确认。
- `inquiry` 控制完整询报价登记和订单状态表入口。
- `purchaseRegistration` 控制采购部登记过滤视图；该视图不授予完整询报价登记权限。
- `purchaseOrderTable` 控制独立采购订单表登记视图。
- `inquiry.batchEdit` 是询报价批量编辑 / 导入导出高级权限。
- `order.financials` 是订单状态表金额、回款、到账金额高级权限。
- `admin` 不是普通 moduleId，后台访问由 `isAdmin` 和中间件控制。
- 左侧 `IMPA物料` 已从公开硬编码入口改为 `impa` 模块权限。

## 数据存储现状

### Cloudflare D1

`schema.sql` 当前包含：

- `User`：用户账号、密码 hash、邮箱、状态、管理员标记。
- `Permission`：用户到 moduleId 的权限映射。
- `quotation_history`：旧兼容表，主站历史当前不以此表为主。
- `Document`：统一业务单据表，当前询报价登记、采购部登记过滤视图、采购订单表使用该表；其他业务模块仍以本地历史为主。
- `Customer`：客户、供应商、收货人公司资料。
- `Contact`：客户/供应商/收货人的联络人资料。
- `CustomerEvent`：客户时间轴和跟进相关事件。

已存在迁移文件：

```text
002_add_inquiry_type.sql
003_grant_default_tool_permissions.sql
004_customer_contacts_redesign.sql
005_fix_customer_event_fk_after_task59.sql
006_backfill_inquiry_customer_links.sql
007_grant_default_impa_permission.sql
008_add_domestic_document_type.sql
```

生产确认：

- `007_grant_default_impa_permission.sql` 已在远程 D1 执行。
- 执行后复查：`impa_permissions = 8`，`enabled_permissions = 8`。

### localStorage

多数历史单据仍保存在浏览器 `localStorage`，关键 key：

```text
quotation_history
invoice_history
packing_history
purchase_history
customer_management
supplier_management
consignee_management
customer_timeline_events
customer_followups
new_customer_tracking
draftQuotation
draftPurchase
qt.visibleCols
pk.visibleCols
themeConfig
theme-config
```

注意：浏览器存储约 5MB 上限仍是架构风险。新增长文本、图片或大批量历史时需要评估配额。

## 前端交互与主题现状

- 全局反馈入口为 `src/components/ui/Toast.tsx`，支持 success / error / warning / info / loading、更新已有 toast、promise-style 流程、hover 暂停、Esc 关闭最新一条和最多 4 条堆叠。
- 全局二次确认入口为 `src/components/ui/ConfirmDialog.tsx`。纯提示类反馈使用 Toast，需要用户决策的危险操作使用 ConfirmDialog。
- 主题系统只保留明暗模式，不再提供 `classic` / `colorful` 按钮主题；配置写入 `theme-config`，并兼容旧 `themeConfig`。
- 深色模式层级：应用主背景为 `#1c1c1e`，弹层 / 用户菜单表面为 `#2c2c2e`；Tailwind 语义色为 `app.dark.base` 和 `app.dark.surface`。
- Dashboard 模块卡片使用静态 Tailwind 背景类（浅色 `bg-*-50`，深色 `dark:bg-*-500/10`），不再依赖运行时 CSS 变量注入或 `!important` 覆盖。
- 用户菜单个人信息子菜单的「账户工具」包含主题紧凑切换和权限刷新图标按钮；权限刷新通过 `usePermissionRefresh.ts` 调用 `/api/auth/force-refresh-session`。
- 预加载只保留真实阶段：静态资源到 50%，PDF 字体到 100%；空实现的表单页 / 脚本样式阶段已移除。完成后用户菜单中的预加载行直接隐藏，不再显示「资源已预加载 (100%)」（详见 `docs/features/PRELOAD_FEATURE.md`）。
- 用户菜单个人信息子菜单在 <640px 屏幕下改为在按钮下方原地展开，避免移动端 220px 侧边栏空间不足导致子菜单溢出可视区域；`sm` 及以上保持原有向右弹出。
- 移动端侧边栏和整体布局容器改用 `.app-h-dvh`（`100vh` 回退 + `100dvh` 覆盖），修复移动浏览器地址栏显示时固定侧边栏底部（用户菜单）被压到可视区域外的问题。

## 客户管理现状

- 客户、供应商、收货人共用 `Customer` + `Contact` 数据模型。
- 公司信息在客户顶层字段；人的信息统一在 `contacts[]`。
- 客户支持分类：`A` / `B` / `C` / `New` / `Blacklist`。
- 分类备注保存在 `Customer.data.categoryNote`，分类保存在 `Customer.data.category`，未新增 D1 字段。
- 客户页支持列表/卡片视图、分类筛选、搜索、详情页。
- 客户/供应商/收货人详情卡片的名称和地址支持行内编辑，使用勾号保存、叉号取消，不再打开整表单编辑弹窗。
- 收货人管理的列表/卡片视图显示对应收货人的收货订单数量，不显示主联络人摘要。
- 收货人详情页隐藏联络人区块，订单区域标题为「收货订单」。
- 收货人详情的「收货订单」按 `InquiryRecord.orderDeliveryConsignee` 与收货人显示名称精确匹配。
- 客户详情活动列表显示该客户全部联络人的询价记录。
- 客户详情活动列表左侧编号优先显示订单编号；没有订单编号时显示询价编号。
- 客户详情活动列表会区分询价订单附加状态：辙销显示「已辙销」、悬挂显示「已悬挂」、善后显示「善后」；若询价记录带 `orderSubStatusRemark`，活动描述会追加该情况备注。
- 询价编辑弹窗的客户/联络人显示以客户资料为准，不信任旧记录里的历史文本。
- `CustomerContactPicker` 在多个联络人标签退化为同一公司简称时只保留一项，优先主联络人。

## 询报价与订单状态现状

- 询报价记录已支持 `customerId`、`contactId` 结构化关联。
- 采购部登记复用 `InquiryRecord`，新增 `purchaseContentDesc` 与 `purchaseInquiryStatus` 两个采购部专用字段，不复用询报价登记的 `description`、`supplierStatuses` 或 `quotedStatuses` 状态。
- 询价成单后支持 `orderSubStatus` 标记：`cancelled`（辙销C）、`suspended`（悬挂P）、`followup`（善后S）。
- 编辑询价时选择 C/P/S 标记会出现单行「情况备注」，保存到 `orderSubStatusRemark`；取消标记或清空订单编号会清空该备注。
- 询价 Excel 导入导出包含 `订单标记`、`订单备注` 两列；D1 仍通过 `Document.data` JSON 透传，无需 schema 迁移。
- 新增询价要求选择客户/联络人；旧记录可保留文本继续编辑。
- 批量关联客户会写入 `customerId`、`contactId` 和规范化 `inquirer`。
- 订单状态表可通过 `quoteStatus=has_order` 从客户详情跳转到“已成单”筛选。
- 订单状态表会在客户订单号下方显示 C/P/S 情况备注，并按辙销红色、悬挂绿色、善后蓝色着色。
- 订单状态表的执行情况支持 `orderDeliveryConsignee` 收货人关联。收货人只在「交货」编辑态下选择，但关联属于订单本身；后续把执行情况改为「发票」或「备货」不会自动清空收货人。
- 只有点击执行情况「清除」按钮，或在「交货」编辑态下把收货人下拉框选回空白，才会解除 `orderDeliveryConsignee` 关联。
- 金额相关字段由 `order.financials` 高级权限控制。

## 采购订单表现状

- `/purchase` 仍是旧采购订单单据创建功能，数据保存在 `purchase_history`，用于 PDF/Excel 和草稿。
- `/purchase-order-table` 是并行的新登记表，走 D1 `Document.type='purchase'`，`user_id='_shared_purchase_'`，用于团队共享列表和状态追踪。
- 新采购订单表当前支持采购单号、供应商、金额、创建日期、备货/交货/发票状态的新增、编辑、删除和筛选。
- 旧 `purchase_history` 不会自动迁移或显示在新采购订单表中。

## 文档维护规则

- `docs/core/CURRENT_STATE.md`：最新事实源，记录“现在是什么样”。
- `docs/core/CHANGELOG.md`：变更历史，记录“什么时候改了什么”。
- `CODEX_TASKS.md`：任务执行和验收记录，记录“为什么做、怎么做、如何验收”。
- `docs/features/**`、`docs/technical/**`、`docs/bugfixes/**`：模块说明、技术说明和历史修复记录。旧文档不应为了“最新”而重写历史结论，除非它是入口文档或明确误导当前维护。

## 已知风险

1. Worker 管理接口仍依赖客户端传入 `X-User-*` 请求头，存在伪造风险，应迁移到 HMAC/JWT 或服务端 session 校验。
2. `wrangler.toml` 中仍存在明文 token，应迁移到 Cloudflare secret 并轮换。
3. 业务历史仍大量依赖 `localStorage`，有容量和多设备同步风险。
4. `src/lib/d1-client.ts` 的 `validatePassword` bcrypt 分支存在已知问题，修改密码相关功能需谨慎验证。
5. `silent-refresh` 服务端分支依赖浏览器缓存，仍不可作为可靠刷新机制。
6. `src/components` 与 `src/features` 仍有迁移中的重复边界，修改前必须确认实际 import 路径。
