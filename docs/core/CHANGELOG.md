# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2026-07-13

### Changed

#### 采购部登记与询报价登记的询报价状态集中梳理（TASK-156）
- **飞罗同步三级优先级**：采购部保存时按“我司无法报价 > 采购供应商需补资料 > 普通已报价”的优先级同步销售侧“飞罗”状态与日期（此前只处理普通已报价一种情况），均不满足时不清空/回退飞罗现状；同步逻辑集中到可测试的纯函数 `purchaseInquiryStatus.ts`，不再散落在 `handleSave` 里。
- **采购部状态列改版**：表头“成单状态”改为“状态”，只显示一个优先级最高的主 badge（已关闭 > 已成单 > 已补充信息 > 需补充信息 > 其他 n 家已报价 > 空态），“其他 n 家已报价”按供应商简称去重、排除飞罗，与编辑弹窗内的同名只读提示共用同一份计数逻辑。
- **询价已关闭完全只读化**：采购部弹窗不再提供可编辑的“询价已关闭” checkbox，改为只读展示销售侧 `record.quotedStatuses` 中的真实关闭状态；历史 `purchaseQuotedStatuses.type === 'closed'` 数据不再参与判断，也不会被覆盖或清除。
- **受限视图只读开放 `quotedStatuses`**：仅有 `purchaseRegistration` 权限的用户 GET 响应新增完整只读 `quotedStatuses`（用于读取销售侧关闭/需补资料状态），但该字段仍不在受限 PUT 的允许写入字段列表里，写入会被丢弃。
- `InquiryQuoteStatus` 新增 `unavailableLabel` / `quotedTrailingContent` / `showClosedControl` 三个窄配置 props（默认值保持询报价登记页面行为不变），采购部场景据此定制文案与隐藏关闭编辑入口，避免复制整个组件。
- 弹窗按 `record.id` 从 store 最新状态解析记录，后台同步不再用旧快照覆盖飞罗判断，也不会清空用户尚未保存的输入。
- **追加修复**：销售侧飞罗 `need_info` 只读提示能显示，但采购部之前没有勾选"已补充信息"的入口（该 checkbox 只看本地 `purchaseSupplierStatuses`，读不到销售侧只读信号）。`InquiryQuoteStatus` 新增 `extraNeedInfo` prop，采购部弹窗传入销售侧飞罗需补资料状态，让提示和勾选入口保持一致可见。
- **追加修复 2**：销售从客户那边拿到补充信息后登记在**询报价登记原始** `record.quotedStatuses.type === 'supplemented'`（与采购部自己标记的 `purchaseQuotedStatuses.supplemented` 是两个独立来源），此前采购部完全看不到。新增 `findSalesSupplemented` / `isSalesSupplemented`，状态列"已补充信息" badge 和编辑弹窗新增的蓝色只读提示都会识别这一来源。
- **追加调整 3**：采购部弹窗的"飞罗需补充信息"和"已补充信息"两条提示改为同一行并列显示（`flex flex-wrap`），"飞罗需补充信息"补上日期；询报价登记编辑/新增弹窗新增对称的只读提示"采购侧提示：需补充信息（日期）" / "采购侧提示：已补充信息（日期）"，读取采购部的 `purchaseSupplierStatuses` / `purchaseQuotedStatuses`，不提供编辑入口。新增 `findSelfSupplierNeedInfo` / `findLatestPurchaseNeedInfo` / `findPurchaseSupplemented`。状态列"已补充信息"优先级高于"需补充信息"的判断此前已实现，本次确认无需改动。

#### 四张登记表支持手动拖拽调整列宽（TASK-157）
- 新增通用 `useResizableColumns` hook（`src/components/table/`）：按列 id 把像素宽度存 `localStorage`，列集合变化（权限/断点导致列增删）时只给新列补默认宽度，不打乱已有列宽；配套 `ResizeHandle` 拖拽手柄组件（双击重置默认宽度）。
- 询报价登记（`InquiryTable`，`lg` 断点）、订单状态表（`OrderTable`，`xl` 断点）、采购订单表（`PurchaseOrderTable`，`lg`/`xl` 断点）分别只在各自"全列展示"的断点接入拖拽调宽，更窄断点继续用原有百分比响应式布局，不受影响；采购部登记表（`PurchaseRegistrationTable`，本身无断点逻辑）全断点接入。
- 采购部登记表"询报价状态"列默认宽度从约 26%（约 234px）加宽到 340px，解决状态提示装不下的问题。
- checkbox/操作等固定功能列不参与拖拽，避免被意外拖没。

### Added

#### 权限变更自动生效（TASK-141）
- **轻量轮询**：新增 `/api/auth/permissions-meta` 与全局 `usePermissionChangeWatcher`；登录用户在页面前台时每 90 秒检查一次 `User.updatedAt`，切到后台暂停，恢复前台立即补检。
- **按需刷新**：首次检查只建立本地基准；检测到变化后复用既有 `usePermissionRefresh` 流程刷新权限、提示并重载，失败时回滚基准以便后续重试。
- **可靠变更信号**：Worker 的单个/批量权限更新成功后统一 touch 目标用户 `updatedAt`，按用户名查询响应同步返回该字段。

### Fixed

