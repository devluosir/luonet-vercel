# Current State

最后更新：2026-07-17
当前分支：`main`
当前提交：以 `git log -1 --oneline` 为准
应用版本：`1.2.0`（`package.json`）
最近发布 tag：`v1.2.0`

## 定位

LC App / MLUONET 是 Luo & Company 内部业务管理系统，不是展示站。核心工作流包括外贸报价、内销报价、销售确认、询报价登记、订单状态跟踪、采购部登记、采购订单表、装箱单、财务发票、采购订单、客户资料、权限管理和 AI 邮件助手。

维护优先级：业务稳定 > 数据兼容 > PDF/Excel 输出正确 > UI 打磨 > 重构。

## 技术与部署

- 前端：Next.js 14、React 18、TypeScript 5、Tailwind CSS 3；图表用 `recharts`（首页询价/订单趋势图，2026-07-09 新增，此前项目未装任何图表库）。
- 主站：Vercel，香港 `hkg1` 区域。
- Web App：根布局通过 `/static/manifest.json` 声明 PWA manifest，并提供多尺寸 favicon 与 Apple Touch Icon；manifest 图标路径、格式和尺寸与磁盘资源一致。
- 用户和权限服务：Cloudflare Worker + D1，自定义域 `https://udb.luocompany.net`。
- 采购供应商后端：D1 migration 014 已于 2026-07-14 应用，`PurchaseSupplier` / `PurchaseSupplierContact` 及唯一编码索引已上线；Worker 新 API 已部署。
- AI 邮件：DeepSeek Chat API，通过 `/api/generate` 调用。
- PDF/Excel：前端生成；字体、头图、印章、logo 图标资源由 `scripts/embed-resources.js` 在构建时嵌入到 `src/lib/embedded-resources.ts`（该文件仍不手工编辑，改 `public/` 源文件后重跑脚本）。
- 全部 6 个 PDF 生成器（内销报价/合同、外贸报价单、销售确认、装箱单、发票、采购单）的表头已从整条横幅图片统一改为"logo 图标 + 矢量文字"排版，共享实现在 `src/utils/pdfHeaderBlock.ts`（`drawHeaderBlock()`），文字来自 `src/utils/companyLetterhead.ts` 的 `COMPANY_LETTERHEAD` 常量；单份文档体积减少约 80KB（双语表头场景）。`logoIcon`（`public/images/header-logo-icon.png`，237×246px，~13.8KB）不是简单的方形图标，而是直接从原横幅图裁出来的"菱形 LC 图标 + Luo & Company 文字"完整 lockup（96 色量化压缩），保留了原图标下方的蓝色 "Luo & Company" 小字——这行字是 logo 本身的一部分，不能用单纯的方形图标替代。绘制时按 237:246 的真实长宽比换算宽高，避免被拉伸变形。装箱单在横向 A4（显示 marks 列时）会触发文字居中宽度封顶（180mm）逻辑，避免 logo 和文字在宽页面上分得太开；其余 5 个纵向 A4 生成器不受影响，行为跟封顶前完全一致。原横幅图源文件 `public/images/header-bilingual.jpg`（~92KB）/`header-english.png`（~24KB）已删除，`embedded-resources.ts` 里对应的 `headerImage`/`headerEnglish` 资源项、`imageLoader.ts` 里的 `getHeaderImage()`/`getHeaderImageFormat()` 也已一并清理。

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
| `/dashboard` | 首页 | 快速创建（外贸报价/外贸合同/内销报价/内销合同各自独立入口+双维度图标）、今日新增/本月累计询价与订单统计、可切换粒度的询价/订单趋势图（`recharts`，仅 `inquiry` 权限可见）、最近文档、权限过滤入口 |
| `/quotation` | 外贸报价合同（报价单 / 销售确认） | 已合并为同一入口，页面顶部不再有 tab 按钮，改在设置面板内用 "Type: Quotation / Sales Confirmation" 切换；本地历史为主，支持 PDF/Excel、复制、编辑 |
| `/quotation?tab=domestic` | 内销报价合同 | 独立侧边栏入口，复用报价单页面与 `quotation_history` 存储 key，默认 CNY，中文录入表单和中文合同式 PDF，历史记录使用独立 `type='domestic'`，避免混入外贸报价单 |
| `/inquiry` | 询报价登记 | 已接入 D1 `Document`，支持客户/联络人关联、批量关联和筛选；列表点击行编辑，编辑弹窗可永久删除，批量删除仍为软删除；与另外三张登记表共用跨标签自适应同步 |
| `/order` | 订单状态表 | 复用询报价记录，支持订单状态、金额权限和进行中筛选 |
| `/purchase-registration` | 采购部登记 | 复用询报价 D1 JSON 记录，只开放内容描述（与询报价登记共享 description）和采购部专属供应商/报价状态字段；不含备货/交货/发票 |
| `/purchase-order-table` | 采购订单表 | 询报价登记的过滤视图，只展示 orderNo 有值的记录，不能新增/删除；支持一单多家采购供应商，采购单号/供应商在编辑弹窗维护；交货日期/执行情况与订单状态表双向共享，确认日期/客户订单号只读来自订单状态表 |
| `/packing` | 箱单发票 | 支持从销售确认导入，已切断装箱单 Consignee 反向污染客户库的保存动作 |
| `/invoice` | 财务发票 | 本地历史为主，支持导入、PDF/Excel、复制、编辑 |
| `/purchase` | 采购订单 | 本地历史为主，支持供应商资料、PDF、草稿 |
| `/history` | 单据历史 | 汇总本地历史，支持搜索、筛选、导入导出 |
| `/customer` | 客户管理 | 客户/供应商/收货人统一资料库，支持分类、卡片/列表视图、详情；独立统计视图展示全部客户趋势、询价 Top 10 和分类占比 |
| `/customer/detail` | 资料详情 | 客户/供应商/收货人详情；名称和地址支持行内编辑；客户详情显示联络人、单客户询价/已报价/订单趋势、活动列表和跟进记录；收货人详情显示收货订单 |
| `/purchase-supplier` | 采购供应商 | 采购侧独立主档三列列表（全称/简称堆叠、主联系人、供货范围），支持新增、归档、服务端搜索和点击进入详情；不与销售侧供应商同步 |
| `/purchase-supplier/detail` | 采购供应商详情 | 按 ID 加载（含归档资料），基本信息/采购设置在桌面双栏展示并逐项保存；基本信息逐项独占一行，采购设置按供应范围/类型、付款条件/币种配对展示，备注及联系人独占整行；可分别归档或永久删除；按 `purchaseSupplierId` 精确派生只读采购活动，显示采购登记内容描述，并可跳到全部时间精确筛选 |
| `/mail` | AI 邮件 | DeepSeek 邮件生成和回复 |
| `/admin` | 管理后台 | 用户管理、账号状态、管理员状态、模块权限；用户详情头部可直接切换管理员/账户状态，登记表权限桌面双栏、小屏单栏 |
| `/clock` | 时区汇率 | 工具模块，受权限控制；包含时间轴城市联动和外币兑人民币换算 / 走势 |
| `/holidays` | 全球假日 | 工具模块，受权限控制；按月展示 2026 假日，支持详情展开和进入后定位当前月份 |
| `/rmb` | RMB 大写 | 工具模块，受权限控制 |
| 外部链接 | IMPA 物料 | 左侧入口打开 `https://impa.luocompany.com`，受 `impa` 权限控制 |