#### 原生日期/月份选择器清除（TASK-155）
- 订单状态表行内日期、回款月份选择器在浏览器返回空值时，现会分别提交 `undefined`，不再被非空解析守卫拦截。
- “编辑订单”弹窗的日期与回款月份选择器同步接受原生清除事件；保存时继续由既有逻辑把空字符串转换为 `undefined`，正常日期/月格式保持不变。
- 新增行内与弹窗组件回归测试，覆盖清除和正常选择两条路径。

#### 订单“正常”筛选兼容空状态（TASK-154）
- 订单状态表与采购订单表的「正常」列表和角标改为共用 `isNormalOrder`，同时接受未设置、历史 `null` 和悬挂P；撤销C、善后S仍保持独立状态。
- Worker PUT 收到 `orderNo`、`orderSubStatus`、`orderSubStatusRemark`、`customerId`、`contactId` 的显式 `null` 时删除对应 `Document.data` JSON 属性，避免清空操作再次持久化 `orderSubStatus: null`。
- 新增迁移 `013_remove_null_inquiry_order_sub_status.sql`，清理既有显式空状态并刷新同步时间；新增前端状态判定和 Worker payload 合并回归测试。

#### 询报价“已成单”筛选口径（TASK-153）
- 「已成单」改为包含所有具有有效订单编号的记录，不再排除标记为辙销C或善后S的订单；「已辙销」与「善后」继续作为可重叠的细分筛选。
- 列表筛选与状态角标复用同一个订单编号判定，并新增回归测试覆盖普通、C/P/S、空白订单号和缺少订单号的记录。

#### 询报价登记订单号搜索（TASK-152）
- `/inquiry` 现有关键词搜索增加 `orderNo` 的大小写不敏感子串匹配；询价编号、客户编号和内容简述搜索保持不变。
- 对没有订单号的询价记录保持空值安全，并新增 hook 回归测试覆盖新旧四类关键词字段。

#### 编辑订单并发状态保护（TASK-151）
- 订单状态表的编辑弹窗改为按记录 ID 从最新列表解析当前记录，不再长期持有打开弹窗时的旧对象快照。
- 后台同步刷新时保留用户尚未保存的执行情况、日期、客户订单号等输入，只同步用户未触碰的 C/P/S 状态区。
- 保存普通订单字段时不再附带未被用户操作的 `orderSubStatus` / `orderSubStatusRemark`，避免编辑执行情况时把另一标签页刚更新的撤销、悬挂或善后状态覆盖回旧值。
- 新增组件回归测试，覆盖后台刷新与用户明确修改状态两条路径。

#### 单据历史权限联动（TASK-146）
- `history` 改为由外贸报价合同、内销报价合同、箱单发票、财务发票、采购订单五类权限自动派生：任一开启则自动开启，全部关闭则自动关闭；管理后台归入“单据”分组并禁止手动切换。
- Dashboard 单据搜索、时间筛选、管理按钮和文档区域改为仅对具备单据历史权限的用户显示；管理员也按模块权限配置显示，不再强制可见。
- 管理员身份收敛为“可进入权限控制和账号控制”：业务模块入口、页面守卫、权限 store、客户/单据/询报价代理 API、AI 邮件 API 均改为只认显式模块权限。
- 新增 `011_backfill_admin_full_permissions.sql`（给现有管理员账号补全全部模块的显式权限行）与 `012_sync_history_permission_with_documents.sql`（原编号 010，因撞号由 TASK-147 重新编号；一次性修正所有账号已有的不一致 `history` 权限行，管理员同样按单据类权限派生）；两者已按顺序在远程 D1 执行完毕。

#### 退出登录过渡态（TASK-145）
- 点击桌面端或移动端“退出登录”后立即显示全屏 Logo 遮罩，覆盖侧边栏和主内容区，避免清理会话期间继续冻结显示业务页面。
- 退出流程改为 `signOut({ redirect: false })` 后单次客户端跳转到 `/`，不再先整页刷新当前业务路由、再由 middleware 二次重定向；请求失败时会收起遮罩并保留错误 Toast。
- Dashboard、时区汇率、全球假日移除各自复制的旧退出逻辑，统一复用 `useAppUser`；全仓库退出流程只保留一个实现入口。
- 退出流程增加防重复保护：`isLoggingOut` 已激活时忽略后续调用，避免重复注销请求和重复导航。
- 增加 8 秒超时兜底：注销请求长期无响应时使用 `window.location.replace('/')` 强制离开业务页面；正常成功或明确失败都会取消定时器。

#### 内销报价合同页面权限（TASK-144）
- `/quotation` 页面级守卫改为直接按 URL `tab` 选择权限模块：内销报价/合同检查 `domesticQuotation`，外贸报价/销售确认检查 `quotation`，避免仅有内销权限的普通用户被外贸权限守卫误拦截。
- 权限不足提示同步区分内销与外贸；判断直接读取 URL，不依赖报价 store 的异步 tab 初始化，确保地址栏首次进入也不会产生权限竞态。