## 权限现状

唯一模块注册表：`src/constants/permissionModules.ts`。

当前模块：

```text
quotation
domesticQuotation
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
purchaseSupplier
ai-email
impa
clock
holidays
rmb
```

说明：

- `quotation` 控制外贸报价单和销售确认；`domesticQuotation` 独立控制内销报价与内销合同。报价页面守卫直接按 URL `tab` 选择对应权限模块，避免首次进入时受 store tab 异步初始化影响。
- `inquiry` 控制完整询报价登记和订单状态表入口。
- `purchaseRegistration` 控制采购部登记过滤视图；该视图不授予完整询报价登记权限。
- `purchaseSupplier` 控制采购供应商新增、编辑和归档；采购供应商候选与详情读取另外允许 `purchaseRegistration` 或 `purchase`，但详情只读且不授予任何维护权限。
- `purchaseOrderTable` 控制采购订单表过滤视图（询报价登记的已成单子集）；该视图不授予完整询报价登记权限。
- `inquiry.batchEdit` 是询报价批量编辑 / 导入导出高级权限。
- `order.financials` 是订单状态表金额、回款、到账金额高级权限。
- `admin` 不是普通 moduleId，后台访问由 `isAdmin` 和中间件控制；管理员身份只代表可进入权限控制和账号控制，不自动获得业务模块权限。
- 业务模块统一按显式权限开通后才能使用：侧边栏/移动端入口、页面级守卫、权限 store、客户/单据/询报价代理 API、AI 邮件 API 都不再用 `isAdmin` 兜底。
- `history` 不再是独立可编辑权限：由 `quotation`、`domesticQuotation`、`packing`、`invoice`、`purchase` 任一开启自动开启，五项全关时自动关闭；管理后台只读展示该派生状态。Dashboard 单据筛选区域、侧边栏“单据历史”入口与 History 页面入口共用这一权限结果，管理员也按该模块权限配置显示和访问。
- 左侧 `IMPA物料` 已从公开硬编码入口改为 `impa` 模块权限。
- 用户详情弹窗把管理员和账户状态开关固定在用户信息头右侧；当前登录用户不能停用自己的账户或取消自己的管理员身份，两个开关均在界面禁用，Next 管理 API 也会拒绝绕过前端的自我停用/降权请求；其他管理员仍可管理目标账号。“登记表”权限在桌面按两个父模块分栏，小屏退化为单列。
- Worker 在单个或批量模块权限更新成功后刷新目标用户 `User.updatedAt`。前端通过 `/api/auth/permissions-meta` 在可见且聚焦的标签页每 3 分钟检查该时间戳；同一用户名的多个标签页由跨标签协调器只保留一次检查。变化时 leader 复用 `usePermissionRefresh` 完成 silent-refresh 后广播，其它同账号标签页再重载；后台/失焦停止，恢复前台受 30 秒节流后补检，首次挂载只建立基准而不刷新。

## 登记表同步现状

- `/inquiry`、`/order` 属于 `full` 同步组，`/purchase-registration`、`/purchase-order-table` 属于 `restricted` 同步组；两组水位和字段完整度严格隔离。协调 key 同时包含用户名，避免账号串线。
- 同浏览器同用户同组优先通过 Web Locks 选出一个前台 leader，BroadcastChannel 广播同步完成；不支持时使用带 owner id、5 秒 heartbeat、15 秒 TTL 的 localStorage lease，leader 离开前台后 follower 可接管。
- 周期检查只在 `visibilityState === 'visible' && document.hasFocus()` 时运行：最近 5 分钟有离散操作时每 2 分钟检查 meta，空闲后每 10 分钟；恢复聚焦或空闲后的首次操作立即补检，并受 30 秒跨标签最小节流约束。
- 强制整表兜底为 6 小时；meta/增量/整表请求失败保留本地数据并按 1、2、5、10 分钟退避，不会因 meta 失败退化为整表请求。`mergeFromD1`、`mergeFieldsOnly`、pending 队列及完整/受限水位语义保持不变。
- 完整视图 `mergeFromD1` 会在时间戳相同的情况下补齐本地残缺记录缺少、但完整 D1 响应实际带回的字段，修复受限视图先落空缓存后询价人/客户编号持续为空的问题；自愈只填缺失键，不覆盖已有本地字段。
- 协调器可用 `NEXT_PUBLIC_INQUIRY_SYNC_COORDINATOR_ENABLED=false` 全局关闭，或在单浏览器设置 `inquiry_sync_coordinator_disabled=1` 诊断关闭；关闭后退回逐标签独立同步，但仍保留自适应频率和前后台保护。
- NextAuth `SessionProvider` 周期重读为 24 小时，`refetchWhenOffline=false`；首次 session、登录/退出广播及权限变化后的 silent-refresh 不受影响。

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
009_split_domestic_quotation_permission.sql
010_merge_purchase_registration_permissions.sql
011_backfill_admin_full_permissions.sql
012_sync_history_permission_with_documents.sql
```

生产确认：

- `007_grant_default_impa_permission.sql` 已在远程 D1 执行。
- 执行后复查：`impa_permissions = 8`，`enabled_permissions = 8`。
- `008_add_domestic_document_type.sql` 已在远程 D1 执行（2026-07-08 复查确认）。
- 复查结果：`Document` 表 `type` CHECK 约束已包含 `'domestic'`；当前分组计数为 `confirmation=60`、`inquiry=967`、`invoice=9`、`packing=11`、`purchase=50`、`quotation=265`。
- `011_backfill_admin_full_permissions.sql`、`012_sync_history_permission_with_documents.sql`（原编号 010，TASK-147 重新编号避免跟 `010_merge_purchase_registration_permissions.sql` 撞号）已于 2026-07-11 在远程 D1 依次执行完毕。执行前复查发现两个管理员账号（roger、dex）Permission 表里合计有 12 条业务模块显式 `canAccess=0` 记录（例如 roger 的 `quotation`/`packing`/`invoice`/`purchase`/`customer`/`domesticQuotation`/`history`/`ai-email` 等，共 10 条；dex 的 `inquiry.batchEdit`/`order.financials`，共 2 条）——这些账号在 TASK-146 拿掉全仓库的 `?? isAdmin` 兜底之后会被这些显式 0 值直接拦截，因此在 TASK-146 代码部署前先执行了 011 补全。011 执行后复查两个管理员账号已无任何 `canAccess=0` 记录；012 执行后全表复查（`history=1` 但五个单据类权限全 0`，或反之）结果为空，无残留不一致账号。

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