#### 登录过渡期侧边栏时序（TASK-142）
- 全局 `DesktopSidebarHost` 增加当前路径判断：登录页 `/` 无论会话是否已切换为 authenticated 都不渲染桌面侧边栏，避免登录成功到业务路由跳转完成之间出现“侧边栏 + 登录表单”的画面分裂。
- 业务路由仍按原逻辑在 authenticated 状态下显示侧边栏；未认证和 session 加载阶段行为不变。

#### 管理员自我保护（TASK-141）
- 管理员编辑自己的账号时，管理员身份开关禁用，并提示需由其他管理员操作；编辑其他用户时保持可用。

#### Purchase Registration Hook 依赖
- 将供应商与待关联供应商匹配逻辑提升为模块级纯函数，使三个 `useMemo` 只依赖实际筛选值和数据数组，消除 `react-hooks/exhaustive-deps` warning，筛选行为保持不变。

### Tests
- TASK-155：`OrderRow` / `OrderEditModal` 组件测试 2 个文件、6 项通过（含原生日期/月选择器清除与正常转换）；`npx tsc --noEmit`、相关 ESLint、`npm run build` 通过。
- `npx jest src/components/layout/__tests__/DesktopSidebarHost.test.tsx --runInBand`（4 项）
- `npx jest src/hooks/__tests__/usePermissionChangeWatcher.test.ts --runInBand`（5 项）
- `npx tsc --noEmit`
- 改动文件 ESLint
- `npm run build`
- E2E 登录与退出流程通过；完整 E2E 在配置专用测试账号及所需环境变量后通过。
- TASK-145 桌面端与移动端退出验证通过：点击后立即进入 Logo 过渡态，随后直接到登录页，无业务页面冻结或中间路由闪烁。
- `npx jest src/hooks/__tests__/useAppUser.test.ts --runInBand`（3 项：重复调用、8 秒超时兜底、失败恢复）。
- TASK-146 权限测试 5 项通过：hook 自动开启/关闭、手动 history 切换拦截、分组归类，以及权限弹窗中只读开关与实时联动。
- migration 010 内存 SQLite 验证通过：无单据权限账号 `history` 关闭，有任一单据权限账号补插/更新为开启。

## [Unreleased] - 2026-07-10

### Changed

#### 手机主屏幕图标修复（TASK-136）
- **PWA 元数据**：根布局接入 Web App Manifest 和 Apple Touch Icon，避免添加到主屏幕时退回页面缩略图或占位图。
- **图标一致性**：修正 Web 图标的真实格式和尺寸声明，并补齐 manifest 引用的 96×96 / 192×192 图标，消除图标资源 404。

#### Sidebar 视觉密度优化
- **桌面宽度**：展开态由 260px 收紧为 240px，主内容区偏移同步调整；收缩态保持 56px，移动端侧滑菜单保持 260px。
- **菜单密度**：导航项由 44px / 15px 调整为 40px / 14px，图文间距由 12px 调整为 10px；20px 图标、12px 分组标题和既有配色保持不变。
- **一致性**：同步更新 `sidebarCollapse` 展开宽度常量、CSS 首屏默认变量、单元测试和 `SIDEBAR_DESIGN_SPEC.md`。

### Security

#### P0 安全加固
- **改密哈希**：`d1-client.updatePassword` 写入前使用 `bcrypt.hash`，与创建用户一致，避免明文落库。
- **登录限流**：Worker `/api/auth/d1-users` 按 IP 限流（1 分钟最多 10 次），超限返回 429。
- **NEXTAUTH_SECRET**：生产环境未配置时直接抛错，禁止硬编码回退密钥；开发环境使用临时密钥并告警。
- **AI 邮件权限**：`/api/generate` 除登录外校验 `ai-email` 模块权限；TASK-146 后管理员也必须具备该模块权限。
- **日志收敛**：登录成功/失败日志不再输出密码明文或 hash 前缀。

### Added

#### 首页导航与统计（TASK-109 / TASK-110）
- **报价/合同 4 入口拆分**：侧边栏 `AppSidebar.tsx` 的「外贸报价合同」「内销报价合同」2 项拆成「外贸报价/外贸合同/内销报价/内销合同」4 项，id/路径与首页模块宫格 `QUICK_CREATE_MODULES` 对齐；4 项换用新建的 `src/components/icons/TradeDocIcons.tsx` 双维度自定义图标（文档主体区分报价/合同，右下角标区分外贸/内销），不再共用同一个 `FileText`。
- **首页询价/订单统计**：新增「今日新增：询价/已报价/订单」「本月累计：询价/订单」两行统计卡片（`InquiryOrderStats.tsx`），以及可切换天/周/月/季/年度粒度的询价+订单趋势图（`InquiryOrderTrendChart.tsx`，基于新引入的 `recharts`）。统计口径：订单确认日期（`orderConfirmDate` 只存 `[月.日]`）按询价单编号年份推算跨年；已报价按记录数（`customer_quoted` 判定）而非报价条目数计。两块内容仅 `inquiry` 模块权限用户可见。

#### P1 权限与配额
- **页面级 moduleId 守卫**：新增 `useModulePermissionGuard`；报价/装箱/发票/采购/历史/客户（含详情）/邮件/时区/假日/RMB 共 11 页接入，无权限显示 `PermissionDenied`（询报价相关 4 页此前已有）。
- **历史写入配额统一入口**：`persistHistoryToStorage`；报价/发票/装箱/采购历史与 `d1Pull.mergeIntoStorage` 主写入路径接入，超限时智能清理/裁剪。
- **PermissionMap 补全**：`inquiry`、`purchaseRegistration`、`purchaseOrderTable`、`clock`、`holidays`、`rmb`；dashboard 类型改为复用 `@/types/permissions`。