- 全局桌面侧边栏 `DesktopSidebarHost` 同时依据 session 和当前路径渲染：登录页 `/` 始终隐藏，即使登录成功后 session 已先变为 authenticated，也会等路由真正进入 `/dashboard` 或其他业务页后再出现，避免与仍挂载的登录表单形成过渡期画面分裂。
- 桌面端与移动端退出登录统一先显示全屏 Logo 遮罩，再通过 `signOut({ redirect: false })` 清理会话并单次客户端跳转到 `/`；遮罩会等登录页且 session 确认为未登录后收起，请求失败则恢复当前页面并显示错误 Toast。共享入口会忽略 `isLoggingOut` 期间的重复调用，并在注销超过 8 秒仍未完成时使用 `window.location.replace('/')` 强制跳转；正常成功或明确失败都会取消兜底定时器。Dashboard、时区汇率、全球假日已移除各自的旧退出实现，全仓库统一使用 `useAppUser`，相关登录与退出 E2E 已验证通过。
- 桌面端左侧 Sidebar 展开宽度为 240px、收缩宽度为 56px；导航项采用 40px 高度、14px/500 字体、20px 图标和 10px 图文间距。移动端侧滑菜单独立保持 260px 宽度。
- 全局反馈入口为 `src/components/ui/Toast.tsx`，支持 success / error / warning / info / loading、更新已有 toast、promise-style 流程、hover 暂停、Esc 关闭最新一条和最多 4 条堆叠。
- 全局二次确认入口为 `src/components/ui/ConfirmDialog.tsx`。纯提示类反馈使用 Toast，需要用户决策的危险操作使用 ConfirmDialog。
- 主题系统只保留明暗模式，不再提供 `classic` / `colorful` 按钮主题；配置写入 `theme-config`，并兼容旧 `themeConfig`。
- 深色模式层级：应用主背景为 `#1c1c1e`，弹层 / 用户菜单表面为 `#2c2c2e`；Tailwind 语义色为 `app.dark.base` 和 `app.dark.surface`。
- Dashboard 模块卡片使用静态 Tailwind 背景类（浅色 `bg-*-50`，深色 `dark:bg-*-500/10`），不再依赖运行时 CSS 变量注入或 `!important` 覆盖。
- 用户菜单个人信息子菜单的「账户工具」包含主题紧凑切换和权限刷新图标按钮；手动刷新与全局权限变更 watcher 都复用 `usePermissionRefresh.ts` 调用 `/api/auth/force-refresh-session`。
- 预加载只保留真实阶段：静态资源到 50%，PDF 字体到 100%；空实现的表单页 / 脚本样式阶段已移除。完成后用户菜单中的预加载行直接隐藏，不再显示「资源已预加载 (100%)」（详见 `docs/features/PRELOAD_FEATURE.md`）。
- 用户菜单个人信息子菜单在 <640px 屏幕下改为在按钮下方原地展开，避免移动端侧滑菜单空间有限导致子菜单溢出可视区域；`sm` 及以上保持原有向右弹出。
- 移动端侧边栏和整体布局容器改用 `.app-h-dvh`（`100vh` 回退 + `100dvh` 覆盖），修复移动浏览器地址栏显示时固定侧边栏底部（用户菜单）被压到可视区域外的问题。
- 移动端底部导航（`src/components/layout/MobileBottomTab.tsx`，`md:hidden`）为：首页（直达链接）+ 新建 / 登记 / 管理 / 工具 / 我（浮动子菜单），共最多 6 个入口。「新建」子项复用 `dashboardModules.ts` 的 `QUICK_CREATE_MODULES`；「登记/管理/工具」子项与桌面端 `AppSidebar.tsx` 的 `NAV_ITEMS` 保持同一套 id 和权限 moduleId（「工具」现含 AI 邮件，moduleId `ai-email`，与桌面 tools 分组对齐）；权限过滤后子项全空则对应分类入口隐藏，「首页」「我」固定常驻不受权限过滤。「我」菜单含关于、个人信息、管理后台（仅 `user.isAdmin`，跳转 `/admin`，与桌面端一致）、退出登录。
- 移动端汉堡菜单（`AppTopBar.tsx` 的 `onMenuClick` 按钮）改为只在 768–1024px（`md`–`lg`）之间显示（`hidden md:flex lg:hidden`）。原因：<768px 已由底部 6 个入口（含首页/AI邮件）覆盖全部导航；768–1024px 之间桌面侧边栏（`lg:flex`）和底部导航都不显示，此按钮是该区间唯一导航入口，不能整体移除。
- 修复：`/quotation?tab=domestic&docType=quotation|contract` 这个 `docType` URL 参数此前只在页面**首次挂载**时生效（`useInitQuotation.ts` 里的一次性初始化 effect），页面已挂载时仅切换查询参数（如移动端"新建"浮动菜单在 内销报价 ⇄ 内销合同 之间连续点击、或先点其他"新建"子项再点内销合同）不会重新应用，会静默停留在旧的单据类型/条款配置上。现已在监听 `searchParams` 变化的 effect 里补上 `updateData({ domesticDocType })` + 对应默认条款（`DOMESTIC_NOTES_CONFIG` / `DOMESTIC_QUOTATION_NOTES_CONFIG`）同步，并在应用后从 URL 中移除已消费的 `docType`（避免后续浏览器前进/后退等场景重新触发、覆盖用户在页面内手动切换的选择）。
- 「关于」「个人信息」弹窗（`MobileSheetModal.tsx`）在所有屏宽下都居中显示（不再是移动端贴底、`sm` 以上才居中）。「关于」内容为 Logo + 「LC App」+ 展示版本号 `V1.0.0`（`MobileBottomTab.tsx` 内 `APP_DISPLAY_VERSION` 常量，与 `package.json` 的内部版本号 `1.2.0` 分开维护，如需同步需手动改）。「个人信息」在弹窗内使用 `UserProfilePanel` 的 `layout="sheet"` 排版：居中头像 + 大字号姓名/邮箱 + 独立的「修改密码」按钮，桌面端 hover 子菜单仍用默认紧凑排版。
- 用户资料 + 改密表单从 `AppUserMenu.tsx` 抽成独立组件 `UserProfilePanel.tsx`，供桌面端下拉菜单与移动端「我」菜单的个人信息弹窗共用，避免两份改密逻辑。

## 客户管理现状

- 客户、供应商、收货人共用 `Customer` + `Contact` 数据模型。
- 公司信息在客户顶层字段；人的信息统一在 `contacts[]`。
- 客户支持分类：`A` / `B` / `C` / `New` / `Blacklist`。
- 分类备注保存在 `Customer.data.categoryNote`，分类保存在 `Customer.data.category`，未新增 D1 字段。
- 客户页支持列表/卡片视图、分类筛选、搜索、详情页，以及独立的“统计分析”视图；统计视图展示全部客户询价/已报价/订单趋势、询价 Top 10 横向排名和 A/B/C/New/黑名单分类占比，进入时隐藏资料列表相关操作。
- 客户管理统计只复用本地询价 store 数据并排除软删除记录，不新增后端聚合接口，也不额外要求询报价模块权限。
- 客户/供应商/收货人详情卡片的名称和地址支持行内编辑，使用勾号保存、叉号取消，不再打开整表单编辑弹窗。
- 收货人管理的列表/卡片视图显示对应收货人的收货订单数量，不显示主联络人摘要。
- 收货人详情页隐藏联络人区块，订单区域标题为「收货订单」。
- 收货人详情的「收货订单」按 `InquiryRecord.orderDeliveryConsignee` 与收货人显示名称精确匹配。
- 客户详情活动列表显示该客户全部联络人的询价记录。
- 客户详情资料卡下方显示当前客户专属的询价/已报价/订单趋势图，按 `customerId` 汇总非删除记录并支持天/周/月/季/年切换；供应商与收货人详情不显示该图。
- 客户详情活动列表左侧编号优先显示订单编号；没有订单编号时显示询价编号。
- 客户详情活动列表会区分询价订单附加状态：辙销显示「已辙销」、悬挂显示「已悬挂」、善后显示「善后」；若询价记录带 `orderSubStatusRemark`，活动描述会追加该情况备注。
- 询价编辑弹窗的客户/联络人显示以客户资料为准，不信任旧记录里的历史文本。
- `CustomerContactPicker` 在多个联络人标签退化为同一公司简称时只保留一项，优先主联络人。

## 询报价与订单状态现状