#### 移动端底部导航改版（TASK-103）
- **五分类浮动菜单**：`MobileBottomTab.tsx` 从 5 个直达 tab（首页/外贸报价合同/登记表/历史/邮件）改为固定 5 个分类入口（新建/登记/管理/工具/我），点击弹出浮动子菜单；子项按权限过滤，全空则顶层入口隐藏，「我」常驻。
- **数据源复用**：「新建」复用 `dashboardModules.ts` 的 `QUICK_CREATE_MODULES`；「登记/管理/工具」子项 id 与权限 moduleId 与 `AppSidebar.tsx` 的 `NAV_ITEMS` 保持一致。
- **新增组件**：`UserProfilePanel.tsx`（从 `AppUserMenu.tsx` 抽出的资料/改密面板，桌面端下拉菜单与移动端「我」菜单共用）、`MobileSheetModal.tsx`（移动端底部弹窗壳，用于「关于」占位内容和「个人信息」）。
- 「关于」目前为占位弹窗（「内容待补充」），具体文案后续再定。

#### P3 测试与结构（第一批）
- **E2E**：新增 `e2e/permission-guard.spec.ts`（已登录访问守卫路由不回登录页；未登录直链回登录）、`e2e/document-pages.spec.ts`（装箱/发票/采购页可达）。
- **报价双轨迁移 PR-1**：`PasteDialog`、`CustomerInfoCompact`、`PaymentTermsSection`、`DomesticCustomerInfo` 迁入 `features/quotation/components/`；旧路径保留 re-export；删除孤儿 `TabButton` / `NotesSection` / `CustomerInfoSection`。

#### P3 报价双轨迁移（第二批）
- **ItemsTable 集群**：`ItemsTable`、`ImportDataButton`、`ColumnToggle`、`QuickImport` 迁入 `features/quotation/components/`；旧路径 re-export。
- **SettingsPanel**：迁入 features；`QuotationPage` 全部改为相对 features 导入，生产代码不再直接依赖 `@/components/quotation/*`。
- **清理实验死代码**：删除未接入的 `UltimatePowerNotesSection`、`OptimizedNotesSection`、`MobileOptimizedNotes`、`AdvancedNotesFeatures`、`PerformantDragDrop`、`CustomerInfoSection`、`ItemsTableSection`。

#### P3 packing / purchase 双轨迁移
- **packing**：`SettingsPanel`、`OtherFeesTable` 迁入 `features/packing/components/`；删除孤儿 `ConsigneeSection`、`ShippingMarksModal`、旧 `ItemsTable`。
- **purchase**：`SettingsPanel`、`PurchaseBaseInfo` 迁入 features；开票资料组件重命名为 `InvoiceCompanyInfo`（避免与 sections/BankInfoSection 冲突）；删除孤儿 `SupplierInfoSection`。
- 旧路径保留 thin re-export shim（随后已删除，见同日「清理 shim」条目）。

### Changed

#### 文档对齐
- 同步 `AGENTS.md` / `README.md` / `PROJECT_SUMMARY.md` / `CURRENT_STATE.md`：权限模块补全、路由补全、Bearer/secret 现状、客户 D1 主存表述；关闭已过时的「紧急安全」待办描述。
- 跨设备策略确认：取消 TASK-14 旧历史批量迁移；保留双写 + 登录拉取 + 本地补推。

#### 文档清理（2026-07-09）
- **删除低价值过程文档**：整夹移除 `docs/bugfixes/`（39）、`docs/archived/2025-10/`、`docs/archived/2026-07/`；工作树仅留 `docs/archived/README.md`（用 git 历史找回）。
- **删除过时活跃文档**：`RELEASE_v1.2.0_SUMMARY.md`、`performance_optimization.md`、`STABILITY_GUARDRAILS_FINAL.md`。
- **精简 `CODEX_TASKS.md`**：由约 1.5 万行改为短索引。
- 活跃文档收敛为：core 事实源 + 模块入口 + 权限/主题/工程守则/PDF 指南。

#### 权限刷新
- 删除无 listener 的 `silentRefreshPermissions` 事件；改为派发带 `tokenNeedsRefresh` 的 `permissionsUpdated`。完整 session 刷新仍由 `usePermissionRefresh` 负责。

### Tests
- `npx tsc --noEmit`
- 手动建议：无模块权限直链对应路由应见权限不足；历史保存超配额时控制台有裁剪/清理日志
- E2E：`E2E_USERNAME=... E2E_PASSWORD=... npm run test:e2e`（含 permission-guard / document-pages）

## [Unreleased] - 2026-07-07

### Changed

#### 用户菜单
- **预加载状态收敛**：预加载完成后菜单项直接隐藏，不再展示无法交互的「资源已预加载 (100%)」文案。
- **移动端子菜单防溢出**：个人信息子菜单在 <640px 屏幕下改为按钮下方原地展开（此前固定向右弹出，在 220px 宽的移动端侧边栏上会超出屏幕），`sm` 及以上保持原有向右弹出。

### Fixed

#### 移动端布局
- **侧边栏“沉底”问题**：侧边栏与整体布局容器由 `h-screen`（100vh）改为 `.app-h-dvh`（`100vh` 回退 + `100dvh` 覆盖），修复移动浏览器地址栏显示时固定侧边栏底部（含用户菜单）被压到可视区域外的问题。

### Tests
- `npx tsc --noEmit`
- `npx eslint`（AppUserMenu.tsx / AppSidebar.tsx / AppLayout.tsx）

## [Unreleased] - 2026-07-06

### Added

#### 全局反馈 / Toast
- **统一 Toast 组件**：全局支持 `success`、`error`、`warning`、`info`、`loading` 五种状态，使用真实右侧滑入 / 滑出动画。
- **Toast 交互补全**：支持 hover 暂停自动关闭、Esc 关闭最新一条、最多同时显示 4 条，超出后顶掉最早一条。
- **状态更新能力**：`showToast` 返回 id，新增 `updateToast` 和 promise-style 流程，支持 loading 平滑更新为 success / error。
- **确认弹窗统一**：纯提示类原生 `alert` 迁移为 Toast；需要用户决策的 `window.confirm` 迁移为全局 `ConfirmDialog`。

### Changed

#### 主题 / 深色模式
- **深色层级统一**：应用主背景统一为 `#1c1c1e`，弹层 / 用户菜单表面统一为 `#2c2c2e`，并在 Tailwind 中提供 `app.dark.base` / `app.dark.surface` 语义色。
- **模块卡片静态化**：Dashboard 模块卡片改为静态 Tailwind 颜色类，移除运行时 CSS 变量注入和 `.module-button` / `.dashboard-module-button` 的 `!important` 覆盖。
- **退休双主题开关**：移除 `classic` / `colorful` 按钮主题、`buttonTheme` API 和相关调色盘入口；`ThemeToggle` 只负责明暗模式，图标语义改为显示当前状态。

#### 权限 / 用户菜单
- **刷新权限入口优化**：权限刷新按钮移入用户菜单的个人信息子菜单「账户工具」，使用紧凑图标按钮和全局 Toast 反馈。
- **权限刷新实现收敛**：保留 `usePermissionRefresh.ts` + `/api/auth/force-refresh-session` 主流程，删除未使用刷新权限实现，减少后续误接风险。

#### 预加载
- **进度口径收敛**：预加载只保留真实执行的两阶段：静态资源 50%、PDF 字体 100%；移除空实现阶段，避免虚假的 100%。

### Removed

- 删除未使用的采购模块旧 Toast、主题调试器、旧颜色映射、旧主题样式工具和 `useThemeManager`。