- 询报价记录已支持 `customerId`、`contactId` 结构化关联。
- 询报价登记表不再显示独立“操作”列，点击资料行打开编辑弹窗；仅该页面的编辑弹窗显示永久删除入口，走同步 `hard-delete` 请求并在 Worker 物理删除 `Document` 行，失败不移除本地数据。客户详情复用的询价弹窗不显示该入口；批量选择工具栏删除继续走 30 天可同步感知的软删除。
- 采购部登记复用 `InquiryRecord` 的 `description` 字段读写内容描述（与询报价登记共享同一份数据）；新增 `purchaseSupplierStatuses` 与 `purchaseQuotedStatuses` 两个采购部专用字段，结构与询报价登记的 `supplierStatuses` / `quotedStatuses` 相同，但数据独立存储，通过点击整行弹出的"编辑询价"弹窗编辑；不展示/不读写 `orderDeliveryStatus` / `orderDeliveryConsignee`（那是订单状态表 `/order` 和采购订单表 `/purchase-order-table` 共同维护的共享字段，两边编辑的是同一份数据）。
- 采购部登记弹窗手动录入不在候选列表中的采购供应商时，会按 `(shortName || name)` 忽略首尾空格和大小写精确查重，未命中则自动创建采购供应商主档并关联 `purchaseSupplierId`；缺少采购供应商读写权限或接口失败时仍保存未关联自由文本。采购部登记表、编辑弹窗和供应商筛选按 `purchaseSupplierId` 读取主档当前名称，因此主档改名后显示和筛选同步更新；仅替换展示影子数据，不回写历史 `supplierShortName` 快照、不触碰询价同步层（TASK-177/178）。
- 询价成单后支持 `orderSubStatus` 标记：`cancelled`（辙销C）、`suspended`（悬挂P）、`followup`（善后S）；状态标记和 `orderSubStatusRemark` 情况备注统一在订单状态表的“编辑订单”弹窗维护。善后S 可另外标记 `orderFollowupCompleted`（“善后完成” checkbox，仅在善后S 选中时可见）：完成后订单归入“正常”筛选/统计、字母标记从红色“S”变为红色“S”+绿色“-OK”、行背景恢复正常，但“善后”细分筛选依然能筛出这些记录（判断仍是 `orderSubStatus === 'followup'`，与是否完成无关）。`isNormalOrder`/`isInProgressOrder`/`getOrderRowBgClass`/`getOrderSubStatusLetter` 统一收敛在 `orderStatus.ts`，避免此前 `isInProgressOrder`/行背景色/字母标记组件在订单状态表与采购订单表两处重复实现导致的漂移风险（TASK-158）。
- “编辑订单”弹窗按记录 ID 读取 store 刷新后的最新对象；后台同步不会重置用户正在编辑的普通订单字段，且保存时只在用户明确操作过 C/P/S 状态区后才提交状态字段，避免编辑执行情况时用旧快照覆盖其它标签页刚更新的状态（TASK-151）。
- “编辑订单”弹窗不再展示“客户询价编号”；只读区保留订单编号、询价编号、联络人和内容简述。小屏只读区将订单编号/联络人、询价编号/内容简述分别同排，交货日期/确认日期也同排。其余编辑区桌面将客户订单号/金额按 75% / 25% 排布，将执行情况/回款月份/到账金额按 50% / 25% / 25% 排布；小屏将客户订单号和执行情况各自整行展示，金额/回款月份/到账金额三等分同排。无财务权限时只渲染客户订单号和执行情况，并保留各自的 3/4、1/2 桌面跨度（TASK-180）。
- 询报价登记表的统一关键词搜索支持询价编号、客户编号、内容简述和订单号；订单号支持大小写不敏感的部分匹配，没有订单号的记录保持兼容（TASK-152）。
- 询报价登记表的「已成单」统一按有效 `orderNo` 判断，包含普通、辙销C、悬挂P、善后S 的全部成单记录；「已辙销」和「善后」保留为可重叠的细分筛选，筛选列表与角标数量共用同一判定（TASK-153）。
- 订单状态表与采购订单表的「正常」统一通过 `isNormalOrder` 判断：无 C/P/S 标记（兼容旧缓存/旧 D1 的 `null`）、悬挂P、或善后S已标记完成均计入（TASK-158 起）；Worker 收到可清空询报价字段的显式 `null` 时会删除对应 JSON 属性，不再持久化 `orderSubStatus: null`；迁移 013 已清理既有空状态字段（TASK-154）。
- 订单状态表已取消交货/确认日期、客户订单号、执行情况、金额、回款月份、到账金额的全部行内编辑；点击任意业务单元格统一打开“编辑订单”弹窗，批量选择 checkbox 阻止冒泡。采购部登记“内容描述”和采购订单表的采购单号、供应商、金额、交货日期、执行情况也采用整行点击打开各自弹窗的唯一编辑入口；列表只负责只读展示（TASK-174/175/176）。弹窗中的原生日期/月选择器仍支持浏览器“清除”操作，空值保存为 `undefined`，正常选择沿用 `m.D` / `m` 存储格式（TASK-155）。
- 采购部登记同步销售侧“飞罗”状态改为三级优先级（我司无法报价 > 采购供应商需补资料 > 普通已报价，均不满足时不清空/回退），逻辑集中在 `purchaseInquiryStatus.ts` 纯函数；采购部登记表状态列（原“成单状态”）按已关闭/无法报价/已成单/已补充信息/需补充信息/其他 n 家已报价/空态七档优先级只显示一个主 badge（“已补充信息”优先级高于“需补充信息”；“无法报价”——销售侧 `quotedStatuses` 中 `type === 'unavailable'`，即“已回复客户无法报价”——优先级仅次于“已关闭”、高于“已成单”，TASK-159 新增，此前完全没有传递到采购侧）；采购部弹窗“询价已关闭”改为完全只读，只依据销售侧 `record.quotedStatuses`，不再提供可编辑 checkbox，历史 `purchaseQuotedStatuses.type === 'closed'` 数据不参与判断也不被清除；仅有 `purchaseRegistration` 权限的受限视图 GET 响应新增只读完整 `quotedStatuses`，但仍不允许写入（TASK-156）。采购部弹窗与询报价登记编辑/新增弹窗互相展示对方只读提示：采购部弹窗“销售侧提示：飞罗需补充信息（日期）”+“已补充信息（日期）”+“已回复客户无法报价（日期）”同行显示；询报价登记弹窗对称展示“采购侧提示：需补充信息（日期）”+“已补充信息（日期）”+“我司无法报价（日期）”（TASK-161 补齐第三档），均只读、不提供编辑入口。注意区分两个同名但独立的“无法报价”字段：采购部自己勾选的“我司无法报价”写在 `purchaseQuotedStatuses`（用于同步销售侧“飞罗”状态），销售侧“已回复客户无法报价”写在 `quotedStatuses`，互不覆盖。销售侧已关闭/已回复客户无法报价时，采购部登记表整行（询价编号+内容描述）文字颜色也会变灰（`getPurchaseRowColorClass`，与状态列共用 `computePurchaseMainStatus` 的最高两档优先级判断，避免整行颜色与状态列 badge 口径不一致，TASK-159 追加修复）。
- 询报价登记、采购部登记、订单状态表、采购订单表四张登记表都支持手动拖拽调整列宽（`useResizableColumns` hook，按列 id 存 `localStorage`，双击手柄重置默认宽度）：采购部登记表无响应式断点，全断点启用；其余三张表只在各自”全列展示”的断点启用（询报价登记 `lg`、订单状态表 `xl`、采购订单表 `lg`/`xl`），更窄断点保持原有百分比响应式布局不变。采购部登记表”询报价状态”列默认宽度同时加宽到 340px。每张表挑一列（渲染顺序里**实际最后一列**）故意不设显式宽度、不给拖拽手柄，交给 `table-layout: fixed` 分配剩余空间，保证表格在拖拽断点下始终撑满容器、不留白：`PurchaseRegistrationTable` 的“状态描述”、`InquiryTable` 的“询报价状态”、`PurchaseOrderTable` 的“执行情况”、`OrderTable` 按 `canViewFinancials` 权限动态取“到账金额”或“执行情况”；“内容描述/内容简述”均为正常可拖拽列。所有撑满列都有最小宽度保护：显式列总宽超过容器时改为横向滚动，不再把末列压到 0 或触发表头逐字换行；普通表头标签统一使用固定 `h-6`、不换行和溢出截断（TASK-157，最初误把撑满列放在第 2 列导致拖拽方向反向，后续又发现末列无下限会导致表头异常增高，均已修复）。采购部登记表”状态”列改名为”状态描述”，各状态文案（已关闭/已成单/已补充信息/需补充信息/其他 n 家已报价）都带上最贴切来源的日期，多个来源存在时取较新的一个，缺日期时只显示文案不带空括号；”已补充信息”优先级严格高于”需补充信息”（`computePurchaseMainStatus` 判断顺序）。采购部登记页面筛选栏按 `purchaseQuotedStatuses` 语义筛选/排序时用的是一份把 `quotedStatuses` 替换成 `purchaseQuotedStatuses` 的"影子记录"，`PurchaseRegistrationPage.tsx` 在筛选排序完成后用 `restoreOriginalRecords` 按 id 把最终传给表格/编辑弹窗的记录换回真实对象，避免状态列读到被覆盖的 `quotedStatuses`（曾因未做这一步换回，销售侧真实的"已补充信息"被覆盖看不到，状态列误判成"需补充信息"，而编辑弹窗因为另外按 id 直接查 store 未受影响，两处显示不一致）。
- 询价 Excel 导入导出包含 `订单标记`、`订单备注` 两列；D1 仍通过 `Document.data` JSON 透传，无需 schema 迁移。
- 新增询价要求选择客户/联络人；旧记录可保留文本继续编辑。
- 批量关联客户会写入 `customerId`、`contactId` 和规范化 `inquirer`。
- 订单状态表可通过 `quoteStatus=has_order` 从客户详情跳转到”已成单”筛选。
- 询报价登记 `/inquiry`、采购部登记 `/purchase-registration`（两者共用 `useInquiryFilter.ts`）默认进入时时间范围筛选选中”当月”（`` `month:${todayMonth()}` ``，即月份导航器 `MonthRangeNav` 的当月挡位），而非此前的”近3月”；该默认值在每次挂载/点击”重置”时用 `todayMonth()` 动态计算，不会因跨月不刷新页面而停留在旧月份。
- 从采购供应商详情通过 `purchaseSupplierId` 深链接进入 `/purchase-registration` 时例外：页面自动切到“全部”时间，并优先按供应商主档 ID 精确筛选；没有 ID 的手动下拉和历史自由文本仍按供应商名称匹配。
- 订单状态表 `/order`、采购订单表 `/purchase-order-table` 默认进入时状态筛选选中”进行中”，时间范围一并放宽到”全部”（订单状态表排序同时默认按订单号降序），与手动点击”进行中”筛选芯片的效果一致；两页的”重置筛选”也回到这个组合，而不是回到”全部状态 + 近3个月”。
- 修复：执行情况（`orderDeliveryStatus`）是自由文本框，此前 `isInProgressOrder`/行文字颜色逻辑（`OrderPage.tsx`/`PurchaseOrderRegistrationPage.tsx`/`OrderRow.tsx`/`PurchaseOrderRow.tsx`，四处重复实现）反过来”白名单”匹配 备货/交货 前缀，导致用户手写任何不是这两个前缀的说明文字（如”合同确认中”）就被误判成”已完成”、行也从粉色变灰。现改为：只有明确写”发票...”前缀才算完成态，其余任何文字（含空、备货、交货、自定义说明）都算”进行中”并保持粉色。
- 修复：执行情况文本框的”清除”按钮此前不生效（清空后刷新/同步又被旧值覆盖）。同步前由 `normalizeSyncPayload()` 把 payload 里明确出现的 `undefined` 转成可序列化的 `null`；Worker 再将可清空询报价字段的 `null` 解释为“删除该 JSON 属性”。这样既能把清空意图传到服务端，也不会把 `orderSubStatus: null` 等无业务含义的值长期保存在 D1。
- 订单状态表会在客户订单号下方显示 C/P/S 情况备注，并按辙销红色、悬挂绿色、善后蓝色着色。
- 订单状态表的执行情况支持 `orderDeliveryConsignee` 收货人关联。收货人只在「交货」编辑态下选择，但关联属于订单本身；后续把执行情况改为「发票」或「备货」不会自动清空收货人。
- 只有点击执行情况「清除」按钮，或在「交货」编辑态下把收货人下拉框选回空白，才会解除 `orderDeliveryConsignee` 关联。
- 金额相关字段由 `order.financials` 高级权限控制。