### Tests
- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`
- 全仓库搜索确认旧 Toast、原生 alert / confirm、旧主题 API 和旧权限刷新路径无残留调用。

## [Unreleased] - 2026-07-05

### Changed

#### 工具模块 / 时区汇率
- **世界时钟更名为时区汇率**：`/clock` 页面标题、面包屑、左侧导航和权限模块名称统一为「时区汇率」。
- **时区汇率页重构**：页面包含「时间 / 汇率」两个 Tab；时间 Tab 保留城市时间轴联动，汇率 Tab 支持外币兑人民币快速换算、关注货币、手动刷新和 7 天 / 1 个月走势查看。

#### 工具模块 / 全球假日
- **假日详情完善**：假日行可展开查看「假期背景」「假期表现与商务影响」「禁忌与注意事项」，重点节日使用专属文案，其他节日按分类生成通用说明。
- **详情区域布局优化**：展开内容取消左侧额外缩进，与假日内容列对齐，减少大屏空白。
- **当前月份定位调整**：进入 `/holidays` 后即时定位到当前月份；定位不使用平滑滚动动画，展开 / 收起详情不再触发页面滚动。

### Tests
- `npm run build`

## [Unreleased] - 2026-07-04

### Fixed

#### 订单状态表 / 收货人关联
- **执行情况切换不再误删收货人**：`DeliveryStatusCell` 中的 `orderDeliveryConsignee` 不再和 `orderDeliveryStatus` 是否以「交货」开头强绑定；订单从「交货」改为「发票」或「备货」时会保留已选收货人。
- **主动解绑路径保留**：「清除」按钮仍会同时清空执行情况和收货人；在「交货」编辑态下把收货人下拉框选回空白仍会解除收货人关联。
- **非编辑态显示修正**：只要订单记录存在 `orderDeliveryConsignee`，执行情况单元格第二行就显示收货人蓝字，不再受当前状态文字影响。

### Changed

#### 客户管理 / 收货人详情
- **详情页行内编辑**：客户/供应商/收货人详情卡片移除右上角整卡「编辑」按钮，名称和地址旁的修改图标改为当前页面内行内编辑，使用勾号保存、叉号取消，不再打开 `CustomerModal`。
- **收货人详情简化**：收货人详情页隐藏联络人区块；订单区域标题改为「收货订单」，空状态为「暂无收货订单」。
- **行内地址编辑比例优化**：地址编辑框改为横向展开的固定高度输入区，保存/取消按钮放在输入区下方右侧，避免窄高比例影响录入。
- **收货人列表订单统计**：收货人管理的列表/卡片视图不再显示主联络人摘要，改为显示对应收货人的收货订单数量，统计口径与收货人详情页一致，均基于 `orderDeliveryConsignee` 精确匹配。

#### 代码质量 / Lint 清理
- **全量 lint warning 清零**：分阶段清理 `no-unused-vars`、`no-explicit-any` 和 `react-hooks/exhaustive-deps`，从 616 条 warning 降为 0。
- **类型安全增强**：将热点文件中的 `any` 替换为现有业务类型、局部结构类型或 `unknown` + 类型收窄；覆盖历史导入导出、PDF 表格生成、权限、Worker、报价/装箱/发票/采购模块等。
- **Window / NextAuth 类型声明补齐**：补充装箱单、发票页面注入数据的 `Window` 全局声明，并补齐 session/user/token 的 `status` 类型。
- **React Hooks 依赖处理**：对拖拽、弹窗定位、搜索快捷键等场景补齐稳定依赖；对一次性初始化和防循环同步场景保留局部 disable，并写明原因。
- **PDF 插件类型边界修正**：统一 jsPDF + AutoTable 扩展对象的类型断言方式，避免生产 build 类型检查失败。

### Tests
- `npx tsc --noEmit`
- `npx next lint`
- `npm run build`
- `npx eslint src/features/order`
- `npm run test -- src/features/customer/__tests__`

---

## [Unreleased] - 2026-07-03

### Added

#### 询报价登记 / 客户活动列表
- **C/P/S 情况备注**：编辑询价时，订单编号存在且选中「辙销C / 悬挂P / 善后S」后显示单行「情况备注」，保存到 `InquiryRecord.orderSubStatusRemark`；取消标记或清空订单编号时同步清空备注。
- **客户活动状态同步**：客户详情活动列表现在区分显示「已辙销 / 已悬挂 / 善后」，并将 C/P/S 情况备注追加到活动描述，便于直接看到撤销、悬挂或善后原因。
- **客户活动筛选**：客户详情活动列表右侧会在存在对应订单时显示「已辙销 / 已悬挂 / 善后」筛选按钮；C/P/S 备注文字分别使用红色、绿色、蓝色。
- **客户活动编号显示**：客户详情活动列表左侧编号优先显示订单编号；没有订单编号时继续显示询价编号。
- **Excel 兼容**：询报价导入导出新增 `订单标记` 和 `订单备注` 两列，避免 C/P/S 状态备注在文件流转中丢失。

#### 订单状态表
- **C/P/S 备注位置**：订单状态表在「客户订单号」下方显示辙销、悬挂、善后的情况备注，并保留对应状态颜色。

### Changed

#### 询价 D1 同步
- **可清空字段处理**：Worker 对完整询价记录 PUT 增加 `orderNo`、`orderSubStatus`、`orderSubStatusRemark`、`customerId`、`contactId` 的清空同步，避免远端 `Document.data` 保留旧值；无需 D1 schema 迁移。

### Tests
- 新增并扩展 `src/features/customer/__tests__/inquiryTimelineService.test.ts`，覆盖 C/P/S 活动状态 badge、情况备注描述拼接和备注颜色映射。

---

## [Unreleased] - 2026-07-02

### Added

#### 权限 / 工具模块
- **IMPA 物料模块权限**：左侧 `IMPA物料` 外部工具入口接入模块权限体系，后台用户权限弹窗新增 `IMPA 物料` 开关；TASK-146 后管理员也必须具备该模块权限
- **IMPA 权限生产迁移**：新增并已执行 `migrations/007_grant_default_impa_permission.sql`，给现有普通用户默认补上 `impa` 权限；生产 D1 复查结果为 `impa_permissions = 8`、`enabled_permissions = 8`

#### 客户管理 / 客户分类
- **客户分类标记**：客户可标记为 A类 / B类 / C类 / New（未成单新客户）/ 黑名单 五档，人为评定订单量、付款及时性等；仅适用于「客户」标签页（供应商/收货人不涉及）
- **分类备注**：分类旁可填写简短文字摘要说明评定理由（如"月均3单，回款及时"）
- **展示位置**：编辑弹窗内选择分类 + 填写备注（`CustomerForm.tsx`）；客户列表行、卡片视图、客户详情页均显示彩色分类徽章（黑名单红色），鼠标悬停徽章显示备注全文
- **分类筛选**：客户列表页新增分类筛选 chip（全部/A类/B类/C类/New/黑名单），各自带数量统计，点击即筛选
- **存储方式**：分类与备注存入 `Customer.data` 既有的 JSON 透传列（`data.category` / `data.categoryNote`），未修改数据库 schema，未改动 `src/worker.ts`（该列本就原样存取）

### Fixed

#### 联络人选择器（CustomerContactPicker）
- **去重公司名条目**：客户下多个联络人均未填「简称」时，标签会退化成只显示公司名；此前会在「新增询价」联络人选择器中重复出现多条相同公司名，现在同一公司只保留一项（优先保留主联络人）

### Changed

#### 文档体系
- **新增最新事实源**：新增 `docs/core/CURRENT_STATE.md`，作为当前系统、权限、数据、迁移和风险的统一现状说明书
- **核心文档精简**：清理根目录和 `docs/core/` 中大量一次性过程总结、重复文档整理报告、旧系统状态报告和临时 CODEX 汇报，保留事实源、更新日志、项目总结、发布摘要和必要部署说明
- **入口文档更新**：更新 `README.md`、`AGENTS.md`、`docs/README.md`、`docs/core/README.md`、`docs/core/PROJECT_SUMMARY.md`，统一指向 `CURRENT_STATE.md` 和当前权限注册表 `src/constants/permissionModules.ts`
- **客户文档修正**：重写 `docs/features/customer/README.md`、`docs/features/customer/USER_GUIDE.md` 和 `src/features/customer/README.md`，删除错位/过时的客户模块过程文档

#### 客户管理页布局
- **头部精简**：移除「客户管理」标题下方与标签页数字重复的「37位客户·10家供应商·6位收货人」提示行
- **大屏紧凑**：外层容器由 `max-w-none`（无限拉伸）改为 `mx-auto max-w-7xl`，与客户详情页保持一致，避免大屏下内容被拉得过宽、行间过于稀疏
- **搜索栏与分类筛选同行**：客户分类筛选 chip 与搜索框合并到同一行（`lg` 断点起横排），视图切换按钮靠右；小屏下自然换行堆叠

---

## [Unreleased] - 2026-06-26

### Changed

#### 询报价登记 / 订单状态表
- **表头样式统一**：询报价登记表和订单状态表统一为浅灰层级表头、列分隔线和排序高亮按钮，提升横向扫描效率。
- **订单状态表筛选增强**：新增搜索框、客户选择器和「进行中」筛选；点击「进行中」时自动切到全部时间并按订单号降序排序；客户选项绑定 `InquiryRecord.inquirer`，状态角标基于时间、关键词、客户筛选后的集合计算。
- **订单状态表行样式**：订单号改为粗体文本，去除绿色徽标底框；C/P/S 订单按标记显示加重灰底、绿底、红底；执行情况按 `备货...`、`交货...`、`发票...` 开头控制文字颜色，空执行情况按备货状态显示。

### Docs
- 更新 `docs/features/inquiry/INQUIRY_MODULE.md`、`docs/features/order/ORDER_STATUS_TABLE.md` 和功能文档索引，记录 2026-06-26 手动验证完成。

---

## [1.3.0] - 2026-06-25

### Added

#### 工具模块
- **RMB大写转换**（`/rmb`）：人民币大写转换工具，支持中文银行大写和英文金额（SAY USD … ONLY）两种格式；5个快捷预设金额；附带规则说明折叠面板
- **时区汇率**（`/clock`）：时间 / 汇率双 Tab；8个默认城市（含上海），时间轴同步所有城市时区；支持外币兑人民币快速换算、关注货币和走势查看
- **全球假日**（`/holidays`）：三类假日 Tab（中国法定 / 全球 / 宗教），移动端优化，过去假日不置灰，进入后即时定位当前月份，假日行支持详情展开

#### 询报价登记优化
- **筛选面板常驻**：移除筛选展开/收起 Toggle，FilterBar 始终可见，标题行去掉，减少操作层级
- **时间芯片角标**：近3月/全部/选月 选中时显示当前过滤条数（深蓝色角标）
- **同步时间上移**：最后同步时间移至顶部导航栏（`topBarSlot` 插槽），桌面端显示在面包屑右侧，移动端显示在页标题旁
- **"共xx条"移除**：以时间芯片角标替代，页面更简洁
- **订单标记（C/P/S）**：询报价记录可标记辙销C / 悬挂P / 善后S；主表格订单编号徽标内显示红色粗体字母 + 红色边框；对应筛选芯片「已辙销」「善后」（悬挂仍归入「已成单」）
- **移动端列宽调整**：询价编号 26%、内容简述 33%、状态 33%、删除 8%

#### AppLayout / AppTopBar
- 新增 `topBarSlot?: ReactNode` 插槽，任意页面可在顶部导航栏注入额外内容（如同步时间）

#### 左侧导航
- 新增 RMB大写（`/rmb`，Banknote 图标）
- 首页大磁贴：移除时区汇率、全球假日、人民币大写三个入口，避免重复

### Changed
- `QuoteStatusFilter` 类型新增 `'cancelled'` 和 `'followup'`
- `InquiryRecord.orderSubStatus?: OrderSubStatus` 新字段（可选，无需 D1 迁移）
- `InquiryBasicInput` 扩展包含 `orderSubStatus`
- `InquiryFilterBar` 筛选芯片：移除 `border-t` 分隔线，与新布局对齐

### Delivered
- **订单状态表**（`/order`）：已实现并进入维护状态，设计与维护文档见 `docs/features/order/ORDER_STATUS_TABLE.md`

---

## [1.1.0] - 2025-01-08

### Added
- **采购模块模块化重构**: 完整的模块化架构，包含store/selectors/services/hooks/components
- **键盘导航功能**: ItemsTable支持Enter键在单元格间移动，ArrowUp/ArrowDown在行间移动
- **历史搜索功能**: HistoryDrawer支持按标题、PO号、供应商名称实时搜索过滤
- **自动保存功能**: 300ms防抖自动保存，支持localStorage配额不足时的降级保存
- **PDF负载集中化**: 统一的PDF导出数据结构，避免页面到处拼装
- **Toast提示系统**: 保存成功/失败的用户反馈，支持自动消失
- **表单验证增强**: 字段级错误提示，实时验证反馈
- **Store迁移v3**: 支持布尔字段从字符串到布尔值的自动迁移
- **类型安全**: 完整的TypeScript覆盖，零构建警告
- **回归测试套件**: 全面的功能测试清单

### Changed
- **采购页面架构**: 从单体组件重构为模块化架构
- **表单绑定统一**: 使用field/numberField/boolField/selectField统一处理
- **错误处理机制**: 统一的错误提示和异常处理
- **数据持久化**: 改进的localStorage管理和版本迁移

### Fixed
- **构建警告**: 解决所有TypeScript类型错误和React受控告警
- **服务层兼容性**: 修复新旧数据结构的兼容性问题
- **性能优化**: 减少不必要的重渲染和内存泄漏

### Breaking Changes
- 无破坏性变更，保持路由与数据完全兼容

## [1.0.0] - 2024-01-15

### Added
- **PDF性能优化**: 实现字体和图片缓存系统，大幅提升PDF生成性能
- **字体预热优化**: 首轮字体加载从9.7s优化到150-180ms
- **PDF生成优化**: 表格生成从463ms优化到250ms左右
- **缓存系统**: 支持字体和图片的版本控制和缓存管理
- **错误处理**: 完善的缓存错误处理和降级机制

### Changed
- **Dashboard页面重构**: 模块化拆分，提升代码可维护性
- **性能优化**: 统一文档计数逻辑，使用Map加速权限判断
- **用户体验**: 响应式筛选器，智能空状态提示

### Fixed
- **代码质量**: 完整的TypeScript类型定义，完善的错误处理
- **状态同步**: 修复重新开始功能数据恢复问题
- **全局粘贴**: 增强支持"名称，数量，单位，单价"4列格式智能识别

## [0.9.0] - 2024-01-10

### Added
- **2048游戏AI推演功能**: 使用Expectimax算法和蒙特卡洛树搜索
- **随机演示功能**: 用于调试和蒙特卡洛模拟
- **推演统计和速度控制**: 支持手动干预和撤销功能
- **移动端优化**: 优化移动端用户体验

### Changed
- **AI算法性能**: 支持Alpha-Beta剪枝优化
- **状态管理**: 使用JSON深拷贝确保状态隔离

## [0.8.0] - 2024-01-05

### Added
- **报价管理Notes自定义排序**: 支持拖拽排序和显示控制
- **完整Notes类型**: 包含9种Notes类型，支持质量条款、保修条款等
- **双语模板**: EXW工厂交货/FOB离岸价/CIF到岸价等一键套用
- **内联选择器**: Payment Terms和Delivery Terms支持下拉选择

### Changed
- **用户体验**: 卡片式布局，展开态强化，收缩态标签
- **搜索功能**: 支持选项搜索，快速定位所需内容
- **拖拽编辑分离**: 拖拽句柄与编辑区域完全分离，避免冲突

## [0.7.0] - 2023-12-20

### Added
- **企业级预水合清理工具**: 解决Next.js应用中浏览器扩展导致的hydration警告问题
- **独立包发布**: 预水合清理工具已作为独立包发布

### Changed
- **项目结构**: 优化项目架构和文档组织

## [0.6.0] - 2023-12-15

### Added
- **邮件系统**: 集成邮件发送功能
- **装箱单管理**: 创建详细的装箱清单
- **发票管理**: 生成和管理发票

### Changed
- **Dashboard智能管理**: 模块化设计，实时文档管理
- **权限系统**: 多源权限容错，支持Store、Session、本地缓存三重权限源

## [0.5.0] - 2023-12-10

### Added
- **404页面娱乐功能**: 五子棋游戏和2048游戏
- **Dashboard模块化**: 清晰的模块按钮和权限控制
- **智能预加载**: 悬停预加载和权限动态预加载

### Changed
- **搜索高亮**: 支持文档编号、客户名称等关键词搜索和高亮显示
- **响应式布局**: 完美适配移动端和桌面端

## [0.4.0] - 2023-12-05

### Added
- **采购管理**: 处理供应商采购订单
- **报价管理**: 创建和管理客户报价单

### Changed
- **技术栈升级**: Next.js 14 (App Router)
- **UI组件**: Tailwind CSS + Lucide React

## [0.3.0] - 2023-11-30

### Added
- **状态管理**: React Hooks + Zustand
- **部署平台**: Vercel配置

### Changed
- **项目结构**: 优化目录组织和文件结构

## [0.2.0] - 2023-11-25

### Added
- **基础功能**: 用户认证、权限管理
- **核心业务**: 报价、采购、发票、装箱单

### Changed
- **架构设计**: 现代化企业管理系统架构

## [0.1.0] - 2023-11-20

### Added
- **项目初始化**: MLUONET企业管理系统基础框架
- **技术栈**: Next.js、TypeScript、Tailwind CSS
- **基础配置**: 开发环境、构建配置、部署设置