## 采购订单表现状

- `/purchase` 仍是旧采购订单单据创建功能，数据保存在 `purchase_history`，用于 PDF/Excel 和草稿，与本节无关。
- `/purchase-order-table`（TASK-101 重构后）不再是独立数据表，改为询报价登记的过滤视图：只展示 `orderNo` 有值（已成单）的 `InquiryRecord`，不能手动新增/删除，记录随询价成单自动出现——关系与"订单状态表 `/order` 之于询报价登记"完全一致。
- `purchaseOrderNo`（采购单号）、`purchaseOrderSuppliers`（一单多家供应商）和 `purchaseOrderAmount`（金额，受 `purchaseRegistration.financials` 权限门槛控制）为采购订单表专属字段。采购订单表不提供任何行内编辑，点击任意业务单元格统一打开“编辑采购订单”弹窗。
- “编辑采购订单”弹窗的只读区按“订单编号/询价编号/联络人”和“内容描述/客户订单号/确认日期”两组三列展示，订单状态标记独占一行；编辑区桌面按交货日期 25%、采购金额 25%、执行情况 50% 排布，小屏将日期与金额同排、执行情况放到下一行。无财务权限时不渲染金额，桌面日期/执行情况约为 1/3 / 2/3，小屏纵向堆叠（TASK-179）。
- `purchaseOrderSuppliers` 是供应商权威数组；旧 `purchaseOrderSupplier` / `purchaseOrderSupplierId` 保留为存量记录 fallback 和数组首项兼容镜像。列表、关键词搜索和供应商筛选均读取全部供应商；受限采购视图已在 GET 清洗和 PUT 白名单同时开放数组字段。
- 交货日期（`orderDeliveryDate`）、执行情况（`orderDeliveryStatus`/`orderDeliveryConsignee`）与订单状态表**双向共享同一份数据**，两边都能编辑。
- 确认日期（`orderConfirmDate`）、客户订单号（`orderCustomerNo`）**只读**，来自订单状态表，采购订单表这边不能编辑（API 层强制）。
- 旧的独立 D1 `Document.type='purchase'` 记录、`/api/purchase-order` 路由、`handlePurchaseOrderRequest`、`purchase-order.store.ts`/`purchase-order.service.ts`/`PurchaseOrderFormModal.tsx` 已全部删除；旧数据未迁移（功能上线仅 1 天，数据量极少），未来如需清理需手动处理。

## 文档维护规则

- `docs/core/CURRENT_STATE.md`：最新事实源，记录“现在是什么样”。
- `docs/core/CHANGELOG.md`：变更历史，记录“什么时候改了什么”。
- `CODEX_TASKS.md`：精简任务索引（可选后续）；不要再堆已完成 TASK 全文。
- `docs/features/**`、`docs/technical/**`：模块与技术入口说明。
- `docs/archived/README.md`：说明过程 FIX/SUMMARY 已删除，用 git 历史找回。
- 不要再新增 `*_FIX.md` / `*_SUMMARY.md` 过程文档；结论写入 CURRENT_STATE 或模块入口即可。

## 已知风险

1. 权限刷新链路仍复杂（store / hook / API 多处联动），改动需谨慎；页面级守卫已覆盖主要业务页，middleware 仍不做 moduleId 拦截。
2. 业务历史仍以 `localStorage` 为主；跨设备依赖双写 + 登录拉取 + 本地补推（不做 TASK-14 旧历史批量迁移）。配额写入已接入 `persistHistoryToStorage`，极端大数据量仍可能裁剪旧记录。
3. 单据模块双轨已收敛：quotation / packing / purchase 业务 UI 在 `features/*/components/`；对应 `src/components/{quotation,packinglist,purchase}` 目录已删除。admin 的 `CreateUserModal` 本体亦在 features，`components/admin` 仅留兼容 re-export。

> 已关闭（勿再当作待办）：Worker `X-User-*` 伪造（已改 Bearer）、`wrangler.toml` 明文 token（已迁 secret）、`validatePassword` bcrypt bug（已修复）、`updatePassword` 明文写入（已改 bcrypt）、登录无限流（已加 IP 限流）、NEXTAUTH 硬编码 secret（生产必填）、AI 邮件仅验登录（已验 `ai-email`）、业务页无页面级守卫（P1 已补）、`storageQuotaManager` 零引用（P1 已接入历史写入）、报价/装箱/采购 components↔features 双轨与 shim（P3 已删）、docs 过程 FIX/SUMMARY 与超长 CODEX_TASKS（已从工作树删除，git 可找回）。
