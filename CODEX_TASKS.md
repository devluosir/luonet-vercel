# CODEX_TASKS.md — 任务索引（精简）

最后更新：2026-07-12

执行前阅读 `AGENTS.md`。当前事实以 `docs/core/CURRENT_STATE.md`、`docs/core/CHANGELOG.md` 为准。

> 本文件曾长达约 1.5 万行，堆积已完成 TASK 规格原文。历史内容已从工作树删除，需要时用 git 找回：
> `git log --follow -- CODEX_TASKS.md` / `git show <commit>:CODEX_TASKS.md`

## TASK-103：移动端底部导航改为「新建/登记/管理/工具/我」五个入口 + 浮动子菜单

**状态**：已完成（2026-07-09，本次会话由 Claude 直接实现，未经 Codex）
**日期**：2026-07-09

**执行记录**：
- 重写 `src/components/layout/MobileBottomTab.tsx`：5 个分类入口 + 浮动子菜单，权限过滤逻辑与 `AppSidebar.tsx` 的 `PERMISSION_MODULE_MAP`/`isVisible` 对齐；「新建」复用 `QUICK_CREATE_MODULES`。
- 新建 `src/components/layout/MobileSheetModal.tsx`（通用移动端底部弹窗壳）。
- 新建 `src/components/layout/UserProfilePanel.tsx`：从 `AppUserMenu.tsx` 抽出资料/改密面板，供桌面端下拉菜单与移动端「我」菜单共用；`AppUserMenu.tsx` 同步精简，新增 `isEditingPassword` 状态通过 `onChangePasswordToggle` 回调维持原有「改密期间不自动收起子菜单」行为。
- `AppLayout.tsx` 向 `MobileBottomTab` 传入 `user` / `onLogout`。
- 「关于」为占位弹窗，内容后续再定（用户已确认）。
- 验证：`npx tsc --noEmit` 通过；`npx eslint`（改动的 5 个文件）无输出；`npm run build` 在沙箱 45s 超时内跑到 Next.js webpack 编译阶段未见报错，未能等到编译完全结束（沙箱单次命令有时长限制，历史已知问题）——建议用户本地或 CI 跑一次完整 `npm run build` 二次确认。
- 未做手动窄屏浏览器视觉验证（沙箱无可视浏览器/无本地运行中的 dev server），建议用户本地开发环境用 DevTools 模拟 <768px 验证 5 入口显示、浮动菜单、权限收缩、active 高亮、深色模式。

**追加调整（同日）**：
- `MobileSheetModal.tsx` 弹窗改为所有屏宽都居中显示（原先移动端贴底、`sm` 起才居中）。
- 「关于」内容改为 Logo + 「LC App」+ 展示版本号 `V1.0.0`（硬编码常量 `APP_DISPLAY_VERSION`，与 `package.json` 的 `1.2.0` 是两回事，用户明确要求展示 V1.0.0）。
- `UserProfilePanel.tsx` 新增 `layout?: 'compact' | 'sheet'`，移动端弹窗用 `sheet`（居中头像+大字号+独立改密按钮），桌面端 hover 子菜单保持默认 `compact` 不变。
- 「我」菜单新增「管理后台」，仅 `user.isAdmin` 显示，点击 `router.push('/admin')`，与桌面端 `AppUserMenu.tsx` 行为一致。
- 验证：`npx tsc --noEmit` 通过，`npx eslint`（改动的 3 个文件）无输出。

**追加调整 2（同日）**：用户确认原方案有导航缺口——底部 5 分类不含首页/AI邮件，且汉堡菜单断点是 `lg:hidden`（0–1024px 全程显示），768–1024px 平板宽度下桌面侧边栏（`lg:flex`）和底部导航（`md:hidden`）都不出现，汉堡菜单是该区间唯一入口，不能直接删除。用户选择：把首页和 AI 邮件补进底部导航，再取消小屏（<768px）汉堡。
- `MobileBottomTab.tsx`：新增「首页」直达入口（`kind: 'link'`，无子菜单，直接 `Link` 到 `/dashboard`，不受权限过滤），置于最左；「工具」分类追加「AI 邮件」（`/mail`，moduleId `ai-email`），与桌面端 `AppSidebar.tsx` tools 分组的 `['impa', 'clock', 'holidays', 'rmb', 'mail']` 对齐。入口总数从 5 变为最多 6（首页 + 新建/登记/管理/工具中权限允许的 + 我）。
- `AppTopBar.tsx`：汉堡按钮从 `lg:hidden`（<1024px 常显）改为 `hidden md:flex lg:hidden`（仅 768–1024px 显示），<768px 隐藏（底部导航已覆盖全部入口），≥1024px 隐藏（桌面侧边栏覆盖）。
- 验证：`npx tsc --noEmit` 通过，`npx eslint`（`MobileBottomTab.tsx` / `AppTopBar.tsx`）无输出。

**追加调整 3（同日）**：用户反馈"新建"菜单里的"内销合同"没有正确跳转（打开后仍是报价单条款/未切到合同类型）。
- 根因：`docType` URL 参数（`/quotation?tab=domestic&docType=contract`）只在页面**首次挂载**的初始化 effect 里读取一次（`useInitQuotation.ts` 原第 38–50 行注释就写明"仅首页快速创建入口会携带该参数"，隐含假设"总是新挂载"）。移动端"新建"浮动菜单允许在同一个已挂载的 `/quotation` 页面内连续切换不同子项（只变查询参数、不重新挂载），这种场景下原来监听 `searchParams` 变化的 effect 只同步了 `tab`，没读 `docType`，导致内销报价⇄内销合同之间切换、或从其他"新建"子项直接跳内销合同都不会正确应用单据类型。这不是新功能引入的 bug，是复用已有 `docType` 机制时暴露了它"只承诺处理首次挂载"的既有假设。
- 修复：`src/features/quotation/hooks/useInitQuotation.ts` 的 searchParams 监听 effect 里补上 `updateData({ domesticDocType })` + 对应默认条款 `setNotesConfig(...)`（复用 `DOMESTIC_NOTES_CONFIG` / `DOMESTIC_QUOTATION_NOTES_CONFIG`，与页面内手动切换按钮 `handleDomesticDocTypeChange` 的 `applySwap()` 逻辑一致，但不含"是否已编辑过条款"的二次确认弹窗——这里视为"新建"场景，等同首次挂载）；应用后从 URL 里删除已消费的 `docType`，避免浏览器前进/后退等场景重新触发、覆盖用户后续手动切换的选择。
- 非目标：未改动 `initDataFromSources` / `initNotesConfigFromSources`（首次挂载路径）、未改动页面内手动切换按钮的确认弹窗逻辑。
- 验证：`npx tsc --noEmit` 通过，`npx eslint`（`useInitQuotation.ts`）无输出；`npx jest` 在当前沙箱因缺 SWC 原生二进制（arm64）无法运行，未做自动化测试验证，建议用户本地跑一次 `npm run test` 和手动点击 内销报价⇄内销合同 二次确认。

### 背景

小屏（`md:hidden`，即 < 768px）当前的底部导航是 `src/components/layout/MobileBottomTab.tsx` 里的 5 个直达 tab（首页/外贸报价合同/登记表/历史/邮件），每个都是整页跳转链接。现在要改为固定 5 个分类入口——**新建、登记、管理、工具、我**——点击后从入口上方弹出浮动子菜单，而不是直接跳页；子菜单项要按用户权限过滤，子菜单全空时对应顶层入口也隐藏。

这不是全新功能，而是把已有的三份数据/逻辑重新组合：
- "新建"的 7 项与 `src/constants/dashboardModules.ts` 里的 `QUICK_CREATE_MODULES` 完全一致（id/label/path 都能直接复用）。
- "登记""管理""工具"的子项与 `src/components/layout/AppSidebar.tsx` 里 `NAV_ITEMS` 的对应条目（含 `permissionKey`）完全一致，权限判断逻辑也要照抄 `AppSidebar.tsx` 的 `PERMISSION_MODULE_MAP` + `isVisible`（TASK-146 后为显式 `canAccess === true`，不再用管理员兜底），保持两端权限口径一致。
- "我"分类里的"个人信息"要复用 `src/components/layout/AppUserMenu.tsx` 里已有的资料/改密面板逻辑，不要重写一份。

### 文件范围

- `src/components/layout/MobileBottomTab.tsx` — 主要改造对象，替换 `MOBILE_TABS` 数据结构和渲染逻辑
- `src/constants/dashboardModules.ts` — 只读复用 `QUICK_CREATE_MODULES` 作为"新建"子菜单数据源，不要重复定义一份新的
- `src/components/layout/AppSidebar.tsx` — 只读参考/复用 `NAV_ITEMS`、`PERMISSION_MODULE_MAP` 里"登记"（inquiry/order/purchase-registration/purchase-order-table）、"管理"（history/customer）、"工具"（impa/clock/holidays/rmb，**不含** mail）对应条目，不要改动这个文件本身的桌面端渲染逻辑
- `src/components/layout/AppUserMenu.tsx` — "个人信息"复用这里的资料/改密面板（可提取成共享组件，也可以直接在移动端复用同一份状态/表单逻辑，具体实现方式由 Codex 决定）；"退出登录"复用 `onLogout`
- 新建文件：一个"关于"空壳弹窗组件（路径/命名 Codex 自定，建议放 `src/components/layout/` 下）——只做入口和空弹窗，标题 + "内容待补充" 占位文字即可，用户明确表示内容后续再定，不要自行编造公司介绍等内容
- 如果 5 个分类要复用同一套"点击展开浮动菜单 + 点外部收起"交互逻辑，建议抽一个共享子组件（如 `MobileFloatingMenu.tsx`），避免 5 份重复代码，但这是实现细节，非强制

### 验收标准

- 小屏底部导航固定显示 5 个顶层入口（权限过滤后可能少于5个，见下）：新建、登记、管理、工具、我
- 点击顶层入口弹出浮动子菜单（非整页跳转），内容：
  - **新建**：外贸报价、外贸合同、内销报价、内销合同、箱单发票、财务发票、采购订单 —— 路径与 `QUICK_CREATE_MODULES` 一致（如 `/quotation?tab=quotation`、`/quotation?tab=confirmation`、`/quotation?tab=domestic&docType=quotation` 等）
  - **登记**：询报价登记 `/inquiry`、订单状态表 `/order`、采购部登记 `/purchase-registration`、采购订单表 `/purchase-order-table`
  - **管理**：单据历史 `/history`、客户管理 `/customer`
  - **工具**：IMPA物料（外链 `https://impa.luocompany.com`，新标签页打开）、时区汇率 `/clock`、全球假日 `/holidays`、RMB大写 `/rmb`
  - **我**：关于（空壳弹窗）、个人信息（复用现有资料/改密面板）、退出登录（调用 `onLogout`）
- 权限过滤：新建/登记/管理/工具四个分类的子项权限判断要和 `AppSidebar.tsx` 的 `PERMISSION_MODULE_MAP` + `isVisible` 口径一致（moduleId：quotation/packing/invoice/purchase/inquiry/purchaseRegistration/purchaseOrderTable/history/customer/clock/holidays/rmb/impa），**不要**直接复用 `src/features/dashboard/utils/moduleFilters.ts` 的 `filterQuickCreateModules`（它对内销报价/内销合同两项直接放行、不做权限校验，是已知偏差，本任务不修复，但移动端新入口不能继承这个偏差）
- 某分类下子项经权限过滤后全部为空，则该顶层入口本身也不显示；"我"入口固定常驻，不受权限过滤影响
- 顶层入口按最终可见数量自适应等宽栅格（沿用现有 `visibleTabs.length` 动态 `gridTemplateColumns` 思路）
- 同一时刻最多一个浮动菜单展开；点击菜单外部区域，或点击某个子项跳转后，菜单自动收起
- 当前路由命中某分类下任一子项路径时，对应顶层入口要有 active 高亮态（需按新分类重新实现判断逻辑，例如命中 `/quotation`、`/packing`、`/invoice`、`/purchase` 都让"新建"高亮；命中 `/inquiry`、`/order`、`/purchase-registration`、`/purchase-order-table` 让"登记"高亮，以此类推）
- 浮动菜单与 `AppBottomActionBar`（页面级底部操作栏，占用额外高度）同屏出现时不能互相遮挡，菜单要完整可点击
- 深色模式（`dark:`）配色与现有 `MobileBottomTab` 保持同一套体系

### 非目标 / 红线

- 不改动桌面端/平板端（`md` 及以上）导航；`AppSidebar.tsx` 的桌面渲染逻辑、`NAV_GROUPS`、`NAV_ITEMS` 结构本身不动（只读复用其中的数据和权限映射）
- 不修复 `filterQuickCreateModules` 对内销报价/内销合同权限校验缺失的问题（那是仪表盘快捷入口既有行为，不在本任务范围）
- 不在移动端"我"菜单加"管理后台"入口，即使当前用户是管理员——严格按用户列出的 3 项（关于/个人信息/退出登录）
- 不确定"关于"面板的最终展示内容——只做空壳弹窗，用户明确表示内容后续再定，不要自行编造
- 原来 `MobileBottomTab` 里的"首页"和"AI 邮件"直达入口从底部 5 项里移除后，不需要做迁移补偿——两者仍可通过 `AppTopBar` 汉堡菜单打开的侧边栏 overlay 访问

### 验证步骤

- `npx tsc --noEmit`
- `npx eslint` 改动到的文件
- `npm run build`
- 手动窄屏（<768px，可用浏览器 DevTools 模拟）验证：5 入口显示与自适应布局、每个浮动菜单内容和跳转路径、不同权限账号下子项/顶层入口的收缩、路由 active 高亮、点外部收起、深色模式

**状态**：not started

## TASK-104：登记/订单类页面默认筛选调整（订单进行中 / 登记当月）

**状态**：已完成（2026-07-09，本次会话由 Claude 直接实现，未经 Codex）
**日期**：2026-07-09

### 背景

用户要求两组页面调整"默认进入时"的筛选状态（不是加新筛选项，是改初始值）：
1. 订单状态表 `/order`、采购订单表 `/purchase-order-table`：默认选中"进行中"。
2. 询报价登记 `/inquiry`、采购部登记 `/purchase-registration`：默认选中"当月"。

### 执行记录

- `src/features/order/app/OrderPage.tsx`：`timeRange` 默认值 `'3months'` → `'all'`，`orderStatusFilter` 默认值 `'all'` → `'inProgress'`，`sortField` 默认值 `'deliveryDate'` → `'orderNo'`（与手动点击"进行中"筛选芯片时的副作用组合完全一致，见该文件里 FilterChip 的 onClick）。`activeCount` 基准和 `resetFilters()` 同步改为这套新默认值，保证"重置"回到与首次进入相同的视图。
- `src/features/purchase-order-registration/app/PurchaseOrderRegistrationPage.tsx`：同样把 `timeRange`/`orderStatusFilter` 默认值改为 `'all'`/`'inProgress'`，`activeCount` 基准和 `onReset` 同步更新。
- `src/features/inquiry/hooks/useInquiryFilter.ts`：询报价登记与采购部登记共用此 hook。原 `DEFAULT_FILTER` 是模块级常量、`timeRange` 硬编码 `'3months'`；改为 `getDefaultFilter()` 函数，`timeRange` 用 `` `month:${todayMonth()}` `` 动态计算（与月份导航器 `MonthRangeNav` 的 `month:YYYY-MM` 格式一致）。用函数而非模块常量是因为如果写死在模块加载时计算一次，SPA 会话跨月不刷新页面时会一直停留在旧月份。`useState` 初始值改用惰性初始化 `useState(getDefaultFilter)`，`reset()` 和 `activeCount` 基准同步改为动态"当月"而不是固定 `'3months'`。
- 未新增筛选选项，未改 `matchesTimeRange` / `matchesOrderStatus` 等匹配逻辑本身，只改了默认值和"重置"目标值。

### 验证

- `npx tsc --noEmit` 通过。
- `npx eslint`（`OrderPage.tsx` / `PurchaseOrderRegistrationPage.tsx` / `useInquiryFilter.ts` / `InquiryFilterBar.tsx`）无输出。
- `npm run build` 在沙箱 45s 超时内跑到 Next.js webpack 编译阶段未见报错，未等到编译完全结束（沙箱单命令时长限制，非本次改动引入的问题）。
- 未做手动浏览器验证，建议本地确认：打开 `/order`、`/purchase-order-table` 默认是否显示"进行中"芯片高亮 + 时间范围"全部"；打开 `/inquiry`、`/purchase-registration` 默认月份导航器是否显示当前月份（如"7月"）而不是"选月"占位；各页点"重置筛选"应回到同样的默认状态。

## TASK-105：订单执行情况——自由文本误判完成态 + 清除按钮不生效

**状态**：已完成（2026-07-09，本次会话由 Claude 直接实现，未经 Codex）
**日期**：2026-07-09

### 背景

用户截图反馈（订单状态表 `/order`）：执行情况（`orderDeliveryStatus`）文本框里写了"合同确认中"（不是"交货"/"发票"开头），整行就从"进行中"的粉色变成了普通灰色（等同被判定为已完成/非进行中）；且点"清除"按钮清空文字后，状态无法恢复成原来空白的"进行中"（粉色）——刷新或同步后又变回去。定位到两个独立根因：

1. **分类逻辑方向反了**：执行情况是自由文本输入框（`DeliveryStatusCell.tsx`，备货/交货/发票只是快捷预设，不限制只能填这三种），但 `isInProgressOrder`/行文字颜色逻辑却反过来"白名单"匹配 备货/交货 前缀——任何不认识的文字都会被当成"既不是备货也不是交货"，从而被误判成完成态。四处重复实现：`OrderPage.tsx`、`OrderRow.tsx`、`PurchaseOrderRegistrationPage.tsx`、`PurchaseOrderRow.tsx`。
2. **清除不生效**：`executeSyncOp`（`inquiry.service.ts`）用 `JSON.stringify(op.payload)` 序列化同步请求体，`undefined` 字段会被整体丢弃（不是传 `null`，是这个 key 都不出现）。清除操作 `onSave(undefined, undefined)` 最终发出的 PUT 请求体里根本没有 `orderDeliveryStatus` 这个 key，服务端 `worker.ts` 的 `{...existingData, ...body}` 合并逻辑因此看不到"清空"这个动作、保留旧值；下次 GET 拉取又把旧值合并回本地，造成"清除完刷新又变回去"的现象。

### 执行记录

- `src/features/order/app/OrderPage.tsx`：`isInProgressOrder` 改为"只有明确 `发票` 前缀才算完成，其余（含空/备货/交货/任意自定义文字）都算进行中"。
- `src/features/order/components/OrderRow.tsx`：`getRowTextClass` 同步调整——`交货` 蓝色、`发票` 深色，其余（含空/备货/任意自定义文字）一律粉色。
- `src/features/purchase-order-registration/app/PurchaseOrderRegistrationPage.tsx`、`src/features/purchase-order-registration/components/PurchaseOrderRow.tsx`：与订单状态表完全一致同步修改（这两个文件本就是"与 OrderPage/OrderRow 保持一致"的重复实现，注释里也写明了这一点）。
- `src/features/inquiry/services/inquiry.service.ts`：新增 `normalizeSyncPayload()`，在 `executeSyncOp` 序列化请求体前，把 payload 里值为 `undefined` 的字段显式转成 `null`（`null` 能正常被 `JSON.stringify` 保留并传给服务端）。**未改动 `worker.ts`**——服务端现有的 `{...existingData, ...body}` spread 合并逻辑本来就会用显式 `null` 正确覆盖旧值，问题只出在客户端序列化这一步，一次性修复覆盖了"全量记录同步"（`/order`，走 `updateInD1`）和"局部 patch 同步"（`/purchase-order-table`，走 `patchRecordForView`/`patchInD1`）两条路径。

### 非目标

- 未修改 `worker.ts` 里已有的 `INQUIRY_CLEARABLE_FIELDS` 白名单机制（那是给"整条记录同步但字段缺失=清空"这个更窄场景用的旧机制，本次修复更通用，覆盖了它但没有替换/删除它）。
- 未改动 `DeliveryStatusCell.tsx` 的预设按钮（备货/交货/发票）或输入框本身的交互。
- 未涉及采购部登记 `/purchase-registration`（该页面没有执行情况字段/进行中判定）。

### 验证

- `npx tsc --noEmit` 通过。
- `npx eslint`（`OrderPage.tsx` / `OrderRow.tsx` / `PurchaseOrderRegistrationPage.tsx` / `PurchaseOrderRow.tsx` / `inquiry.service.ts`）无输出。
- 未做手动浏览器验证（沙箱无法登录测试账号操作真实同步），建议本地验证：在执行情况里填非备货/交货/发票的自定义文字，确认行仍是粉色且计入"进行中"筛选；点清除后确认文字消失且颜色变回默认粉色，刷新页面/切换设备后确认清空状态确实持久化（不会被旧值同步回来）。

## TASK-106：内销合同/报价 PDF 表头改为「logo+矢量文字」，减小文件体积（试点）

**状态**：已完成（2026-07-09，本次会话由 Claude 直接实现，未经 Codex；用户已确认先只改一种单据类型看效果）
**日期**：2026-07-09

### 背景

用户反馈生成的 PDF 有几百 KB，问表头能否从整张横幅图片改成"logo+文字"排版。排查确认：`scripts/embed-resources.js` 把整条表头横幅图（`public/images/header-bilingual.jpg` ~92.3KB / `header-english.png` ~24KB）连同印章图、两个完整的 NotoSansSC 中文字体文件一起塞进 `src/lib/embedded-resources.ts`，`domesticQuotationPdfGenerator.ts`（内销报价/合同）等 6 个 PDF 生成器各自用 `doc.addImage()` 把整张横幅图嵌进每份 PDF。用实测排除了另一个怀疑点——`putOnlyUsedFonts` 选项缺失：直接用 jsPDF 2.5.2 + 完整 NotoSansSC-Regular.ttf（10.56MB）跑了一次对照测试，开关这个选项只差 2.2KB，不是本版本 jsPDF 的主要体积来源，未做改动。

用户确认：先只改内销合同这一种单据类型看效果，文字排版尽量还原现有"logo居左、公司名+地址居中"的样子，再决定要不要推广到外贸报价单/销售确认/装箱单/发票/采购单。

### 执行记录

- 新增 `public/images/header-logo-icon.png`：从现有 1024×1024 app 图标（`public/assets/logo/Assets.xcassets/AppIcon.appiconset/1024.png`）降采样到 160×160，PNG 优化后 ~13.0KB。
- `scripts/embed-resources.js`：新增 `logoIcon` 资源项，指向上述文件；跑过一次 `node scripts/embed-resources.js` 重新生成 `src/lib/embedded-resources.ts`（新增 `logoIcon` 字段，其余字段不变，`headerImage`/`headerEnglish` 仍保留供其它 5 个生成器使用）。
- 新增 `src/utils/companyLetterhead.ts`：`COMPANY_LETTERHEAD` 常量（英文名/中文名/英文地址/电话邮箱网址一行），文字与原横幅图上的一致，供后续如推广到其它生成器时复用，不用各处硬编码。
- `src/utils/imageLoader.ts`：新增 `getLogoIcon()` 导出。
- `src/utils/domesticQuotationPdfGenerator.ts`：原 `drawHeaderImage()`（`doc.addImage` 整张横幅图）替换为 `drawHeaderBlock()`——14mm 方形 logo 图标居左 + `NotoSansSC` 矢量文字居中（英文名 13pt 粗体、中文名 10.5pt 粗体仅双语模式显示、地址与联系方式 7.5pt 常规），`headerType` 为 `none`/`bilingual`/`english` 三态判断逻辑不变。
- 验证方式：用真实的 `NotoSansSC` 字体文件 + 新 logo 图标，在沙箱里跑了一份独立的 jsPDF 复现脚本（同一套定位/字号参数），用 `pdftoppm` 转成 PNG 做了视觉核对，效果与原横幅图基本一致（已发给用户看过预览图）；未通过浏览器实跑真实生成流程（沙箱无法登录跑完整业务表单）。
- 体积影响：`headerImage` 解码后 94,514 字节，新 `logoIcon` 解码后 13,271 字节，单份内销合同/报价 PDF 预计减少约 81KB（双语表头场景）。

### 非目标

- 未改动外贸报价单（`quotationPdfGenerator.ts`）、销售确认（`orderConfirmationPdfGenerator.ts`）、装箱单（`packingPdfGenerator.ts`）、发票（`invoicePdfGenerator.ts`）、采购单（`purchasePdfGenerator.ts`）——这 5 个生成器仍用原横幅图片方案，等用户看过内销合同的实际效果后再决定是否推广。
- 未删除 `embeddedResources.headerImage`/`headerEnglish`（仍被其它 5 个生成器引用），未做无用资源清理。
- 未改动印章图片（`shanghaiStamp`/`hongkongStamp`）——盖章是必须的图形资产，无法矢量化。
- 未处理 `putOnlyUsedFonts` 选项缺失（`quotationPdfGenerator.ts`/`purchasePdfGenerator.ts`/`domesticQuotationPdfGenerator.ts` 仍未显式传这个参数）——已实测确认这个不是本版本 jsPDF 的体积瓶颈，不需要动。

### 验证

- `npx tsc --noEmit` 通过。
- `npx eslint`（`domesticQuotationPdfGenerator.ts` / `imageLoader.ts` / `companyLetterhead.ts` / `scripts/embed-resources.js`）无输出。
- 沙箱内独立 jsPDF 脚本 + `pdftoppm` 渲染视觉核对通过（非真实业务代码路径的直接产物，是同参数复现）。
- **待用户验证**：在真实环境里生成一份内销报价单/合同 PDF，确认表头视觉效果、Word/PDF 阅读器兼容性正常，并对比生成文件的实际大小变化；确认满意后再决定要不要让 Codex/后续会话把同样的改法推广到其它 5 个生成器。

**追加修正（同日）**：第一版 `logoIcon` 用的是 app 图标（纯菱形 LC 图标，来自 `Assets.xcassets/AppIcon.appiconset/1024.png` 降采样），用户反馈原图标下方本来有一行蓝色 "Luo & Company" 文字丢了——那行字是 logo 视觉的一部分，不是随便一个方形图标能替代的。改为直接从 `header-bilingual.jpg` 裁出"菱形图标 + Luo & Company 文字"的完整 lockup（裁剪范围 x:47-264, y:31-257，四周加 10px 白边），96 色量化压缩后 13.8KB（跟之前纯图标版本 13.3KB 几乎一样大，没有变胖）。`drawHeaderBlock()` 里的 logo 尺寸换算同步改为按裁出来的图片真实长宽比（237:246）而非正方形，避免拉伸变形。已用同一套沙箱可视化流程重新核对过效果。

**追加调整（同日）**：用户反馈 logo 图标可以再大一点。`logoHeight` 从 16mm 调到 20mm（宽度仍按 237:246 比例联动），不影响整体表头高度（文字块本身已经比 16mm 的 logo 高，`headerHeight = Math.max(logoHeight, 文字块高度)` 取的是文字块，20mm 的 logo 仍在这个高度预算内，不会把下面内容往下挤）。

**追加调整 2（同日）**：用户反馈中文公司名可以再大一点，地址/电话两行加粗、行距缩小。中文名字号 10.5→12.5，行距 4.6→5mm；地址行、联系方式行字体从 `normal` 改 `bold`，两行之间的行距从 4mm 缩到 3.4mm（最后一行到表头结束仍留 4mm）。

**追加调整 3（同日）**：用户问"中英文公司名同宽"效果。改成动态计算——先用 `doc.getTextWidth()` 量出英文名（13pt）的实际渲染宽度，再反推中文名字号，使中文名渲染宽度与英文名一致（而不是写死一个字号，中英文字符宽度差异大，固定字号很难保证两行等宽）。当前文案下算出来约 16.87pt（比之前的 12.5pt 明显更大，视觉上两行等宽、更像正式信笺抬头）。用沙箱可视化核对过，效果符合预期。这个计算是动态的——以后 `COMPANY_LETTERHEAD.nameEn`/`nameCn` 文案变了，中文字号会跟着重新计算，不需要手动调参数。

**追加调整 4（同日）**：用户反馈调整 3 的等宽计算（~16.87pt）中文字太大了。改回固定字号 13.5pt，去掉宽度反推逻辑（连带删掉不再使用的 `enNameWidth` 变量）。渲染了 13.5pt/14.5pt 两版预览对比，用户未回复偏好前先选定视觉上更克制的 13.5pt——比原始 10.5pt 明显大、比等宽版的 16.87pt 收敛，与英文名（13pt）视觉重量接近。若后续用户觉得还需要微调，直接改 `drawHeaderBlock()` 里的 `cnFontSize` 常量即可，不再是动态计算。

**追加调整 5（同日）**：用户反馈中文名与下方地址/电话两行之间的行距还可以再近一些。原来中文名后的行距是 `cnFontSize * 0.3528 * 1.25`（约 5.96mm），调成 `* 0.75`（约 3.57mm）——这个值特意跟地址行→联系方式行的固定间距 3.4mm 接近一致，让整个信笺抬头三行文字（英文名/中文名/地址/联系方式）的行距观感统一，不再是"名字块跟地址块之间明显比地址块内部松"。渲染对比过 0.95/0.75 两个倍数，选了收紧更明显的 0.75。

## TASK-107：logo+矢量文字表头推广到全部 6 个 PDF 生成器

**状态**：已完成（2026-07-09，本次会话由 Claude 直接实现，未经 Codex）
**日期**：2026-07-09

### 背景

用户对 TASK-106 试点效果（内销合同/报价）满意，要求"以此 header 为准，将所有中英文版的文件头进行应用"，即把 logo+矢量文字表头推广到其余 5 个还在用整条横幅图片的生成器：`quotationPdfGenerator.ts`（外贸报价单）、`orderConfirmationPdfGenerator.ts`（销售确认）、`invoicePdfGenerator.ts`（发票）、`packingPdfGenerator.ts`（装箱单/形式发票）、`purchasePdfGenerator.ts`（采购单）。

排查发现这 5 个文件里表头逻辑全部是内联写在主生成函数体内的（不像 domestic 那样已经抽成独立函数），且其中 3 个（invoice/packing/purchase）各自内联复制了一份 `getHeaderImage`/`getHeaderImageFormat`，完全绕开 `imageLoader.ts`。`purchasePdfGenerator.ts` 业务上没有 `headerType` 配置项，一直固定双语表头。

### 执行记录

- 新增 `src/utils/pdfHeaderBlock.ts`：把 TASK-106 里在 `domesticQuotationPdfGenerator.ts` 内联的 `drawHeaderBlock()` 抽成共享函数（签名 `(doc, headerType, margin, pageWidth, y) => Promise<number>`，`headerType` 为 `'bilingual' | 'english' | 'none'`），6 个生成器共用同一份实现，样式改动以后只改这一个文件。
- `domesticQuotationPdfGenerator.ts`：原地保留的 `drawHeaderBlock()` 改为薄封装，内部直接调用共享函数；删掉不再需要的 `getLogoIcon`/`COMPANY_LETTERHEAD` 本地 import。
- `quotationPdfGenerator.ts` / `orderConfirmationPdfGenerator.ts`：把内联的整图表头代码块替换成一行 `drawHeaderBlock()` 调用；这两个文件本来就 import `imageLoader.ts` 的 `getHeaderImage`/`getHeaderImageFormat`，改造后这两个 import 已移除（不再被其它地方引用）。
- `invoicePdfGenerator.ts`：内联表头代码替换为 `drawHeaderBlock()` + 统一的标题绘制；删掉了本地重复实现的 `getHeaderImageBase64()`/`getHeaderImageFormat()`，以及只在 headerType 分支里用到的 `handleHeaderError()`/`handleNoHeader()`（新逻辑下表头和标题统一处理，不再需要三套独立的降级路径）。`PDFGeneratorData.headerType` 类型是宽松的 `string`（不是字面量联合类型），调用处做了 `as PdfHeaderType` 类型断言。
- `packingPdfGenerator.ts`：内联表头代码里原本有"横向模式+显示 marks 列"的紧凑排版分支（`shouldUseCompactHeader`），实测两个分支算出来的图片尺寸完全一样，是历史遗留的重复代码，替换时一并合并成统一调用；同样删掉本地 `getHeaderImage()`/`getHeaderImageFormat()`/`handleHeaderError()`/`handleNoHeader()`。
- `purchasePdfGenerator.ts`：内联表头代码替换为 `drawHeaderBlock(doc, 'bilingual', margin, pageWidth, startY)`——固定传 `'bilingual'`，因为这个单据类型本来就没有 `headerType` 配置项，保留原有"永远双语表头"的业务行为；删掉本地 `getHeaderImage()`/`getHeaderImageFormat()`。
- **横向页面居中修正**：装箱单在"显示 marks 列"时会用横向 A4（pageWidth≈297mm）。共享函数原先用 `pageWidth / 2` 居中文字，纵向页面（pageWidth≈210mm）下这正好等于 `margin + 内容宽度/2`，跟 logo 位置协调；但横向页面下会把文字拉到页面正中间，logo 留在左边距，两者中间出现一大截空白，视觉上像没对齐（沙箱渲染预览验证时发现的，非用户报告）。改成 `centerX = margin + Math.min(pageWidth - margin * 2, 180) / 2`——180mm 这个封顶刚好比所有纵向 A4 场景的实际内容宽度（160~178mm）大，纵向页面数学上跟原来的 `pageWidth / 2` 完全等价（无回归），只有横向装箱单会触发封顶，让文字块跟 logo 保持在同一视觉分组里。

### 验证

- `npx tsc --noEmit`（全项目）通过。
- `npx eslint`（6 个生成器 + `pdfHeaderBlock.ts`）无输出。
- 沙箱内用共享函数的逻辑复现脚本 + `pdftoppm` 渲染了 5 种场景做视觉核对：纵向双语、纵向纯英文、纵向 none（表头跳过，只剩标题）、横向双语（触发居中封顶）、纵向 margin=25（装箱单纵向场景）——效果符合预期，横向场景的居中问题在这一轮里发现并修正。
- **待用户验证**：在真实环境里分别生成一份外贸报价单/销售确认/发票/装箱单（含显示 marks 列的横向场景）/采购单 PDF，确认表头视觉效果、体积变化符合预期。

### 非目标

- 未改动印章图片（`shanghaiStamp`/`hongkongStamp`）、未处理 `putOnlyUsedFonts`（沿用 TASK-106 的结论，不是体积瓶颈）。
- 未统一 6 个文件里不一致的 `margin`（16/20/25 不等）、`pageWidth` 取值写法（`.getWidth()` 方法 vs `.width` 属性）——这些是各文件既有的历史差异，跟表头改造无关，不属于本次范围。

**追加调整（同日）**：用户反馈双语表头里中文名上方（英文名→中文名）空隙明显比下方（中文名→地址行）大。原来两段间距分别是固定 6.5mm 和 `cnFontSize * 0.3528 * 0.75`≈3.57mm。第一次尝试把两者都设成 3.57mm 做到完全相等，结果英文名和中文名字号都在 13pt 上下、字身较高，间距太紧导致两行文字重叠（渲染预览验证时发现，没有直接推给用户）。改成英文名→中文名 5mm、中文名→地址行 4.5mm——数值上基本对称、视觉上不再有明显的上空下挤，同时留了安全余量不会重叠。`nameEn`/`nameCn` 之间的间距只在双语模式下收紧到 5mm，纯英文模式（`headerType === 'english'`，没有中文名那一行）间距不变，仍是 6.5mm。

**追加清理（同日）**：6 个生成器都确认切到新表头之后，用户要求删除用不到的图片文件。排查确认 `public/images/header-bilingual.jpg`（~92KB）和 `header-english.png`（~24KB）已经没有任何生成器引用（`imageLoader.ts` 里的 `getHeaderImage()`/`getHeaderImageFormat()` 也一并确认是死代码，同步删除）。执行：① `scripts/embed-resources.js` 删掉 `headerImage`/`headerEnglish` 两条资源项；② 重跑 `node scripts/embed-resources.js` 重新生成 `src/lib/embedded-resources.ts`，两条 base64（合计约 116KB 源文件、编码后更大）不再进最终产物；③ 删除 `public/images/header-bilingual.jpg`、`header-english.png` 源文件；④ 同步更新 `README.md`、`AGENTS.md` 里提到这两个文件的资源清单说明。排查时确认还有两处历史遗留、本来就没人 import 的死代码提到同名文件——`src/utils/pdfHelpers.ts` 的 `getHeaderImage`（引用的是完全不存在的 `/images/header-bilingual.png`，注意是 .png 不是 .jpg）和 `src/utils/imageCache.ts`（一个没有任何地方 import 的 IndexedDB 缓存模块）——这两个不是这次改动引入的，跟本次清理无关，没有动。`npx tsc --noEmit`（全项目）、`npx eslint` 均通过。

## TASK-108：内销合同供需双方信息表——7 行 2 列合并为 1 行 2 列

**状态**：已完成（2026-07-09，本次会话由 Claude 直接实现，未经 Codex）
**日期**：2026-07-09

### 背景

用户反馈内销合同 PDF 底部的"供方/需方"信息表排版可以调整：原来是表头行（供方｜需方）+ 6 项信息各占一行（单位名称(章)/单位地址/法定代表人/委托代理人/电话/纳税人识别号），共 7 行；要求改成 1 行 2 列，并把表头文字"供方"/"需方"替换成对应的"单位名称(章)"。

这句话本身有歧义（到底是只留单位名称(章)一项、把其它 5 项删掉，还是 6 项信息都保留只是排版上挤进一行），用 AskUserQuestion 澄清后，用户选择：**6 项信息都保留，合并挤进一行**——即表格变成真正的 1 行 2 列，每个单元格内用换行把 6 项信息堆在一起，首行"单位名称(章)"前面加上"供方"/"需方"字样，取代原来单独的表头行。

### 执行记录

`src/utils/domesticQuotationPdfGenerator.ts` 的 `drawPartyTable()`：

- 移除 `doc.autoTable()` 的 `head`/`headStyles`（不再有单独表头行）。
- `body` 从原来的 6~8 行（每行 `[标签：供方值, 标签：需方值]`）改成只有 1 行：把 `partyRows()` 返回的每一项用 `\n` 拼成两个多行字符串，供方列首行拼成"供方 单位名称(章)：XXX"、需方列首行拼成"需方 单位名称(章)：XXX"，其余项前缀不变。
- 页面剩余空间不够、需要压缩字号/内边距的逻辑相应从"按行数"改成"按单元格内的行数"估算（`lineCount * fontSize * 0.3528 * 1.15 + cellPadding*2`），压缩下限仍是字号 7pt。
- 删掉了原来专门用于"单位地址"这一行单独缩字号避免自动换行的 `fitFontSizeToOneLine()`——因为地址现在只是多行大单元格里的一行文字，自动换行成 2 行是正常的段落排版效果，不再需要像"整行都比别的行高"那样特殊处理；用沙箱渲染验证过长地址自动换行后效果正常，不会撑得离谱。
- 印章绘制逻辑不变（仍然用 `doc.lastAutoTable.finalY` 动态定位，不受行数变化影响）。

### 验证

- `npx tsc --noEmit`、`npx eslint`（`domesticQuotationPdfGenerator.ts`）均无输出。
- 沙箱内独立 jsPDF+autotable 复现脚本（同一套 `drawPartyTable` 逻辑）+ `pdftoppm` 渲染核对：1 行 2 列、供方/需方并入首行、长地址自动换行效果符合预期。
- **待用户验证**：在真实环境里生成一份实际数据完整（法定代表人/委托代理人都有值）的合同 PDF，确认整体排版、翻页逻辑（信息很多时是否还能和产品条款同页）符合预期。

### 非目标

- 未改动"供方：XXX / 需方：XXX"这一处（在合同标题下方、`drawHeader()` 函数里，只显示公司简称，不是这次改的信息表），两处是完全独立的显示位置。
- 未把这个改动应用到其它 5 个 PDF 生成器——这张"供需双方信息表"本来就只有内销合同/报价单有，其它单据类型没有对应的表格。

**追加调整（同日）**：用户反馈换页时机不合理，签名框（供需双方信息表）会过早跳到第二页。排查发现根因是当天早些时候写的"按行数估算所需高度"压缩算法有两个问题：① 高度估算按"每项信息固定 1 行"假设，没算上单位地址这类长文本会自动换行成 2 行的情况，估算跟实际渲染高度对不上；② 压缩字号的收缩比例用一次性公式算出的 `scale` 直接卡在 `Math.max(7/8.5, ...)` 这个下限上，遇到"差一点点就能放下"的临界情况（比如只差 0.3mm）也会直接放弃压缩、判定放不下，其实字号哪怕多压 0.1pt 就够了。

重写为：① 用 `doc.splitTextToSize()` 按实际列宽量出每个字号下真实会换行成几行，而不是假设 1 行；② 从基准字号 8.5pt 开始每次降 0.5pt 迭代量一次实际高度，找到刚好能放进剩余空间的最大字号就停，找不到才在 7pt 下限时真正换页；③ 如果确实换页了，新的一页从顶部开始、空间充足，字号直接重置回基准 8.5pt，不会沿用换页前压缩过的小字号（换页后没必要还挤着排）。用沙箱脚本模拟了三种场景验证：剩余空间充足（80mm）→ 全尺寸不压缩；临界压缩（30mm，8 行信息含开户行/帐号，旧算法在这个场景会误判放不下）→ 压缩到 7pt 后成功放进第 1 页，不再换页；剩余空间严重不足（10mm）→ 正确换页，且新页字号重置回 8.5pt。

**追加调整（同日）**：用户反馈框内空间充足时行间距也应该适当宽松一些（当时用的是 jsPDF 默认行距系数 1.15，比较紧凑）。改成两级策略：① 优先用舒展行距 1.45（比默认宽松不少，渲染对比过 1.15/1.3/1.45/1.6 几档，1.45 观感舒适、不会显得空）；② 空间不够时先收紧行距（1.45 每次降 0.05 直到 1.15 下限），行距收紧对可读性的影响比缩字号小，优先级排在缩字号前面；③ 行距收到 1.15 下限仍不够，才开始按原逻辑缩字号/内边距；④ 真的换页了，新页字号和行距都重置回基准值（8.5pt / 1.45）。

技术细节：`jspdf-autotable` 的单元格行距是按 `doc.getLineHeightFactor()`（jsPDF 文档级全局设置）算的，不是每个 cell 能单独指定的样式，所以要在 `doc.autoTable()` 调用前后手动 `setLineHeightFactor`/恢复原值，避免影响这张表之后画的页码等其它内容。这两个方法在项目用的 `@types/jspdf`（一份比较旧的 DefinitelyTyped 类型定义）里没有收录，但 jsPDF 运行时实际支持——按文件里 `ExtendedJsPDF` 接口已有的"手动补齐缺失类型声明"惯例（`getImageProperties`/`setGState` 等也是这么处理的），补充声明了 `getLineHeightFactor`/`setLineHeightFactor` 两个方法签名。用沙箱脚本验证过三档空间（80mm 充足/45mm 中等/30mm 紧张）：空间充足时字号 8.5pt+行距 1.45 不压缩；中等空间只压行距到 1.40（字号不受影响，可读性优先）；紧张空间行距压到 1.15 下限后再压字号到 7pt，依然不用换页。

**追加调整（同日，真正的根因）**：用户反馈"还是移位太早了"——上面几轮修的都是压缩算法本身的估算精度，但用户截图显示的场景（10 行空产品表 + 内销合同默认 13 条条款）里，条款结束后到页码之间明明还有一大截肉眼可见的空白，表格还是跳到了第 2 页，说明问题不在压缩算法，而在"available（剩余空间）"这个输入值本身算小了。

这次用 `tsx` + 手动 stub `window`/`localStorage`/`fetch`（把 `/fonts/NotoSansSC-*.ttf(.gz)` 的请求重定向到本地 `public/fonts/` 文件，绕开 IndexedDB/浏览器环境依赖）直接跑了一遍真实的 `generateDomesticQuotationPDF()`（不是沙箱里手写的复现脚本，是项目里的原函数），用 `DOMESTIC_NOTES_CONFIG`（`src/features/quotation/types/notes.ts` 里内销合同的默认 13 条条款，正好是用户截图里"二、质量要求技术标准"到"十四、其它约定事项"那一套）+ 10 行空产品行复现，第一次跑（改动前的代码）确认稳定复现"2 页、供需表独占第 2 页"，跟用户截图完全一致。

根因：`drawPartyTable()` 原来复用的是全文件共享的 `checkPage(doc, y, needed, margin, pageHeight)`，它的判定条件是 `y + needed > pageHeight - margin - 12`，即预留 `margin + 12`（这里 margin=16，共 28mm）的底部安全区。这个预留量是给"下面还有更多正文内容要接着排"的场景设计的（条款、合计等中间内容用它很合理）。但供需双方信息表是这页最后一块内容，后面只剩页码（所有内容画完后统一在 `pageHeight - 8` 补画），根本不需要留出整块 `margin` 那么大的安全区——实测这套复现场景下，条款结束时 `y≈250mm`，`checkPage` 用的门槛是 `297-16-12=269mm`，可用空间只有 19mm；而页码实际画在 289mm 处，真正可用空间其实有 33mm 左右——白白少算了约 14mm，导致明明压缩到底（7pt+1.15 行距）也需要约 21～25mm 的表格被误判为放不下。

修复：`drawPartyTable()` 不再调用共享的 `checkPage()`，改成专门按页码实际位置算的下边界：`pageBottom = pageHeight - 14`（14mm 只是留出页码基线 `pageHeight-8` 之上的安全间距，不是 `margin+12`），`available = pageBottom - y`，换页判断也相应改成 `y + neededHeight > pageBottom`。没有改动共享的 `checkPage()` 函数本身（条款、合计等其它调用点的换页时机不受影响，那些场景确实需要给后续内容留出安全区，不属于这次要解决的问题）。

用同一套 `tsx` 真实复现脚本重新跑了一遍改动后的代码：同样的 10 行产品表 + 13 条默认条款，`pdfinfo` 确认从 2 页变成 1 页，供需双方信息表跟产品条款留在同一页，跟用户截图里"应该放得下"的直觉一致。

## TASK-109：侧边栏拆分外贸/内销报价合同为 4 个独立入口 + 双维度自定义图标

**状态**：已完成（2026-07-09，本次会话由 Claude 直接实现，未经 Codex）

**执行记录**：
- 新建 `src/components/icons/TradeDocIcons.tsx`：`ForeignQuotationIcon`/`ForeignContractIcon`/`DomesticQuotationIcon`/`DomesticContractIcon` 4 个自定义 SVG 组件，文档主体区分报价（3 条横线）/合同（1 条横线+签名波浪线），右下角标区分外贸（简化船体+桅杆）/内销（简化屋顶+主体），描边风格对齐 lucide（`strokeWidth=2`、round cap/join）。
- `AppSidebar.tsx`：`NAV_ITEMS` 拆成 4 条（`quotation`/`confirmation`/`quotation-domestic`/`quotation-domestic-contract`，id 与 `dashboardModules.ts` 对齐），`NAV_GROUPS.documents` 同步更新；`isItemActive()` 改成按 `tab`+`docType` 判断 4 种状态；移除不再使用的 `FileText` 导入；`SidebarItem.icon` 类型从 `LucideIcon` 放宽为 `React.ComponentType<React.SVGProps<SVGSVGElement>>` 以兼容自定义图标组件。
- `dashboardModules.ts`：`QUICK_CREATE_MODULES` 对应 4 条的 `icon` 换成新图标组件（原来 4 条共用 `FileText`）。
- `MobileBottomTab.tsx`：`MobileMenuLink.icon` 类型同步放宽（它直接复用 `QUICK_CREATE_MODULES`，无需改结构，图标随之生效）。

**未做**：未改 `useInitQuotation.ts`（TASK-103 已让 `docType` 持续监听生效，本任务不需要动）；未改 `ModuleButton.tsx` 的颜色方案。

**验证**：`npx tsc --noEmit` 通过；`npx eslint`（改动+新增文件）无输出；`npm run build` 在沙箱 45s 超时内跑到 Next.js 编译阶段（"▲ Next.js 14.2.32"之后）未见报错，未能等到编译完全结束（沙箱单次命令时长限制，历史已知问题，见 TASK-103/TASK-108 verification 记录）——建议用户本地或 CI 跑一次完整 `npm run build` 二次确认。

**追加调整（同日）**：用户反馈第一版图标（船/房子小图形角标）"一点也看不清"，截图确认首页卡片和侧边栏两种尺寸下角标细节确实完全糊成一团，报价/合同的主体差异也不明显。改用文字角标：右下角一个白色描边圆 + 实心色圆（`fill="currentColor"`，跟随卡片颜色）+ "外"/"内" 白色粗体文字，白色描边圆把角标从文档线条里"挖"出来，不再跟主体线条糊在一起。

验证方式：沙箱装了 `@resvg/resvg-js`（临时装在 `/tmp`，未写入项目依赖）把新图标 SVG 光栅化成 PNG，用项目自带的 `public/fonts/NotoSansSC-Bold.ttf` 加载字体（避免用无 CJK 字体的环境误判"字糊了"是设计问题还是环境缺字体），在 16px/24px/48px 三档实际渲染尺寸下用 `pngjs` 做最近邻放大（不引入插值模糊，如实还原小尺寸下的真实像素）组成对比图人工检查：24px（首页卡片）"外"/"内"两个字清晰可辨；16px（侧边栏）在这套 1x 光栅模拟下仍然偏紧但已经明显好于船/房子图形版本，且真实 Retina 屏幕的抗锯齿会比这里的 1x 模拟更清晰。验证用的临时脚本、字体渲染测试文件均已清理，未留在仓库里。

**仍需用户在真实浏览器里最终确认**：尤其是 16px 侧边栏场景，如果用户实际看到还是不满意，可选备用方案是把角标文字换成更简单的拉丁字母（如 F/D），单一字母笔画更少，在极小尺寸下比"外/内"这类多笔画汉字更容易辨认，但会跟应用其它部分的全中文风格不一致，需要用户确认是否接受这个权衡。

### 背景

首页模块宫格（`src/constants/dashboardModules.ts` 的 `QUICK_CREATE_MODULES`）已经把外贸报价/外贸合同/内销报价/内销合同拆成 4 个独立入口（id 分别是 `quotation`/`confirmation`/`quotation-domestic`/`quotation-domestic-contract`），移动端底部导航（`MobileBottomTab.tsx`，TASK-103 已改造）也直接复用这 4 个入口。但桌面端侧边栏 `AppSidebar.tsx` 的 `NAV_ITEMS` 还是旧的 2 项合并写法：

```ts
{ id: 'quotation',    label: '外贸报价合同', path: '/quotation',              icon: FileText,  permissionKey: 'canCreateQuotation' },
{ id: 'quotation-domestic', label: '内销报价合同', path: '/quotation?tab=domestic', icon: FileText, permissionKey: 'canCreateQuotation' },
```

跟首页/移动端的导航粒度不一致。同时这 4 个入口目前全部共用同一个 lucide `FileText` 图标，仅靠 `ModuleButton.tsx` 里 `MODULE_STYLES` 的背景色区分——用户反馈图标本身分不清楚，要求换成能同时体现"外贸/内销"和"报价/合同"两个维度的自定义图标（不能只靠颜色）。

**已确认不会重现的历史 bug**：`docType` 查询参数在 `src/features/quotation/hooks/useInitQuotation.ts` 里（TASK-103"追加调整 3"修复）现在会持续监听 `searchParams` 变化并实时生效、消费后从 URL 里删除，不再只在首次挂载时读一次一次性生效。也就是说桌面端在已经停留于 `/quotation` 页面时，通过侧边栏连续点击 4 个入口（同页面换 query、不重新挂载）也能正确切换单据类型，不会重现 TASK-103 之前"内销合同没有正确跳转"的问题。**本任务不需要改动 `useInitQuotation.ts`**，只是提前记录这个依赖关系，避免误以为要重新排查。

### Files in scope

- `src/components/layout/AppSidebar.tsx` — `NAV_ITEMS` 拆分、`NAV_GROUPS.documents`、`isItemActive()`
- `src/constants/dashboardModules.ts` — `QUICK_CREATE_MODULES` 里 4 条的 `icon` 换成新图标
- 新建 `src/components/icons/TradeDocIcons.tsx` — 4 个自定义 SVG 图标组件

### Acceptance criteria

**1. `AppSidebar.tsx` 的 `NAV_ITEMS`** 里把这 2 条替换成 4 条，id/path 直接对齐 `dashboardModules.ts` 的 `QUICK_CREATE_MODULES`（同一套 id，避免出现两套 quotation id 系统）：

```ts
{ id: 'quotation',                    label: '外贸报价', path: '/quotation?tab=quotation',                icon: ForeignQuotationIcon, permissionKey: 'canCreateQuotation' },
{ id: 'confirmation',                 label: '外贸合同', path: '/quotation?tab=confirmation',              icon: ForeignContractIcon,  permissionKey: 'canCreateQuotation' },
{ id: 'quotation-domestic',           label: '内销报价', path: '/quotation?tab=domestic&docType=quotation', icon: DomesticQuotationIcon, permissionKey: 'canCreateQuotation' },
{ id: 'quotation-domestic-contract',  label: '内销合同', path: '/quotation?tab=domestic&docType=contract',  icon: DomesticContractIcon,  permissionKey: 'canCreateQuotation' },
```

4 条权限都仍然挂 `canCreateQuotation` → `PERMISSION_MODULE_MAP` 里现有的 `'quotation'` moduleId，**不新增权限维度**（有权限的用户看到全部 4 条，没权限的 4 条一起隐藏，跟现在行为一致）。

**2. `NAV_GROUPS` 的 `documents` 组** 从 `navGroupItems(['quotation', 'quotation-domestic', 'packing', 'invoice', 'purchase'])` 改成：

```ts
navGroupItems(['quotation', 'confirmation', 'quotation-domestic', 'quotation-domestic-contract', 'packing', 'invoice', 'purchase']),
```

**3. `isItemActive()`** 需要能区分这 4 条（当前只判断了 `tab === 'domestic'`，没处理 `tab=confirmation` 和 `docType=contract`）。参考实现：

```ts
function isItemActive(item: SidebarItem, pathname: string, tab: string | null, docType: string | null) {
  if (pathname.startsWith('/quotation')) {
    switch (item.id) {
      case 'quotation':                   return tab !== 'domestic' && tab !== 'confirmation';
      case 'confirmation':                return tab === 'confirmation';
      case 'quotation-domestic':          return tab === 'domestic' && docType !== 'contract';
      case 'quotation-domestic-contract': return tab === 'domestic' && docType === 'contract';
      default: return false;
    }
  }
  const itemPath = item.path.split('?')[0];
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}
```

调用处补上 `const docType = searchParams.get('docType');` 并传入。

**4. 新建 `src/components/icons/TradeDocIcons.tsx`**，导出 4 个组件，签名与 lucide 图标兼容（`(props: React.SVGProps<SVGSVGElement>) => JSX.Element`），`viewBox="0 0 24 24"`、`stroke="currentColor"` `strokeWidth={2}` `strokeLinecap="round"` `strokeLinejoin="round"` `fill="none"`，风格与现有 lucide 图标（`stroke-width=2` 描边风格）保持一致，可以直接接收 `className` 透传（跟 `FileText` 用法一致）。每个图标由两部分组成，画在同一个 24×24 视图里：

- **主体（区分"报价 vs 合同"）**：报价用类似 `FileText` 的"文档 + 内部 2～3 条横线"轮廓；合同用类似 `FileSignature` 的"文档 + 底部一道签名波浪线"轮廓。
- **角标（区分"外贸 vs 内销"）**：在文档右下角叠加一个约 8×8 单位的小图形——外贸用简化的船体+桅杆（或简化地球经纬线）图形，内销用简化的房屋/建筑图形（三角屋顶+矩形主体）。角标应使用相同描边风格，避免和主体线条打架，位置在两个"报价/合同"图标里保持一致，方便用户认"外贸/内销"角标位置。

4 个组件：`ForeignQuotationIcon`（文档报价主体 + 船/地球角标）、`ForeignContractIcon`（文档合同主体 + 船/地球角标）、`DomesticQuotationIcon`（文档报价主体 + 房屋角标）、`DomesticContractIcon`（文档合同主体 + 房屋角标）。

**5. `dashboardModules.ts` 的 `QUICK_CREATE_MODULES`** 里对应 4 条的 `icon` 从 `FileText` 换成上面 4 个新组件（`quotation-domestic-contract` 这一条目前缺 `icon` 属性使用了默认值，需要一并补上）。`MODULE_STYLES` 里已有的颜色分组保持不变（继续用颜色 + 新图标形状双重区分，不是替换颜色方案）。

**⚠️ 图标可读性提醒**：侧边栏图标实际渲染只有 `h-4 w-4`（16px），首页模块卡片是 `h-5/h-6`（20～24px）。角标叠加主体在 16px 下可能挤在一起看不清——完成后请在这两种实际尺寸下截图/肉眼确认，如果 16px 下角标完全糊成一团，优先保证"报价 vs 合同"主体形状在小尺寸下清晰可辨，角标细节可以简化甚至在 16px 场景先只保留颜色区分，不必为了硬塞两个维度牺牲可读性——这个取舍需要实现完成后判断，不是提前定死的规则。

### Non-goals / 红线

- 不改 `src/features/quotation/hooks/useInitQuotation.ts` 或 `/quotation` 页面本身的 tab/docType 处理逻辑（已在 TASK-103 修好，见上文背景）。
- 不改 `MobileBottomTab.tsx`（它已经直接复用 `QUICK_CREATE_MODULES`，图标换了会自动生效，不需要额外改动；结构本身不用动）。
- 不新增权限维度，4 条入口继续共用 `canCreateQuotation`/`'quotation'` moduleId。
- 不改 `ModuleButton.tsx` 里的 `MODULE_STYLES` 颜色方案。

### Verification steps

- `npx tsc --noEmit`
- `npx eslint`（改动 + 新增的文件）
- `npm run build`（沙箱此前有 45s 超时跑不完整的前科，跑到 webpack 编译阶段没报错即可，建议用户本地/CI 再跑一次完整确认）
- 手动检查：桌面宽屏下侧边栏「新单据」分组应显示 4 条各自独立高亮的入口；在 `/quotation` 页面内连续点击 4 个入口不刷新页面也能正确切换单据类型；无 `quotation` 权限账号 4 条一起消失；对照 16px（侧边栏）和 24px（首页卡片）两种尺寸截图确认图标可辨识度。

**Status:** not started

## TASK-110：首页新增询价/报价/订单统计卡片 + 可切换时间粒度趋势图

**状态**：已完成（2026-07-09，本次会话由 Claude 直接实现，未经 Codex）

**执行记录**：
- `package.json` 新增 `recharts@^3.9.2`；因沙箱 `npm install` 单次命令超过 45s 超时反复失败，改用「先手工建好 `node_modules/recharts`（网络安装本身其实已成功，只是没来得及落盘 package.json/lock）→ 补写 `package.json` 依赖 → 用更快的 `npm install --package-lock-only` 补全 `package-lock.json`」的方式完成，`npm ls recharts` 确认无 peer dependency 冲突。
- 新建 `src/features/dashboard/utils/inquiryStats.ts`：`getInquiryCreatedDate`/`getOrderConfirmDate`/`isRecordQuoted`/`getQuotedOnDate`/`countInquiriesOn`/`countInquiriesInMonth`/`countQuotedOn`/`countOrdersOn`/`countOrdersInMonth`/`bucketByGranularity`/`buildTrendData`，复用 `inquiryUtils.ts` 的 `getDateInputValueFromInquiryNo`/`dateInputToDate`/`stripDateBrackets`，未重新写日期解析。跨年推算规则：`orderConfirmDate`/报价 `quoteDate` 的月份 < 询价单月份则年份 +1，否则同询价年份；`getOrderConfirmDate` 不按 `orderSubStatus` 过滤。
- 新建 `src/features/dashboard/hooks/useInquiryOrderStats.ts`：`useEffect` 里 `useInquiryStore.getState().init()`（与 `InquiryPage.tsx` 同一模式），`records` 过滤 `status !== 'deleted'` 后用 `useMemo` 算 `today`/`month`/`trend` 三组数据。
- 新建 `src/features/dashboard/components/InquiryOrderStats.tsx`：「今日」「本月」两行统计卡片，视觉复用 `StatsCards.tsx` 的卡片语言，点击跳转 `/inquiry` 或 `/order`（未附加时间筛选查询参数——`/inquiry`、`/order` 页面目前不支持通过 URL 传入"今天/本月"筛选，只做了跳转，未新增页面侧的筛选能力）。
- 新建 `src/features/dashboard/components/InquiryOrderTrendChart.tsx`：recharts `LineChart`，天/周/月/季/年度切换（默认"月"），询价数量（粉色）+ 订单数量（绿色）两条线，深色模式用 Tailwind class 而非硬编码颜色。
- `DashboardPage.tsx` 接入：`<InquiryOrderStats>` 在 `<StatsCards>` 下方，`<InquiryOrderTrendChart>` 在 `<DashboardModules>` 和 `<DashboardDocuments>` 之间；两者都用 `permissionMap.permissions.inquiry` 控制 `visible`，无权限时组件内部直接 `return null`，不占位。

**未做**：未改 `InquiryRecord` 数据结构、未改 `/inquiry`、`/order` 页面本身、未新建/修改任何 D1 接口、趋势图未加"已报价"这条线、未做按询价人的个人维度统计——均与 spec 的 Non-goals 一致。

**验证**：
- `npx tsc --noEmit` 通过；`npx eslint`（新增+改动文件）无输出（过程中发现 `AppSidebar.tsx`/`MobileBottomTab.tsx` 的 `icon` 类型是 lucide 专属的 `LucideIcon`，跟自定义图标组件类型不兼容，已放宽为 `React.ComponentType<React.SVGProps<SVGSVGElement>>`，随 TASK-109 一起改的）。
- `npm run build` 同 TASK-109，沙箱 45s 超时内跑到 Next.js 编译阶段未见报错，未等到编译完全结束。
- 用沙箱 `npx tsx` 跑了一遍独立断言脚本（写完即删，未留存到仓库）验证核心口径：① 询价单编号 `C251215F`（2025-12-15）+ `orderConfirmDate=[1.10]` 正确推算为 2026-01-10（不是误判成 2025-01-10）；② 同月场景 `C260620F` + `[6.25]` 推算为 2026-06-25；③ 无 `orderNo`/`orderConfirmDate` 返回 `null`；④ `quotedStatuses` 含 `unavailable` 时 `isRecordQuoted` 为 `false`（即使也有 `quoted` 条目）；⑤ `getQuotedOnDate` 按日期精确匹配；⑥ `countInquiriesOn`/`countOrdersOn`/`countOrdersInMonth` 对"今天"构造的记录计数正确；⑦ `bucketByGranularity('month', ..., 12)` 返回 12 个桶。全部断言通过。
- **待用户在真实环境验证**：不同权限账号（有/无 `inquiry` 权限）登录首页，确认新增两块内容按权限显示/隐藏；5 个粒度切换分别看一次图表正常出图；抽 1～2 条真实数据在 `/inquiry`、`/order` 页面手工筛选核对，跟首页数字一致。

**追加调整（2026-07-10）**：用户上传首页真实截图反馈，`StatsCards`（今日单据 7 项，flex-1 等分拉伸满宽）+ `InquiryOrderStats` 原来的两行（今日 3 项、本月 2 项，同样 flex-1 拉伸满宽）三个各自独立带边框阴影的长条盒子堆在一起，因为每行项目数不同（7/3/2），拉伸后间距一松一紧，视觉上"堆一起了"、不精致。改成统一的紧凑徽标风格：

- 新建 `src/features/dashboard/components/StatChip.tsx`：最小统计单元（图标+短标签+数字），自然宽度、`flex-wrap` 排列，不再用 `flex-1` 拉伸铺满一整行——这是这次重构的核心，从"n 等分拉伸"改成"按内容宽度自然流动换行"。
- `StatsCards.tsx` 改用 `StatChip` 渲染「今日」单据 7 项，去掉自己的外层边框/阴影/`mb-4`（改由父级统一包一层外壳）。
- `InquiryOrderStats.tsx` 把原来两个独立盒子（今日 3 项 / 本月 2 项）合并成同一个 `flex-wrap` 行，中间用一道竖分隔线区分「今日」/「本月」两组；新增 `showTopDivider` prop，`StatsCards` 本身无可见项时（比如只有 inquiry 权限没有任何单据权限的账号）不画多余的顶部分隔线。
- `DashboardPage.tsx`：`StatsCards` + `InquiryOrderStats` 现在包在同一个外层 `rounded-xl border shadow-sm` 卡片里，两行之间只用一道 `border-t` 分隔，不再是"两个盒子叠两个盒子"；整个卡片只在 `accessibleDocumentTypes.length > 0 || hasInquiryAccess` 时渲染，避免两个子组件都不可见时露出一个空盒子。

验证：`npx tsc --noEmit` 通过，`npx eslint`（`StatChip.tsx`/`StatsCards.tsx`/`InquiryOrderStats.tsx`/`DashboardPage.tsx`）无输出。**未做视觉走查**（沙箱没有可视浏览器/运行中的 dev server），建议用户本地刷新页面看一眼新布局是否符合"简洁"的预期，尤其是窄屏下 `flex-wrap` 换行的效果。

### 背景

首页目前只统计"新建单据"（报价单/销售确认/内销报价/内销合同/发票/箱单/采购订单）的当日新增数量（`StatsCards.tsx`），完全不反映询报价登记表（`InquiryRecord`，`src/features/inquiry`）和订单状态表（同一份数据的派生视图，`src/features/order`）里的业务量——对做外贸业务的内部人员来说，"今天/这个月询了几个价、报了几次价、成了几个单"是比"今天建了几张单据"更核心的经营数据，且首页现在完全看不到。用户要求新增：

1. 当天新增：**询价数量**、**已报价数量**、**订单数量**
2. 当月累计：**询价数量**、**订单数量**（不含已报价，用户只要求这两项）
3. 一个可切换 **天/周/月/季/年度** 粒度的趋势图，画**询价**和**订单**两条数量曲线（不含已报价，图表只有 2 条线，跟上面 3 个当日数字不是一一对应关系，不要自作主张加第三条线）

已确认的口径（已用 AskUserQuestion 跟用户逐条确认过，不要重新猜）：

- **订单确认日期缺年份**：`InquiryRecord.orderConfirmDate` 只存 `[月.日]`，不含年份。按用户选择的方案，**用询价单编号（`inquiryNo`，格式 `C[YY][MM][DD]...`）里的年份推算**：若确认日的月份 < 询价的月份，说明跨年了，年份 = 询价年份 + 1；否则年份 = 询价年份。这是推算，不是精确值，不改数据结构。
- **"已报价数量"口径**：复用询报价登记表已有的"已报价"状态判定（`useInquiryFilter.ts` 里 `customer_quoted` 的判定逻辑：`quotedStatuses` 里没有 `unavailable`/`closed` 类型、且至少有一条 `quoted` 或无 `type` 的记录），**按记录数计，不按 `quotedStatuses` 条目数计**——同一条询价当天不管改几次价格/加几个供应商版本，只算 1 条。
- **图表数据来源**：直接读 `useInquiryStore` 里的全量 `records`（本地 zustand store，来自 `localStorage` + D1 同步），不做服务端聚合、不做记录级别的"谁创建的"过滤——跟询报价登记表/订单状态表页面本身的可见范围一致（权限是模块级 `canAccess`，不是记录级隐私）。
- **图表库**：引入 `recharts`（`package.json` 目前没有装任何图表库）。

### Files in scope

- `package.json` — 新增 `recharts` 依赖
- 新建 `src/features/dashboard/utils/inquiryStats.ts` — 日期解析、口径判定、按粒度分桶的纯函数
- 新建 `src/features/dashboard/hooks/useInquiryOrderStats.ts` — 订阅 `useInquiryStore`，用 `useInquiryStats.ts` 里的函数算出所有数字
- 新建 `src/features/dashboard/components/InquiryOrderStats.tsx` — "当天新增"+"当月累计"两行统计卡片
- 新建 `src/features/dashboard/components/InquiryOrderTrendChart.tsx` — recharts 折线图 + 粒度切换
- `src/features/dashboard/app/DashboardPage.tsx` — 接入上面两个新组件

### Acceptance criteria

**`inquiryStats.ts` 需要的函数**（复用 `src/features/inquiry/utils/inquiryUtils.ts` 已有的 `getDateInputValueFromInquiryNo`/`dateInputToDate`，不要重新写一套日期解析）：

- `getInquiryCreatedDate(record): Date` — 由 `record.inquiryNo` 解析出的完整日期（含年份）。
- `isRecordQuoted(record): boolean` — 复制 `useInquiryFilter.ts` 里 `customer_quoted` 的判定：`!quotedStatuses.some(s => s.type === 'unavailable' || s.type === 'closed') && quotedStatuses.some(s => !s.type || s.type === 'quoted')`。
- `getQuotedOnDate(record, date): boolean` — 该记录当前满足 `isRecordQuoted` **且** 其 `quotedStatuses` 中至少一条 `type` 为 `'quoted'`/未定义的条目，其 `quoteDate`（`[月.日]` 格式，用 `getInquiryCreatedDate` 的年份按同一条"月份倒退则年份+1"规则推算）落在指定日期。
- `getOrderConfirmDate(record): Date | null` — 若 `record.orderNo` 为空或 `orderConfirmDate` 为空，返回 `null`；否则用上述年份推算规则返回完整日期。**不按 `orderSubStatus`（辙销/悬挂/善后）过滤**——这是"历史上曾确认过的订单数"口径，跟订单状态表"进行中/正常"筛选是不同用途的统计，全部计入。
- `bucketByGranularity(records, granularity, dateGetter, bucketCount)` — 按 `'day' | 'week' | 'month' | 'quarter' | 'year'` 分桶统计最近 N 个桶的数量，`dateGetter` 传入 `getInquiryCreatedDate` 或 `getOrderConfirmDate`（后者需要先过滤掉返回 `null` 的记录）。默认桶数：天=14、周=12、月=12、季=8、年=5（这是本任务给的默认值，不是用户明确要求的数字，如果实现时觉得不合适可以调整，但要在实现记录里写清楚改成了多少）。

**`InquiryOrderStats.tsx` 两行卡片**：

- 当天新增：询价数量 = `getInquiryCreatedDate(record)` 等于今天的记录数；已报价数量 = `getQuotedOnDate(record, 今天)` 为真的记录数；订单数量 = `getOrderConfirmDate(record)` 等于今天的记录数。
- 当月累计：询价数量 = `getInquiryCreatedDate(record)` 落在当前自然月的记录数；订单数量 = `getOrderConfirmDate(record)` 落在当前自然月的记录数。
- 视觉上参考现有 `StatsCards.tsx` 的卡片语言（图标+文字+数字、点击可跳转），点击询价相关数字跳转 `/inquiry`，点击订单数字跳转 `/order`。
- 仅当前登录用户对 `inquiry` 模块有权限（`Permission.moduleId === 'inquiry'`，与 `AppSidebar.tsx` 的 `canViewInquiry` 同一权限位）时渲染，否则整个组件不显示（无权限用户，例如纯财务/仓库账号，首页不应该出现这两行）。

**`InquiryOrderTrendChart.tsx`**：

- 顶部一个 5 选 1 的粒度切换（天/周/月/季/年度），默认选"月"。
- recharts 折线图，两条线：询价数量、订单数量（口径同上），x 轴为分桶标签，y 轴为数量。
- 同样仅在有 `inquiry` 权限时渲染。
- 深色模式下颜色需要跟随现有 Tailwind CSS 变量/暗色 class，不要硬编码亮色主题颜色。

**`DashboardPage.tsx` 接入**：`<InquiryOrderStats>` 放在现有 `<StatsCards>` 下方，`<InquiryOrderTrendChart>` 放在 `<DashboardModules>` 和 `<DashboardDocuments>` 之间（或视觉上更合理的位置，允许微调，但两个新组件都必须在无权限时完全不渲染、不占位）。

### Non-goals / 红线

- 不改 `InquiryRecord` 的数据结构，不新增字段存储 `orderConfirmDate` 的年份——按推算口径处理跨年。
- 不改询报价登记表 (`/inquiry`)、订单状态表 (`/order`) 页面本身的筛选、排序、显示、D1 同步逻辑。
- 不新建/修改任何 D1 Worker 接口，所有统计都基于本地 store 里已同步下来的 `records` 现算，不做服务端聚合查询。
- 趋势图不加"已报价"这条线（用户没有要求）。
- 不做按询价人/业务员拆分的统计（只做全局汇总，不做个人维度）。

### Verification steps

- `npx tsc --noEmit`
- `npx eslint`（新增 + 改动的文件）
- `npm run build`（同样注意沙箱 45s 超时前科）
- 手动核对：任选 1～2 条真实/测试询价记录，手工在 `/inquiry`、`/order` 页面按"今天"/"本月"筛选核对出来的条数，跟首页新卡片数字一致。
- 特别验证跨年推算：构造（或找到）一条询价单创建于去年 12 月、`orderConfirmDate` 填了 `[1.某日]` 的记录，确认它被正确计入"今年 1 月"而不是被漏算/错算成去年。
- 5 个粒度切换（天/周/月/季/年度）分别看一次图表能正常出图、不报错。
- 用无 `inquiry` 权限的账号登录，确认两个新组件都不出现（不留空白占位）。

**Status:** not started

## TASK-111：内销报价合同独立权限开关 + 采购部登记/采购订单表合并权限开关 + 管理后台界面重排

**状态**：已完成（2026-07-10，本次会话由 Claude 直接实现，未经 Codex）

**执行记录**：
- `permissionModules.ts` 新增 `domesticQuotation`（内销报价合同），删除 `purchaseOrderTable`，`purchaseRegistration` label 改为"采购部登记 / 采购订单表"。
- `mapPermissions.ts`、`types/permissions.ts` 同步增删字段；`domestic-quotation`/`domestic-contract` 的 `documentTypePermissions`/`hasDocumentTypePermission` 改读 `domesticQuotation`。
- `AppSidebar.tsx`（`NAV_ITEMS` + `PERMISSION_MODULE_MAP`）、`MobileBottomTab.tsx`（`QUICK_CREATE_MODULE_ID` + `REGISTER_LINKS`）、`PurchaseOrderRegistrationPage.tsx` 的 `hasPermission` 调用同步改用新/合并后的 moduleId。
- 额外发现并修正：`src/app/api/inquiry/[[...path]]/route.ts`（受限视图的服务端字段级访问控制，未在原 spec 文件清单里列出）也硬编码读取了 `purchaseOrderTable` moduleId，用于区分"采购部登记"和"采购订单表"两组可读写字段。已改成合并后的单一 `purchaseRegistration` 权限判断，`restrictToPurchaseOrderTable` 现在恒等于 `restrictToPurchaseRegistration`，两组受限字段（`PURCHASE_REGISTRATION_WRITE_FIELDS`/`PURCHASE_ORDER_TABLE_WRITE_FIELDS`）合并权限后一并放行。这处如果漏改，会导致合并权限后用户在采购订单表页面读写字段被服务端拒绝，属于本次实现中发现的必要修正，不是范围外改动。
- 新建 `migrations/009_split_domestic_quotation_permission.sql`、`migrations/010_merge_purchase_registration_permissions.sql`，均未在沙箱执行（无 D1 remote 访问），命令写在文件头注释里，需要用户手动 `npx wrangler d1 execute ... --remote` 执行。
- 管理后台重排：`AdminPage.tsx` 页头改用 `UserStats`（原来已有但未接入的组件）替代内联统计文字，容器改 `max-w-5xl` 更居中舒展；`UserStats.tsx` 加卡片外壳+分隔线；`UserDetailModal.tsx` 从 `max-w-sm` 加宽到 `max-w-2xl`，权限开关按分类包一层浅色卡片（`rounded-xl bg-gray-50/60`），网格从固定 2 列改成 `grid-cols-2 sm:grid-cols-3`；`UserCard.tsx` 行内边距微调。`CreateUserModal.tsx` 未改（本身没有拥挤问题，只有账号信息 + 管理员开关）。

**未做**：未改权限检查机制本身、D1 `Permission` 表结构、`/api/admin/[...path]` 的 API 形状；未删除 D1 里历史的 `purchaseOrderTable` 权限行。

**验证**：`npx tsc --noEmit`、`npx eslint`（改动文件）均无输出；`npm run build` 沙箱 45s 超时内跑到 Next.js 编译阶段未见报错，未等到完全结束（同 TASK-109/110 沙箱前科）。**未做**：两份迁移 SQL 未在真实 D1 上执行验证，未用老账号实测迁移后的权限延续；管理后台视觉走查沙箱无可视浏览器，未截图。以上建议用户上线前自行验证。

### 背景

当前 `src/constants/permissionModules.ts` 里 `quotation`（外贸报价合同）这一个权限模块同时控制 4 个入口：外贸报价、外贸合同、内销报价、内销合同——`domestic-quotation`/`domestic-contract` 没有独立权限位，`src/utils/mapPermissions.ts`、`AppSidebar.tsx` 的 `PERMISSION_MODULE_MAP`、`MobileBottomTab.tsx` 的 `QUICK_CREATE_MODULE_ID` 里都是硬编码把这两项 fallback 到 `quotation` moduleId（见 TASK-109 背景："不新增权限维度，4 条入口继续共用 canCreateQuotation/'quotation' moduleId"）。用户现在明确要求内销报价合同要能单独开关，不再跟外贸报价合同绑在一起。

同时，`purchaseRegistration`（采购部登记）和 `purchaseOrderTable`（采购订单表）目前是两个独立权限模块，用户要求合并成一个开关（跟 `inquiry` 模块"询报价登记表 / 订单状态表"合二为一的模式一致）。

管理后台（`/admin`，`features/admin/`）目前功能齐全但比较拥挤：`UserDetailModal.tsx` 用 `max-w-sm` 的小弹窗塞下账户设置 + 4 个分类、每类 `grid-cols-2` 的权限开关网格，模块变多会越来越挤；`AdminPage.tsx` 顶部只有用户数统计+"添加用户"按钮，`UserList.tsx`/`UserCard.tsx` 排布也偏简陋。用户要求整体重新设计得"更舒展、精致、简洁明了"。

### Files in scope

- `src/constants/permissionModules.ts` — `PERMISSION_MODULES` 新增 `domesticQuotation`（label 内销报价合同，category `document`，放在 `quotation` 后面）；删除 `purchaseOrderTable`，`purchaseRegistration` 的 label 改为"采购部登记 / 采购订单表"（与 `inquiry` 一致的命名风格）
- `src/utils/mapPermissions.ts` — `permissionsResult`/`documentTypePermissions`/`hasDocumentTypePermission` 里 `domestic-quotation`/`domestic-contract` 改读 `domesticQuotation`；移除 `purchaseOrderTable` 字段，所有原本读它的地方改读 `purchaseRegistration`；空权限默认对象（第 36～65 行附近）同步调整
- `src/components/layout/AppSidebar.tsx` — `NAV_ITEMS` 里 `quotation-domestic`/`quotation-domestic-contract` 的 `permissionKey` 改成新增的 `canCreateDomesticQuotation`；`purchase-order-table` 的 `permissionKey` 改成 `canViewPurchaseRegistration`；`PERMISSION_MODULE_MAP` 同步增删
- `src/components/layout/MobileBottomTab.tsx` — `QUICK_CREATE_MODULE_ID` 里两个内销条目的 moduleId 改成 `domesticQuotation`；`REGISTER_LINKS` 里 `purchase-order-table` 的 moduleId 改成 `purchaseRegistration`
- `src/features/purchase-order-registration/app/PurchaseOrderRegistrationPage.tsx` 第 87 行 `hasPermission('purchaseOrderTable')` 改成 `hasPermission('purchaseRegistration')`
- 新建 `migrations/0XX_split_domestic_quotation_permission.sql` — 给所有已有 `quotation=1` 的用户批量插入 `domesticQuotation=1`（参考 `migrations/007_grant_default_impa_permission.sql` 的写法：`INSERT ... SELECT ... WHERE NOT EXISTS`），保证老用户升级后不会突然失去内销报价/合同的访问权限
- 新建 `migrations/0XX_merge_purchase_permissions.sql` — 把 `purchaseOrderTable=1` 但 `purchaseRegistration` 缺失/为 0 的用户，`purchaseRegistration` 置为 1（两者取"或"，不能让原本只有采购订单表权限的用户合并后失去访问）；旧的 `purchaseOrderTable` 行可以保留不删（不再被代码读取，属于死数据，不强制清理）
- `src/features/admin/app/AdminPage.tsx`、`src/features/admin/components/UserList.tsx`、`UserCard.tsx`、`UserDetailModal.tsx`、`UserStats.tsx`、`CreateUserModal.tsx` — 界面重新排布（见验收标准）

### Acceptance criteria

- 管理后台权限开关列表里，"内销报价合同"是一个独立开关，不再和"外贸报价合同"共用；关掉"外贸报价合同"、只留"内销报价合同"开启时，侧边栏/移动端底部导航/首页统计只显示内销报价、内销合同两项，外贸报价、外贸合同两项消失，反之亦然
- "采购部登记"和"采购订单表"合并成一个开关，勾选后 `/purchase-registration` 和 `/purchase-order-table` 两个页面都能访问，取消后两个页面都变成 `PermissionDenied`
- 两个迁移 SQL 文件写好（不强制在沙箱里执行 remote，参照现有 migrations 目录下文件头注释格式写清楚 `npx wrangler d1 execute <db-name> --file=... --remote` 执行命令），并在验收步骤里提醒用户上线前手动跑一遍
- 管理后台整体视觉重新设计，具体范围由实现者判断，但至少要解决：`UserDetailModal.tsx` 当前 `max-w-sm` 弹窗在权限项变多后拥挤的问题（可以考虑加宽、改用更清晰的分组/间距，不强制具体断点数值）；`AdminPage.tsx`/`UserList.tsx` 页头和列表的视觉密度可以更舒展。改动前后各截一张管理后台首屏 + 权限编辑弹窗的图，供用户对比
- 保留所有现有功能：添加用户、编辑权限、管理员/启用开关、删除用户、重置未保存改动，一个都不能少

### Non-goals / 红线

- 不改权限检查的整体机制（`usePermissionStore.hasPermission` 的实现、D1 `Permission` 表结构、`/api/admin/[...path]` 的 API 形状），只新增/合并"模块"这一层数据
- 不改 `inquiry` 模块本身（它已经是"询报价登记表 / 订单状态表"合并权限的先例，不用动）
- 不删除 `purchaseOrderTable` 这个 moduleId 在 D1 里的历史数据行，只是代码不再读它
- 管理后台重新设计不能砍掉任何现有可操作项（增删改用户、权限开关、管理员/启用状态、删除确认），纯视觉/布局层面的调整

### Verification steps

- `npx tsc --noEmit`
- `npx eslint`（改动文件）
- `npm run build`（沙箱 45s 超时前科，跑到编译阶段不报错即可）
- 用一个原本只有 `quotation=1`（无 `domesticQuotation`）的老账号，确认迁移脚本跑过之后依然能看到内销报价/合同入口
- 用一个原本只有 `purchaseOrderTable=1`、无 `purchaseRegistration` 的老账号，确认迁移脚本跑过之后 `/purchase-registration` 和 `/purchase-order-table` 都能访问
- 管理后台页面截图走查（沙箱无可视浏览器，建议用户本地过一遍）

**Status:** completed

## TASK-112：首页去掉大按钮模块区 + 报价/合同图标复用到统计徽标与各处菜单

**状态**：已完成（2026-07-10，本次会话由 Claude 直接实现，未经 Codex）

**执行记录**：
- `DashboardPage.tsx` 删除了 `<DashboardModules>` 渲染及配套的 `availableQuickCreateModules`/`availableToolModules`/`availableToolsModules`、`handleModuleClick`/`handleModuleHover`、相关 import；`useDashboardDocuments()` 解构里也去掉了只服务这块区域的 `documentCounts`（hook 本身未改，仍会计算，只是页面不再取用）。
- **偏离 spec 的一点**：`DashboardModules.tsx`、`components/dashboard/ModuleButton.tsx`、`features/dashboard/utils/moduleFilters.ts` 三个文件按 spec 本应在确认无其它引用后整个删除，但沙箱挂载这个项目文件夹的方式不支持删除/重命名已写入的文件（`rm`/`mv` 全部返回 `Operation not permitted`，只能覆盖内容）。已确认 `grep -r` 全仓库范围内这三个文件不再被任何地方引用（除了它们互相之间、以及原来的 `features/dashboard/index.ts` barrel 导出，barrel 里对应的 `DashboardModules`/`filterQuickCreateModules` 等导出也已经删掉），所以现在是**孤立但无害**的死文件，不影响 `tsc`/`eslint`/`build`。**需要用户在本地手动删除这三个文件**：`src/features/dashboard/components/DashboardModules.tsx`、`src/components/dashboard/ModuleButton.tsx`、`src/features/dashboard/utils/moduleFilters.ts`。
- `StatsCards.tsx`（`STAT_ITEMS`）、`components/dashboard/RecentDocumentsList.tsx`（`getDocumentTypeInfo`）、`features/history/state/history.store.ts`（`getAvailableTabs`）三处的报价/合同 4 个类型图标都换成了 `ForeignQuotationIcon`/`ForeignContractIcon`/`DomesticQuotationIcon`/`DomesticContractIcon`。`StatChip.tsx` 的 `icon` prop 类型从 `LucideIcon` 放宽为 `React.ComponentType<React.SVGProps<SVGSVGElement>>`（同 TASK-109 对 `AppSidebar`/`MobileBottomTab` 的处理方式）；`features/history/types/index.ts` 的 `TabConfig.icon` 本来就是 `React.ComponentType<{ className?: string }>`，兼容 TradeDocIcons，未改。

**未做**：`app/history/ExportModal.tsx`/`ImportModal.tsx` 里的通用 `FileText` 图标（跟单据类型选择器无关，是导出/导入面板的静态说明图标）未改；未触碰 `AppSidebar.tsx`/`MobileBottomTab.tsx`/`dashboardModules.ts` 里 TASK-109 已经换好的图标。

**验证**：`npx tsc --noEmit`、`npx eslint`（改动文件）均无输出；`npm run build` 沙箱 45s 超时内跑到 Next.js 编译阶段未见报错。`grep -r` 确认 `DashboardModules`/`ModuleButton`/`moduleFilters` 除孤立文件自身外无其它引用方。**未做**：无可视浏览器，未做首页/`/history` 页截图走查，未做多权限组合的交叉验证（依赖 TASK-111 的权限拆分，逻辑上应该正确但未实测）。

### 背景

首页 (`src/features/dashboard/app/DashboardPage.tsx`) 目前在统计区下面还保留一大块 `<DashboardModules>` 按钮网格（`quotation`/`confirmation`/`domestic-quotation`/`domestic-contract`/`packing`/`invoice`/`purchase`/`ai-email`/`history`/`customer` 共 10 个大按钮卡片，`components/dashboard/ModuleButton.tsx`，每个 `h-24`）。这些入口在 TASK-109/103 之后已经全部能通过桌面侧边栏 `AppSidebar.tsx`（新单据/登记表/管理/工具 四个分组）和移动端底部导航 `MobileBottomTab.tsx`（新建/登记/管理/工具 四个分类菜单）到达，首页大按钮区变成了冗余的"第二套入口"。用户要求去掉这块区域。

TASK-109 已经做了 `ForeignQuotationIcon`/`ForeignContractIcon`/`DomesticQuotationIcon`/`DomesticContractIcon` 四个自定义图标（`src/components/icons/TradeDocIcons.tsx`），并接到了 `AppSidebar.tsx`/`MobileBottomTab.tsx`/`dashboardModules.ts` 的 `QUICK_CREATE_MODULES`。但还有几处展示"报价单/销售确认/内销报价/内销合同"四种单据类型的地方，仍然用通用的 `FileText`/`FileSignature` lucide 图标（报价 vs 合同不分主体形状，外贸 vs 内销不分角标），跟侧边栏已经不一致：

1. `src/features/dashboard/components/StatsCards.tsx` 第 3～11、39～42 行，首页"今日新增"统计徽标（`StatChip`）
2. `src/components/dashboard/RecentDocumentsList.tsx` 第 4、307～326 行，首页"最近单据"卡片列表的类型图标（`getDocumentTypeInfo`）
3. `src/features/history/state/history.store.ts` 第 178～181 行，单据历史页 (`/history`) 顶部 4 个 tab 的图标

### Files in scope

- `src/features/dashboard/app/DashboardPage.tsx` — 删除 `<DashboardModules>` 渲染及其相关的 `availableQuickCreateModules`/`availableToolModules`/`availableToolsModules`（`useMemo` + `filterQuickCreateModules`/`filterToolModules`/`filterToolsModules` 调用）、`handleModuleClick`/`handleModuleHover`，以及只服务这块区域的 import
- `src/features/dashboard/components/DashboardModules.tsx`、`src/components/dashboard/ModuleButton.tsx`、`src/features/dashboard/utils/moduleFilters.ts` — 先用 `grep -r` 确认删除首页引用后是否还有其它调用方（预期没有），没有就整个删除；有其它调用方就保留组件本身，只去掉首页这一处引用，并在实现记录里写清楚保留原因。`moduleFilters.ts` 里的 `filterQuickCreateModules` 目前对 `quotation-domestic`/`quotation-domestic-contract` 落到 `default: return true` 分支、完全没做权限过滤，是随手发现的既有缺口，不需要专门修——反正整个文件都要跟着一起下线，不必为它单独补权限判断逻辑
- `src/features/dashboard/components/StatsCards.tsx` — `STAT_ITEMS` 的 `icon` 字段：`quotation`→`ForeignQuotationIcon`、`confirmation`→`ForeignContractIcon`、`domestic-quotation`→`DomesticQuotationIcon`、`domestic-contract`→`DomesticContractIcon`（从 `@/components/icons/TradeDocIcons` 导入）；`StatItem.icon`/相关类型目前是 lucide 专属的 `LucideIcon`，需要放宽成 `React.ComponentType<React.SVGProps<SVGSVGElement>>`（同 TASK-109 对 `AppSidebar`/`MobileBottomTab` 的处理方式）
- `src/features/dashboard/components/StatChip.tsx` — 同步放宽 `icon` prop 类型
- `src/components/dashboard/RecentDocumentsList.tsx` — `getDocumentTypeInfo` 里 4 个类型换成对应的 TradeDocIcons；相关类型标注同步放宽
- `src/features/history/state/history.store.ts` — `getAvailableTabs()` 里 4 个 tab 的 `icon` 换成对应的 TradeDocIcons；`HistoryTabs.tsx` 或相关类型如果对 `icon` 字段有 `LucideIcon` 类型标注，同步放宽

### Acceptance criteria

- 首页不再出现原来的大按钮网格区域（10 个 `h-24` 卡片全部消失），页面从上到下变成：统计徽标区（今日单据 + 询价/已报价/订单）→ 询价/订单趋势图（TASK-110，TASK-113 会改动）→ 最近单据列表
- 首页"今日新增"统计徽标里，报价单/销售确认/内销报价/内销合同 4 项分别显示 `ForeignQuotationIcon`/`ForeignContractIcon`/`DomesticQuotationIcon`/`DomesticContractIcon`，肉眼可辨认外贸用船/地球角标、内销用房屋角标（跟侧边栏已有的一致）
- 首页"最近单据"卡片列表里，同 4 种类型的卡片图标同步换成一致的 TradeDocIcons
- `/history` 单据历史页顶部 tab 的图标同步换成一致的 TradeDocIcons
- 不影响任何权限过滤/跳转逻辑，只换图标组件和删除多余的按钮区域

### Non-goals / 红线

- 不改 `AppSidebar.tsx`/`MobileBottomTab.tsx`/`dashboardModules.ts` 里已经在 TASK-109 换好的图标（它们已经是对的，不用动）
- 不改 `TradeDocIcons.tsx` 本身的图标形状/角标设计
- 不改 `StatsCards`/`InquiryOrderStats` 的整体布局结构（徽标行、分隔线等，TASK-110 追加调整已经定好），只换图标
- 不改权限判断逻辑本身（`documentTypePermissions`、`hasPermission` 等），只是删除一处冗余 UI 和换图标

### Verification steps

- `npx tsc --noEmit`
- `npx eslint`（改动文件）
- `npm run build`
- `grep -r` 确认 `DashboardModules`/`ModuleButton`/`moduleFilters` 删除前没有遗漏的引用方
- 桌面 + 移动端首页截图走查：大按钮区消失、统计徽标图标变化；`/history` 页 tab 图标变化
- 权限账号交叉验证：只开外贸报价合同 / 只开内销报价合同（依赖 TASK-111 落地）时，首页统计徽标对应项目正确显示/隐藏

**Status:** completed

## TASK-113：首页趋势图按权限双表切换 + 增加"已报价"数据线

**状态**：已完成（2026-07-10，本次会话由 Claude 直接实现，未经 Codex）

**执行记录**：
- `inquiryStats.ts`：`isRecordQuoted`/`getQuotedOnDate` 加了第三个可选参数 `field: QuotedStatusField = 'quotedStatuses'`（不传等价于原行为，未破坏既有调用方）；新增 `getQuotedStatusList` 内部辅助函数和新导出函数 `getLatestQuotedDate(record, field)`——筛出 `type` 为 `quoted`/未定义的条目，各自解析出完整日期后取最晚的一个，找不到则 `null`。`TrendPoint` 加了 `quotedCount: number` 字段；`buildTrendData` 新增第三个参数 `quotedStatusField`（第四个参数改为 `bucketCount`，仍有默认值），用 `getLatestQuotedDate` 分桶产出已报价这条线。
- `useInquiryOrderStats.ts` 加了第三个参数 `source: TrendSource = 'inquiry'`（新导出类型 `'inquiry' | 'purchase'`），只影响 `trend`（趋势图数据）里已报价线读哪个字段；`today`/`month`（"今日/本月"统计徽标）按 spec 要求保持不变，固定读 `quotedStatuses`，不受 `source` 影响。
- `InquiryOrderTrendChart.tsx` 加了 `title`/`titleSlot`/`quotedLineLabel` 三个可选 prop（都有默认值，向后兼容），`LineChart` 新增第三条线（`dataKey="quotedCount"`，蓝色 `#3b82f6`，避免跟询价粉色/订单绿色冲突）。
- 新建 `DashboardTrendSection.tsx`：只有一个权限时直接渲染对应图表（无 tab）；两个权限都有时渲染一个 tab 切换条（复用跟粒度切换按钮同样的视觉语言）作为 `titleSlot` 传入，`useState` 内部管理当前选中的 tab（默认 `'inquiry'`）；两个权限都没有时返回 `null`。**粒度选择（天/周/月/季/年度）两个 tab 共用同一份状态**（由 `DashboardPage.tsx` 的 `trendGranularity` 统一管理，不是每个 tab 各自独立记忆）——这是 spec 里明确留给实现者决定的两选一，已在这里写清楚选了"共用"。
- `DashboardPage.tsx`：`useInquiryOrderStats` 现在按 `hasInquiryAccess`/`hasPurchaseAccess`（`permissionMap.permissions.purchaseRegistration`，TASK-111 合并后的权限）各调用一次（分别传 `'inquiry'`/`'purchase'` source），两组结果传给 `DashboardTrendSection`。

**验证**：
- `npx tsc --noEmit`、`npx eslint`（改动 + 新增文件）均无输出。
- `npm run build` 沙箱 45s 超时内跑到 Next.js 编译阶段未见报错。
- 用沙箱 `npx tsx` 跑了一遍独立断言脚本（写完即删——但沙箱这个项目挂载不支持删除文件，脚本已清空成 0 字节文件 `verify_task113_tmp.ts` 留在仓库里，**需要用户手动删除**）验证：① 同一条记录两个不同日期的 `quoted` 状态，`getLatestQuotedDate` 正确返回较晚的日期，不是较早或求和；② 只有 `unavailable` 类型的记录返回 `null`；③ `quotedStatuses` 为空但 `purchaseQuotedStatuses` 有值时，两个字段读取互不干扰；④ 跨年推算（询价 2025-12-20 + 报价 `[1.5]`）正确算成 2026-01-05；⑤ `buildTrendData` 输出的每个桶都带 `quotedCount` 字段。全部通过。
- **未做**：4 种权限组合（只 inquiry / 只 purchaseRegistration / 两者都有 / 两者都无）未用真实账号登录人工核对；5 个粒度切换未在浏览器里实测出图；已报价线未抽真实记录核对分桶结果；询价订单趋势图和采购询价订单趋势图的询价/订单两条线"数值应相同"这一推论未用真实数据验证（逻辑上必然相同，因为读的是同一个 `getInquiryCreatedDate`/`getOrderConfirmDate`，但沙箱没有真实业务数据可比对）。以上建议用户在真实环境验证。

**追加调整（首页细化，2026-07-10，同一会话由 Claude 直接实现）**：用户看过首页后提出四点细化需求，均已实现：

1. **去掉"今日单据"统计**：`DashboardPage.tsx` 删除 `<StatsCards>` 引用，`StatsCards.tsx` 变成孤儿文件（同 TASK-112 的 `DashboardModules.tsx` 等，沙箱不支持删除文件，需用户手动删除，见下方清单）。
2. **图表改名**：`DashboardTrendSection.tsx` 的 `TAB_LABELS`（连带单权限时的 `title`）从"询价订单趋势"/"采购询价订单趋势"改成"总询价订单统计图"/"采购部询价订单统计图"；`InquiryOrderTrendChart.tsx` 默认 `title` 同步改名。
3. **"今日"统计区改成"本周+本月"，且随图表 tab 联动**：`inquiryStats.ts` 新增 `countInquiriesInWeek`/`countQuotedInWeek(field)`/`countOrdersInWeek`/`countQuotedInMonth(field)`（月的已报价此前没有对应函数，一并补上），周的判定用自然周（周一～周日，`startOfWeek`）；`useInquiryOrderStats.ts` 把原来的 `today` 换成 `week`（类型 `InquiryOrderWeekStats`），`month` 补上 `quotedCount` 字段，`week`/`month`/`trend` 三组现在统一用同一个 `quotedStatusField`（由 `source` 参数决定）。`InquiryOrderStats.tsx` 去掉 `showTopDivider`（StatsCards 没了，不再需要顶部分隔线判断），"今日" label 改"本周"，"本月"行补一个"已报价"chip，新增 `source` prop 用于让"询价/已报价"跳转 `/inquiry` 还是 `/purchase-registration`、"订单"跳转 `/order` 还是 `/purchase-order-table`（spec 没明确要求换链接，但数据来源换了、链接不换会点过去对不上，判断属于同一个改动的应有之义）。**联动机制**：`DashboardTrendSection.tsx` 原来内部自己 `useState` 管理 tab，改成受控组件（`activeSource`/`onActiveSourceChange` 由父级传入），`DashboardPage.tsx` 新增 `trendSource` 状态作为唯一数据源，同时喂给趋势图 tab 和上方统计区域（`effectiveTrendSource` 变量处理"只有一个权限时没有 tab、固定用那个权限对应的表"这一分支）。
4. **周视图横轴显示周数 + 图例改名和排序**：`inquiryStats.ts` 新增 ISO 8601 周号算法 `getISOWeekNumber`（周一起始，含当年首个周四的那一周是第 1 周），`buildBuckets` 的 `'week'` 分支从"以今天为终点的滚动 7 天窗口、标签是 M/D"改成"自然周（周一~周日）、标签是`第N周`"——这个改动顺带让"周"粒度的桶边界和"本周"统计口径完全一致（之前两者定义不一样，只是没人注意到）。`InquiryOrderTrendChart.tsx` 三条 `<Line>` 改了声明顺序（已报价 → 订单数量 → 询价数量，对应图例从上到下的顺序）和图例文案（`询价数量(总)`/`订单数量(总)` 硬编码在两种图表里都不变；`已报价` 这条线通过 `quotedLineLabel` prop 区分`已报价(总)`/`已报价(采购部)`，默认值和 `DashboardTrendSection.tsx` 里的 `QUOTED_LINE_LABELS` 常量同步更新）。

验证：`npx tsc --noEmit`、`npx eslint`（改动 + 新增文件）均无输出；`npm run build` 沙箱 45s 超时内跑到 Next.js 编译阶段未见报错。用 `npx tsx` 跑了一遍独立断言脚本（同样清空成 0 字节文件 `verify_task_refine_tmp.ts` 留在仓库，**需要用户手动删除**）验证：① 本周创建的询价被 `countInquiriesInWeek` 计入本周、上周的不计入；② 本周确认的订单被 `countOrdersInWeek` 计入；③ `countQuotedInWeek` 按 `field` 参数正确区分客户/供应商视角，不会互相污染；④ `countQuotedInMonth` 对本周内的报价也正确计入本月；⑤ `buildTrendData` 的 `week` 粒度标签匹配 `第N周` 格式，且连续 12 个桶周号递增合理（实测输出"第17周...第28周"，与当前日期 2026-07-10 吻合）。**未做**：未用真实浏览器验证 tab 切换时统计区域是否正确联动刷新；未验证"本周"统计在跨自然周边界（比如周日晚上到周一）时是否正确翻篇（逻辑上应该没问题，但没有构造这类边界用例）；周号算法未测试跨年边界（比如 12 月底到 1 月初的周号是否符合 ISO 标准的"归属哪一年"规则）。以上建议用户在真实环境验证。

**沙箱遗留、需要用户手动清理**（同一批，本次会话新增）：
- `src/features/dashboard/components/StatsCards.tsx` — 现在完全没有地方引用了，可以删除（`useDashboardDocuments.ts` 只 `import type { StatCounts }`，删除 `StatsCards.tsx` 前需要把这个类型挪到别处或一并去掉该 import）。
- `verify_task_refine_tmp.ts`（仓库根目录）— 已清空为 0 字节，纯粹是沙箱验证脚本的残留。

### 背景

TASK-110 已经做了首页"询价 / 订单趋势"折线图（`InquiryOrderTrendChart.tsx` + `useInquiryOrderStats.ts` + `inquiryStats.ts`），数据源是 `useInquiryStore` 里的 `InquiryRecord[]`，画询价数量、订单数量两条线，仅在用户有 `inquiry` 权限时显示。

用户现在要求：
1. 有 `inquiry` 权限（询报价登记表/订单状态表）的用户，首页默认能看到这张"询价订单趋势图"（现状已经是这样，不用改）。
2. 有采购部登记权限（TASK-111 合并后的 `purchaseRegistration`，覆盖原 `purchaseRegistration`+`purchaseOrderTable`）的用户，首页默认能看到"另一个表"——采购询价订单趋势图。
3. 同时有两个权限的用户，能用选项卡在两张图之间切换。
4. 两张图都要新增一条"已报价"数据线，数据来自各自表专属的已报价状态字段。

### 关键背景（已经确认过、不要重新猜的口径）

`src/features/purchase-registration/app/PurchaseRegistrationPage.tsx` 和 `src/features/purchase-order-registration/app/PurchaseOrderRegistrationPage.tsx` 都是直接读同一个 `useInquiryStore` 的 `InquiryRecord[]`（不是独立的数据源），只是用了记录上专属于采购视角的字段：`purchaseQuotedStatuses`（结构与 `quotedStatuses` 相同，见 `src/features/inquiry/types/index.ts` 第 61～64 行）、`purchaseSupplierStatuses`。采购订单表页面本身用的"已成单"过滤条件（`orderNo` 有值）跟销售侧"订单状态表"完全一致（`PurchaseOrderRegistrationPage.tsx` 第 23～26 行注释也写明"与订单状态表的过滤条件一致"）。

**这意味着**：采购询价订单趋势图的"询价数量"和"订单数量"两条线，用跟 `inquiryStats.ts` 里 `getInquiryCreatedDate`/`getOrderConfirmDate` 完全一样的口径计算，数值会跟询价订单趋势图的对应两条线**完全相同**——这是预期行为，不是 bug，因为两张表本来就是同一批询价/订单记录的不同视角。两张图**唯一的差异只在"已报价"这条线**：询价订单趋势图的"已报价"读 `record.quotedStatuses`（客户报价，销售视角），采购询价订单趋势图的"已报价"读 `record.purchaseQuotedStatuses`（供应商报价，采购视角）。实现前如果发现这个推论有问题（比如采购视角应该有自己独立的"询价"范围界定），先跟用户确认，不要自己改口径。

**"已报价"新数据线的计算规则**（用户原话："已报价的数据取自每条询价记录的状态中已报价的日期，同一条询价如有多个版本ab报价也只记数量1，日期取最新的报价日期"）：跟 TASK-110 里给"今日新增"统计徽标用的 `isRecordQuoted`/`getQuotedOnDate`（判定"今天是否已报价"，一条记录可能在多个不同日期的 bucket 里各命中一次）不是同一个函数——那个是为单日统计设计的，不满足"整条记录只算一次、取最新日期"的要求。需要新增一个函数，语义类似 `getInquiryCreatedDate`/`getOrderConfirmDate`：给一条记录返回**唯一一个"最新已报价日期"**（或 `null`），用于趋势图按此日期分桶时，每条记录只会落进一个 bucket。

### Files in scope

- `src/features/dashboard/utils/inquiryStats.ts` —
  - 把 `isRecordQuoted`/`getQuotedOnDate` 涉及的 `quotedStatuses` 读取改成可配置参数（比如加一个 `statusField: 'quotedStatuses' | 'purchaseQuotedStatuses'` 参数，或者接受一个 `(record) => CustomerQuoteStatus[]` 的 accessor），避免复制一份几乎一样的采购版函数
  - 新增 `getLatestQuotedDate(record, statusField): Date | null`——筛出 `type` 为 `'quoted'`/未定义的条目，各自按 `resolveYearForShortDate` 解析出完整日期，取其中最晚的一个；不存在则 `null`
  - `buildTrendData` 增加已报价这条线的桶数据（复用 `bucketByGranularity`，`dateGetter` 传 `getLatestQuotedDate` 的 partial），`TrendPoint` 类型加 `quotedCount: number`；询价数量、订单数量两条线两边共用同一套计算，不用参数化，只有已报价这条线需要区分数据来源
- `src/features/dashboard/hooks/useInquiryOrderStats.ts` — 支持传入"表来源"（`'inquiry' | 'purchase'`）参数，已报价相关计算按来源选字段；不改询价/订单两条线的计算
- `src/features/dashboard/components/InquiryOrderTrendChart.tsx` — `LineChart` 增加第三条"已报价"线（配色跟 `InquiryOrderStats.tsx` 里已经用的 `text-blue-600` 已报价配色呼应，比如 `#3b82f6`，避免跟询价的粉色 `#ec4899`、订单的绿色 `#10b981` 冲突）
- 新建 `src/features/dashboard/components/DashboardTrendSection.tsx`（文件名实现者可自定）——包一层选项卡切换逻辑：只有 `inquiry` 权限→只显示询价订单趋势图（不显示 tab）；只有 `purchaseRegistration` 权限→只显示采购询价订单趋势图（不显示 tab）；两个都有→显示 tab 切换；两个都没有→整块不渲染，不留空白
- `src/features/dashboard/app/DashboardPage.tsx` — 把现有的 `<InquiryOrderTrendChart visible={hasInquiryAccess} .../>` 替换成新的 `<DashboardTrendSection>`，同时基于 `permissionMap.permissions.purchaseRegistration`（TASK-111 落地后的合并权限）判断采购趋势图的可见性

### Acceptance criteria

- 只有 `inquiry` 权限：首页显示"询价订单趋势图"，无 tab，图上询价/已报价（客户视角）/订单三条线
- 只有 `purchaseRegistration` 权限：首页显示"采购询价订单趋势图"，无 tab，图上询价/已报价（供应商视角）/订单三条线
- 两个权限都有：显示 tab（比如"询价订单趋势"/"采购询价订单趋势"），默认展示询价订单趋势图，点击可切换；粒度选择（天/周/月/季/年度）两张图各自独立记忆还是共用一份状态，实现者自行决定，但要在实现记录里写清楚选了哪种
- 两个权限都没有：整块趋势图区域不渲染，不留空白占位（跟现有 `visible` 语义一致）
- "已报价"这条线：同一条记录不管有几条 `quoted` 类型的报价状态，在同一个粒度的分桶统计里只贡献 1 次，落在其"最新报价日期"对应的桶里
- 询价订单趋势图和采购询价订单趋势图的"询价数量"、"订单数量"两条线数值应该完全相同（因为是同一批记录），这是预期行为——验收时不要因为两张图这两条线数值一样而误判成 bug

### Non-goals / 红线

- 不改 `InquiryOrderStats.tsx`（"今日/本月"统计徽标行）——用户这次只要求趋势图加线、加 tab，没有要求把统计徽标也拆成两套，`isRecordQuoted`/`getQuotedOnDate` 这两个原有函数保持不动，只是新增 `getLatestQuotedDate`，不要复用/篡改前者的语义
- 不改 `PurchaseRegistrationPage.tsx`/`PurchaseOrderRegistrationPage.tsx` 页面本身的筛选/展示逻辑，趋势图直接读 `useInquiryStore` 的全量 records 现算，不做服务端聚合（同 TASK-110 非目标）
- 不新增 D1 接口，不改 `InquiryRecord` 数据结构
- 不用假设"采购询价"是跟"销售询价"不同的记录范围——按上面确认的口径，两条线数值理应相同，不要为了"让两张图看起来不一样"而擅自加额外过滤条件（比如只统计有 `purchaseSupplierStatuses` 的记录）
- 依赖 TASK-111：`purchaseRegistration` 权限的合并要先落地，这里才能用它同时代表"采购部登记"和"采购订单表"两个页面的访问权；如果 TASK-111 还没做，先按现状的两个独立权限（`purchaseRegistration` 或 `purchaseOrderTable` 任一为真）判断采购趋势图可见性，并在实现记录里写清楚用的是过渡方案

### Verification steps

- `npx tsc --noEmit`
- `npx eslint`（改动 + 新增文件）
- `npm run build`
- 独立断言脚本验证 `getLatestQuotedDate`：构造一条记录，`quotedStatuses` 里有两条不同日期的 `quoted` 类型条目，确认返回的是较晚的那个日期；构造一条只有 `unavailable` 类型的记录，确认返回 `null`
- 4 种权限组合（只 inquiry / 只 purchaseRegistration / 两者都有 / 两者都无）分别登录首页人工核对趋势图显示/隐藏/tab 是否符合预期
- 5 个粒度切换在两张图上分别看一次不报错
- 已报价线抽 1～2 条真实记录，手工核对分桶结果是否落在"最新报价日期"对应的桶

**Status:** completed

## TASK-114：Sidebar 重新设计——企业级中性风格（MS365/Linear/Notion/Stripe Dashboard）

**状态**：已完成（2026-07-10，本次会话由 Claude 直接实现，未经 Codex）

**背景**：用户在批准并验证 TASK-109 之后的"菜单图标彩色化"（逐项专属彩色图标，见 `src/constants/menuIconColors.ts`）之上，又提出完全反向的设计要求——放弃彩色图标，改用企业级中性配色方案（80% 中性色 + 15% 品牌色 + 5% 功能色），并给出了精确到像素/hex 的设计规范。本任务**只针对桌面端左侧 Sidebar（`AppSidebar.tsx`）及其内嵌的用户菜单（`AppUserMenu.tsx`）**生效；移动端底部导航 `MobileBottomTab.tsx` 用户没有提及"Sidebar"这个词，且是完全独立的组件，本次未改动，仍保留 Phase 6 的彩色图标方案。

**执行记录**：
- 新增侧边栏专属 CSS 变量（`src/app/globals.css` `:root` + `html.dark`）：`--sidebar-bg`、`--sidebar-border`、`--sidebar-section-title`、`--sidebar-item-text`、`--sidebar-item-icon`、`--sidebar-item-hover-bg`、`--sidebar-item-active-bg`、`--sidebar-item-active-text`、`--sidebar-item-active-icon`、`--sidebar-item-active-indicator`，以及 `--color-success/warning/danger`。Light 值按用户给定 hex 原样落地；Dark 值为新设计（用户只给了 Light 规范），沿用项目既有 `--app-dark-base`/`--app-dark-surface` 基调，激活态改用更亮的 `#60A5FA`（blue-400）保证暗色背景下的可读对比度。
- `--sidebar-width`/`--sidebar-margin` 默认值从 `220px` 改为 `260px`，同步更新 `src/utils/sidebarCollapse.ts` 的 `SIDEBAR_WIDTH_EXPANDED` 常量、`src/utils/__tests__/sidebarCollapse.test.ts` 的 3 处断言、`AppSidebar.tsx` 移动端 overlay 的 `w-[220px]`→`w-[260px]`，以及 `AppUserMenu.tsx` 里引用 220px 的注释。
- `tailwind.config.ts` `theme.extend.colors` 新增 `sidebar.*`（映射到上述 CSS 变量，shadcn 风格的 token-over-CSS-var 用法，深浅色自动切换不需要额外写 `dark:` 变体）和 `status.success/warning/danger`。
- `AppSidebar.tsx`：移除 Phase 6 的 `MENU_ICON_COLORS`/`DEFAULT_MENU_ICON_COLOR` 引用；导航项改为统一规格——高度 44px（`h-11`）、圆角 10px、水平内边距 12px、图标 20px（`h-5 w-5`，`strokeWidth=1.75`）、字号 15px/字重 500；默认态图标/文字读 `sidebar-item-icon`/`sidebar-item-text`（灰），激活态背景 `sidebar-item-active-bg`、文字/图标 `sidebar-item-active-text`/`sidebar-item-active-icon`（品牌蓝），并在激活项左侧加 3px 圆角蓝色指示条（收缩态不显示，避免和收缩窄轨道的定位冲突）。组标签样式改为 12px/600/大写/`sidebar-section-title` 色，组间距用 `mt-6`（24px）取代原来的分隔线。容器背景/边框改用 `sidebar-bg`/`sidebar-border`。
- `AppUserMenu.tsx`：移除 Phase 6 的 `USER_MENU_ICON_COLORS` 引用，四个操作项图标统一改为中性灰（`text-gray-500 dark:text-gray-400`），底部分隔线改用 `sidebar-border`，与新 Sidebar 配色保持一致（该组件挂载在 Sidebar 底部，若继续保留彩色图标会破坏整体"中性+仅激活态用蓝"的设计原则）。
- 新增独立设计规范文档 `SIDEBAR_DESIGN_SPEC.md`（仓库根目录），包含 Figma 风格规范表格、Tailwind Design Token、CSS Variables、shadcn/ui 风格组件样式片段、Light/Dark 两套配色对照表。

**追加调整（2026-07-10，同一会话）**：用户要求"全部应用到所有菜单"，把中性配色方案从桌面 Sidebar 扩展到移动端底部导航：
- `MobileBottomTab.tsx`：移除 `MOBILE_CATEGORY_ICON_COLORS`/`MENU_ICON_COLORS`/`USER_MENU_ICON_COLORS`/`DEFAULT_MENU_ICON_COLOR` 引用。顶层五个入口（首页/新建/登记/管理/工具/我）图标与文字改用 `sidebar-item-icon`/`sidebar-item-text`（灰），激活/展开态改用 `sidebar-item-active-bg`/`-text`/`-icon`（品牌蓝），与桌面端视觉语言统一；下拉面板（分类子菜单 + "我"子菜单）背景/边框改用 `sidebar-border`，各项图标统一 `text-sidebar-item-icon`，不再逐项彩色；`strokeWidth` 统一改成 1.75 与桌面端一致。
- `src/constants/menuIconColors.ts` 至此已无任何引用方（`AppSidebar.tsx`/`AppUserMenu.tsx`/`MobileBottomTab.tsx` 均已切到 `sidebar-*` token）；用户已手动删除该文件，`tsc`/`eslint` 复查均通过。
- 验证：`npx tsc --noEmit`、`npx eslint`（`MobileBottomTab.tsx` + 删除 `menuIconColors.ts` 后）均无输出。未做：移动端真机/浏览器视觉走查未执行，建议用户实测。

**追加调整 2（2026-07-10）**：根据实际宽屏截图优化桌面 Sidebar 的视觉密度：
- 桌面展开宽度从 260px 收紧为 240px，`--sidebar-width`、`--sidebar-margin`、`SIDEBAR_WIDTH_EXPANDED` 和测试断言同步更新；收缩态仍为 56px。
- 导航项从 44px 高 / 15px 字号调整为 40px 高 / 14px 字号，图文间距从 12px 调整为 10px；图标仍为 20px，组标签仍为 12px。
- 移动端侧滑菜单继续使用 260px，不跟随桌面端缩窄。
- 验证：`src/utils/__tests__/sidebarCollapse.test.ts` 4 项测试通过，`git diff --check` 通过。

### Files in scope

- `src/app/globals.css`
- `tailwind.config.ts`
- `src/utils/sidebarCollapse.ts`
- `src/utils/__tests__/sidebarCollapse.test.ts`
- `src/components/layout/AppSidebar.tsx`
- `src/components/layout/AppUserMenu.tsx`
- `src/components/layout/MobileBottomTab.tsx`（追加调整新增）
- `src/constants/menuIconColors.ts`（追加调整中已删除）
- `SIDEBAR_DESIGN_SPEC.md`（新增）

### Non-goals / 红线

- 不改导航项数据结构（`NAV_ITEMS`/`NAV_GROUPS`/`CATEGORY_DEFS`/权限映射）

### Verification steps

- `npx tsc --noEmit` — 通过
- `npx eslint`（改动文件）— 通过
- `npm run build` — 45 秒沙箱超时前未见报错（既有限制，见 TASK-109/110）
- 待用户在浏览器人工核对：Light/Dark 两种模式下侧边栏配色、激活态指示条、收缩/展开切换，以及桌面 240px / 移动端侧滑 260px 宽度是否符合预期

**Status:** completed

## TASK-115：点击"内销合同"菜单后侧边栏高亮跳回"内销报价"

**状态**：已完成（2026-07-10，本次会话由 Claude 直接实现，未经 Codex）
**日期**：2026-07-10

### 背景

用户反馈：点击侧边栏"内销合同"，页面正确切换到内销合同视图，但菜单高亮又跳回"内销报价"。

根因在 `src/features/quotation/hooks/useInitQuotation.ts` 的 searchParams 监听 effect：`docType` 被设计成"一次性指令"，应用到 Zustand store 后就用 `url.searchParams.delete('docType')` + `window.history.replaceState(...)` 把它从 URL 上删掉（本意是防止浏览器前进/后退等场景把已消费过的旧 docType 重新触发、覆盖用户后续在页面内的手动切换）。但 Next.js 会 patch `window.history.replaceState`，使其同步更新 `useSearchParams()`/`usePathname()`（`app-router.js` 里 `applyUrlFromHistoryPushReplace`），因此这次"删除"会在同一个 tick 内让 `AppSidebar.tsx` 观察到的 URL 从 `?tab=domestic&docType=contract` 变成 `?tab=domestic`（没有 docType）。`AppSidebar.tsx` 的 `isItemActive` 依赖 `docType === 'contract'` 判断"内销合同"是否激活，docType 一旦被删除就退回到默认分支，导致"内销报价"（`docType !== 'contract'` 为真）被错误高亮。

### 执行记录

- `useInitQuotation.ts`：新增 `lastAppliedDocTypeRef` 记录"已应用过的 docType 值"，把原来"应用后删除 URL 参数"的一次性语义改成"值不同才重新应用"——`domesticDocType !== lastAppliedDocTypeRef.current` 才调用 `updateData`/`setNotesConfig`，同一个 docType 值重复触发 effect 时会被跳过，不会覆盖用户随后在页面内的手动切换（原来靠删参数防的就是这个）。
- URL 同步逻辑改为 `url.searchParams.set('tab', tab)` + `url.searchParams.set('docType', domesticDocType)`（不再 `delete`），docType 持续留在 URL 上，供 `AppSidebar.tsx`/`MobileBottomTab.tsx` 判断当前激活菜单项。

### 非目标

- 未改动 `AppSidebar.tsx` 的 `isItemActive` 本身——问题根因在 URL 参数被过早删除，不在判定逻辑。
- 未处理"用户在页面内手动切换报价⇄合同（不通过侧边栏点击）后，侧边栏高亮不会跟着变"这个预置差异——该手动切换只更新 Zustand store，不回写 URL，属于此前就存在、本次未被用户报告的独立行为，如需要侧边栏也跟着联动，需要额外让页面内切换同步 `router.replace`，建议另开任务处理。

### 验证

- `npx tsc --noEmit`、`npx eslint`（`useInitQuotation.ts`）均无输出。
- 未做真实浏览器点击验证（沙箱无法登录测试账号），建议用户实测：依次点击"外贸报价"→"内销报价"→"内销合同"→"内销报价"，每次确认页面内容和侧边栏高亮一致；并验证进入内销合同页面后，若页面内有手动切换单据类型的按钮，切换后侧边栏高亮是否符合预期（见上方非目标说明的已知差异）。

**Status:** completed

## TASK-116：侧边栏收缩为图标导航时，鼠标悬浮没有浮动提示

**状态**：已完成（2026-07-10，本次会话由 Claude 直接实现，未经 Codex）
**日期**：2026-07-10

### 背景

用户反馈：侧边栏收缩成图标导航后，鼠标移到图标上没有浮动提示（tooltip）显示菜单名称。

`AppSidebar.tsx` 里其实早就写了这个 tooltip（`absolute left-full ... group-hover/nav:opacity-100`），但一直不会显示——根因是 `<nav>` 容器为了在收缩/展开宽度过渡时不出现横向滚动条，设了 `overflow-x-hidden`；tooltip 用 `absolute` 定位、`left-full` 伸到导航项右侧（收缩态图标条很窄，tooltip 必然超出 nav 的横向边界），直接被 `overflow-x-hidden` 裁掉，从未真正渲染出来过。

### 执行记录

- `AppSidebar.tsx`：把 tooltip 从"挂在每个导航项内部、absolute 定位"改成"整个组件只有一份、`fixed` 定位"——新增 `tooltip` state（`{id, label, top, left}`），导航项外层 `div` 在收缩态时绑定 `onMouseEnter`/`onMouseLeave`，进入时用 `getBoundingClientRect()` 读取该图标的视口坐标算出 tooltip 应该出现的位置（`top` 取图标垂直居中，`left` 取图标右边缘 + 8px 间距），存进 state。tooltip 元素挪到 `<nav>` 外面（`</aside>` 内、用户菜单下方）单独渲染一份，用 `position: fixed` + 该坐标定位——`fixed` 只受 `transform`/`filter` 等属性的祖先裁剪，不受 `overflow-x-hidden` 影响，因此能正常伸出收缩态窄图标条之外。
- `<nav>` 新增 `onScroll={hideTooltip}`，避免导航列表内容较多需要滚动时，tooltip 位置跟丢导航项、悬在错误位置。
- 动效复用项目已有的 `animate-in fade-in-0` 工具类（`globals.css` 手写实现，`AppUserMenu.tsx` 下拉面板同款），不引入新依赖。

### Files in scope

- `src/components/layout/AppSidebar.tsx`

### Non-goals / 红线

- 未改动展开态的导航项样式/交互。
- 未处理移动端（`MobileBottomTab.tsx`）——移动端侧边栏没有"收缩为图标"这个状态，本来就不需要 tooltip。

### Verification steps

- `npx tsc --noEmit`、`npx eslint`（`AppSidebar.tsx`）均无输出。
- 未做真实浏览器验证（沙箱无法交互鼠标悬浮），建议用户实测：点击收起侧边栏按钮进入图标态，把鼠标移到任意图标上，确认 0.2s 内出现深色圆角提示条、文字是对应菜单名，移开后消失；滚动导航列表（如果条目多到需要滚动）时确认提示会跟着消失，不会悬在错误位置。

**Status:** completed

## TASK-117：首页「本周/本月」统计只保留「本月」+ 呈现优化

**状态**：已完成（2026-07-10，本次会话由 Claude 直接实现，未经 Codex）
**日期**：2026-07-10

### 背景

用户要求：首页询价/已报价/订单统计区域去掉"本周"，只保留"本月"，并优化一下呈现方式。

### 执行记录

- `InquiryOrderStats.tsx`：删除"本周"整组徽标和中间的竖分隔线，只保留"本月"一组三个 `StatChip`（询价/已报价/订单）；`week` prop 从组件接口中移除。呈现上把原来纯文字的"本月"标签换成浅灰底色圆角小标签（`rounded-md bg-gray-100 dark:bg-gray-700/50`），并把整行内边距从 `px-3 py-2.5` 放宽到 `px-4 py-3`、chip 间距从 `gap-x-0.5` 放宽到 `gap-x-2`——原来两组数字挤在一起用极小间距是为了塞下 6 个 chip，现在只有 3 个，松一点更耐看。
- `DashboardPage.tsx`：调用处去掉 `week={activeOrderStats.week}` 这一行传参。
- `useInquiryOrderStats.ts` 未改动——`week` 统计仍然会被计算并保留在 hook 返回值里（`InquiryOrderWeekStats` 类型、`countInquiriesInWeek`/`countQuotedInWeek`/`countOrdersInWeek` 等函数均未删除），只是首页不再渲染它。这样万一之后又要用回"本周"，不需要重新写计算逻辑；如果确认以后都不需要了，可以再单独清理这部分为死代码。

### Files in scope

- `src/features/dashboard/components/InquiryOrderStats.tsx`
- `src/features/dashboard/app/DashboardPage.tsx`

### Non-goals / 红线

- 未删除 `useInquiryOrderStats.ts`/`inquiryStats.ts` 里的"本周"计算逻辑（`week` 字段、`countXInWeek` 系列函数）——只是不再在首页渲染，见上方执行记录说明的取舍。
- 未改动趋势图的"周"粒度选项（`Granularity` 里的 `'week'`，用于横轴分桶显示"第N周"）——那是完全独立的功能（TASK-113），跟这次去掉的"本周统计徽标"没有关系。

### Verification steps

- `npx tsc --noEmit`、`npx eslint`（`InquiryOrderStats.tsx`/`DashboardPage.tsx`）均无输出。
- 未做真实浏览器验证，建议用户确认首页统计区域只显示一行"本月 询价/已报价/订单"，视觉间距是否满意。

**Status:** completed

## TASK-118：客户管理页默认筛选 New 类 + 工具菜单 IMPA 排到最后

**状态**：已完成（2026-07-10，本次会话由 Claude 直接实现，未经 Codex）
**日期**：2026-07-10

### 执行记录

- `src/features/customer/app/CustomerPage.tsx`：`categoryFilter` 的 `useState` 初始值从 `'all'` 改成 `'New'`；`handleTabChange` 里原来无条件重置成 `'all'`，改成"切回客户 tab 时回到 `'New'`，其余 tab（供应商/收货人不用这个筛选）保持 `'all'`"，保证不管是首次进入页面还是从供应商/收货人 tab 切回来，客户列表默认都只看 New 类。分类筛选 UI/计数逻辑本身未改动。
- `src/components/layout/AppSidebar.tsx`：`NAV_GROUPS` 里"工具"组的 `navGroupItems([...])` 顺序从 `['impa', 'clock', 'holidays', 'rmb', 'mail']` 改成 `['clock', 'holidays', 'rmb', 'mail', 'impa']`。
- `src/components/layout/MobileBottomTab.tsx`：`TOOLS_LINKS` 数组同步调整成同样的顺序，保持桌面端/移动端"工具"菜单一致。

### Files in scope

- `src/features/customer/app/CustomerPage.tsx`
- `src/components/layout/AppSidebar.tsx`
- `src/components/layout/MobileBottomTab.tsx`

### Verification steps

- `npx tsc --noEmit`、`npx eslint`（三个改动文件）均无输出。
- 未做真实浏览器验证，建议用户确认：进入 `/customer` 页面时"New"筛选按钮默认高亮、列表只显示 New 类客户；侧边栏和移动端"工具"分类里 IMPA物料 排在时区汇率/全球假日/RMB大写/AI 邮件之后。

**Status:** completed

## TASK-119：侧边栏悬浮提示改用 sidebar 设计 token 配色

**状态**：已完成（2026-07-10，本次会话由 Claude 直接实现，未经 Codex）
**日期**：2026-07-10

### 背景

TASK-116 修好了收缩态悬浮提示的可见性问题，但当时沿用的是通用深色气泡样式（`bg-gray-900 dark:bg-gray-700` + 白字 + 小三角），跟 TASK-114/115 定的 Sidebar 中性配色系统（`sidebar-bg`/`sidebar-border`/`sidebar-item-text` 等 token）不是一套东西。用户要求悬浮提示也套用同一套颜色设计规则。

### 执行记录

- `AppSidebar.tsx`：tooltip 容器从 `bg-gray-900 dark:bg-gray-700 text-white` 改成 `border border-sidebar-border bg-sidebar-bg text-sidebar-item-text`——浅底色 + 细边框 + 中性文字，跟菜单本体、组标签、"本月"徽标共用同一套 token，深色模式也自动跟随（CSS 变量本身已经处理了 light/dark，不用再写 `dark:` 变体）。
- 去掉了原来配合深色气泡的小三角指示（`border-r-gray-900`），改成浅底带边框的卡片式提示（跟 Notion/Linear 的 tooltip 观感一致，没有三角指示反而更干净），边框本身已经能起到视觉指向作用。

### Files in scope

- `src/components/layout/AppSidebar.tsx`

### Verification steps

- `npx tsc --noEmit`、`npx eslint`（`AppSidebar.tsx`）均无输出。
- 未做真实浏览器验证，建议用户确认：收缩态鼠标移到图标上，提示框是浅色底+细边框（不再是黑底白字），Light/Dark 两种模式下都跟侧边栏本体配色协调。

**Status:** completed

## TASK-120：统一各单据页面「设置」区域展开间距与呈现

**状态**：已完成（2026-07-10，本次会话由 Claude 直接实现，未经 Codex）
**日期**：2026-07-10

### 背景

用户要求统一 报价单/内销报价合同（`QuotationPage.tsx`）、箱单发票（`PackingForm.tsx`）、财务发票（`InvoicePage.tsx`）、采购订单（`PurchaseForm.tsx`）四个单据页面的"设置"折叠面板风格，尤其是展开后跟上下元素的间距。

排查发现：四个面板本体卡片样式（`bg-blue-50 border rounded-lg p-3 shadow-sm`）其实已经一致，真正不统一的是外层 `CollapsibleSection` 的 `contentClassName` 和跟下一个区域之间的间距处理方式，四家各不相同：
- Quotation：`contentClassName="px-4 sm:px-6 py-3 mb-4"`，下方"客户信息区域"用 `showSettings ? 'py-2' : 'py-4'` 三元表达式反向补偿——两处耦合，脆弱且间距会随展开/收起状态变化。
- Packing：`contentClassName="px-4 sm:px-6 py-2"`（无下边距），下方"基本信息区域"固定 `py-4 sm:py-6`，本身没问题但跟其他三家的量级不统一。
- Invoice：`contentClassName="px-4 sm:px-6 py-2 mb-8"`——`mb-8`（32px）明显偏大，且下方"基础信息区域"完全没有自己的上边距，展开态间距过宽、跟其余三家不成比例。
- Purchase：`contentClassName="px-4 sm:px-6 py-6"`（24px，无下边距），中间还夹了几行没有任何内容的空 JSX 行（`{}`之间纯空行，不产生任何实际间距，属于死代码）。

### 执行记录

- 四个页面的 `CollapsibleSection`（Quotation/Invoice/Purchase 在页面组件里，Packing 在其 `SettingsPanel.tsx` 内部自己包了一层）统一改成同一个 `contentClassName="px-4 sm:px-6 pt-3 pb-4"`——面板内容离上面工具栏 12px，离下面区域 16px，展开态收起态间距一致（`pb-4` 属于会被 grid-template-rows 裁剪掉的内容区域，收起时自动归零，不用另外写条件判断）。
- `QuotationPage.tsx`：去掉"客户信息区域"的 `showSettings ? 'py-2' : 'py-4'` 三元耦合，改成固定 `py-4`，不再随设置面板展开/收起变化。
- `InvoicePage.tsx`：去掉 `mb-8`；顶部工具栏本身自带 `mb-6`，收起态基线间距已经足够，不需要再给"基础信息区域"额外加上边距。顺带修了设置按钮本身两处跟其余三个页面不一致的地方：缺 `title="Settings"`（无障碍/悬浮提示缺失）、hover/图标颜色用的是 `dark:hover:bg-gray-700/50`/`dark:text-gray-400`，跟另外三个页面统一用的 `dark:hover:bg-[#3A3A3C]`/`dark:text-[#98989D]` 不一致，已对齐。
- `PurchaseForm.tsx`：删掉设置面板和主内容区域之间几行没有实际作用的空 JSX 行；下方"主内容区域"本身已是固定 `p-4 sm:p-6`，不用改。
- Packing/Purchase 的下方区域原本就是固定 padding（不随展开态变化），未改动，只统一了设置面板自身的 `contentClassName`。

### Files in scope

- `src/features/quotation/app/QuotationPage.tsx`
- `src/features/packing/components/SettingsPanel.tsx`
- `src/features/invoice/app/InvoicePage.tsx`
- `src/features/purchase/components/PurchaseForm.tsx`

### Non-goals / 红线

- 未改动四个 `SettingsPanel.tsx` 组件内部的表单项布局/配色（本来就已经一致：`bg-blue-50 dark:bg-blue-950/30 border rounded-lg p-3 shadow-sm` + 选项按钮统一用 `bg-[#007AFF]` 高亮）。
- 未统一四个页面设置按钮本身的尺寸（Quotation 工具栏 4 个按钮共用 `p-1.5`，其余三个页面只有 2 个按钮用 `p-2`——这是每个页面自己工具栏内部的一致性，跨页面统一会破坏页面内部的视觉平衡，只对齐了颜色/title 这类明显的不一致项）。
- Purchase 的 `SettingsPanel.tsx` 本身内容为空（"设置选项已移至相应位置"占位文案）——不在本次范围内调整其内容。

### Verification steps

- `npx tsc --noEmit`、`npx eslint`（四个改动文件）均无输出。
- 未做真实浏览器验证，建议用户逐个打开四个单据页面，点击设置按钮展开/收起，确认面板跟上方工具栏、下方内容区域的间距观感一致。

**追加修正（2026-07-10，同一会话）**：用户截图反馈财务发票页面设置展开后，跟上方标题栏的间距明显比其他三个页面更大。原因是当时只统一了 `CollapsibleSection` 自身的 `contentClassName`，漏看了 Invoice 的标题栏容器本身还多叠加了一层 `mb-6`（`InvoicePage.tsx` 标题栏 div：`-mx-4 md:-mx-8 px-4 md:px-8 pb-6 mb-6 border-b`）——`pb-6`（24px，header 内部标题到分割线的距离）之外又加了一个 `mb-6`（24px，分割线到设置面板的距离），比 Quotation（`p-3 sm:p-4` 单层 12~16px）、Packing/Purchase（`p-4 sm:p-6` 单层 16~24px）多出一整倍。去掉这个多余的 `mb-6`，把 `pb-6` 改成 `pb-4 sm:pb-6`，跟 Packing/Purchase 的 header 量级对齐，分割线之后紧接着由 `CollapsibleSection` 自己的 `pt-3` 提供间距，不再重复叠加。`npx tsc --noEmit`/`npx eslint` 均无输出。

**追加修正 2（2026-07-10，同一会话）**：用户又指出发票页面"客户信息/单号"这块区域有底框（`bg-gray-50/50 dark:bg-gray-800/20 rounded-xl border ... p-4`），而 Quotation（`CustomerInfoCompact`）、Packing（`BasicInfoSection`）对应区域都是直接铺在卡片背景上、没有单独的底框。`InvoiceInfoCompact` 组件本身只是 `grid grid-cols-12 gap-3`，不依赖外层的背景/边框，去掉包裹的底框 div，外层直接改成跟 Packing 一致的 `px-4 sm:px-6 py-4 sm:py-6`（保留原有 `mb-8` 不变，这次只针对"有没有底框"这一点，不涉及间距数值）。`npx tsc --noEmit`/`npx eslint` 均无输出。

**Status:** completed

## TASK-121：统一四张登记表（询报价登记/订单状态表/采购部登记/采购订单表）主内容字号

**状态**：已完成（2026-07-10，本次会话由 Claude 直接实现，未经 Codex）
**日期**：2026-07-10

### 背景

用户截图对比反馈"询报价登记"表格看起来比另外三张（订单状态表/采购部登记/采购订单表）字更大、行更松。排查后发现行高（`py-2`）四张表完全一致，差异纯粹来自字号：`InquiryRow.tsx` 用的是 `text-sm`（14px），另外三张表的等价内容列用的是 `text-xs`/`text-[11px]`（12/11px）。

用户进一步追问"最舒适的字号是多大"，综合考虑：这类表格是"扫读型"（用户找单号/客户名/状态，不是读长句），12px 在非 Retina 显示器上偏小、容易疲劳，14px 又会明显减少单屏可见行数（询报价登记截图单屏能看到 26 条记录）；专业密集表格产品（Linear/Airtable 的数据网格）主内容大多落在 13~14px 区间。综合舒适度和信息密度，选定 **13px** 作为四张表主内容的统一字号（用户确认选择）。

### 执行记录

只调整"主要内容"（单号/客户名/描述/状态/供应商等用户实际要读的文本），不动日期、金额等结构化数字字段的字号（这些字段本来就该保持紧凑，各表处理方式本就一致，不是本次要解决的问题）：

- `InquiryRow.tsx`：4 处 `text-sm` → `text-[13px]`（询价编号、询价人、客户编号、内容简述所在的 `<td>`）。
- `InquiryQuoteStatusDisplay.tsx`（询报价登记 + 采购部登记共用的"询报价状态"列）：`text-xs` → `text-[13px]`。
- `OrderRow.tsx`：`OrderNoText`（订单编号，原 `text-[11px]`）→ `text-[13px]`；客户列、内容简述列（原 `text-xs`）→ `text-[13px]`。
- `DeliveryStatusCell.tsx`（订单状态表 + 采购订单表共用的"执行情况"列）：只读展示态 `text-xs` → `text-[13px]`。
- `PurchaseRegistrationRow.tsx`：询价编号主标识（原 `text-[11px]`）→ `text-[13px]`；内容描述 `EditableText` 只读态（原 `text-xs`）→ `text-[13px]`。
- `PurchaseOrderRow.tsx`：`OrderNoText`（原 `text-[11px]`）→ `text-[13px]`；采购单号/供应商 `EditableText` 只读态（原 `text-xs`）→ `text-[13px]`。

### Files in scope

- `src/features/inquiry/components/InquiryRow.tsx`
- `src/features/inquiry/components/InquiryQuoteStatusDisplay.tsx`
- `src/features/order/components/OrderRow.tsx`
- `src/features/order/components/DeliveryStatusCell.tsx`
- `src/features/purchase-registration/components/PurchaseRegistrationRow.tsx`
- `src/features/purchase-order-registration/components/PurchaseOrderRow.tsx`

### Non-goals / 红线

- 未改动日期选择器（`DatePickerCell`/`DateEditCell`/`MonthPickerCell`）、金额输入（`AmountCell`/`AmountEditCell`）、只读参考字段（`ReadOnlyText`：确认日期/客户订单号）、编辑态 `<input>` 本身的字号——这些保持原有 `text-xs`（12px）不变，是刻意的层级区分（结构化数字/参考数据 vs 用户主要阅读的文本内容），四张表在这一层原本就是一致的，不在本次问题范围内。
- 未改动表头 `<th>` 字号——排查确认表头在四张表之间本来就是一致的，差异只在表体（`<tr>`/`<td>`）。
- 未改动行高/内边距（`py-2`）——四张表本来就一致，字号变化会让行的视觉高度顺带增加一点（13px 比 12px 略高），这是预期的、跟随字号自然产生的变化，不是单独调整行高。

### Verification steps

- `npx tsc --noEmit`、`npx eslint`（六个改动文件）均无输出。
- 未做真实浏览器验证，建议用户对比四张表，确认字号观感一致、单屏可见行数没有因为字号变化而大幅减少。

**Status:** completed

## TASK-122：订单状态表——确认日期列在中屏/小屏也显示

**状态**：已完成（2026-07-10，本次会话由 Claude 直接实现，未经 Codex）
**日期**：2026-07-10

### 背景

`OrderTable.tsx`/`OrderRow.tsx` 原来"确认日"和"客户订单号"两列绑在同一个 `showLgCols`（仅 lg/xl ≥1024px）开关下，一起出现一起消失。用户反馈中屏（md，768~1023px）和小屏（sm，<768px）下也需要看到"确认日"这一列（客户订单号没提，维持仅 lg/xl 显示）。

### 执行记录

- `src/features/order/utils/orderTableLayout.ts`：新增 `showConfirmDateCol(bp)`（所有断点都返回 `true`），`showLgCols(bp)` 保留不变但语义收窄为只管"客户订单号"列。`getVisibleColWidths` 的 `sm`/`md` 分支各插入确认日列宽度并重新分配百分比：
  - sm：`['26%','12%','36%','26%']`（订单编号/交货/内容简述/执行情况）→ `['22%','10%','30%','10%','28%']`（订单编号/交货/内容简述/确认日/执行情况）
  - md：`['14%','7%','12%','28%','29%']`（订单编号/交货/客户/内容简述/执行情况）→ `['13%','7%','11%','24%','8%','27%']`（订单编号/交货/客户/内容简述/确认日/执行情况）
  - lg/xl 两档列数和顺序不变（确认日本来就在，只是判定条件从 `lgCols` 换成了恒真的 `confirmDateCol`，视觉上无变化）。
- `OrderTable.tsx`：表头新增 `confirmDateCol` 变量，"确认日"单独一个 `<th>`（不再跟"客户订单号"共用一个 `lgCols && (<>...</>)` fragment），sm 断点下文案缩短成"确认"（比照"执行情况"→"执行"的现有缩写规则）；"客户订单号"单独保留在 `lgCols` 判断下。
- `OrderRow.tsx`：同步拆分——确认日期 `<td>`（`DatePickerCell`）不再包在 `lgCols` fragment 里，改成独立的 `confirmDateCol &&` 判断，四个断点都渲染；客户订单号 `<td>`（含 `EditableCell` + 订单子状态备注）继续用 `lgCols` 单独包裹。

### Files in scope

- `src/features/order/utils/orderTableLayout.ts`
- `src/features/order/components/OrderTable.tsx`
- `src/features/order/components/OrderRow.tsx`

### Non-goals / 红线

- 客户订单号列维持原样，仍然只在 lg/xl（≥1024px）显示——用户只要求确认日期，没有要求客户订单号也下放到中小屏。
- 未改动 `/purchase-order-table`（`PurchaseOrderRow.tsx`）的"确认日期"列（`ReadOnlyText`，目前该页面没有响应式断点隐藏机制，本来就一直显示，不在本次问题范围内）。
- 列宽百分比是估算重新分配（新插入confirm列取约 8~10%，从内容简述/执行情况两列均摊让出），非精确计算；原数组本身合计也并非严格 100%（如 lg 档 97%、xl+financials 档 98%），延续现有的近似惯例。

### Verification steps

- `npx tsc --noEmit`、`npx eslint`（三个改动文件）均无输出。
- 未做真实浏览器验证，建议用户把窗口分别缩到 <768px（sm）、768~1023px（md）两档，确认"确认日"列都能看到且不跟其他列挤压换行；lg/xl 档确认视觉无变化。

**Status:** completed

## TASK-123：采购订单表新增「内容描述」列 + 响应式列隐藏（中屏藏客户订单号，小屏再藏采购单号/确认日期）

**状态**：已完成（2026-07-10，本次会话由 Claude 直接实现，未经 Codex）
**日期**：2026-07-10

### 背景

`采购订单表`（`/purchase-order-table`）原来没有响应式断点机制（`PurchaseOrderTable.tsx` 固定 7~8 列，不随屏幕宽度变化），也没有"内容描述"列。用户要求：① 新增"内容描述"列；② "客户订单号"内容要跟订单状态表一致、且不可编辑（该列本来就已经是只读展示，直接复用）；③ 中屏（md）隐藏"客户订单号"；④ 小屏（sm）在此基础上再隐藏"采购单号"和"确认日期"。

### 执行记录

- 新建 `src/features/purchase-order-registration/utils/purchaseOrderTableLayout.ts`，仿照 `src/features/order/utils/orderTableLayout.ts` 同款模式：`PurchaseOrderTableBreakpoint`（`sm`/`md`/`lg`/`xl`）、`getVisibleColWidths(bp, canViewFinancials)`（四档 × 有无金额权限，共 8 组列宽百分比）、`showPurchaseOrderNoCol`/`showConfirmDateCol`（均为 `bp !== 'sm'`）、`showCustomerNoCol`（仅 `lg`/`xl`）。
- `PurchaseOrderTable.tsx`：新增本地 `useBreakpoint()` hook（跟 `OrderTable.tsx` 完全一致的实现：`resize` 监听 + `window.innerWidth` 断点映射），表头新增"内容描述"列（订单编号之后），"采购单号"/"确认日期"/"客户订单号"三个表头改成按对应的 `show*Col(bp)` 条件渲染；把算好的 `bp` 传给每个 `PurchaseOrderRow`。
- `PurchaseOrderRow.tsx`：新增 `bp` prop；新增"内容描述"只读单元格（`record.description`，纯 `<p>` 展示，不可编辑，字号跟随 TASK-121 统一的 13px，颜色跟随行状态色 `rowTextClass`）；"采购单号"（`EditableText`）、"确认日期"（`ReadOnlyText`）、"客户订单号"（`ReadOnlyText`）三个单元格分别包上 `purchaseOrderNoCol && (...)`/`confirmDateCol && (...)`/`customerNoCol && (...)` 条件渲染，单元格出现顺序跟表头一一对应。"客户订单号"本身逻辑未改动——原来就是 `ReadOnlyText` 只读展示、`fallback` 走跟订单状态表一致的 RFQ→PO 替换规则，天然满足"内容一致、不可编辑"的要求。
- 各断点列数与新列宽数组一一核对过（sm 5~6 列、md 7~8 列、lg/xl 8~9 列，含/不含金额两种情况都对齐），未出现列宽数组长度和实际渲染列数不匹配的情况。

### Files in scope

- `src/features/purchase-order-registration/utils/purchaseOrderTableLayout.ts`（新增）
- `src/features/purchase-order-registration/components/PurchaseOrderTable.tsx`
- `src/features/purchase-order-registration/components/PurchaseOrderRow.tsx`

### Non-goals / 红线

- "金额"列的显隐仍然只受 `canViewFinancials` 权限控制，跟本次新增的响应式断点无关（沿用改动前的既有行为，未叠加断点隐藏）。
- 未改动"客户订单号"本身的数据来源/替换逻辑（`record.orderCustomerNo` + RFQ→PO fallback）——只是给它包了一层断点可见性判断，内容渲染代码原样保留。
- 未联动修改 `src/features/order/utils/orderTableLayout.ts`（订单状态表自己的响应式规则，TASK-122 刚调整过）——两个表现在各自独立一份布局工具文件，没有共享（沿用项目里 Order/PurchaseOrder 两套 Row/Table 组件一直是各自独立实现、不共享底层逻辑的既有惯例）。
- 列宽百分比是估算重新分配，非精确计算，合计不严格等于 100%（延续 `orderTableLayout.ts` 的既有惯例）。

### Verification steps

- `npx tsc --noEmit`、`npx eslint`（三个改动/新增文件）均无输出。
- 未做真实浏览器验证，建议用户把窗口分别缩到 <768px（sm）、768~1023px（md）、≥1024px（lg/xl）三档，确认：sm 只看到订单编号/内容描述/供应商/(金额)/交货日期/执行情况；md 在此基础上多出采购单号/确认日期，仍不显示客户订单号；lg/xl 全部列都显示。同时确认"内容描述"列在各断点下内容正确、不可点击编辑，"客户订单号"内容与订单状态表同一条记录展示的值一致。

**Status:** completed

## TASK-124：修复采购部登记/采购订单表看不到刚编辑的客户订单号（mergeFieldsOnly 缺 pending 保护）

**状态**：已完成（2026-07-10，本次会话由 Claude 直接实现，未经 Codex）
**日期**：2026-07-10

### 背景

用户反馈：同一条记录（FL2684，客户 SAAM）在`订单状态表`能看到"客户订单号"（`QUOTATION - RQVDC06133 - SAAM TAMOIO -FILIAL VIL...`），但在`采购订单表`该列是空的。两个表渲染这个字段的代码逻辑完全相同（`ReadOnlyText value={record.orderCustomerNo}`），排除了是渲染层的 bug，转向排查共享数据层 `useInquiryStore`。

根因：`useInquirySync` 在 `mergeLocal:false` 模式（`/purchase-order-table`、`/purchase-registration` 两个页面都是这个模式，各自独立跑一次 30s/5min 周期同步）下走 `mergeFieldsOnly`，而不是 `/order` 用的、已经有 pending 同步保护的 `mergeFromD1`。用户在 `/order` 编辑 `orderCustomerNo` 后，写入是"本地先落盘 + 排队异步 PUT 到 D1"（fire-and-forget），如果这个 PUT 还没完成/失败重试中，此时 D1 上还是旧值。恰好这时候如果 `/purchase-order-table` 或 `/purchase-registration` 页面在后台也在跑自己的周期同步，`mergeFieldsOnly` 拉到的是 D1 的旧记录，且原来的实现完全没有检查这条记录是否有 pending 操作，就直接 `{...localRecord, ...d1Record}` 整条覆盖，把刚编辑的正确值从**共享**的 `useInquiryStore.records`（以及 localStorage 里的 `inquiry_records`）里冲掉了。因为 store 是全局共享的，冲掉之后不管哪个页面读，看到的都是被污染后的同一份记录——不是"两个表逻辑不一致"，是数据在中间被污染了。

这跟项目里之前记录的 `bug_inquiry_sync_phantom_records.md`（fire-and-forget 同步静默失败）、`bug_inquiry_restricted_view_cache_corruption.md`（受限视图响应整条覆盖共享缓存冲掉字段）是同一类问题：只要哪个同步路径"整条覆盖"而不做 pending/字段级保护，就会把还没同步成功的本地编辑冲掉。

### 执行记录

- `src/features/inquiry/services/inquiry.service.ts` 的 `mergeFieldsOnly`：新增 `const pendingIds = this.getPendingSyncIds();`，对 d1Records 管道加 `.filter((record) => !pendingIds.has(record.id))`（有 pending 操作的记录不参与"用 D1 数据字段合并"这一步），并把这些记录的本地版本通过 `.concat(local.filter((record) => pendingIds.has(record.id) && record.status !== 'deleted'))` 原样带回最终结果（`mergeFieldsOnly` 是纯函数式的 `d1Records.filter().map()` 管道、不是 `mergeFromD1` 那种"以 local 为底的 Map 遍历"，如果只加 filter 不做这一步 concat，会导致有 pending 操作的记录直接从返回结果里消失，而这个返回值会整体替换 `useInquiryStore` 的 `records`）。
- 本地 pending 记录里 `status === 'deleted'` 的不再带回列表，跟 d1Records 分支已有的 `record.status !== 'deleted'` 过滤保持一致，避免本地标记删除但还没同步成功的记录重新出现在列表里。
- 确认 `/purchase-registration`（`PurchaseRegistrationPage.tsx`）和 `/purchase-order-table`（`PurchaseOrderRegistrationPage.tsx`）都是 `useInquirySync({ pushLocal: false, mergeLocal: false })`，两个页面都走 `mergeFieldsOnly`，本次修复对两者都生效；`/order`（`OrderPage.tsx`）用默认 `mergeLocal: true` 走 `mergeFromD1`，本来就有保护，未受影响、未改动。

### Files in scope

- `src/features/inquiry/services/inquiry.service.ts`（`mergeFieldsOnly` 函数）

### Non-goals / 红线

- 未改动 `mergeFromD1`、`patchInD1`、`pushLocalToD1`、`getPendingSyncIds` 等其它同步逻辑。
- 未改动任何表格渲染代码（`OrderRow.tsx`/`PurchaseOrderRow.tsx`/`PurchaseRegistrationRow.tsx`）——问题root cause 确认在数据合并层，不在渲染层。
- 未改动 `useInquirySync.ts` 的调用方式/参数（`pushLocal`/`mergeLocal` 语义不变）。

### Verification steps

- `npx tsc --noEmit` 通过；`npx eslint src/features/inquiry/services/inquiry.service.ts` 无输出。
- 建议用户实测复现路径确认：在 `/order` 编辑某条记录的"客户订单号"，立刻切到 `/purchase-order-table` 或 `/purchase-registration`（尤其网络较慢或该记录同步曾失败过的情况下），确认该字段不再被清空/回退成旧值；也可以直接检查 FL2684 这条记录目前在两个表里"客户订单号"是否已经一致。

**Status:** completed

## TASK-125：订单状态表新增"编辑订单"弹窗，订单状态标记编辑从编辑询价迁移过来

**状态**：已完成（2026-07-10，本次会话由 Claude 直接实现，未经 Codex）
**日期**：2026-07-10

### 背景

撤销C/悬挂P/善后S + 情况备注这几个字段描述的是"订单本身的状态"，但原来只能在询报价登记的"编辑询价"弹窗里编辑，跟询价阶段的信息（联络人、客户询价编号等）混在一起，概念上不对口，用户在订单状态表里也看不到编辑入口。用户要求把这部分编辑挪到订单状态表，通过点击每一行"订单编号+询价编号"这个原本纯只读的区域弹出"编辑订单"弹窗，弹窗里既展示来自询价的只读信息，也能编辑订单相关字段。

设计阶段跟用户确认了两个关键范围问题：① 弹窗要不要顺带集中编辑订单状态表里已经支持行内点击编辑的其它字段（交货/确认日期/客户订单号/执行情况/金额/回款月份/到账金额）——用户选择"弹窗集中编辑全部订单字段，行内编辑保留"，即弹窗和行内点击编辑并存，不是互斥关系；② 订单编号（orderNo）本身——把询价"转成"订单或撤回——放在哪编辑，用户选择维持现状，仍只在"编辑询价"弹窗编辑。

### 执行记录

- 新建 `src/features/order/components/OrderEditModal.tsx`：弹窗分三块——①"来自询价（只读）"信息卡（订单编号/询价编号/客户询价编号/联络人/内容简述，纯展示，附一行提示"订单编号如需修改或撤回，请在询报价登记表的编辑询价中操作"）；②"订单信息"可编辑区（交货日期/确认日期用 `DateField` 本地组件，文本输入 + 原生日期选择器叠加，逻辑参考 `OrderRow.tsx` 的 `DatePickerCell` 但始终展开、不需要点击激活；客户订单号文本输入；执行情况文本输入 + 复用 `DeliveryStatusCell.tsx` 导出的 `STATUS_PRESETS` 预设按钮 + 收货人下拉；金额/回款月份/到账金额仅 `canViewFinancials` 为真时显示，金额用 `AmountField` 本地组件复刻 `AmountCell` 的货币符号切换+两位小数逻辑）；③"订单状态标记"区（撤销C/悬挂P/善后S 互斥单选 + 情况备注，UI 直接照搬原来在 `InquiryFormModal.tsx` 里的实现）。保存时一次性把这些字段合并成一个 patch 通过 `onSave(id, patch)` 交给上层，日期字段保存前统一走 `normalizeShortDateInput` 加回方括号，跟行内编辑单元格的存储格式保持一致。
- `src/features/order/components/OrderRow.tsx`：新增可选 prop `onOpenEdit`；原来纯展示的"订单编号+询价编号" `<div>` 包一层 `role="button"` + 点击/回车触发 `onOpenEdit(record)`，加 hover 底色提示可点击，`title` 附加"（点击编辑订单）"提示。
- `src/features/order/components/OrderTable.tsx`：新增 `editingRecord` 本地 state，渲染时把 `onOpenEdit={setEditingRecord}` 传给每个 `OrderRow`；表格外层包一层 Fragment，加一个 `<OrderEditModal>` 常驻渲染，`isOpen={editingRecord !== null}`，`onSave` 直接调用外部传入的 `onUpdate(id, patch)`（跟行内编辑走同一个更新函数，最终都落到 `useInquiryStore.updateRecord`）。
- `src/features/inquiry/components/InquiryFormModal.tsx`：移除 `orderSubStatus`/`orderSubStatusRemark` 两个本地 state 和对应的"撤销C/悬挂P/善后S"按钮组 + "情况备注"输入框 UI；保留"订单编号"输入框不变（维持在询价侧编辑的决定）。`handleSubmit` 的 payload 不再主动设置这两个字段（未编辑过的字段不参与 patch，不会覆盖订单状态表那边刚保存的值），只保留一条防御性清理：如果这次提交把订单编号清空（订单撤回成询价）且记录原来有 `orderSubStatus`，才顺带把这两个字段一起清掉，避免撤销/悬挂/善后标记变成看不见的脏数据残留在没有订单号的记录上。原来的"辙销C/悬挂P/善后S"按钮位置替换成一段只读提示文字：有订单号且已有 `orderSubStatus` 时显示"当前订单状态标记：XX，如需修改请在订单状态表中点击该记录编辑"，避免用户在询价弹窗里找不到这几个字段就以为丢失了。
- `src/features/inquiry/types/index.ts` 未改动——`InquiryBasicInput` 仍然保留 `orderSubStatus`/`orderSubStatusRemark` 作为可选字段（用于上面那条防御性清理场景），只是 `InquiryFormModal.tsx` 不再提供编辑 UI，两者是"类型允许传，但这个表单不主动传"的关系。

### Files in scope

- `src/features/order/components/OrderEditModal.tsx`（新增）
- `src/features/order/components/OrderRow.tsx`
- `src/features/order/components/OrderTable.tsx`
- `src/features/inquiry/components/InquiryFormModal.tsx`

### Non-goals / 红线

- 未改动 `src/features/inquiry/types/index.ts` 的字段结构，`InquiryRecord` 上所有相关字段（orderDeliveryDate/orderConfirmDate/orderCustomerNo/orderDeliveryStatus/orderDeliveryConsignee/orderAmount/orderPaymentDate/orderReceivedAmount/orderSubStatus/orderSubStatusRemark）本来就已存在，无需 D1 迁移。
- 未移除订单状态表任何行内单元格点击编辑（交货/确认日期/客户订单号/执行情况/金额/回款月份/到账金额）——弹窗和行内编辑是并存关系，这是设计阶段用户明确选择的范围，不是本次的"重构掉行内编辑"。
- 未改动订单编号（orderNo）的编辑位置——仍然只在"编辑询价"弹窗，"编辑订单"弹窗里订单编号是只读展示。
- 未触碰采购订单表（`PurchaseOrderRow.tsx`/`PurchaseOrderTable.tsx`）——用户这次只提到订单状态表，采购订单表要不要加同样的"编辑订单"弹窗入口是后续可选项，不在本次范围内。
- 未改动批量选择模式（`canBatchEdit`）下的行为——"订单编号+询价编号"单元格在批量模式下依然可以点击打开编辑弹窗，跟其它单元格现有的行内编辑权限保持一致（未额外加权限/模式互斥判断）。

### Verification steps

- `npx tsc --noEmit`、`npx eslint`（四个改动/新增文件）均无输出。
- 未做真实浏览器验证，建议用户实测：① 在订单状态表点击某条记录"订单编号+询价编号"区域，确认弹出"编辑订单"，只读信息区显示的订单编号/询价编号/客户询价编号/联络人/内容简述与该记录一致；② 在弹窗里编辑交货日期/确认日期/客户订单号/执行情况/金额/回款月份/到账金额，保存后确认对应行内单元格同步更新；③ 在弹窗里切换撤销C/悬挂P/善后S 并填写情况备注，保存后确认整行变灰底黑字（撤销）或对应背景色（悬挂/善后），行内客户订单号下方能看到情况备注小字；④ 打开该记录的"编辑询价"弹窗，确认订单编号仍可编辑，撤销/悬挂/善后按钮已消失，改成一行只读提示文字（如果记录当前有状态标记的话）；⑤ 在编辑询价里把订单编号清空保存，确认订单状态表里这条记录消失，且如果之后重新填回同一个订单编号，原来的状态标记不会奇怪地自动复现（因为清空时已经顺带清掉了）。

**Status:** completed

## TASK-126：采购订单表新增"编辑采购订单"弹窗 + 客户订单号列的情况备注只读同步显示

**状态**：已完成（2026-07-10，本次会话由 Claude 直接实现，未经 Codex）
**日期**：2026-07-10

### 背景

TASK-125 给订单状态表加了"编辑订单"弹窗后，用户要求采购订单表也补一个对应的编辑弹窗；同时订单状态表"客户订单号"列第二行会显示撤销C/悬挂P/善后S 的情况备注小字，采购订单表这一列此前没有同步展示这段说明，用户要求也做只读展示（不可编辑——状态标记的编辑入口仍然只在订单状态表）。

### 执行记录

- 新建 `src/features/purchase-order-registration/components/PurchaseOrderEditModal.tsx`，结构参考 `OrderEditModal.tsx` 但字段范围按采购订单表的实际编辑权限收窄：只读信息区展示订单编号/询价编号/客户询价编号/联络人/内容描述/确认日期/客户订单号/订单状态标记（含情况备注），并附一行提示"确认日期、客户订单号、订单状态标记如需修改，请在订单状态表的编辑订单中操作"；可编辑区只有采购订单表本来就允许编辑的字段——采购单号、供应商、采购金额（`canViewFinancials` 权限、¥/$/€ 三态循环切换，逻辑照抄 `PurchaseOrderRow.tsx` 里的 `AmountEditCell`）、交货日期（与订单状态表双向共享字段）、执行情况+收货人（同样双向共享，复用 `STATUS_PRESETS`）。确认日期、客户订单号、撤销/悬挂/善后状态标记及情况备注这几个字段在这个弹窗里从头到尾没有编辑控件，纯文字展示。
- `src/features/purchase-order-registration/components/PurchaseOrderRow.tsx`：新增可选 prop `onOpenEdit`，"订单编号+询价编号"单元格包一层点击/回车触发，写法跟 `OrderRow.tsx` 的对应改动完全一致；新增本地 `getOrderSubStatusRemarkClass`（从 `OrderRow.tsx` 抄一份，项目里 Order/PurchaseOrder 两套组件本来就是独立实现，不共享）；"客户订单号"单元格内部包一层 flex 纵向布局，第二行加情况备注（`record.orderSubStatusRemark`，仅在 `record.orderSubStatus` 存在且备注非空时显示），文字大小/颜色/截断逻辑与订单状态表 `OrderRow.tsx` 对应单元格完全一致，只是这里没有 `EditableCell`，客户订单号本身还是原来的 `ReadOnlyText`。
- `src/features/purchase-order-registration/components/PurchaseOrderTable.tsx`：新增 `editingRecord` state，渲染 `<PurchaseOrderEditModal>`，把 `onOpenEdit={setEditingRecord}` 传给每个 `PurchaseOrderRow`，`onSave` 直接调用外部 `onUpdate(id, patch)`，跟订单状态表的接法一致。

### Files in scope

- `src/features/purchase-order-registration/components/PurchaseOrderEditModal.tsx`（新增）
- `src/features/purchase-order-registration/components/PurchaseOrderRow.tsx`
- `src/features/purchase-order-registration/components/PurchaseOrderTable.tsx`

### Non-goals / 红线

- 弹窗里确认日期、客户订单号、撤销C/悬挂P/善后S + 情况备注均为只读，未在采购订单表新增这几个字段的编辑能力——这几个字段本来就规定只在订单状态表编辑（见 `InquiryRecord` 类型注释和 TASK-125），本次只是把"情况备注"这一小段文字的**展示**同步到采购订单表，不涉及编辑权限变化。
- 未改动交货日期/执行情况这两个双向共享字段的既有编辑逻辑，只是在弹窗里多提供一个编辑入口，行内点击编辑保留、并存（与 TASK-125 保持同一设计原则）。
- 未联动修改订单状态表任何文件。

### Verification steps

- `npx tsc --noEmit`、`npx eslint`（三个改动/新增文件）均无输出。
- 建议用户实测：① 采购订单表点击"订单编号+询价编号"区域，确认弹出"编辑采购订单"，只读信息区的确认日期/客户订单号/订单状态标记与订单状态表同一条记录一致；② 编辑采购单号/供应商/采购金额/交货日期/执行情况保存后，确认对应行内单元格同步更新；③ 找一条在订单状态表标了撤销/悬挂/善后并填了情况备注的记录，确认采购订单表"客户订单号"列下方能看到同一段备注文字（中屏及以下该列隐藏时自然也看不到备注，属预期，与客户订单号列的显隐规则一致）。

**Status:** completed

## TASK-127：采购订单表补齐"备货/交货/发票"执行情况颜色，与订单状态表同步

**状态**：已完成（2026-07-10，本次会话由 Claude 直接实现，未经 Codex）
**日期**：2026-07-10

### 背景

用户反馈采购订单表里备货/交货/发票几种执行情况对应的记录颜色没有跟订单状态表同步。排查发现 `getRowTextClass`/`getRowBgClass` 这两个颜色判定函数在 `PurchaseOrderRow.tsx` 和 `OrderRow.tsx` 里本来就是逐字一致的实现（TASK-121/TASK-124 之前就已核对过），根因不在颜色判定逻辑，而在于套用：`PurchaseOrderRow.tsx` 里"采购单号"（`EditableText`）、"供应商"（`EditableText`）、"金额"（`AmountEditCell`）这三个单元格调用时漏传了 `textClassName={rowTextClass}`，实际渲染用的是各自组件的默认灰色（`text-gray-800`），跟同一行"交货日期""执行情况"两个有传 `textClassName` 的单元格颜色对不上，也跟订单状态表 `OrderRow.tsx` 里所有单元格统一传 `rowTextClass` 的做法不一致。

### 执行记录

- `src/features/purchase-order-registration/components/PurchaseOrderRow.tsx`：给"采购单号"的 `EditableText`、"供应商"的 `EditableText`、"金额"的 `AmountEditCell` 三处调用补上 `textClassName={rowTextClass}`，跟"交货日期"（`DateEditCell`）、"执行情况"（`DeliveryStatusCell`）保持一致，行内所有可编辑字段现在统一跟随 `getRowTextClass` 的判定结果（备货/其它自由文本=粉色，交货=蓝色，发票=黑色，撤销订单=统一黑色）。

### Files in scope

- `src/features/purchase-order-registration/components/PurchaseOrderRow.tsx`

### Non-goals / 红线

- 未改动 `getRowTextClass`/`getRowBgClass` 判定逻辑本身——这两个函数在 Order/PurchaseOrder 两边一直是一致的，问题只在个别单元格没接上判定结果。
- 未改动"内容描述"单元格和"订单编号+询价编号"单元格的颜色处理——这两处本来就已经传了 `rowTextClass`。
- 未改动只读字段（确认日期、客户订单号）的颜色——这两个字段本来就用固定的 `ReadOnlyText` 灰色展示，不跟随执行情况变色，订单状态表那边对应的只读展示逻辑也是如此。

### Verification steps

- `npx tsc --noEmit`、`npx eslint`（该文件）均无输出。
- 建议用户实测：找同一条记录分别在订单状态表和采购订单表对比，执行情况为"备货"（或任意非"交货/发票"开头的自由文本）时两边都应是粉色，"交货..."开头时两边都是蓝色，"发票..."开头时两边都是黑色；采购订单表里"采购单号""供应商""金额"这三列现在应该也跟着变成同样的颜色，而不是一直显示默认灰色。

**Status:** completed

## TASK-128：询报价同步改为增量拉取，修复 Vercel Fluid CPU 逼近月度上限

**状态**：已完成（2026-07-10，本次会话由 Claude 直接实现，未经 Codex）
**日期**：2026-07-10
**背景来源**：用户反馈 Vercel Hobby 项目月度 Fluid Active CPU 用量 3h54m/4h（已接近上限），排查后定位到根因在询报价同步逻辑，非 PDF/图片/Excel 处理。

### 背景

`useInquirySync`（`src/features/inquiry/hooks/useInquirySync.ts`）目前被 4 个页面使用：`InquiryPage.tsx`（询报价登记，`mergeLocal:true`）、`OrderPage.tsx`（订单状态表，`mergeLocal:true`）、`PurchaseRegistrationPage.tsx`（采购部登记，`pushLocal:false mergeLocal:false`）、`PurchaseOrderRegistrationPage.tsx`（采购订单表，`pushLocal:false mergeLocal:false`）。每个打开的页面每 30 秒轮询一次 `GET /api/inquiry/meta`（count + maxUpdatedAt），只要这个值变化（即"任何人改了任何一条询报价记录"），就会对**这张表的全部记录**发起一次全量拉取（`inquiryService.pullFromD1()`，`src/worker.ts` 的 `GET /api/inquiry` 完全不支持增量参数，只能整表返回），而且不管有没有变化，每 5 分钟还会强制整表重新同步一次。

协作编辑越密集，级联效应越明显：多人同时改询报价的时段，每次编辑都会在 30 秒窗口内让所有打开着这 4 个页面的客户端一起触发整表拉取（每次响应体是全部询报价记录的 JSON，在 Vercel 的 `/api/inquiry` 代理路由里还要做一次 `JSON.parse` + 受限视图的逐条字段过滤），这是 Vercel 侧 40.9 万次/月调用和"特定几天 CPU 飙升"最直接的成因。

本任务把"整表轮询"改成"增量拉取"：客户端记住上次同步到的服务端时间戳（`meta.maxUpdatedAt`），下次同步时只让 Worker 返回这之后变化过的记录，而不是每次都要回整张表。

这跟仓库里已有的三个询报价同步 bug 记录是同一套代码路径，实现时必须保住它们已经修好的行为，不能开倒车：
- `bug_inquiry_sync_phantom_records`（fire-and-forget 同步静默失败，不能把本地独有、未入队的记录误推到 D1）
- `bug_inquiry_restricted_view_cache_corruption`（受限视图字段被裁剪的响应，绝不能整条覆盖共享 `inquiry_records` 缓存，必须字段级合并）
- `bug_inquiry_merge_pending_protection` / TASK-124（`mergeFieldsOnly` 必须跳过有 pending 同步操作的记录，不能用 D1 的旧值把刚编辑、还没同步成功的字段冲掉）

### Files in scope

- `src/worker.ts`（`handleInquiryRequest` 里 `GET /api/inquiry` 分支，约 1548-1586 行）——加 `since` 查询参数支持
- `src/features/inquiry/services/inquiry.service.ts`——`pullFromD1` 加 `since` 参数；`mergeFieldsOnly` 改写为 Map-based upsert（不再是"以 d1Records 为源、缺席即丢弃"的管道）
- `src/features/inquiry/hooks/useInquirySync.ts`——拆分"全量同步"与"增量同步"两条路径，维护同步水位（watermark）

### 具体改动要求

**1. `src/worker.ts` — `GET /api/inquiry` 支持 `since`**

在现有 `limit`/`offset` 之外读取 `since = url.searchParams.get('since')`。校验：`since` 存在且 `!Number.isNaN(Date.parse(since))` 才生效，否则按"无 since"处理（不要因为参数非法就报错/500）。生效时把 `AND updated_at >= ?` 拼进现有 WHERE（在 `(status = 'active' OR updated_at >= datetime('now', '-30 days'))` 后面追加，用 `>=` 不用 `>`——增量拉取用的是上次已知的服务端 `maxUpdatedAt` 做水位，用 `>=` 允许水位这一刻的记录被重复带回来，客户端合并是按 id upsert 的幂等操作，重复带回无害，但用 `>` 会在同一 updated_at 精度内有并发写入时丢记录）。这个 `since` 绑定要同时用在**COUNT 查询和 SELECT 查询**，两处绑定参数顺序必须一致（`since` 在前，`limit, offset` 在后）。不传 `since` 时的行为必须和现在完全一样（回归保护）。

**2. `src/features/inquiry/services/inquiry.service.ts` — `pullFromD1`**

签名改为 `pullFromD1(since?: string): Promise<InquiryRecord[]>`，每一页请求都带上 `since`（有值时）：`` `${API_BASE}?limit=${PAGE_SIZE}&offset=${offset}${since ? `&since=${encodeURIComponent(since)}` : ''}` ``。分页/总数判断逻辑不变。

**3. `src/features/inquiry/services/inquiry.service.ts` — `mergeFieldsOnly` 改写**

当前实现是纯管道 `d1Records.filter().map().concat(pending本地版本)`，返回值**只包含这次响应里出现过的记录**——这在"每次都是整表"的前提下没问题（缺席=D1 没有=已删除），但增量拉取下"缺席"只代表"这条没变化"，不代表"不存在"，如果不改会导致采购部登记/采购订单表这两个页面在增量同步后，列表里只剩本次变化过的那几条记录，其余全部消失。

改成跟 `mergeFromD1` 同样的 Map-based upsert 模式（`mergeFromD1` 本身已经是这个模式，不需要改）：

```ts
mergeFieldsOnly(d1Records: InquiryRecord[]): InquiryRecord[] {
  const local = this.getAll();
  const localMap = new Map(local.map((record) => [record.id, record]));
  const pendingIds = this.getPendingSyncIds();

  for (const d1Record of d1Records) {
    if (pendingIds.has(d1Record.id)) continue; // TASK-124 保护：有 pending 操作的记录不参与字段合并
    if (d1Record.status === 'deleted') {
      localMap.delete(d1Record.id);
      continue;
    }
    const localRecord = localMap.get(d1Record.id);
    localMap.set(d1Record.id, localRecord ? { ...localRecord, ...d1Record } : d1Record);
  }

  return Array.from(localMap.values())
    .filter((record) => record.status !== 'deleted')
    .sort((a, b) => b.inquiryNo.localeCompare(a.inquiryNo));
}
```

行为对照：TASK-124 的 pending 保护语义不变（有 pending 操作的记录保留本地版本，不被 d1Record 覆盖——现在是"跳过合并，localMap 里保留原样"而不是"从管道里 filter 掉再 concat 回来"，效果一致）；`bug_inquiry_restricted_view_cache_corruption` 的字段级合并语义不变（`{...localRecord, ...d1Record}`，只覆盖 d1Record 真正带回来的字段）；新增行为是"不在 d1Records 里的本地记录默认保留"（增量拉取的必要条件），删除信号从"filter 掉、管道里消失"改成"显式 `localMap.delete`"。

**4. `src/features/inquiry/hooks/useInquirySync.ts` — 拆分全量/增量同步**

- `POLL_INTERVAL_MS` 从 `30_000` 调到 `60_000`。
- `FORCE_FULL_SYNC_EVERY_MS` 从 `5 * 60_000` 调到 `60 * 60_000`（1 小时）——增量同步已经能在检测到变化时即时更新，这个定时全量不再是"防止漏更新"的主力机制，只是兜底自愈（防御未知边界情况/时钟问题），所以间隔可以大幅拉长。
- 新增一个 ref 记录同步水位，例如 `const syncWatermarkRef = useRef<string | null>(null)`，初始为 `null`（未同步过，下一次必须走全量）。
- `fullSync()`（保留现名，代表真正整表拉取的路径）在成功后把 `syncWatermarkRef.current` 设为**这次拿到的 `meta.maxUpdatedAt`**（用服务端时间，不要用本地 `Date.now()`/`new Date().toISOString()`，避免客户端时钟偏移导致水位比服务端记录的 updatedAt 还早/晚，进而漏拉或重复拉整表）。
- 新增 `incrementalSync()`：调用 `inquiryService.pullFromD1(syncWatermarkRef.current ?? undefined)`（水位为空时等同全量，理论上不会发生，因为首次一定走 `fullSync()`，但保留兜底），**不调用 `pushLocalToD1`**（无论 `pushLocal` 是否为 true——`pushLocalToD1` 是"拿完整 D1 记录集对比本地哪些没同步"的逻辑，喂给它一个增量结果集会导致每个本次没变化、没有 pending 操作的本地记录都被判定为"D1 里找不到"，从而在每个增量周期里对着完全正常的记录刷 `console.warn` 噪音——这个检测只在真正拿到全表时才有意义，增量周期跳过即可，不算功能回归，因为真正需要"推本地独有记录"的 pending 记录不受影响，见下方 pushLocalToD1 现有逻辑），走 `mergeLocal ? mergeFromD1(d1Records) : mergeFieldsOnly(d1Records)`（两者现在都是 delta-safe），成功后把 `syncWatermarkRef.current` 更新为这次 `meta.maxUpdatedAt`。
- `checkAndMaybeSync()`：`metaProbeFailed || forceFullSync` 时仍然走 `fullSync()`（整表 + 按 `pushLocal` 决定要不要 `pushLocalToD1`，逻辑不变）；`metaKey !== lastMetaRef.current` 且不需要强制全量时，改走 `incrementalSync()`，不再调用 `fullSync()`。
- Hook 对外的入参/返回值（`enabled/suspended/pushLocal/mergeLocal` → `{ lastSyncedAt, syncStatus }`）不变，4 个调用方（`InquiryPage.tsx`/`OrderPage.tsx`/`PurchaseRegistrationPage.tsx`/`PurchaseOrderRegistrationPage.tsx`）不需要改动。

### Non-goals / 红线

- 不改动 `mergeFromD1`——它已经是 Map-based upsert，天然支持增量结果集，不需要改代码，只是它接收到的参数会从"整表"变成有时是"增量"。
- 不改动 pending 队列相关逻辑（`enqueueSync`/`compactWithNewOp`/`executeSyncOp`/`flushPendingSyncs`/`patchInD1`/`syncToD1`/`updateInD1`/`deleteFromD1`）——`incrementalSync()` 仍然要在同步前调用 `flushPendingSyncs()`，跟现在 `fullSync()` 的第一步一致，不要省略。
- 不改动 `app/api/inquiry/[[...path]]/route.ts`（Vercel 代理层）——它已经是 `${WORKER_BASE}${workerPath}${url.search}` 透传全部 query string，`since` 会自动带过去，不需要改代码；实现时确认一下这一点即可，不要额外加逻辑。
- 不改动 `/api/inquiry/meta`、`GET /api/inquiry/:id`、POST/PUT/DELETE 分支。
- 不改动 `customers`/`documents`/`admin` 这几个其它代理路由和它们对应的 Worker handler——本次只处理询报价这一条同步路径。
- 不改动 `PAGE_SIZE`（2000）本身的分页机制。
- 不新增/修改 `DELETED_KEY`（`inquiry_deleted_ids`）相关逻辑——`mergeFieldsOnly` 的删除处理走 `localMap.delete`，跟 `mergeFromD1` 不同，`mergeFromD1` 那边的 `deletedIds` 记账逻辑不用照搬过来，两者删除防护的场景不同（`mergeFieldsOnly` 对应的页面 `pushLocal:false`，没有"本地新建/编辑还没同步、可能被误判删除"的场景）。

### 验收标准

- 首次进入询报价登记/订单状态表/采购部登记/采购订单表任意一个页面，行为不变：一次性拉到完整数据（走 `fullSync()`，水位为空）。
- 复现 TASK-124 场景：在 `/order` 编辑某条记录的"客户订单号"，该 PUT 还在排队/未完成时立刻切到 `/purchase-order-table` 或 `/purchase-registration`，等待或触发一次增量同步后，确认该字段值不被回退成旧值（即 pending 保护在增量路径下依然生效）。
- 复现"字段裁剪不冲掉缓存"场景：受限视图页面（采购部登记）触发一次增量同步后，检查其它页面（询报价登记）里同一条记录的 `quotedStatuses` 等受限视图不返回的字段没有丢失。
- 新增场景：A 设备在 `/inquiry` 新增/编辑一条记录，B 设备已经打开 `/order` 且本地已有其余全部历史记录，等 B 设备下一次 30-90 秒周期内的 meta 轮询检测到变化后，B 设备的 `useInquiryStore.records` 里应该：新记录/被编辑记录的值正确更新，**且其余历史记录不会凭空消失**（验证 `mergeFieldsOnly` 改写和增量路径没有把"没在这次响应里"的记录误删）。
- 用浏览器 Network 面板确认：稳态下（没有新增/编辑发生时）增量同步请求 `GET /api/inquiry?...&since=...` 返回的 `records` 数组明显小于全表条数（理想情况下为空或只有个位数条目），而不是每次都回全表。
- 建议给 `mergeFieldsOnly` 补一个 Jest 单测（`src/features/inquiry/services/__tests__/inquiry.service.test.ts`，当前该文件不存在），覆盖：(a) 增量结果不包含的本地记录被保留；(b) `status:'deleted'` 的记录被从结果里移除；(c) 有 pending 操作的记录不被 d1Record 覆盖。这个函数过去半年已经因为类似的边界问题出过两次线上 bug（TASK-124、受限视图缓存崩溃），目前完全没有自动化测试覆盖。

### Verification steps

- `npx tsc --noEmit` 通过
- `npx eslint src/worker.ts src/features/inquiry/services/inquiry.service.ts src/features/inquiry/hooks/useInquirySync.ts` 无输出
- `npm test -- inquiry.service` （如按验收标准补了单测）通过
- 手动走一遍上面"验收标准"里列的 4 个复现场景
- 部署后观察 1-2 天 Vercel 后台的 Function Invocations 和 Active CPU 曲线，确认协作编辑高峰时段不再出现整表级联拉取导致的尖峰（这一步无法在开发环境验证，记录为部署后待观察项）

### 执行记录

- `src/worker.ts`：`GET /api/inquiry` 加 `since` 参数（校验 `Date.parse` 合法性，非法/缺失按无 since 处理），拼进 COUNT 和 SELECT 两条查询的 WHERE，绑定参数顺序保持一致（`since` 在前，`limit/offset` 在后）；不传 `since` 时行为与改动前完全一致。
- `src/features/inquiry/services/inquiry.service.ts`：`pullFromD1` 加可选 `since` 参数，逐页请求带上；`mergeFieldsOnly` 从"以 d1Records 为源的 filter/map 管道"改写为 Map-based upsert（跟 `mergeFromD1` 同一模式），不在响应里出现的本地记录默认保留，`status:'deleted'` 走 `localMap.delete` 显式移除，TASK-124 的 pending 保护改成"跳过合并、保留 localMap 原值"，字段级合并语义不变。`mergeFromD1` 本身未改动——它已经是 Map-based upsert，天然对增量结果集安全。
- `src/features/inquiry/hooks/useInquirySync.ts`：`POLL_INTERVAL_MS` 30s→60s，`FORCE_FULL_SYNC_EVERY_MS` 5min→60min；新增 `syncWatermarkRef`（存服务端 `meta.maxUpdatedAt`，不用本地时钟）；`fullSync` 保留原逻辑（整表 + `pushLocalToD1`），新增 `incrementalSync`（用水位增量拉取，不调用 `pushLocalToD1`，避免把"这次没变化、没有 pending 操作的本地记录"误判成"D1 里找不到"而刷警告）；`checkAndMaybeSync` 改为：探测失败或到了强制整表兜底周期走 `fullSync`，否则 meta 变化走 `incrementalSync`。Hook 对外签名和 4 个调用方（`InquiryPage`/`OrderPage`/`PurchaseRegistrationPage`/`PurchaseOrderRegistrationPage`）均未改动。
- `src/features/inquiry/services/__tests__/inquiry.service.test.ts`（已存在，追加而非新建）：新增 `describe('inquiryService.mergeFieldsOnly (TASK-128)')`，覆盖增量结果保留未出现记录、软删除移除、pending 保护、字段级合并四种场景，未改动文件里原有的 pending 队列测试。

### Files in scope

- `src/worker.ts`
- `src/features/inquiry/services/inquiry.service.ts`
- `src/features/inquiry/hooks/useInquirySync.ts`
- `src/features/inquiry/services/__tests__/inquiry.service.test.ts`

### Verification steps

- `npx tsc --noEmit` 通过。
- `npx eslint` 对上述四个改动文件无输出。
- `npx jest inquiry.service` 通过，9/9（5 条既有 pending 队列测试 + 4 条新增 `mergeFieldsOnly` 测试）。
- 未做：部署后观察 Vercel 后台 Function Invocations / Active CPU 曲线（需要真实生产流量，记录为部署后待观察项，不在本次会话验证范围内）。
- 建议用户实测：在 `/order` 编辑某条记录的字段后立刻切到 `/purchase-order-table`，确认编辑没被同步周期冲掉（TASK-124 场景在增量路径下依然成立）；多设备协作编辑时用浏览器 Network 面板确认稳态下的同步请求体明显变小，不再是每次都回整表。

**Status:** completed

## TASK-129：7 个 PDF 生成器加 `compress: true`，降低文件体积

**状态**：已完成（2026-07-10，本次会话由 Claude 直接实现，未经 Codex）
**日期**：2026-07-10
**背景来源**：用户反馈"现在每个生成的文件都有 600K 左右"，要求分析最佳可控文件大小。

### 背景

TASK-106/107 已经把表头从整张横幅图（`header-bilingual.jpg` ~92KB / `header-english.png` ~24KB）换成 logo 图标+矢量文字（~13KB），并确认 `putOnlyUsedFonts` 选项差异只有 2.2KB、不是体积瓶颈（当时的测试场景没有实际用到粗体）。这两个任务完成后用户仍然反馈单份 PDF 在 ~600KB 左右，说明真正的瓶颈没有被排除。

用沙箱内独立 jsPDF 2.5.2 复现脚本（与真实 `invoicePdfGenerator.ts` 一致的用法：同时注册 `NotoSansSC-Regular.ttf`/`NotoSansSC-Bold.ttf` 两个完整字体文件，且文字内容里真的切换过 `bold`，因为发票/报价单的金额合计、表头等确实用粗体）测出：

| 配置 | 体积 |
|---|---|
| `putOnlyUsedFonts:true`，无 `compress` | 545.1 KB（与用户反馈的"~600K"吻合） |
| `putOnlyUsedFonts:true` + `compress:true` | 98.7 KB |

只加一个 `compress:true`（jsPDF 内置基于 pako 的标准 PDF 流压缩，字体/内容流按 FlateDecode 压缩，所有 PDF 阅读器原生支持，不影响字体渲染或图片内容），体积降了约 82%。这是 TASK-106 里没有测试过的选项（TASK-106 只排除了 `putOnlyUsedFonts`），风险低、改动小。

### Files in scope

- `src/utils/invoicePdfGenerator.ts`（约 151-157 行，`new jsPDF({...})`）——已有 `putOnlyUsedFonts`/`floatPrecision`，补 `compress: true`
- `src/utils/quotationPdfGenerator.ts`（约第 75 行，`new jsPDF()` 无参数）——补整个 options 对象：`{ orientation: 'portrait', unit: 'mm', format: 'a4', putOnlyUsedFonts: true, floatPrecision: 16, compress: true }`（原来完全没传 options，等于全部用 jsPDF 默认值，顺带把 `putOnlyUsedFonts` 也一起补上，跟其它生成器保持一致）
- `src/utils/domesticQuotationPdfGenerator.ts`（约第 377 行）——现有 options 里补 `putOnlyUsedFonts: true, compress: true`
- `src/utils/purchasePdfGenerator.ts`（约 58-62 行）——现有 options 里补 `putOnlyUsedFonts: true, compress: true`
- `src/utils/packingPdfGenerator.ts`（约 194-200 行）——已有 `putOnlyUsedFonts`/`floatPrecision`，补 `compress: true`
- `src/utils/shippingMarksPdfGenerator.ts`（约 24-30 行）——已有 `putOnlyUsedFonts`/`floatPrecision`，补 `compress: true`
- `src/utils/orderConfirmationPdfGenerator.ts`（约 82-88 行）——已有 `putOnlyUsedFonts`/`floatPrecision`，补 `compress: true`

### Acceptance criteria

- 7 个生成器的 `new jsPDF({...})` 调用都带上 `compress: true`。
- `quotationPdfGenerator.ts`/`domesticQuotationPdfGenerator.ts`/`purchasePdfGenerator.ts` 顺带补上缺失的 `putOnlyUsedFonts: true`（不改变现有 `floatPrecision`/`orientation`/`unit`/`format` 等已有参数取值）。
- 不改变任何视觉排版、字体、表头逻辑、印章图片——纯粹是 jsPDF 构造参数改动。
- 生成流程（`ensurePdfFont`/`registerChineseFonts`/`autoTable`/`addImage` 调用顺序）不变。

### Non-goals / 红线

- 不做字形子集化（只嵌入实际用到的汉字），那是更大的改造（需要 fontkit/subset-font），本任务只做 `compress:true` 这一层。
- 不改动 TASK-106/107 已经做完的 logo 表头逻辑（`pdfHeaderBlock.ts`/`companyLetterhead.ts`）。
- 不改动字体文件本身（`public/fonts/NotoSansSC-*.ttf(.gz)`、`src/lib/embedded-resources.ts`）。
- 不改动 `pdfFontHealthcheck.ts`（诊断工具，本来就已经是 `compress:true`，不受影响）。

### 执行记录

- 7 个文件的 `new jsPDF({...})` 全部加了 `compress: true`；`quotationPdfGenerator.ts`（原来 `new jsPDF()` 完全没传参）、`domesticQuotationPdfGenerator.ts`、`purchasePdfGenerator.ts`（原来都没有 `putOnlyUsedFonts`）顺带补上了 `putOnlyUsedFonts: true`，其余已有的 `orientation`/`unit`/`format`/`floatPrecision` 取值一律保留不变。
- 未改动表头、字体注册、`autoTable`、印章图片等任何业务逻辑，只动了 jsPDF 构造参数。

### 验证

- `npx tsc --noEmit`（全项目）通过。
- `npx eslint`（7 个改动文件）无输出。
- 沙箱内用真实字体文件（`public/fonts/NotoSansSC-Regular.ttf`/`Bold.ttf`）+ jsPDF 2.5.2 复现一份跟 `invoicePdfGenerator.ts` 用法一致、真的切换过粗体的模拟发票：`putOnlyUsedFonts:true` 无 `compress` 时 545.1KB，加 `compress:true` 后 98.7KB，降幅约 82%（与本次改动前的诊断结论一致）。
- **待用户验证**：在真实环境分别生成一份发票/报价单/内销合同/采购单/装箱单/唛头/销售确认 PDF，确认能正常打开、内容和排版无变化，且体积明显下降（预期从 ~600KB 降到 100~150KB 区间，具体数值取决于每份单据实际的表格行数/条款长度）。

## TASK-130：销售确认书印章"挤压覆盖文字"改为印章在文字下方

**状态**：已完成（2026-07-10，本次会话由 Claude 直接实现，未经 Codex）
**日期**：2026-07-10
**背景来源**：用户发来一份"SALES CONFIRMATION"截图——Notes 条款很长时，印章会挤进已经画完的文字区域，且看起来印章盖住了文字。用户明确要求：这种"印章与文字重叠以省一页"的效果本身是他想要的（"这效果挺好"），但必须保证重叠时印章在文字下方、文字始终在印章上层可读。

### 背景

`orderConfirmationPdfGenerator.ts` 里印章一共有 3 处放置逻辑，前两处已经是"印章先画、文字后画"的正确顺序：

1. `stampWillBeAlone` 分支（约 461-491 行）：内容能放进当前页但加上印章放不下时，印章提前画在 Notes/Bank/PaymentTerms **之前**，文字随后正常绘制、天然盖在印章上层——顺序正确。
2. 3 处正常情况（远早于印章挤压场景）不涉及重叠。

但还有 2 处是"文字已经画完、印章再挤进来"，顺序刚好反过来（印章在文字之上）：

3. 约 779-800 行：Notes/Bank/PaymentTerms **全部画完之后**才检查剩余空间，若不够，`adjustedY = currentY - stampHeight - 20`，把印章画到已经画完的文字区域——此时 `doc.addImage` 晚于文字的 `doc.text`，印章盖住文字。
4. 约 803-836 行"正常情况"分支内部，`stampY + stampHeight > pageBottom` 且 `currentY > margin + 20` 时同样会 `stampY = Math.max(margin + 50, currentY - stampHeight - 20)`，同样的挤压覆盖问题。

用户截图里 Notes 条款异常长（远超单页），触发的正是第 3 处。jsPDF 是顺序绘制模型（谁后画谁盖住先画的重叠区域），只要文字已经先画完，就没有办法把印章"插队"到文字下面——除非在印章画完之后，把落在印章范围内的文字重新画一遍盖回印章上层。

### 修复方案

不删除"重叠省页"的效果（用户明确要保留），而是保证重叠时的层级正确：

- 新增 `contentTextRuns` 数组 + `emitText()` 包装函数：Notes、Bank Information、Payment Terms 三段的每一次 `doc.text()` 调用改用 `emitText()`，除了正常绘制文字，同时记录 `{text, x, y, page, fontName, fontStyle, fontSize, color}`（`doc.getFont()`/`getFontSize()`/`getTextColor()` 都是 jsPDF 2.5.2 原生支持的方法，已用沙箱脚本验证过 `getTextColor()` 返回的十六进制颜色可以直接传回 `setTextColor()` 还原）。
- 新增 `redrawTextOverStamp(stampPage, stampY, stampHeight)`：在印章 `addImage` 之后调用，找出 `contentTextRuns` 里跟印章同一页、且 y 坐标落在印章 `[stampY-1, stampY+stampHeight+1]` 范围内的记录，按记录下来的字体/字号/颜色原样重新 `doc.text()` 一遍，画完后把 `doc.setFont`/`setFontSize`/`setTextColor` 恢复成重画前的状态（避免影响后面的页码等内容）。
- 在两处挤压分支（779-800 行的 `adjustedY`、803-836 行嵌套的 `stampY = Math.max(...)`）的 `doc.addImage()` 之后，各插入一次 `redrawTextOverStamp()` 调用。
- 不改动第 1 处已经正确的 `stampWillBeAlone` 提前放置逻辑。

### Files in scope

- `src/utils/orderConfirmationPdfGenerator.ts`——新增 `contentTextRuns`/`emitText`/`redrawTextOverStamp`（约 checkAndAddPage 定义之后）；Notes（约 511/532/536 行）、Bank Information（约 556/569/571 行）、Payment Terms（约 599/612/632/636/640/656/660/664/685/690/702/720/724/728/748/752/756 行，约 20 处）的 `doc.text()` 改为 `emitText()`；两处挤压分支各插入 `redrawTextOverStamp()` 调用。

### Acceptance criteria

- Notes 很长导致印章挤进已画文字区域时，文字在印章之上清晰可读（不再被印章盖住）。
- `stampWillBeAlone` 提前放置场景（印章在文字之前画）视觉效果不变。
- 正常情况（印章画在空白区、不重叠）视觉效果不变。
- 不影响页码、印章本身透明度（0.9）等其它现有行为。

### Non-goals / 红线

- 不删除"印章与文字重叠以省一页"的效果本身——这是用户明确要保留的。
- 不改动 `domesticQuotationPdfGenerator.ts` 里类似的印章叠加供需方表格文字的逻辑（那是故意用透明度模拟盖章效果、不是本次截图反馈的场景），除非用户后续单独要求。
- 不改动印章图片本身（`shanghaiStamp`/`hongkongStamp`）、印章透明度数值。
- 不改动 Notes/Bank/PaymentTerms 的分页、换行、字号压缩等既有排版逻辑，只是把绘制文字的方式从直接 `doc.text()` 改成"画 + 记录位置"的 `emitText()`，视觉结果不变。

### 执行记录

- `src/utils/orderConfirmationPdfGenerator.ts`：`ExtendedJsPDF` 类型补了 `getFont`/`getFontSize`/`getTextColor`（项目用的 `@types/jspdf` 没收录这几个方法，但 jsPDF 2.5.2 运行时支持，用沙箱脚本验证过 `getTextColor()` 返回的十六进制颜色能直接传回 `setTextColor()` 还原，做法跟 TASK-108 补 `getLineHeightFactor`/`setLineHeightFactor` 是同一惯例）。
- 新增 `contentTextRuns`/`emitText`/`redrawTextOverStamp` 三个局部辅助（`checkAndAddPage` 定义之后）。
- Notes（3 处）、Bank Information（3 处）、Payment Terms（14 处，含单条款/多条款两种布局分支）共 20 处 `doc.text()` 改为 `emitText()`。
- 两处印章挤压分支（`adjustedY` 分支、"正常情况"分支内 `stampY + stampHeight > pageBottom` 且当前页有内容时的嵌套挤压子分支）的 `doc.addImage()` 之后各插入一次 `redrawTextOverStamp()` 调用；后者额外加了 `stampOverlapsContent` 标志，只在真正发生挤压重叠时才触发重画，正常不重叠的路径（新开一页、印章画在空白区）不受影响。
- 未改动 `stampWillBeAlone` 提前放置分支（本来就是印章先画、文字后画，顺序已经正确）。

### 验证

- `npx tsc --noEmit`（全项目）通过。
- `npx eslint src/utils/orderConfirmationPdfGenerator.ts` 无输出。
- 沙箱内写了一份独立复现脚本：不引入 Next.js 路径别名/浏览器环境依赖，直接用 jsPDF + 项目里新增的 `emitText`/`redrawTextOverStamp` 同一套逻辑（逐字复制），画 12 行模拟 Notes 文字，再在文字中段画一个半透明蓝底红圈的色块模拟印章（验证的是"绘制顺序 + 透明度合成"这个通用机制，不依赖印章图片具体内容）。对比两份 PDF 用 `pdftoppm` 渲染成 PNG：未修复版本里被色块覆盖的第 7-11 行文字明显被冲淡、难以辨认；修复版本里同样被色块覆盖的文字保持跟其它行一样清晰的黑色实色，印章视觉上确实"沉"到了文字下层。
- **待用户验证**：在真实环境生成一份 Notes 很长、会触发印章挤压重叠的销售确认书 PDF，确认印章挤压场景下所有文字（含 Bank Info/Payment Terms 如果恰好是挤压时的最后内容）清晰可读，且印章本身视觉效果（透明度、位置）与之前一致。

## TASK-131：产品购销合同（内销合同）印章"偏下"——从底边锚点改为顶边锚点

**状态**：已完成（2026-07-10，本次会话由 Claude 直接实现，未经 Codex）
**日期**：2026-07-10
**背景来源**：用户发来一份"产品购销合同"截图——供需方信息表里印章位置明显偏下，圆章大半跑到表格边框外面的空白区域，没有压在"单位名称(章)"公司名那一行上。用户同时重申：印章要在文字下方（TASK-130 的同一要求）。

### 背景

`domesticQuotationPdfGenerator.ts` 的 `drawPartyTable()`（约 223-365 行）原来的印章定位公式：

```ts
const stampY = Math.max(y + 10, finalY - stampHeight - 4);
```

这是"按表格底边往上量"的锚点，写这行代码时对应的是 TASK-108 之前"单位名称(章)"单独占一行的旧版表格。TASK-108 把供需双方信息表从 7 行拆分表合并成 1 行 2 列（6 项信息用 `\n` 堆进同一个单元格，"单位名称(章)"只是这个单元格的第一行），但没有同步更新印章定位公式，导致两个问题（用沙箱按截图里的真实数据——供方姓名/地址/电话有值、需方全空——复现验证过）：

1. **锚点跟着单元格总高度走**：字段越多、单元格越高，`finalY`（表格底边）越往下，印章就被推得越靠下，容易盖到"纳税人识别号"这类末尾字段而不是公司名。
2. **`y + 10` 下限在单元格矮的时候反而帮倒忙**：这次截图对应的场景里，供方内容不算多（公司名、地址、电话各占约 1 行，需方全空），整张表格只有约 25mm 高，但上海印章尺寸是 34×34mm——本身就比这行矮的表格高。旧公式在这种情况下会算出 `stampY` 比表格底边还低，实测印章底边越出表格边框约 19mm，看起来章大半悬空在表格外面，就是用户截图里的"偏下"。

### 修复方案

`src/utils/domesticQuotationPdfGenerator.ts`（约 353-361 行）：

```ts
const stampY = Math.max(y - 2, Math.min(y + cellPadding - 2, pageBottom - stampHeight));
```

改成"按表格顶边往下量"：优先把印章顶部贴在单元格顶部内侧（`y + cellPadding - 2`，正好压住"单位名称(章)"这一行），跟单元格总高度解耦——不管后面堆了几项信息，印章始终锚定在公司名那一行附近。印章物理尺寸比一行文字高本来就是常态，允许印章下半部分探出表格底边（贴近真实盖章效果，其它生成器也是类似做法），但用 `pageBottom`（`drawPartyTable` 内已有的、给页码留出安全距离的下边界，见 267-268 行 `bottomReserve=14`）兜底，保证印章不会探到页码区域。`y - 2` 防止印章顶部超出表格上边框太多。

### Files in scope

- `src/utils/domesticQuotationPdfGenerator.ts`（`drawPartyTable()` 内印章定位公式，约 353-361 行）

### Acceptance criteria

- 印章始终压在"单位名称(章)"公司名这一行附近，不再随字段数量/单元格高度往下漂移。
- 印章允许探出表格底边（真实盖章效果），但不会探到页码区域。
- 印章透明度（0.82）、印章图片本身、`stampX` 水平位置不变。
- TASK-130 的要求同时满足：印章仍然是先画在文字之前（`drawPartyTable` 里印章在 `autoTable` 之后画，本来就是印章盖在文字上层，这是本文件故意用透明度模拟的盖章效果，跟 TASK-130 处理的销售确认书场景一致，本次不涉及顺序改动，只改位置）。

### Non-goals / 红线

- 不改动 `stampWidth`/`stampHeight`/`stampX`/印章透明度（0.82）。
- 不改动供需双方信息表本身的行高压缩算法（TASK-108 已经调好）。
- 不改动 `orderConfirmationPdfGenerator.ts`（TASK-130 已处理，跟这次是不同文件）。

### 验证

- `npx tsc --noEmit`（全项目）通过。
- `npx eslint src/utils/domesticQuotationPdfGenerator.ts` 无输出。
- 沙箱内用截图同款数据（供方姓名/地址/电话有值，需方全空）复现 `drawPartyTable` 的行高计算 + 印章定位逻辑，`pdftoppm` 渲染对比：旧公式印章圆心落在"电话/纳税人识别号"附近、底边越出表格边框约 19mm；新公式印章顶部压在"单位名称(章)"公司名这一行、底边仍在页码安全区之内。
- **待用户验证**：在真实环境生成一份供需双方信息填写情况不同（供方详细/需方空白、双方都详细、双方都简略等）的产品购销合同 PDF，确认印章始终压在公司名附近、不越出页码区域。

## TASK-132：印章 PNG 调色板量化瘦身，不影响观感

**状态**：已完成（2026-07-10，本次会话由 Claude 直接实现，未经 Codex）
**日期**：2026-07-10
**背景来源**：用户要求检查印章图片本身能否在不影响观感的前提下再压缩，减小最终 PDF 体积（延续 TASK-129/130/131 这一轮 PDF 体积/印章排查）。

### 背景

`public/images/stamp-shanghai.png`（350×347）和 `stamp-hongkong.png`（400×169）都已经是索引色（PNG colorType=3，带 tRNS 透明通道）——`scripts/compress-stamps.js` 显示这两个文件之前已经被压缩过一轮（resize + 索引色）。但两者调色板条目数仍偏大：shanghai 165 色、hongkong 256 色（满编）。用 ImageMagick 试了两组优化：

1. **无损重新压缩**（同调色板，只是加大 deflate 压缩强度）：shanghai 63,702→62,582 字节、hongkong 18,285→18,052 字节，几乎无收益（~1-2%）——说明瓶颈不在压缩强度，而在调色板本身太大。
2. **降低调色板颜色数**（`convert -colors N`，只减少颜色数量，不改变像素尺寸）：这两张图实际内容只是红/蓝墨迹 + 透明背景，颜色数量本来就很有限，多出来的调色板条目基本都是抗锯齿边缘上的过渡色。测了多档颜色数，并用 `compare -metric RMSE` 量化每一档跟原图的像素差异（0-1 归一化，越接近 0 差异越小）：

   | 文件 | 颜色数 | 文件大小 | 相对原图 RMSE |
   |---|---|---|---|
   | shanghai | 16 | 25.6KB | 4.80% |
   | shanghai | **24** | **30.9KB** | **4.48%** |
   | shanghai | 32 | 32.3KB | 4.10% |
   | hongkong | 8 | 5.1KB | 2.76% |
   | hongkong | **16** | **6.8KB** | **2.33%** |
   | hongkong | 24 | 7.7KB | 2.20% |

   所有档位的 RMSE 都在 2-5% 区间（都是抗锯齿边缘的细微色阶差异），渲染成图肉眼对比看不出差别。选了留有余量的一档而不是最激进的一档：shanghai 24 色、hongkong 16 色。

### 执行记录

- `public/images/stamp-shanghai.png`：63,702 字节 → 30,949 字节（-51.4%），尺寸仍是 350×347，24 色索引色 + 透明通道。
- `public/images/stamp-hongkong.png`：18,285 字节 → 6,761 字节（-63.0%），尺寸仍是 400×169，16 色索引色 + 透明通道。
- 跑 `node scripts/embed-resources.js` 重新生成 `src/lib/embedded-resources.ts`：文件从 28,275,884 字节降到 28,216,852 字节（-59,032 字节，跟两张图 base64 编码后的体积差正好对上）。用脚本从新生成的 `embedded-resources.ts` 里把 `shanghaiStamp`/`hongkongStamp` 两个 base64 字段解码还原成 PNG，逐字节 `cmp` 对比确认跟压缩后的源图完全一致，排除编码写入过程出错的可能。
- 清理了本次排查过程中不小心创建在仓库目录里的几个临时复现脚本（`pdftest_tmp.js`/`pdftest2_tmp.js`/`pdftest3_tmp.js`/`party_repro_tmp.js`/`party_repro2_tmp.js`/`stamp_repro_tmp.js`）——发现这几个文件被仓库自带的版本快照机制自动提交过（`git log` 能看到 `v26.7.10.0.17`/`v26.7.10.0.18` 两次自动提交包含了它们），本次会话结束时已删除，工作区里已经没有这几个文件。

### Files in scope

- `public/images/stamp-shanghai.png`（二进制替换）
- `public/images/stamp-hongkong.png`（二进制替换）
- `src/lib/embedded-resources.ts`（`node scripts/embed-resources.js` 自动重新生成，不手改）

### Acceptance criteria

- 两张印章图片素材尺寸（350×347 / 400×169）不变，只是调色板颜色数减少。
- `embedded-resources.ts` 里 `shanghaiStamp`/`hongkongStamp` 字段解码后跟对应源 PNG 文件字节级一致。
- 印章在 PDF 里的显示尺寸、位置、透明度不受影响（`addImage` 按固定 `stampWidth`/`stampHeight` 缩放，跟源图像素尺寸无关）。

### Non-goals / 红线

- 不改动 `logoIcon`（TASK-107 已经优化过的表头 logo）、两个 NotoSansSC 字体文件——本次只处理印章两张图。
- 不改动 `scripts/compress-stamps.js`（之前那版压缩脚本留着做参考，没有整合本次的调色板量化步骤，如果以后要重新生成需要手动跑 `convert -colors N`，未来如果这个诉求变得常态化可以考虑补进脚本里，本次没有改脚本）。
- 不改动印章在各 PDF 生成器里的绘制逻辑（TASK-130/TASK-131 已处理的排布问题不受影响）。

### 验证

- `npx tsc --noEmit`（全项目）通过；`npx eslint scripts/embed-resources.js` 无输出。
- `identify` 确认两张图替换后像素尺寸未变。
- 用 ImageMagick `compare -metric RMSE` 量化了多档颜色数下跟原图的像素差异，选定档位的 RMSE 均在 2-5%（抗锯齿边缘色阶差异，非可见瑕疵）；沙箱内直接查看图片确认肉眼看不出跟原图的差别。
- 解码 `embedded-resources.ts` 里的新 base64 字段，逐字节 `cmp` 对比跟磁盘上的压缩后 PNG 完全一致。
- **待用户验证**：生成一份用上海印章、一份用香港印章的 PDF，确认盖章视觉效果（清晰度、颜色）与之前一致，且文件体积按预期减小（上海印章文档减少约 33KB，香港印章文档减少约 11.5KB，在 TASK-129 的 `compress:true` 之上叠加）。

## TASK-133：产品购销合同（内销合同）印章改成先画，文字盖在印章上层

**状态**：已完成（2026-07-10，本次会话由 Claude 直接实现，未经 Codex）
**日期**：2026-07-10
**背景来源**：用户反馈"产品购销合同的 pdf 的印章，没有在文字下层"——TASK-131 只修了印章的 Y 坐标（不再偏下），但没改绘制顺序，印章其实还是在 `autoTable` 画完供需方文字之后才画，盖在文字上层，跟 TASK-130（销售确认书）要求的"印章在文字下方"不一致。

### 背景

`drawPartyTable()` 原来的顺序是：`doc.autoTable(...)` 画供需方表格（文字+边框）→ 再 `doc.addImage()` 画印章。jsPDF 是顺序绘制模型，后画的盖住先画的重叠区域，所以印章必然叠在文字上层。

TASK-131 把印章定位公式从"依赖 autoTable 画完之后才知道的 `finalY`"（`finalY - stampHeight - 4`）改成了"只依赖 autoTable 开始画之前就已知道的 `y`/`cellPadding`/`pageBottom`"（`Math.max(y-2, Math.min(y+cellPadding-2, pageBottom-stampHeight))`）——这意味着印章位置不再需要等表格画完才能算出来，具备了"提前到 autoTable 之前画"的条件，但那次改动只顺手改了位置公式，没有同步把绘制顺序也换过来。

### 修复方案与踩坑

把印章绘制块整体移到 `doc.autoTable(...)` 调用之前。但移动之后用沙箱复现测试发现一个新问题：jspdf-autotable 的 `grid` 主题默认给单元格铺一层**不透明白色底**（`fillColor: 255`，来自 `node_modules/jspdf-autotable` 的 `getTheme('grid')` 定义），如果印章先画、表格照旧不改样式，表格自己的白底会把已经画好的印章大半块整片盖掉（沙箱截图验证：印章只剩表格边框以外没被白底覆盖的那一小截）。

修复：在 `doc.autoTable(...)` 的 `styles` 里显式加 `fillColor: false`（透明），去掉这层不透明白底——页面本来就是白色，视觉上没有任何变化，但能让底下的印章透出来，只有文字和表格边框画在印章上层。

### Files in scope

- `src/utils/domesticQuotationPdfGenerator.ts`（`drawPartyTable()`）：印章绘制块移到 `doc.autoTable(...)` 之前；`styles` 里新增 `fillColor: false`。

### Acceptance criteria

- 印章挤压/叠加在供需方信息文字上时，文字始终在印章上层清晰可读（不再被印章盖住）。
- 印章位置（TASK-131）、透明度（0.82）、图片本身（TASK-132）均不变。
- 表格边框、文字颜色等视觉效果与之前一致（`fillColor:false` 只是去掉一层视觉上等同于白色背景的不透明填充，页面底色本来就是白色，非重叠区域看起来没有变化）。

### Non-goals / 红线

- 不改动 TASK-130 处理的 `orderConfirmationPdfGenerator.ts`（不同文件，那边用的是 emitText/redrawTextOverStamp 方案，因为那边文字是逐个 `doc.text()` 调用、不是 autoTable）。
- 不改动印章定位公式（TASK-131）、印章图片（TASK-132）、透明度数值。

### 验证

- `npx tsc --noEmit`（全项目）通过；`npx eslint src/utils/domesticQuotationPdfGenerator.ts` 无输出。
- 沙箱内用真实的行高计算参数 + 一个实心填充圆模拟印章（比空心描边更接近真实印章的墨色浓度）跑了三组对照，`pdftoppm` 渲染核对：① 印章先画 + 不加 `fillColor:false` → 白底把印章压在表格范围内的部分整片抹掉，证实了这个坑确实存在；② 印章先画 + `fillColor:false`（本次实际采用的修复）→ 印章完整可见，文字清晰叠在印章上层；③ 旧行为（表格先画、印章后画）→ 印章下方的文字被印章盖住看不清，对照确认了用户反馈的问题。
- **待用户验证**：生成一份供需双方信息填写较多、印章会挤压叠加在文字上的产品购销合同 PDF，确认所有文字清晰可读，印章视觉效果不变。

## TASK-134：产品购销合同设置里去掉"香港"印章选项

**状态**：已完成（2026-07-10，本次会话由 Claude 直接实现，未经 Codex）
**日期**：2026-07-10
**背景来源**：用户要求把产品购销合同页面设置里的香港印章选项去掉。

### 背景

`src/features/quotation/app/QuotationPage.tsx` 里"印章：无/上海/香港"这组按钮（约 798-824 行）只在 `(data.domesticDocType ?? 'contract') === 'contract'` 时渲染，即只在产品购销合同（跟内销报价单共用同一个页面，用 `domesticDocType` 区分）这个文档类型下出现，正是用户说的"产品购销合同页面的设置"。

### 执行记录

- `src/features/quotation/app/QuotationPage.tsx`（约 799-802 行）：按钮选项数组里删掉 `{ value: 'hongkong', label: '香港' }`，只保留"无"/"上海"两个选项。
- 只改了这一处 UI 选项列表，没有改 `templateConfig.stampType` 的类型定义（仍然是 `'none' | 'shanghai' | 'hongkong'`，见 `src/types/quotation.ts`）、没有改 `domesticQuotationPdfGenerator.ts` 里对 `hongkong` 类型的渲染支持——如果某份已保存的合同数据里 `stampType` 之前就存的是 `'hongkong'`，这次改动不会主动把它清掉，只是设置面板里不再能选到这个选项。

### Files in scope

- `src/features/quotation/app/QuotationPage.tsx`（印章选项按钮组，约 799-802 行）

### Acceptance criteria

- 产品购销合同（`domesticDocType === 'contract'`）设置面板的印章按钮组只显示"无"/"上海"。
- 内销报价单（`domesticDocType !== 'contract'`）本来就不显示这组按钮，不受影响。
- 不影响其它文档类型（销售确认书、发票、装箱单、采购单）各自独立的印章设置。

### Non-goals / 红线

- 不改动 `types/quotation.ts` 里 `stampType` 的类型定义（仍保留 `'hongkong'` 作为合法值，避免影响已保存数据的类型兼容性）。
- 不改动 `domesticQuotationPdfGenerator.ts` 对香港印章的渲染逻辑（万一已有数据是 `hongkong`，PDF 仍然能正常生成，只是新数据没法从 UI 选到这个值）。
- 不改动其它 4 个文档类型（发票/装箱单/采购单/销售确认书）各自的香港印章选项——用户只提到产品购销合同这一个页面。

### 验证

- `npx tsc --noEmit`（全项目）通过；`npx eslint src/features/quotation/app/QuotationPage.tsx` 无输出。
- 代码走读确认这是仓库里唯一一处"产品购销合同"专属的印章选项 UI（`grep 香港/hongkong` 全仓库确认无其它同类选择器引用这段代码）。
- **待用户验证**：打开产品购销合同页面设置，确认印章选项只剩"无"/"上海"。

## TASK-135：修复 TASK-132 引入的回归——香港印章 4-bit PNG 导致 jsPDF 渲染失败，PDF 里看不到章

**状态**：已完成（2026-07-10，本次会话由 Claude 直接实现，未经 Codex）
**日期**：2026-07-10
**背景来源**：用户反馈"凡有显示香港印章的地方，选中后，却在 pdf 中看不到香港印章"——这是 TASK-132 引入的回归，本任务是那个任务的修正。

### 背景（根因）

TASK-132 把 `stamp-hongkong.png` 用 `convert -colors 16` 量化调色板颜色数来减小体积，只验证了"颜色数越少、RMSE 越小、肉眼看不出差别"，没有验证**jsPDF 是否真的能正常解码渲染这张图**——这是一个疏漏，直接用真实的 `embedded-resources.ts` 数据在 jsPDF 里跑一遍 `addImage` 才发现问题，之前的验证方式（`identify`/`cmp`/RMSE 对比）都不会暴露这个坑。

实测复现：`doc.addImage('data:image/png;base64,'+hongkongStamp的真实数据, 'PNG', ...)` 直接抛异常 `offset is out of bounds`，`stamp-shanghai.png` 用同样方式测试完全正常。排查发现根因是 PNG 的调色板位深（bit depth）：

- ImageMagick 的 `-colors N` 会自动选择"刚好够用"的最小位深——16 色恰好能用 4 bit 存下（2⁴=16），ImageMagick 就把 `stamp-hongkong.png` 编码成了 **4-bit 索引色 PNG**（`stamp-shanghai.png` 量化到 24 色，5 bit 才够，PNG 规范里位深只有 1/2/4/8/16 几档，只能往上取整到 8 bit，所以shanghai 保住了 8-bit，侥幸没触发这个坑）。
- jsPDF 内置的 PNG 解码器不支持 4-bit 索引色（8/2/1-bit 或真彩色能正常解，4-bit 这一档会导致解码时按字节对齐算错行偏移，抛 `offset is out of bounds`），这是 jsPDF 自身 PNG 解析器的已知局限，不是这次改动能绕开的运行时环境问题。

排查时顺带确认了本次改动前就有的 `logoIcon`（TASK-107）和现在的 `stamp-shanghai.png` 都是 8-bit，不受影响，只有 `stamp-hongkong.png` 踩中了这个坑。

### 修复方案

不再让 ImageMagick 自由选择位深——只要颜色数选在 17-256 区间（迫使编码器至少用 8-bit），就能既拿到调色板量化的体积收益、又避开 4-bit 解码坑。把 `stamp-hongkong.png` 从 16 色（4-bit，6,761 字节，但导致渲染失败）改成 **24 色（8-bit，7,934 字节）**——跟 `stamp-shanghai.png` 用同一个颜色数档位，体积只比之前的 4-bit 版本大约 1.1KB，仍然比 TASK-132 之前的原始 256 色版本（18,285 字节）小 57%。

注：曾尝试过用 `-define png:bit-depth=8 -define png:color-type=3` 强制显式指定位深/颜色类型来保留 16 色的体积优势，但这个组合会破坏 tRNS 透明通道——渲染出来整张图背景变成不透明的浅灰蓝色色块（而不是透明），比 4-bit 崩溃更隐蔽也更糟（会被误判为"图能显示，只是背景有点怪"而不是直接报错）。最终放弃这个思路，改用最简单可靠的"选一个自然落在 8-bit 的颜色数"方案。

### 执行记录

- `public/images/stamp-hongkong.png`：6,761 字节（4-bit，有问题）→ 7,934 字节（8-bit，正常），尺寸仍是 400×169。
- 重新跑 `node scripts/embed-resources.js` 重新生成 `src/lib/embedded-resources.ts`。
- 用真实的 `embedded-resources.ts` 里的 `hongkongStamp`/`shanghaiStamp` 数据在 jsPDF 里各跑一次 `addImage`，确认都不再抛异常。
- 解码新生成的 `embedded-resources.ts` 里的 `hongkongStamp` 字段，逐字节 `cmp` 对比确认跟磁盘上的新 PNG 完全一致。

### Files in scope

- `public/images/stamp-hongkong.png`（二进制替换）
- `src/lib/embedded-resources.ts`（`node scripts/embed-resources.js` 自动重新生成）

### Acceptance criteria

- `stamp-hongkong.png` 恢复为 8-bit 索引色 PNG，`doc.addImage()` 加载不抛异常。
- 香港印章在实际 PDF 里能正常显示（透明背景、颜色跟之前一致）。
- 体积仍然比 TASK-132 之前的原始版本小（57% 而不是 63%，因为放弃了 4-bit 但仍保留调色板量化的收益）。

### Non-goals / 红线

- 不改动 `stamp-shanghai.png`（TASK-132 那版 24 色本来就是 8-bit，没有这个问题）。
- 不改动 `logoIcon`、字体文件（不受影响）。
- 不改动印章在各 PDF 生成器里的绘制逻辑（排布问题是 TASK-130/131/133 处理的，跟这次的图片解码问题是两回事）。

### 验证

- `npx tsc --noEmit`（全项目）通过。
- 用真实 `embedded-resources.ts` 数据在 jsPDF 里实际跑 `addImage`（而不是只测图片文件本身的 identify/RMSE）——这次改成了以"jsPDF 能不能真正加载"作为验收标准，而不只是"文件体积和视觉 RMSE 达标"，弥补 TASK-132 验证方式的疏漏。
- 解码新 `embedded-resources.ts` 里的字段，逐字节比对确认跟磁盘文件一致。
- **待用户验证**：在真实环境生成一份选中香港印章的 PDF（发票/采购单/装箱单唛头/销售确认书等任意支持香港印章的单据类型），确认印章能正常显示。

## TASK-136：手机"添加到主屏幕"图标不正确——`layout.tsx` 从未接入图标/manifest 元数据

**状态**：已完成（待真机验证）
**日期**：2026-07-10
**背景来源**：用户反馈"在手机上将网页添加到桌面时，图标不能正确"。

### 背景（根因）

`src/lib/logo-config.ts` 里其实已经写好了 `getLayoutIcons()`（给 Next.js `metadata.icons` 用）和 `getManifestIcons()`（给 `manifest.json` 用）两个函数，但全仓库搜索确认**这两个函数从未被任何地方 import/调用**——纯死代码。`src/app/layout.tsx` 的 `export const metadata` 只有 `title` / `description` 两个字段，完全没有 `icons` 字段，也没有 `manifest` 字段。整个代码库里也没有任何手写的 `<link rel="manifest">` 或 `<link rel="apple-touch-icon">` 标签。

`public/static/manifest.json` 文件本身是存在且内容完整的（12 个不同尺寸的图标条目），但因为没有任何地方引用它，浏览器渲染出的 `<head>` 里根本不包含指向它的 `<link rel="manifest">` 标签——对浏览器来说这个文件形同不存在。

这解释了症状：
- **iOS Safari**：「添加到主屏幕」在没有 `<link rel="apple-touch-icon">` 时会退化成截取当前页面内容生成一张缩略图当图标，或者退回一个通用占位图标，不会是 Luo & Company 的 logo。
- **Android Chrome**：「添加到主屏幕」/ PWA 安装依赖 `<link rel="manifest">` 才能读到 manifest 里 192x192 / 512x512 那两个 `purpose: any maskable` 图标；没有这个 link 标签，Chrome 只能退回去猜测（通常是页面favicon 或某个显眼的 img），同样得到不正确的图标。

顺带用脚本核对了一遍 `manifest.json` 引用的每个文件，发现同一批文件本身也有数据问题（不是这次的主因，但会让"接上 manifest 之后"的图标依然显示不对或部分尺寸缺失，一并列入本任务）：

- `public/assets/logo/favicon.ico` 实际是一份被改了扩展名的 **PNG 数据**（`file` 识别为 `PNG image data, 192 x 192`），不是真正的 ICO 容器格式；`manifest.json` 里却把它标注成 `"sizes": "16x16", "type": "image/x-icon"`——声明尺寸和真实尺寸（192x192）不符，且 MIME 类型也名不副实。
- `public/assets/logo/icon.png` 实际尺寸 64×64，`manifest.json` 里标注成 `"sizes": "32x32"`——同样不符。
- `manifest.json` 里还有两条指向不存在文件的条目，加载会 404：
  - `/assets/logo/Assets.xcassets/AppIcon.appiconset/96.png`
  - `/assets/logo/Assets.xcassets/AppIcon.appiconset/192.png`
- 反倒是 `public/assets/logo/apple-icon.png`（`LOGO_CONFIG.web.appleIcon`，`getLayoutIcons()` 里 apple 数组的第一项）文件本身是存在的，只是从未被接到 `metadata.icons.apple`。

`src/app/favicon.ico`（Next.js 文件约定，自动识别为标签页 favicon）本身能正常工作，不受这次改动影响，不用动。

### Files in scope

- `src/app/layout.tsx`：`metadata` 导出补上 `icons`（复用 `getLayoutIcons()`）和 `manifest: '/static/manifest.json'` 两个字段。
- `src/lib/logo-config.ts`：`getManifestIcons()` / `getLayoutIcons()` 里的 `sizes` 字段要跟对应文件的真实像素尺寸一致；移除或修正指向不存在文件（96.png / 192.png）的条目。
- `public/assets/logo/favicon.ico`：转成真正的 ICO 容器格式（可用现有 `icon.png` 或 appiconset 里的小尺寸图重新生成），或者如果保留现状，manifest 里对它的 `sizes`/`type` 标注要如实反映它现在其实是 192x192 PNG。两种做法二选一，但不能再让"声明尺寸"和"实际尺寸"对不上。
- `public/assets/logo/icon.png`：同上，调整图片本身尺寸使其匹配声明的 32x32，或者反过来把声明改成实际的 64x64，二选一，保持一致即可。
- `public/static/manifest.json`：如果是从 `getManifestIcons()` 生成/同步的，确认改完 `logo-config.ts` 后重新生成一份并落盘；如果是手写维护的独立文件，直接手改保持和 `getManifestIcons()` 一致。
- 缺失的 96.png / 192.png：可以从 `Assets.xcassets/AppIcon.appiconset/1024.png`（或其他高分辨率源图）用 `convert`/`sips` 之类工具 resize 补齐两个尺寸，或者干脆从 manifest 条目里删掉这两条——两种做法都可以，选一个能让「manifest 里列出的每个文件都真实存在」成立的方案即可。

### Acceptance criteria

- 页面渲染出的 `<head>` 里包含 `<link rel="manifest" href="/static/manifest.json">`，以及至少一组 `<link rel="apple-touch-icon" ...>`（可以是多个不同尺寸）。可以用 `npm run build && npm run start` 后 `curl localhost:3000 | grep -i "manifest\|apple-touch-icon"` 或者浏览器查看源代码确认。
- `manifest.json` 里每一条 `icons[].src` 指向的文件都真实存在（无 404）。
- `manifest.json` 里每一条 `icons[].sizes` 都跟对应文件的真实像素尺寸完全一致（不能再出现之前 `favicon.ico` 声明 16x16 实际 192x192、`icon.png` 声明 32x32 实际 64x64 这种不符）。
- **待用户验证（无法在沙箱里做真机测试）**：iOS Safari 和 Android Chrome 各自实际执行一次「添加到主屏幕」，确认桌面上出现的图标是 Luo & Company 的 logo，不是页面截图缩略图或通用占位图标。

### Non-goals / 红线

- 不重新设计 logo 视觉本身，只修图标引用路径、声明尺寸、缺失文件这几类"元数据对不上"的问题。
- 不改动 `src/app/favicon.ico`（Next.js 文件约定的标签页 favicon，工作正常，跟"添加到主屏幕"图标是两回事）。
- 不改动 `Assets.xcassets` / `android/mipmap-*` 目录下已有的原生 App 图标资源内容本身——这些目录是给原生 iOS/Android App 打包用的，网页这次只是复用同一批文件做引用，除非某个尺寸确实缺失需要补齐，不要连带重新生成整套已存在的文件。

### 验证

- `npx tsc --noEmit` 通过。
- `npx eslint`（改动的文件）无输出。
- 用脚本核对 `manifest.json` 每条 `icons` 的 `src` 文件是否存在、`sizes` 是否与文件真实像素尺寸一致（沙箱里可以用 Python Pillow 批量核对，前面诊断阶段已经写过一次类似脚本，可以直接复用思路）。
- `npm run build` 跑通（沙箱如遇历史已知的超时问题，按 TASK-103 的做法在 45s 内跑到编译阶段即可，建议用户本地或 CI 补跑一次完整 build 确认）。
- **待用户验证**：真机 iOS Safari + Android Chrome 各做一次「添加到主屏幕」，确认图标正确。

## TASK-137：单据全量同步改为增量拉取 + 持久化水位，降低 Vercel Fluid CPU

**状态**：已完成（2026-07-11；部署后仍需观察 Vercel CPU，并做跨设备手工验证）
**背景来源**：用户反馈 Vercel Fluid Active CPU 用量随"打开 app 的次数"线性累加（开一次约 +3s，开两次约 +6s），排查定位到全局挂载的 `useD1Sync`（`src/hooks/useD1Sync.ts`，在 `src/app/providers.tsx` 里包住整个 app，跟停留在哪个页面无关，首页也会触发）。

### 背景（根因）

`useD1Sync` 在每次**全新页面加载**（新开 tab / 整页刷新，用户已登录）4 秒后调用一次 `pullAllFromD1()`（`src/utils/d1Pull.ts`）。这个函数目前是无条件全量同步：

1. `pushLocalDocsToD1`（约 126-228 行）：对 quotation / confirmation / domestic / invoice / packing / purchase 六种单据类型各发一次 `GET /api/documents?type=X&status=all`，只是为了拿到 D1 现有 id 集合，判断本地有没有"D1 缺失、需要补推"的记录。
2. 紧接着 `pullAllFromD1` 主体（约 355-422 行）：同样六种类型再各发一次 `GET /api/documents?type=X&status=all`，把全部记录整表拉回来 merge 进 localStorage。

一次打开 app 至少 12 次 `/api/documents` 请求（某类型超过 500 条时 `fetchAll` 还会继续翻页，请求更多）。每次都是独立的 Vercel serverless function 调用（`getServerSession` 解 JWT + 代理转发到 Cloudflare Worker + `await workerResp.json()` 解析整页单据数据——单据 `data` 字段是完整报价单/发票内容，body 不小），这是"每次开 app 都固定 +N 秒 CPU"的直接成因。

`syncedUserId`（`useD1Sync.ts` 里的模块级变量）只在**同一次页面加载**内去重，一刷新或新开 tab 就失效，等同于"从未同步过"，于是每次都重新跑一整轮。

这跟询报价同步在 [[bug_inquiry_sync_phantom_records]] 之后、TASK-128 修复前的"整表轮询"是同一类问题（全量拉取、没有增量/水位机制），TASK-128 已经把询报价那条路径改成了"服务端 `since` 参数 + 客户端维护同步水位"，本任务是同一思路在 documents 同步路径上的对应修复。**关键区别**：TASK-128 的水位存在 `useInquirySync` 组件的 `useRef` 里就够用，因为它是"同一次页面加载内、30-60 秒轮询"的场景；本任务的水位必须**持久化到 localStorage**，否则每次新开 tab 依然会被判定成"从未同步过"而触发全量，起不到效果。

**已知隐患，实现时必须处理**：`pullAllFromD1` 里的 `mergeIntoStorage`（约 230-288 行）在"响应里没出现的本地记录 + 不在 pending 队列"时，会调用 `recordDeletedDocId` 把它当成"已在其他设备删除"从本地清掉（约 265-277 行）。这个推断只有在**响应是完整全量结果集**时才成立；改成增量（`since` 过滤）之后，一条记录"没出现在这次响应里"通常只是"最近没变化"，如果不加区分，会把所有近期没编辑过的历史单据在下一次增量同步后从本地误删——这跟 TASK-128 里 `mergeFieldsOnly` 那个"缺席 tomorrow 当删除"的回归是同一类型的 bug，必须在设计里显式避免，不能等测试发现。

### Files in scope

- `src/worker.ts` —— `handleListDocuments`（第 1320 行起）：加 `since` 查询参数支持
- `src/utils/d1Sync.ts` —— 新增同步水位 / 上次全量同步时间 / 上次同步尝试时间的读写函数；`clearD1DocumentLocalState` 加入新 key 的清理
- `src/utils/d1Pull.ts` —— `fetchAll` 加 `since` 参数；`mergeIntoStorage` 加 `isFullSync` 参数修正误删逻辑；拆分 `pullAllFromD1` 为 `fullSyncFromD1` / `incrementalSyncFromD1` 两条路径 + 顶层节流编排
- `src/hooks/useD1Sync.ts` —— 预期不需要改动（`pullAllFromD1()` 对外签名不变），实现时确认这一点即可

### 具体改动要求

**1. `src/worker.ts` —— `handleListDocuments` 支持 `since`**

在现有 `type`/`status`/`search`/`limit`/`offset` 之外读取 `since = url.searchParams.get('since')`。校验：`since` 存在且 `!Number.isNaN(Date.parse(since))` 才生效，否则按"无 since"处理（不要因为参数非法就报错/500，跟 TASK-128 里 `/api/inquiry` 的 `since` 校验规则一致）。生效时在 `conditions`/`values` 数组里追加 `updated_at >= ?` / `since`（放在 `search` 条件之后、`values.push(limit, offset)` 之前，保证 `conditions.join(' AND ')` 里的 `?` 占位符顺序和 `values` 数组顺序一一对应）。用 `>=` 不用 `>`（原因同 TASK-128：允许水位这一刻的记录被重复带回来，客户端 merge 是按 id upsert 的幂等操作，重复带回无害；用 `>` 在同一 `updated_at` 精度内有并发写入时会丢记录）。不传 `since` 时返回结果必须和现在完全一样（回归保护）。

**2. `src/utils/d1Sync.ts` —— 新增水位/节流状态读写**

新增三个 localStorage key 和对应读写函数（放在文件里 `ACTIVE_USER_KEY` 附近即可）：

```ts
const DOC_SYNC_WATERMARK_KEY = 'd1_docs_sync_watermark';        // 已知的服务端最大 updated_at（ISO 字符串）
const DOC_SYNC_LAST_FULL_AT_KEY = 'd1_docs_last_full_sync_at';   // 上次成功全量同步的时间戳（客户端 Date.now()，仅用于节流判断，不是数据水位）
const DOC_SYNC_LAST_ATTEMPT_AT_KEY = 'd1_docs_last_sync_attempt_at'; // 上次发起同步尝试（无论成败）的时间戳

export function getDocSyncWatermark(): string | null { ... }
export function setDocSyncWatermark(iso: string): void { ... }
export function getDocsLastFullSyncAt(): number { ... }
export function setDocsLastFullSyncAt(ts: number): void { ... }
export function getDocsLastSyncAttemptAt(): number { ... }
export function setDocsLastSyncAttemptAt(ts: number): void { ... }
```

读函数在 `typeof window === 'undefined'` 时分别返回 `null`/`0`；写函数同样条件下直接 return。数值型用 `Number(localStorage.getItem(key) || 0)` / `String(ts)` 存取。

`clearD1DocumentLocalState`（约 61-71 行）的清理列表里加上这三个 key——切换账号时必须一并清空，强制新用户走一次全量同步，不能复用上一个用户的水位。

**3. `src/utils/d1Pull.ts` —— `fetchAll` 加 `since`**

```ts
async function fetchAll<T>(url: string, key: string, since?: string): Promise<{ data: T[]; ok: boolean }> {
  // ...原逻辑不变，只是请求 URL 拼接时加上 since ? `&since=${encodeURIComponent(since)}` : ''
}
```

**4. `src/utils/d1Pull.ts` —— `mergeIntoStorage` 加 `isFullSync` 参数**

签名改为 `mergeIntoStorage<T>(storageKey, incoming, d1Ok, pendingIds, deletedIds, isFullSync: boolean)`。第二个循环（约 265-277 行，"存在于本地但不在这次响应里的记录"）改成：

```ts
for (const item of existing) {
  if (deletedIds.has(item.id)) continue;
  if (map.has(item.id)) continue;

  if (!isFullSync) {
    // 增量响应里没出现 = 最近没变化，不代表已删除，原样保留
    map.set(item.id, item);
    continue;
  }

  if (pendingIds.has(item.id)) {
    map.set(item.id, item);
  } else {
    recordDeletedDocId(item.id);
  }
}
```

其余合并逻辑（`activeIncoming` 过滤、按 `updatedAt` 取较新版本等）不变。

**5. `src/utils/d1Pull.ts` —— 拆分 `pullAllFromD1`**

把现有 `pullAllFromD1` 函数体重命名为 `fullSyncFromD1`（保留内部全部逻辑：`flushPendingQueue` → `pushLocalDocsToD1` → `flushPendingQueue` → 六种类型整表 `fetchAll`（不传 `since`）→ 六次 `mergeIntoStorage(..., isFullSync: true)`），在最后成功路径追加：

- 只有当六种类型的 fetch 全部 `ok`（即 `quotRes.ok && confRes.ok && domesticRes.ok && invRes.ok && packRes.ok && purchRes.ok`）时，才计算这一批数据里 `updated_at` 字段的最大值（用每个 `D1Doc.updated_at` 服务端字段，不要用转换后 `docToXxxHistory()` 输出的 `updatedAt`，也不要用客户端 `Date.now()`——原因同 TASK-128，避免客户端时钟偏移导致水位比服务端记录还早/晚），调用 `setDocSyncWatermark(maxUpdatedAt)` 和 `setDocsLastFullSyncAt(Date.now())`。
- 任一类型 fetch 失败时，不更新水位、不更新"上次全量同步时间"（下次调用会因为水位/时间都没推进，仍然判定需要重试）。

新增 `incrementalSyncFromD1(since: string): Promise<void>`：

- 只调用一次 `flushPendingQueue()`（跟全量同步的第一步一致，不要省略），**不调用 `pushLocalDocsToD1`**（原因同 TASK-128 对 `incrementalSync` 的处理：`pushLocalDocsToD1` 需要拿到完整 D1 id 集合才能判断"本地独有"，喂给它一个 `since` 过滤后的结果会把所有"最近没变化、也没有 pending 操作"的本地记录误判成"D1 里找不到"，产生噪音警告；真正需要补推的场景已经由 pending 队列 + `flushPendingQueue` 覆盖，遗留的真正孤儿记录会在下一次强制全量同步时被 `pushLocalDocsToD1` 捕获）。
- 六种类型各 `fetchAll(..., since)` 一次，六次 `mergeIntoStorage(..., isFullSync: false)`。
- 同样只有六种类型全部 `ok` 时才推进水位：新水位 = `max(旧水位, 这一批 D1Doc.updated_at 最大值)`（如果这一批为空，水位不变；不要因为这次没有新数据就往回退）。任一类型失败则水位保持不变。

顶层 `pullAllFromD1()` 改成节流 + 分派编排（对外仍然是唯一入口，无参数，签名不变）：

```ts
const MIN_SYNC_INTERVAL_MS = 60_000;             // 60 秒内的重复触发（多 tab / 快速刷新）直接跳过
const FORCE_FULL_SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 小时强制整表兜底一次（自愈，防御增量路径的未知边界问题）

export async function pullAllFromD1(): Promise<void> {
  if (typeof window === 'undefined') return;

  const now = Date.now();
  if (now - getDocsLastSyncAttemptAt() < MIN_SYNC_INTERVAL_MS) return;
  setDocsLastSyncAttemptAt(now);

  const watermark = getDocSyncWatermark();
  const needsFull = !watermark || (now - getDocsLastFullSyncAt() > FORCE_FULL_SYNC_INTERVAL_MS);

  try {
    if (needsFull) {
      await fullSyncFromD1();
    } else {
      await incrementalSyncFromD1(watermark);
    }
  } catch (err) {
    console.warn('[d1Pull] 同步失败（不影响现有功能）:', err);
  }
}
```

### Acceptance criteria

- 用户首次登录/换设备（本地无 `d1_docs_sync_watermark`）：打开 app 走 `fullSyncFromD1()`，行为和改动前一致（一次性拉全量 + push-check）。
- 已有水位、且距上次全量同步不到 24 小时：打开 app 只走 `incrementalSyncFromD1()`，用浏览器 Network 面板确认六个 `/api/documents?...&since=...` 请求返回的 `documents` 数组在稳态下（没有新增/编辑）明显小于全表条数（理想情况为空）。
- 60 秒内重复打开/刷新 app（模拟用户连续开关或多 tab）：第二次及以后的调用应直接被节流跳过，不发起任何 `/api/documents` 请求（Network 面板确认）。
- 回归验证："响应中没出现的历史单据不会被误删"——先用增量路径同步一次（本地已有的、近期未编辑的历史单据不在 `since` 之后），确认这些历史单据在 `quotation_history`/`invoice_history`/`packing_history`/`purchase_history` 里原样保留，没有被 `recordDeletedDocId` 误删。
- 回归验证："删除仍能同步"——在 A 设备删除一条单据，B 设备下一次增量同步后，该单据应从 B 设备本地清除（验证 D1 软删除 `status='deleted'` + `updated_at` 更新后能被 `since` 过滤的增量响应正确捕获，不依赖"缺席=删除"那条只对全量有效的旧逻辑）。
- 回归验证：TASK-124/`bug_inquiry_merge_pending_protection` 同类场景——某条单据本地刚编辑、PUT 还在 pending 队列里未确认，此时触发一次增量同步，确认该单据不被覆盖回旧值（`mergeIntoStorage` 现有的 pending 保护逻辑在增量路径下依然生效，未受本次改动影响）。
- 不传 `since` 的 `GET /api/documents` 行为不变（`npm test` 或手工 curl 确认）。

### Non-goals / 红线

- 不改动 `app/api/documents/[[...path]]/route.ts`（Vercel 代理层）——它已经是 `${WORKER_BASE}${workerPath}${url.search}` 透传全部 query string，`since` 会自动带过去，不需要改代码，实现时确认这一点即可。
- 不改动 `handleGetDocument`/`handleCreateDocument`/`handleUpdateDocument`/`handleDeleteDocument` 这几个单文档 CRUD handler。
- 不改动 `pushLocalDocsToD1` 内部逻辑本身（判断"本地独有、需要补推"的规则不变），只是把它的调用时机从"每次同步都跑"收紧成"只在 `fullSyncFromD1` 里跑"。
- 不改动 `customers`/`inquiry`/`admin` 这几个其它代理路由和它们对应的 Worker handler——本次只处理 documents 这一条同步路径。
- 不改动 `PAGE_SIZE`（500）本身的分页机制。
- 不改动 `flushPendingQueue`/`enqueue`/`dequeue`/`executeOp`/`d1SyncDocument`/`recordDeletedDocId`/`getDeletedDocIds`/`getPendingIds` 这些 pending 队列相关函数。
- 不改动 `useD1Sync.ts` 里"延迟 4 秒执行"和"`syncedUserId` 同一页面加载内去重"这两条逻辑——它们和本任务的持久化水位节流是两层不同的保护，都保留。

### Verification steps

- `npx tsc --noEmit` 通过
- `npx eslint src/worker.ts src/utils/d1Sync.ts src/utils/d1Pull.ts` 无输出
- `npx jest d1Pull`（如果补了单测，建议至少覆盖 `mergeIntoStorage` 的 `isFullSync: false` 分支——增量响应缺席的记录被保留、`status: 'deleted'` 的记录仍被正确移除）
- `npm run build` 跑通
- 手动走一遍上面"验收标准"里列的场景，重点是"60 秒节流"和"增量同步不误删历史记录"这两条
- 部署后观察 1-2 天 Vercel 后台 Function Invocations 和 Active CPU 曲线，确认"打开 app 次数"和 CPU 用量之间不再是之前的线性关系（这一步无法在开发环境验证，记录为部署后待观察项）

**Status:** completed

## TASK-138：`pullAllFromD1` 加 `force` 参数，恢复历史页"手动同步刷新"按钮的强制全量语义

**状态**：已完成（2026-07-11）
**背景来源**：TASK-137 上线验证时发现的副作用——`src/features/history/app/HistoryPage.tsx` 里有一处独立的 `pullAllFromD1()` 调用点，不在 TASK-137 的 Files in scope 里，没有随之调整，导致该页面的"手动同步刷新"按钮在 TASK-137 之后可能被节流静默吞掉，或者降级成增量、跳过 `pushLocalDocsToD1`，跟用户点这个按钮时的预期（"强制真的去拉一次最新数据"）不符。

### 背景

`HistoryPage.tsx` 里 `pullAllFromD1()` 目前有两处调用：

1. `handleSyncRefresh`（第 108-121 行左右，绑定在"同步刷新"按钮 `onClick={handleSyncRefresh}`，约第 344 行）：用户主动点击触发，语义是"我知道/怀疑数据可能不是最新的，强制去拉一次"。
2. 组件内部的 `syncFromD1()`（第 152 行起）：在页面 `mount` 时调用一次（第 162 行 `void syncFromD1()`），以及浏览器标签页从后台切回前台时（`visibilitychange` 事件，第 166 行）再调用一次。这是自动触发，跟 TASK-137 要解决的"频繁触发同步消耗 CPU"是同一类场景——用户来回切换标签页会反复命中这个 effect。

TASK-137 把 `pullAllFromD1()` 改成了"60 秒节流 + 有水位时默认增量"，这两处调用点因为共用同一个函数，行为都变了。**但这两处调用点的语义其实是不一样的**：调用点 1（按钮）应该保留"用户主动要求、必须给出真实结果"的强语义，调用点 2（mount / visibilitychange 自动触发）恰恰应该继续享受 TASK-137 的节流和增量收益——不做区分的话，要么按钮被误伤（用户点了没反应），要么如果简单粗暴地把两处都改成强制全量，会重新引入 TASK-137 想解决的"频繁切回历史页触发全量请求"问题，前功尽弃。

### Files in scope

- `src/utils/d1Pull.ts` —— `pullAllFromD1` 加可选 `force` 参数
- `src/features/history/app/HistoryPage.tsx` —— 只改 `handleSyncRefresh` 这一处调用
- `src/utils/__tests__/d1Pull.test.ts` —— 补两个测试（见下）

### 具体改动要求

**1. `src/utils/d1Pull.ts` —— `pullAllFromD1(force = false)`**

```ts
export async function pullAllFromD1(force = false): Promise<void> {
  if (typeof window === 'undefined') return;

  const now = Date.now();
  if (!force && now - getDocsLastSyncAttemptAt() < MIN_SYNC_INTERVAL_MS) return;
  setDocsLastSyncAttemptAt(now);

  const watermark = getDocSyncWatermark();
  const needsFull = force || !watermark || now - getDocsLastFullSyncAt() > FORCE_FULL_SYNC_INTERVAL_MS;

  try {
    if (needsFull) {
      await fullSyncFromD1();
    } else {
      await incrementalSyncFromD1(watermark);
    }
  } catch (err) {
    console.warn('[d1Pull] 同步失败（不影响现有功能）:', err);
  }
}
```

两处改动：`force` 为 `true` 时跳过 60 秒节流的 early return；`needsFull` 的判断加上 `force ||`，强制走 `fullSyncFromD1()`（内部逻辑不变，仍然是 `flushPendingQueue → pushLocalDocsToD1 → flushPendingQueue → 六种类型整表 fetch → mergeIntoStorage(isFullSync: true) → 六种类型全部 ok 时才更新水位/`lastFullSyncAt`）。`setDocsLastSyncAttemptAt(now)` 保持无条件执行（`force` 场景也算一次尝试，避免紧接着的自动同步在同一个节流窗口内重复触发）。

**2. `src/features/history/app/HistoryPage.tsx` —— 只改按钮这一处**

第 113 行 `await pullAllFromD1();` 改成 `await pullAllFromD1(true);`。

第 154 行（`syncFromD1()` 内部，服务于 mount 和 visibilitychange 两个触发点）**不改**，继续调用 `pullAllFromD1()`（不传参，默认 `force = false`），保留 TASK-137 的节流 + 增量行为。

### Acceptance criteria

- `pullAllFromD1()`（不传参/`force: false`）在 60 秒节流窗口内被重复调用时，行为跟 TASK-137 完成后一致：第二次及以后的调用不发起任何 `/api/documents` 请求。
- `pullAllFromD1(true)` 无论是否处于 60 秒节流窗口内，都会真正发起请求，且总是走 `fullSyncFromD1()`（六种类型的 push-check + 六种类型的整表 pull，请求 URL 都不带 `since` 参数），不受当前是否已有有效水位、是否还没到 24 小时强制全量周期的影响。
- 点击历史页"同步刷新"按钮（`handleSyncRefresh`）在任何时机都会触发一次真正的全量同步，不会被静默吞掉。
- 历史页 mount 和标签页切回前台触发的自动同步（`syncFromD1()`）行为不变，继续吃 TASK-137 的节流和增量收益——反复切换标签页回到历史页，不应该重新变成"每次都整表拉取"。

### Non-goals / 红线

- 不改动 `fullSyncFromD1`/`incrementalSyncFromD1`/`mergeIntoStorage`/`fetchAll` 的内部实现——本任务只是让 `pullAllFromD1` 多一个入口参数去选择已有的两条路径之一，不新增同步逻辑。
- 不改动 `src/hooks/useD1Sync.ts`——它调用 `pullAllFromD1()` 不传参，默认 `force = false`，行为不变，不需要动这个文件确认这一点即可。
- 不给 `HistoryPage.tsx` 里 `syncFromD1()`（mount / visibilitychange 路径）传 `force: true`——这是本任务最重要的红线，传了就会重新引入 TASK-137 要解决的"频繁切换标签页导致全量请求堆积"问题。
- 不新增 UI 提示（比如"已强制刷新"之类的 toast）——除非用户后续单独提出，这次只恢复函数语义。

### Verification steps

- `npx tsc --noEmit` 通过
- `npx eslint src/utils/d1Pull.ts src/features/history/app/HistoryPage.tsx src/utils/__tests__/d1Pull.test.ts` 无输出
- `npx jest d1Pull` 通过，新增两个测试用例：
  1. "60 秒内普通调用被节流，强制调用不被节流"：预置一个最近的 `d1_docs_last_sync_attempt_at`（模拟刚同步过），先调用 `pullAllFromD1()` 确认没有发起任何 fetch，再调用 `pullAllFromD1(true)` 确认发起了 fetch（六次，URL 不含 `since`）。
  2. "已有有效水位时，强制调用仍走全量路径并执行 push-check"：预置一个有效的 `d1_docs_sync_watermark` 和最近的 `d1_docs_last_full_sync_at`（模拟"正常情况下应该走增量"的状态），调用 `pullAllFromD1(true)`，验证请求总数是 12 次（push-check 6 次 + 主 pull 6 次）且没有一个 URL 带 `since` 参数——用这个信号证明 `pushLocalDocsToD1` 真的执行了，而不是被跳过直接进了增量分支。有余力的话可以进一步验证：本地放一条 D1 mock 响应里不存在的孤儿单据，强制同步后确认 `d1_pending_syncs` 队列或 fetch 记录里出现过针对该 id 的 `POST /api/documents`。
- 手动验证：历史页连续切走再切回浏览器标签页几次（模拟 visibilitychange），确认 Network 面板里不会每次都出现 12 个请求，只有偶发的节流内跳过或增量的 6 个请求；随后点一次"同步刷新"按钮，确认这次一定能看到 12 个请求（或至少确认不带 `since` 参数）。

**Status:** completed

## TASK-139：询报价四张登记表共享同步水位（按权限分组），跨页面切换不再各自整表拉取

**状态**：已完成（2026-07-11）
**背景来源**：用户发现询报价登记/订单状态表/采购部登记/采购订单表这四个页面，哪怕是同一个用户在同一次浏览器会话里依次点开，每进一个页面都会各自触发一次整表拉取，问"是不是这样"，排查确认属实。用户特别要求：这次修复要考虑到不同权限/视图之间的正确处理，不能简单粗暴共用一份水位。

### 背景（根因）

`useInquirySync`（`src/features/inquiry/hooks/useInquirySync.ts`）目前被 4 个页面各自独立调用一次：

| 页面 | 权限模块 | `mergeLocal` | `pushLocal` | 视图 |
|---|---|---|---|---|
| `InquiryPage.tsx`（询报价登记） | `inquiry` | `true`（默认） | `true`（默认） | 完整字段（客户视角，含 `quotedStatuses`/`customerId`/`inquirer` 等） |
| `OrderPage.tsx`（订单状态表） | `inquiry`（`hasOrderAccess` 读的也是 `inquiry` 权限） | `true`（默认） | `true`（默认） | 完整字段 |
| `PurchaseRegistrationPage.tsx`（采购部登记） | `purchaseRegistration` | `false` | `false` | 受限视图（服务端裁剪掉部分字段，见 `bug_inquiry_restricted_view_cache_corruption`） |
| `PurchaseOrderRegistrationPage.tsx`（采购订单表） | `purchaseRegistration` | `false` | `false` | 受限视图 |

`syncWatermarkRef`/`lastFullSyncAtRef`（TASK-128 引入）都是组件级 `useRef`，只在这一个页面组件的挂载周期内有效。这四个页面是四个不同的路由组件，客户端路由切换时前一个组件卸载、后一个组件重新挂载，所有 ref 都会回到初值，`useEffect` 里第 143 行 `void fullSync();` 会无条件重新跑一次整表拉取（含 `flushPendingSyncs` + 视情况 `pushLocalToD1` + `pullFromD1()` 整表 + `mergeFromD1`/`mergeFieldsOnly`）。哪怕用户几分钟内把四个页面依次点一遍，也是四次整表拉取，水位在页面之间完全不共享——这跟 TASK-137 修复前 documents 同步的问题是同一类根因（状态存在内存里，一"卸载重装"就当从零开始），但比 documents 那次更容易触发：不需要刷新页面或新开 tab，切一下路由就现踪。

**这次不能像 TASK-137/138 一样简单粗暴地做成"一份持久化水位、四个页面共用"**，原因是 `mergeLocal:true` 和 `mergeLocal:false` 两组页面需要的字段完整度不一样：

- 如果用一份共享水位，某个用户先访问了受限视图页面（比如 `PurchaseRegistrationPage`，只做过 `mergeFieldsOnly` 增量/全量合并），水位被推进到较新的时间点；紧接着该用户如果也有 `inquiry` 权限、切到 `InquiryPage`，如果直接信任这份"最近同步过"的水位去跳过自己的整表拉取、改走增量（`pullFromD1(since=水位)`），那些**最近没有变化、但历史上只被受限视图污染过（缺 `quotedStatuses` 等字段）**的记录不会出现在这次增量响应里，`mergeFromD1` 里专门为这种情况写的自愈逻辑（约 364-372 行，"即便 updatedAt 没有变化也要用完整视图响应补全字段"）根本没有机会触发——因为这条记录压根不在增量响应集合里。结果是 `InquiryPage` 第一次挂载就被"优化"成了增量同步，但本地缓存里一堆历史记录还缺着字段，界面上会看到不完整的数据，且没有任何后续时机能自愈（要等 1 小时强制整表兜底才会修复）。
- 反过来（`InquiryPage` 先同步过、水位很新，`PurchaseRegistrationPage` 复用这份水位跳过整表）方向上其实是安全的（完整字段是受限字段的超集，`mergeFieldsOnly` 是字段级 upsert，不会因为拿到"更多字段"的记录而出问题）。但为了避免实现时把这个方向性判断搞反（这个仓库过去半年至少两次因为类似的"缺席"/"字段裁剪"边界条件出过线上 bug，见 `bug_inquiry_restricted_view_cache_corruption`、`bug_inquiry_merge_pending_protection`），**本任务明确要求两组视图各自维护独立的持久化水位，互不复用**，哪怕这意味着"完整视图 → 受限视图"这个理论上安全的方向也放弃优化。这是本任务最重要的设计决策，Codex 实现时不要"顺手"把两组合并成一份或做成"取较新的那个"。

分组规则：`mergeLocal === true` 的页面（`InquiryPage`、`OrderPage`）共享一组水位；`mergeLocal === false` 的页面（`PurchaseRegistrationPage`、`PurchaseOrderRegistrationPage`）共享另一组。两组之间不互相读取对方的水位。

### Files in scope

- `src/features/inquiry/services/inquiry.service.ts` —— 新增按视图分组的水位/上次整表同步时间读写函数
- `src/features/inquiry/hooks/useInquirySync.ts` —— 挂载时改成"先看本组是否有新鲜的持久化水位，有就走增量，没有才整表"；`fullSync`/`refreshMetaMemory` 成功后把水位/整表同步时间写回对应分组
- `src/features/inquiry/services/__tests__/inquiry.service.test.ts` —— 补新增函数的单测
- 新建 `src/features/inquiry/hooks/__tests__/useInquirySync.test.ts`（当前不存在）—— 覆盖"同组共享水位跳过整表"和"跨组不共享"两个场景

### 具体改动要求

**1. `src/features/inquiry/services/inquiry.service.ts` —— 新增分组水位读写**

新增（放在 `getMeta`/`getSyncStatus` 附近即可），用 `isFullView: boolean` 区分分组（`true` 对应 `mergeLocal:true` 的完整视图组，`false` 对应 `mergeLocal:false` 的受限视图组），不要引入新的字符串枚举增加不必要的复杂度：

```ts
const SYNC_WATERMARK_KEY_FULL = 'inquiry_sync_watermark_full';
const SYNC_WATERMARK_KEY_RESTRICTED = 'inquiry_sync_watermark_restricted';
const LAST_FULL_SYNC_AT_KEY_FULL = 'inquiry_last_full_sync_at_full';
const LAST_FULL_SYNC_AT_KEY_RESTRICTED = 'inquiry_last_full_sync_at_restricted';

// 挂在 inquiryService 对象上，风格跟现有的 getSyncStatus/getPendingSyncIds 一致
getSyncWatermark(isFullView: boolean): string | null { ... }
setSyncWatermark(isFullView: boolean, iso: string): void { ... }
getLastFullSyncAt(isFullView: boolean): number { ... }
setLastFullSyncAt(isFullView: boolean, ts: number): void { ... }
```

`typeof window === 'undefined'` 时读函数返回 `null`/`0`，写函数直接 return，跟 `d1Sync.ts` 里对应函数的写法一致。

**2. `src/features/inquiry/hooks/useInquirySync.ts` —— 挂载逻辑改造**

第 143 行 `void fullSync();` 替换为：

```ts
const persistedWatermark = inquiryService.getSyncWatermark(mergeLocal);
const persistedLastFullSyncAt = inquiryService.getLastFullSyncAt(mergeLocal);
const hasFreshBaseline =
  Boolean(persistedWatermark) &&
  Date.now() - persistedLastFullSyncAt <= FORCE_FULL_SYNC_EVERY_MS;

async function initialSync() {
  if (hasFreshBaseline) {
    syncWatermarkRef.current = persistedWatermark;
    lastFullSyncAtRef.current = persistedLastFullSyncAt;
    await incrementalSync();
  } else {
    await fullSync();
  }
}

void initialSync();
```

复用现有的 `FORCE_FULL_SYNC_EVERY_MS`（1 小时）常量做"水位是否新鲜"的判断，不要另外发明一个新的时间阈值。`hasFreshBaseline` 的两个读取（`getSyncWatermark`/`getLastFullSyncAt`）要在 effect 一开始就做（跟 `persistedWatermark`/`persistedLastFullSyncAt` 一起），不要放进 `initialSync()` 内部再读，避免每次 `enabled`/`mergeLocal`/`pushLocal` 变化重新跑这个 effect 时基准不一致（实际上目前这几个依赖值在单个页面生命周期内不会变，这里只是保持读取时机清晰）。

`refreshMetaMemory()`（约第 57-64 行）加一行持久化：

```ts
async function refreshMetaMemory() {
  const meta = await inquiryService.getMeta();
  if (!cancelled && meta.count >= 0) {
    lastMetaRef.current = getMetaKey(meta);
    if (meta.maxUpdatedAt) {
      syncWatermarkRef.current = meta.maxUpdatedAt;
      inquiryService.setSyncWatermark(mergeLocal, meta.maxUpdatedAt);
    }
  }
}
```

`fullSync()`（约第 67-89 行）里 `lastFullSyncAtRef.current = Date.now();` 那一行后面加一行：

```ts
lastFullSyncAtRef.current = Date.now();
inquiryService.setLastFullSyncAt(mergeLocal, lastFullSyncAtRef.current);
```

`incrementalSync()` 不需要单独处理"上次整表同步时间"（它本来就不代表一次整表同步），末尾已有的 `await refreshMetaMemory();` 调用会顺带把水位持久化，足够了。

`checkAndMaybeSync()`、`POLL_INTERVAL_MS`、`FORCE_FULL_SYNC_EVERY_MS` 的值、`pushLocalToD1`/`mergeFromD1`/`mergeFieldsOnly` 的调用逻辑本身均不改动。

### Acceptance criteria

- **同组共享水位生效**：模拟同一用户在 1 小时内依次访问 `InquiryPage` → `OrderPage`（都是 `mergeLocal:true`），第二个页面挂载时应该读到第一个页面写入的水位，走 `incrementalSync()` 而不是 `fullSync()`（可以通过 mock `inquiryService.pullFromD1` 断言调用参数：第一次是 `pullFromD1()`（无参，整表），第二次是 `pullFromD1(<水位>)`）。`PurchaseRegistrationPage` → `PurchaseOrderRegistrationPage`（都是 `mergeLocal:false`）同理。
- **跨组不共享（核心安全要求）**：`PurchaseRegistrationPage`（受限视图）先同步过、写入了受限组的水位；紧接着挂载 `InquiryPage`（完整视图），必须仍然走 `fullSync()`（整表拉取），不能因为受限组水位新鲜就跳过——用 mock 断言 `InquiryPage` 对应的 hook 实例第一次调用 `pullFromD1` 时没有传 `since` 参数。反过来（完整视图先同步、受限视图页面挂载）同样必须独立走自己的 `fullSync()`，不复用完整视图组的水位。
- 水位/上次整表同步时间没有持久化状态时（比如全新浏览器、清过缓存），任意一个页面首次挂载的行为和改动前完全一致：走一次整表 `fullSync()`。
- 距离上次整表同步超过 1 小时（`FORCE_FULL_SYNC_EVERY_MS`），即使同组水位存在，也应该重新走 `fullSync()` 而不是无限期信任旧水位（复用现有常量，不新增阈值）。
- 页面内的周期轮询（`checkAndMaybeSync`，30/60 秒探测 + 1 小时强制整表兜底）行为不变，不受这次挂载逻辑改造影响。
- 4 个调用方（`InquiryPage.tsx`/`OrderPage.tsx`/`PurchaseRegistrationPage.tsx`/`PurchaseOrderRegistrationPage.tsx`）传给 `useInquirySync` 的参数（`enabled`/`suspended`/`pushLocal`/`mergeLocal`）不需要改动。

### Non-goals / 红线

- **不做跨组水位复用**，哪怕"完整视图水位喂给受限视图"这个方向理论上是安全的（`mergeFieldsOnly` 字段级 upsert 能扛住），也不要顺手做这个优化——本任务的红线是两组水位严格独立，见上面背景部分的详细论证。
- 不改动 `mergeFromD1`/`mergeFieldsOnly`/`pushLocalToD1`/`flushPendingSyncs`/`pullFromD1`/`getMeta` 这些既有函数的内部逻辑。
- 不改动 `POLL_INTERVAL_MS`（60 秒）、`FORCE_FULL_SYNC_EVERY_MS`（1 小时）这两个常量的值。
- 不改动 `checkAndMaybeSync` 的判断逻辑本身（探测失败/强制整表周期走 `fullSync`，meta 变化走 `incrementalSync`），只改挂载时"第一次该走哪条路径"的判断。
- 不新增"退出登录/切换账号清空询价本地缓存"的逻辑——`inquiry_records`/`inquiry_deleted_ids`/`inquiry_pending_syncs` 目前本来就没有像 documents 那边 `d1_active_user_id`/`clearD1DocumentLocalState` 那样的按用户清理机制（同一浏览器换账号登录，询价本地缓存不会被清空），这是一个已经存在、本任务之外的独立问题，不在这次修复范围内，但新增的这两组水位 key 要跟现状保持一致（不额外发明只给这两个 key 用的清理逻辑，避免行为不一致）。发现这个问题后建议后续单独开一个 TASK 处理。
- 不改动 `src/worker.ts` 的 `/api/inquiry`、`/api/inquiry/meta` 相关 handler。
- 不改动 4 个页面组件传给 `useInquirySync` 的参数取值。

### Verification steps

- `npx tsc --noEmit` 通过
- `npx eslint src/features/inquiry/services/inquiry.service.ts src/features/inquiry/hooks/useInquirySync.ts` 无输出（连同新增测试文件一起过一遍 eslint）
- `npx jest inquiry.service` 通过，新增覆盖 `getSyncWatermark`/`setSyncWatermark`/`getLastFullSyncAt`/`setLastFullSyncAt` 的读写和 `isFullView` 分组隔离（`isFullView:true` 写入不影响 `isFullView:false` 读出，反之亦然）。
- `npx jest useInquirySync`（新建，用 `renderHook` + `jest.mock('../services/inquiry.service')`）通过，至少覆盖 Acceptance criteria 里"同组共享跳过整表"和"跨组不共享"这两个场景——断言方式建议直接 spy `inquiryService.pullFromD1` 的调用参数（有没有传 `since`），比断言最终 merge 结果更直接可靠。
- 手动验证：登录后依次点开询报价登记→订单状态表，用浏览器 Network 面板确认第二个页面只发了 `GET /api/inquiry?...&since=...`（增量），不是整表；再点开采购部登记，确认这次因为跨组不复用水位，仍然发起了一次不带 `since` 的整表请求。

**Status:** completed

## TASK-140：登录/改密码/建用户改用 Web Crypto PBKDF2，替换 bcryptjs，消除 Cloudflare Workers Free 版 CPU 超限风险

**状态**：进行中（代码完成，待生产部署与手动重建账号）
**背景来源**：用户把 `lc.luocompany.net`（Netlify 备用站）部署好之后，问 Worker 免费额度用得怎样。查 Cloudflare Dashboard「指标」页发现过去 24 小时 CPU 时间 P50 1.53ms 还算健康，但 P90 已到 12.39ms、P99 30.5ms、P999 图表尖峰到 ~130ms——已经明显超过官方文档写的 Free 版「每次调用 10ms CPU 硬上限」（[Workers Limits](https://developers.cloudflare.com/workers/platform/limits/)）。当时错误数是 0，查证是因为 Cloudflare 对偶发超限有「isolate 内建 flexibility」的容忍度，只有**持续性**超限才会真的触发 `Error 1102`（Dashboard 里对应 Metrics → Errors → Invocation Statuses → Exceeded CPU Time Limits）。用户确认账号是 Free 版，要求「从根上解决」，并明确表示**可以把现有 D1 `User` 表数据全部删除、重新建号**，不需要考虑新旧密码哈希格式兼容迁移。

### 背景（根因）

CPU 尖峰的根因是 `bcryptjs`（纯 JS 实现的 bcrypt，没有原生绑定）用在了 4 处密码哈希/校验：

| 位置 | 函数 | 用途 | 触发频率 |
|---|---|---|---|
| `src/worker.ts` L2 | `import bcrypt from 'bcryptjs'` | — | — |
| `src/worker.ts` `handleUserAuth`（约 L491-512，路由 `POST /api/auth/d1-users`） | `bcrypt.compare(password, user.password)` | 登录校验密码 | 每次真实用户名密码登录（NextAuth `silent-refresh` 走的是另一条不带密码的接口，不经过这里） |
| `src/worker.ts` `handleCreateUser`（约 L1079-1080） | `bcrypt.hash(password, 10)` | 管理员创建新用户 | 低频 |
| `src/lib/d1-client.ts` L1 | `import bcrypt from 'bcryptjs'` | — | — |
| `src/lib/d1-client.ts` `validatePassword`（约 L249-264） | `bcrypt.compare(currentPassword, user.password)` | 改密码前校验当前密码 | 低频 |
| `src/lib/d1-client.ts` `updatePassword`（约 L267-280） | `bcrypt.hash(newPassword, 10)` | 改密码写入新哈希 | 低频 |

cost factor 10 的 bcrypt 在纯 JS（无原生绑定）环境下单次操作通常要花 30-100ms+ CPU，这跟观测到的 P99/P999 尖峰量级吻合。登录频率不算高（团队几个人、session 30 天有效），所以目前只是「偶发」超限、还没真正触发 1102 错误，但 P90 已经摸到 12ms，说明相当比例的登录请求已经稳定超过硬上限，风险会随登录频率（比如两个站叠加、或者短时间内多人登录）上升而增大。

用户已确认可以清空重建账号，所以**不需要**做「新旧哈希格式并存、登录时按需迁移」那套兼容逻辑，直接切换算法即可，实现复杂度大幅降低。

### Files in scope

- 新建 `src/lib/password-hash.ts` —— 用 Cloudflare Workers 内置的 Web Crypto（`crypto.subtle`，运行时原生实现，不是 npm 包）实现 PBKDF2-SHA256 哈希与校验，替代 bcryptjs
- `src/worker.ts` —— 删除 `import bcrypt from 'bcryptjs'`；`handleUserAuth` 里 L491-512 的密码分支、`handleCreateUser` 里 L1079-1080 的哈希调用改用新模块
- `src/lib/d1-client.ts` —— 删除 `import bcrypt from 'bcryptjs'`；`validatePassword`（L249-264）、`updatePassword`（L267-280）改用新模块
- `package.json` / `package-lock.json` —— 跑 `npm uninstall bcryptjs` 移除依赖（全仓库已确认只有这两个源文件引用 bcryptjs，其余命中都是 `docs/`、`package-lock.json`、`README.md` 里的文字提及，不需要改）

### 具体改动要求

**1. 新建 `src/lib/password-hash.ts`**

自描述存储格式：`pbkdf2$<iterations>$<base64url salt>$<base64url hash>`，方便以后再换算法时能识别旧格式。核心实现：

```ts
const ITERATIONS = 100_000; // 起点值，见下方「验收标准」里的实测要求，必要时调低
const SALT_BYTES = 16;
const HASH_BYTES = 32; // 256 bit

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    HASH_BYTES * 8
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await pbkdf2(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${toBase64Url(salt)}$${toBase64Url(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!stored || !password) return false;
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iterations = Number(parts[1]);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;
  try {
    const salt = fromBase64Url(parts[2]);
    const expected = fromBase64Url(parts[3]);
    const actual = await pbkdf2(password, salt, iterations);
    return constantTimeEqual(actual, expected);
  } catch {
    return false; // 格式损坏/非法 base64 时按校验失败处理，不抛异常
  }
}
```

`toBase64Url`/`fromBase64Url`/`constantTimeEqual` 自己实现（Workers 运行时没有 Node 的 `Buffer`，用 `btoa`/`atob` 或手写字节转换均可；`constantTimeEqual` 要逐字节异或比较、不能提前 return，避免时序攻击）。`verifyPassword` 对任何格式不对的输入（比如空字符串、被截断的历史脏数据）都必须返回 `false` 而不是抛异常，调用方（`handleUserAuth`/`validatePassword`）不需要额外包一层 `try/catch`。

**2. `src/worker.ts` 改造**

- 删除 `import bcrypt from 'bcryptjs'`（L2），改为 `import { hashPassword, verifyPassword } from './lib/password-hash'`。
- `handleUserAuth` 里 L491-512 那段「bcrypt 格式走 bcrypt.compare / 明文走 `===`」的分支，改成统一调用 `await verifyPassword(password, user.password)`。**顺手去掉明文密码回退分支**（现有的 `else if (password === user.password)`）——账号即将全部清空重建，新建号只会写入 `pbkdf2$...` 格式，保留明文比较分支只是徒增攻击面，不用为了「兼容」保留。
- `handleCreateUser` 里 L1079-1080 的 `bcrypt.hash(password, 10)` 改成 `await hashPassword(password)`。

**3. `src/lib/d1-client.ts` 改造**

- 删除 `import bcrypt from 'bcryptjs'`（L1），改为 `import { hashPassword, verifyPassword } from './password-hash'`。
- `validatePassword`（L249-264）：把 bcrypt 分支和明文回退分支（L262-263 `return currentPassword === user.password`）都替换成 `return await verifyPassword(currentPassword, user.password)`，同样理由——不保留明文回退。
- `updatePassword`（L267-280）：`bcrypt.hash(newPassword, 10)` 改成 `await hashPassword(newPassword)`。

**4. 依赖清理**

`npm uninstall bcryptjs`，确认 `package.json`/`package-lock.json` 里 `bcryptjs` 条目消失，`npm run build` 仍然通过。

### Acceptance criteria

- 登录（`POST /api/auth/d1-users`）、管理员创建用户、用户改密码三条路径全部改用 `password-hash.ts`，代码里不再出现任何 `bcrypt`/`bcryptjs` 引用。
- `verifyPassword` 对空密码、空/损坏的存储哈希、非 `pbkdf2$...` 格式的输入统一返回 `false`，不抛异常导致对应 handler 返回 500。
- 新建用户/改密码后写入 D1 的 `password` 字段格式为 `pbkdf2$<iterations>$<salt>$<hash>`。
- **迭代次数需要实测调优**：本地 `npx wrangler dev` 或部署后用 Wrangler CPU profiling（`https://developers.cloudflare.com/workers/observability/dev-tools/cpu-usage/`）量一下 `hashPassword`/`verifyPassword` 单次实际 CPU 耗时。目标是让单次操作明显低于 10ms 硬上限、留出安全边际（比如控制在 3-5ms 以内）。如果 100,000 次迭代实测超出这个范围，调低迭代次数直到达标，并在 PR/commit 里写清楚最终选定的迭代次数和对应实测 CPU 时间。
- 部署（`npx wrangler deploy`）后 24-48 小时，回到 Cloudflare Dashboard「指标」页确认 CPU 时间 P99 相比修复前的 30.5ms 有明显下降。

### 部署后的手动步骤（不在 Codex 实现范围内，需要用户本人执行）

这一步涉及生产数据库操作，Codex 完成代码改动、验证通过、`wrangler deploy` 之后，需要用户手动清空并重建账号：

1. 清空 `User` 表（顺带清对应的 `Permission` 行，避免留下孤儿权限记录）：
   ```
   npx wrangler d1 execute mluonet-users --remote --command "DELETE FROM Permission WHERE userId NOT IN (SELECT id FROM User WHERE 1=0);"
   npx wrangler d1 execute mluonet-users --remote --command "DELETE FROM Permission;"
   npx wrangler d1 execute mluonet-users --remote --command "DELETE FROM User;"
   ```
   （第一条其实是多余的防御性写法，直接跑后两条「先删 Permission 再删 User」即可，避免外键孤儿数据。）
2. 通过管理后台「新建用户」界面（会走到改造后的 `handleCreateUser`，自动用新算法哈希）重新创建所有账号，包括至少一个管理员账号。
3. 用新账号在 Vercel 站和 Netlify 备用站各登录一次，确认都能正常登录、权限正常。

### Non-goals / 红线

- 不做 bcrypt 旧哈希兼容/自动迁移逻辑——用户已明确可以清空重建，不需要这个复杂度，Codex 不用「顺手」加。
- 不改动 `checkAuthRateLimit`（登录限流）逻辑。
- 不改动 NextAuth 侧（`src/lib/auth.ts`）的 session/JWT/`silent-refresh` 逻辑，这次只动 Worker 侧密码哈希算法本身。
- 不改动 `Permission` 表结构或权限校验逻辑。
- 不引入额外的第三方哈希库（`crypto.subtle` 是 Workers 运行时内置全局对象，不需要 polyfill 或新增 npm 依赖）。
- 清空/重建 D1 `User` 表数据是用户手动执行的运维操作，不要在代码或脚本里加自动清库逻辑。

### Verification steps

- `npx tsc --noEmit` 通过
- `npx eslint src/lib/password-hash.ts src/worker.ts src/lib/d1-client.ts` 无输出
- 补 `src/lib/__tests__/password-hash.test.ts`（新建）：覆盖「哈希后能校验通过」「错误密码校验失败」「格式损坏的 stored 值返回 false 而不抛异常」「两次哈希同一密码 salt 不同、结果不同」
- `npm run build` 通过
- 本地 `npx wrangler dev` 手动跑一遍登录/创建用户/改密码三个流程，确认功能正常
- 用 Wrangler CPU profiling 或部署后 Dashboard 实测新哈希函数的单次 CPU 耗时，写进 commit message 或 PR 描述

### 实施记录（2026-07-11）

- 已新增 Web Crypto PBKDF2-SHA256 哈希模块，并完成登录、创建用户、修改密码三条调用路径替换；明文与 bcrypt 回退均已移除。
- 最终迭代次数为 `60,000`。本地 workerd 单操作实测：哈希 3–4ms；校验热态 3–4ms、首次约 6ms；Wrangler 整请求约 4–7ms（含路由和响应开销）。100,000 次时热态约 6ms，故按目标下调。
- `bcryptjs` 已从 `package.json` / `package-lock.json` 移除。
- `password-hash.test.ts` 9 项测试、`npx tsc --noEmit`、目标文件 ESLint、`npm run build` 均通过。
- 尚未执行 `npx wrangler deploy`：部署会使现有 bcrypt 账号立即失效，需要与生产 D1 清库和账号重建安排在同一切换窗口。

**Status:** in progress (implementation complete; production cutover pending)

## TASK-141：管理员开关自我保护 + 权限变更后目标用户自动生效（不需手动点刷新）

**状态**：已完成（代码与自动化验证完成，待部署后双账号手动验证）
**背景来源**：用户按 TASK-140 的方案清库重建了新管理员账号（`admin`）并登录测试，发现两个既有问题：（1）管理员在「用户详情」弹窗里可以直接把自己的管理员开关关掉，没有任何提示或拦截；（2）管理员改了某个用户的权限后，对方要自己手动点「刷新权限」才会生效，没有自动检测机制。用户要求分析方案，确认后要求合并成一个任务。

### 背景（根因）

**问题一**：`src/features/admin/components/UserDetailModal.tsx` 里删除用户按钮（L273-285）已经做了自我保护——`disabled={isBusy || isCurrentUser}`，配 `title="不能删除当前登录用户"`。但管理员开关（L166-175）漏了同样的判断：

```tsx
<Toggle on={isAdmin} onChange={toggleAdmin} color="bg-blue-600" disabled={isBusy} />
```

`isCurrentUser`（L120，`currentUserId === user.id`）这个变量在同一个组件里已经算出来了，只是没有接到这个开关上——是实现时的遗漏，不是设计上故意允许自我降权。

**问题二**：项目用的是 NextAuth JWT session（`src/lib/auth.ts`，`session.strategy: 'jwt'`），没有服务端 session 存储。token 里的 `permissions`/`isAdmin` 只在登录那一刻写入，之后除非：(a) 30 天 token 过期重新登录，或 (b) 本人主动触发——现成的 `usePermissionRefresh`（`src/hooks/usePermissionRefresh.ts`）+「刷新权限」按钮（`PermissionRefreshButton.tsx`，已经挂在 `UserProfilePanel.tsx` L220）——否则不会更新。`providers.tsx` 里 `SessionProvider` 设了 `refetchInterval={5*60}`，但这只是每 5 分钟重新读一次当前 JWT 的 claims，不会触发后端重新查询 D1，解决不了这个问题。

服务端这边还有个不一致，会让「轮询检测变化」这个方案缺一个可靠信号：`D1UserClient.updateUser`（`src/lib/d1-client.ts` L119-142）改 `isAdmin`/`status` 时会顺手 `updatedAt = CURRENT_TIMESTAMP`；但 `handleUpdatePermissions`（`src/worker.ts` L849-918，路由 `PUT /api/admin/users/:id/permissions`）和 `handleBatchUpdatePermissions`（L920-992，路由 `POST /api/admin/users/:id/permissions/batch`）走的是 `updatePermission`/`batchUpdatePermissions`/`createPermission`（`d1-client.ts` L205-246），这几个方法只碰 `Permission` 表，完全不碰对应 `User.updatedAt`。也就是说光改模块权限开关（不动 isAdmin/账户状态），`User.updatedAt` 不会变。

### Files in scope

**问题一**：
- `src/features/admin/components/UserDetailModal.tsx` —— 管理员开关加自我保护

**问题二**：
- `src/lib/d1-client.ts` —— 新增 `touchUpdatedAt(userId)` 方法
- `src/worker.ts` —— `handleUpdatePermissions`/`handleBatchUpdatePermissions` 成功后调用 `touchUpdatedAt`
- 新建 `src/app/api/auth/permissions-meta/route.ts` —— 极简元信息接口，只返回当前登录用户的 `updatedAt`
- 新建 `src/hooks/usePermissionChangeWatcher.ts` —— 轮询检测 hook
- `src/app/providers.tsx` —— 挂载新 watcher

### 具体改动要求

**1. `UserDetailModal.tsx`：管理员开关自我保护**

```tsx
<Toggle
  on={isAdmin}
  onChange={toggleAdmin}
  color="bg-blue-600"
  disabled={isBusy || isCurrentUser}
/>
```

`Toggle` 这个本地小组件（L21-39）目前没有 `title` 透传，给它加一个可选 `title?: string` prop 并传给底层 `<button>`；管理员开关这里传 `title={isCurrentUser ? '不能修改自己的管理员身份，请让其他管理员操作' : undefined}`，跟删除按钮的提示文案风格保持一致。**做成禁用整个开关**，不要做成"允许关但弹确认框"——delete 按钮已经是"禁用"这个先例，保持一致，而且当前库里就一个 admin 账号，真误操作了又要走一遍 D1 手动改数据才能恢复，禁用比确认框更安全。

**2. `d1-client.ts`：新增 `touchUpdatedAt`**

放在 `updateUser` 方法附近：

```ts
async touchUpdatedAt(userId: string): Promise<void> {
  await this.db.prepare(
    `UPDATE User SET updatedAt = CURRENT_TIMESTAMP WHERE id = ?`
  ).bind(userId).run();
}
```

**3. `worker.ts`：权限变更后调用 `touchUpdatedAt`**

`handleUpdatePermissions`（约 L849-918）和 `handleBatchUpdatePermissions`（约 L920-992）里，`userId` 已经从路由里解析出来了（`url.pathname.split('/')[4]`）。在批量更新/新增权限的数据库调用**全部成功之后、返回响应之前**，加一行：

```ts
await d1Client.touchUpdatedAt(userId);
```

两个 handler 都要加，因为两条路由都能改权限。

**4. 新建 `src/app/api/auth/permissions-meta/route.ts`**

参考 `src/app/api/auth/get-latest-permissions/route.ts` 的写法（从 `getServerSession(authOptions)` 拿 `username`，用 `API_TOKEN` bearer 查 Worker `/api/admin/users?username=`），但只挑 `updatedAt` 字段返回，不做权限数组转换，保持这个接口尽量轻（避免每 90 秒轮询一次还带着完整权限数据序列化）：

```ts
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: '未授权访问' }, { status: 401 });
  }
  const userName = session.user.username || session.user.name || '';
  // ...查 Worker，取 userData.updatedAt...
  return NextResponse.json({ updatedAt: userData?.updatedAt ?? null });
}
```

**5. 新建 `src/hooks/usePermissionChangeWatcher.ts`**

思路跟项目里询报价同步那套「cheap meta 轮询、变了才拉全量」（`useInquirySync`/`checkAndMaybeSync`，见 TASK-128/137/139）保持一致，不要发明新模式：

- 只在 `document.visibilityState === 'visible'` 时轮询，间隔 90 秒；标签页切到后台时清掉 interval，切回前台时立即补一次检查（监听 `visibilitychange`）。
- 已知的 `updatedAt` 存 `localStorage`，key 用 `permissions_last_known_updated_at`（跟 `usePermissionRefresh.ts` 里已经在用的 `userCache`/`latestPermissions` 这类命名风格保持一致，不用 zustand store，因为这个值只是个比对基准，不需要参与渲染）。
- **首次拿到 `updatedAt` 只写入本地缓存、不触发刷新**（避免用户刚登录就自动刷新一次）。之后每次轮询，如果拿到的 `updatedAt` 跟本地缓存的不一样，调用 `usePermissionRefresh()` 返回的 `refresh(username)`——这个函数已经会清缓存、必要时 silent-refresh、toast 提示、800ms 后重载页面，直接复用，不要重新实现。
- 未登录（`session` 不存在）或 `usePermissionRefresh` 正在刷新中（`isRefreshing`）时不轮询。

**6. `providers.tsx`：挂载**

跟 `PermissionInitializer`/`D1SyncInitializer` 同样的模式：

```tsx
function PermissionChangeWatcher() {
  usePermissionChangeWatcher();
  return null;
}
```

加进 `<Providers>` 里 `<PermissionInitializer />` 旁边。

### Acceptance criteria

- 管理员打开「用户详情」编辑自己的账号时，管理员开关是禁用状态，鼠标悬浮能看到"不能修改自己的管理员身份"提示；编辑别的用户时开关正常可用。
- 管理员改了某用户的模块权限（走单个更新或批量更新任一路由）后，D1 里该用户的 `User.updatedAt` 会变化；改 isAdmin/账户状态的既有行为不受影响（`updateUser` 那条路径本来就会更新，不用动）。
- 目标用户不需要手动点「刷新权限」按钮，在权限变更后最长 90 秒 + 一次轮询周期内（页面保持在前台的情况下），页面应该自动检测到变化并触发跟点按钮完全一样的刷新流程（toast 提示 + 重载）。
- 标签页切到后台时不再发起轮询请求；切回前台立即补一次检查，不用等满 90 秒。
- 刚登录/首次挂载时不会误触发一次"权限已变更"的自动刷新。

### Non-goals / 红线

- 不做"检测到用户正在编辑表单，暂缓自动刷新"这类复杂度——直接复用 `usePermissionRefresh` 现有的 toast + 800ms 延迟重载行为，跟手动点按钮的体验保持一致，这是已知的取舍，不在本任务范围内解决。
- 不改动 `usePermissionRefresh.ts`/`PermissionRefreshButton.tsx` 内部逻辑，只是新增一个自动触发它的调用方。
- 不改动 `SessionProvider` 的 `refetchInterval`（5 分钟）配置。
- 不把权限元信息轮询做成全局共享单例跨标签页去重——多个标签页各自独立轮询即可，不必用 `BroadcastChannel` 之类的机制协调，避免过度设计。
- 轮询间隔固定 90 秒，不要做成可配置项。
- 不改动 D1 `Permission`/`User` 表结构。

### Verification steps

- `npx tsc --noEmit` 通过
- `npx eslint` 改动到的文件无输出
- 手动验证问题一：用当前登录的管理员账号打开自己的详情弹窗，确认开关禁用+提示文案；打开别的用户详情，确认开关正常。
- 手动验证问题二：开两个浏览器（或一个普通窗口 + 一个隐私窗口）分别登录管理员和普通用户，管理员改普通用户的某个模块权限，观察普通用户那边的页面在无操作情况下最多 90 秒左右自动出现"权限刷新成功"提示并重载，新权限生效。
- 手动验证：把普通用户那个标签页切到后台几分钟再切回来，确认没有在后台持续发轮询请求（可以用浏览器 Network 面板配合 `visibilitychange` 观察），切回前台后能立刻补一次检查。
- `npm run build` 通过

### 实施记录（2026-07-11）

- 管理员编辑自己的账号时，管理员身份开关已禁用并提供悬浮提示；其他用户不受影响。
- 单个/批量权限更新成功后都会刷新目标用户 `User.updatedAt`；按用户名查询用户的 Worker 响应补充返回该字段。
- 新增 `/api/auth/permissions-meta` 和全局 `usePermissionChangeWatcher`：前台每 90 秒检查，后台暂停，回到前台立即补检；首次只建立基准，变化后复用既有权限刷新流程并显示 toast。
- watcher 在刷新前更新基准以避免重载循环；刷新失败时回滚基准，下一轮可以重试。
- watcher 5 项测试、`npx tsc --noEmit`、目标文件 ESLint、`npm run build` 均通过。

**Status:** completed (production dual-account verification pending deployment)

## TASK-142：登录成功后侧边栏提前出现，主内容区仍卡在登录表单，造成几秒"画面分裂"

**状态**：已完成（2026-07-11）
**背景来源**：用户在 `lc.luocompany.net` 登录后反馈"登陆后，它有好几秒时间都愣在这个画面"，并附截图：侧边栏导航已经完整渲染（首页/外贸报价/…/用户名 roger 都在），但主内容区仍显示登录表单（用户名 roger、密码点、"登录 →"按钮），持续几秒才跳转到实际首页。

### 背景（根因）

`src/components/layout/DesktopSidebarHost.tsx`（L13-20）是挂在根 `Providers` 里的全局单例（`src/app/providers.tsx` L43，`src/app/layout.tsx` L47-50 确认 `Providers` 包住所有路由，包括登录页 `/`），渲染条件只看 `useSession().status === 'authenticated'`，不看当前路由：

```tsx
export function DesktopSidebarHost() {
  const { status } = useSession();
  ...
  if (status !== 'authenticated') {
    return null;
  }
  return <AppSidebar ... />;
}
```

组件注释写的是"登录页（未认证）不渲染"——这个假设在正常态下成立，但没考虑登录**瞬间**的过渡态：

1. 用户在 `/`（`src/app/page.tsx`）提交表单，`handleSubmit`（L64-103）里 `signIn('credentials', { redirect: false, ... })` 成功后，NextAuth 客户端会话状态几乎立刻从 `unauthenticated` 变成 `authenticated`（cookie 已写入，`useSession()` 内部重新 fetch `/api/auth/session` 完成）。
2. `DesktopSidebarHost` 只依赖这个全局 `status`，一变成 `authenticated` 立刻渲染完整侧边栏——**不管当前路由还停在哪**。
3. 与此同时，`page.tsx` L94-95 调用 `router.push(callbackUrl)`（默认 `/dashboard`）做客户端跳转。这个跳转不是瞬时的：要经过 `src/middleware.ts` 的 `withAuth`（服务端重新校验 JWT cookie）、拉取 `/dashboard` 的路由数据并渲染，本身可能耗时几百毫秒到几秒（尤其 Netlify Functions 冷启动时更明显）。
4. 在这几秒的窗口里，`page.tsx` 仍然挂载着、仍在渲染登录表单，而 `DesktopSidebarHost` 已经因为 `status === 'authenticated'` 提前渲染出完整侧边栏——两者叠在一起，就是用户截图看到的"侧边栏已经在，主内容区还是登录表单"的分裂画面。

也就是说这不是登录变慢，而是侧边栏的显示时机比路由跳转本身领先了一步，纯前端渲染时序 bug，跟 Cloudflare Worker/D1 无关，不需要动后端。

### Files in scope

- `src/components/layout/DesktopSidebarHost.tsx` —— 渲染条件加上路径判断

### 具体改动要求

`DesktopSidebarHost` 增加 `usePathname()`（`next/navigation`），只要当前路径是登录页 `/`（对照 `src/middleware.ts` L6 的 `PUBLIC_ROUTES` 里 `'/'` 这一项，登录表单只在这个路径渲染），就不渲染侧边栏，即便 `status` 已经是 `authenticated`：

```tsx
'use client';

import { Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useSidebarCollapse } from '@/contexts/SidebarCollapseContext';
import { useAppUser } from '@/hooks/useAppUser';
import { AppSidebar } from './AppSidebar';

export function DesktopSidebarHost() {
  const { status } = useSession();
  const pathname = usePathname();
  const { user, handleLogout } = useAppUser();
  const { collapsed, toggleCollapse } = useSidebarCollapse();

  if (status !== 'authenticated' || pathname === '/') {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <AppSidebar
        className="app-sidebar hidden lg:flex"
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
        user={user}
        onLogout={handleLogout}
      />
    </Suspense>
  );
}
```

组件注释里"登录页（未认证）不渲染"那句话也顺手改成准确描述（比如"登录页不渲染（无论认证状态）"），避免以后又有人凭这句话去掉路径判断。

### Acceptance criteria

- 在 `/` 提交登录表单后，从提交到页面真正跳转到 `/dashboard` 这段时间里，侧边栏不应该出现——主内容区显示的登录表单（或"登录中…”状态）应该是画面上唯一内容，不会出现侧边栏+登录表单叠加的画面。
- 跳转完成、路由变为 `/dashboard`（或其他业务路由）后，侧边栏正常出现，跟改动前行为一致。
- 已登录用户直接访问 `/dashboard` 等业务路由（不经过登录表单），侧边栏渲染时机不受影响。
- 已登录用户手动在地址栏输入 `/` 访问登录页（`page.tsx` 里已有的 `useEffect` 会自动 `router.push('/dashboard')`），在这次自动跳转完成前，侧边栏也不应该出现（同一条路径判断规则自然覆盖这个场景）。

### Non-goals / 红线

- 不改 `src/app/page.tsx` 的跳转逻辑（`handleSubmit` 里的 `router.push` 和 `useEffect` 里的自动跳转），本任务只治标在侧边栏这一层，不重构登录跳转流程。
- 不改 `src/middleware.ts`、`src/lib/auth.ts`，跟 JWT/cookie/中间件校验逻辑无关。
- 不动 `MobileBottomTab`（这个是路由内组件，挂在 `AppLayout` 里，不是全局单例，不受此问题影响，见 `src/components/layout/AppLayout.tsx` L67）。
- 不引入额外的 loading/骨架屏之类的 UI，只是让侧边栏的渲染时机跟路由对齐。

### Verification steps

- `npx tsc --noEmit` 通过
- `npx eslint src/components/layout/DesktopSidebarHost.tsx` 无输出
- 手动验证：清缓存/隐私窗口登录一次，观察提交表单到跳转完成这段过程，确认不再出现侧边栏+登录表单叠加的画面；可以用浏览器 Network 面板的 Slow 3G 节流放大这个过渡窗口方便观察。
- 手动验证：已登录状态下正常在各业务路由间切换，侧边栏显示/隐藏（收起/展开）行为跟改动前一致，没有意外闪烁。
- `npm run build` 通过

**Status:** completed

## TASK-143：已登录设备重新打开 App，会先闪一下空白登录表单再进内页——过渡态改成 logo 展示

**状态**：已完成
**背景来源**：用户反馈"在已登陆过的电脑中，再打开app，它是停在这个界面几秒钟再进内页"，附截图：一个已安装的 PWA 窗口，标题栏显示 `lc.luocompany.net`，页面内容是完整的登录表单（"用户名"/"密码"两个空输入框 + "登录 →"按钮），但用户名密码都是空的占位符状态，停留几秒后才跳进应用内页。用户同时问：这个过渡页能不能改成 logo 图标展示。

### 背景（根因）

跟 [[TASK-142]] 是同一类问题（`page.tsx` 的登录相关渲染没有跟"认证状态是否已确定"对齐），但触发场景不同：TASK-142 是提交登录表单**之后**的跳转过渡，这一条是**打开 App 时会话还没检查完**的过渡。

`src/app/page.tsx` 现状：

```tsx
const { data: session, status } = useSession();   // L17
...
useEffect(() => {
  if (session && status === 'authenticated') {
    router.push('/dashboard');                     // L46-50
  }
}, [session, status, router]);

return (
  <div ...>
    ...
    <form onSubmit={handleSubmit}>...</form>        // L127 起，无条件渲染
  </div>
);
```

`useSession()` 的 `status` 有三种取值：`loading` → `authenticated`/`unauthenticated`。组件对 `status` 唯一的处理只有"变成 authenticated 时跳转"这个 `useEffect`，`return` 那部分**不管 `status` 是什么都无条件渲染完整登录表单**。

已登录设备重新打开这个已安装的 PWA 时：

1. 浏览器已经带着有效的 NextAuth JWT cookie，但 `useSession()` 第一次渲染（包括 SSR 和客户端 hydration 之后）`status` 必然是 `loading`——它要实际发一次请求去验证/解析这个 cookie 才知道是不是有效登录。
2. 这个验证请求没完成之前，组件已经把完整表单渲染出来了——空的用户名/密码框、"登录"按钮——这就是截图里看到的画面。
3. 等 `status` 变成 `authenticated`，上面那个 `useEffect` 才触发 `router.push('/dashboard')`，而这次跳转本身也需要时间（同 TASK-142 背景里提到的：过 middleware 校验 + 拉取 `/dashboard` 路由数据）。
4. 这两段时间加起来，就是用户说的"停在这个界面几秒钟"——不是登录变慢，是这几秒里页面上展示的内容不对：本该是"正在恢复你的登录状态"，却展示成了一个看起来要用户重新输入账号密码的空表单。

这不是 bug（没有走错逻辑，最终确实会自动跳进内页），是一个纯 UX 过渡态展示问题：`status === 'loading'`（以及已确定 `authenticated`、即将跳转）这两种情况下不应该展示登录表单本体。

### Files in scope

- `src/app/page.tsx` —— 按 `status` 区分渲染：`loading`/`authenticated`（跳转中）展示 logo 过渡态，只有 `unauthenticated` 才展示表单

### 具体改动要求

在 `return` 之前加一段分支，`status === 'loading'` 或 `status === 'authenticated'` 时，渲染一个只有 logo（复用现有 `LOGO_CONFIG.web.logo`，跟表单上方用的是同一张图）的居中过渡屏，不渲染表单：

```tsx
if (status === 'loading' || status === 'authenticated') {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center">
      <Image
        src={LOGO_CONFIG.web.logo}
        alt="LC APP"
        width={96}
        height={96}
        className="object-contain animate-pulse"
        priority
      />
    </div>
  );
}
```

- `animate-pulse` 是 Tailwind 自带的呼吸透明度动画，用来提示"正在处理"，不需要额外引入 spinner 组件；如果觉得太素，可以加一行更小号的浅色文字（比如"正在登录…"），但不是必须。
- `status === 'authenticated'` 这个分支存在的意义：即使会话已经确定登录成功，只要 `router.push('/dashboard')` 触发的跳转还没完成，也应该继续展示这个 logo 过渡态，而不是回落到表单——这正是 TASK-142 里 `DesktopSidebarHost` 场景之外，登录页自己这边的对应处理。
- 原有的表单 JSX（用户名/密码/错误提示/登录按钮）保留，只在 `status === 'unauthenticated'` 时才会走到这段渲染。
- 原有的两个 `useEffect`（全局错误处理、跳转逻辑）不用动，加的这段判断放在它们之后、`return` 表单 JSX 之前即可。

### Acceptance criteria

- 已登录设备（cookie 有效）重新打开/刷新 `/`，从页面出现到跳进 `/dashboard` 这段时间里，看到的是居中的 logo（可以有呼吸动画），**不会**再看到空的用户名/密码输入框一闪而过。
- 未登录设备（无 cookie 或 cookie 已过期）访问 `/`，`status` 最终稳定为 `unauthenticated`，正常展示登录表单，可以正常输入账号密码登录——这段体验跟改动前完全一致。
- 提交表单登录成功后（`status` 从 `unauthenticated` 变成 `authenticated`）到 `router.push(callbackUrl)` 跳转完成之间，也会展示同一个 logo 过渡态，不会出现"提交按钮变成登录中"的表单还留在画面上、同时又在悄悄跳转的中间态。
- 不影响手机端/移动端浏览器打开同一登录页的表现（这段改动跟屏幕尺寸、`AppLayout`/`MobileBottomTab` 都无关，纯粹是登录页自身的条件渲染）。

### Non-goals / 红线

- 不解决"会话校验请求本身要花多久"这个问题——比如 Netlify Functions 冷启动、`getToken` 校验耗时等，这些是网络/后端层面的延迟，本任务只解决"这段等待时间里页面展示什么"，不做性能优化。
- 不改 `useSession()`/NextAuth 的配置（`src/lib/auth.ts`）、不改 `SessionProvider` 的 `refetchInterval`。
- 不改动提交表单的 `handleSubmit` 逻辑本身（`signIn` 调用、错误处理、`loading` state 这些保持不动）。
- 不新增依赖（不引入额外的 spinner/loading 组件库），用 Tailwind 自带的 `animate-pulse` 即可。
- 跟 [[TASK-142]]（`DesktopSidebarHost` 路径判断）是两个独立改动，各自负责登录页和侧边栏各自的过渡态，不要合并成一次改动，方便分别验证、互不影响回滚。

### Verification steps

- `npx tsc --noEmit` 通过
- `npx eslint src/app/page.tsx` 无输出
- 手动验证：已登录状态下（浏览器保留 cookie）刷新 `/` 或重新打开已安装的 PWA，确认只看到 logo 过渡态、看不到空表单闪现；可以用 Network 面板节流（Slow 3G）放大这段过渡时间方便观察。
- 手动验证：清 cookie/隐私窗口访问 `/`，确认表单展示、输入、提交、错误提示（比如输错密码）都跟改动前一致。
- 手动验证：正常账号密码登录一次，观察提交后到跳进 `/dashboard` 之间也是 logo 过渡态，不是表单+loading按钮的状态残留。
- `npm run build` 通过

**Status:** completed

## TASK-144：普通用户配置了"内销报价合同"权限，访问内销报价/合同页面仍提示"没有外贸报价合同的访问权限"

**状态**：已完成
**背景来源**：用户在管理后台单独给某普通用户开了"内销报价合同"（`domesticQuotation`）权限，侧边栏也正常显示"内销报价"/"内销合同"菜单项，但点开后页面报错"权限不足：您没有外贸报价合同的访问权限"。

### 背景（根因）

`src/features/quotation/app/QuotationPage.tsx` L82 的页面级权限守卫写死检查 `quotation`（外贸）这一个模块，不区分当前 tab：

```tsx
const { ready: permissionReady, allowed: hasModuleAccess } = useModulePermissionGuard('quotation');
```

而侧边栏（`src/components/layout/AppSidebar.tsx` L74-77）和 migration 009（`migrations/009_split_domestic_quotation_permission.sql`，把 `domesticQuotation` 拆成独立权限位）早就把内销报价/合同（`tab=domestic`）和外贸报价/合同（`tab=quotation` / `tab=confirmation`）区分成两个权限模块了。`QuotationPage.tsx` 里唯一的页面守卫却没跟着拆分，永远只认 `quotation`。所以只要用户没有 `quotation` 权限——哪怕单独给了 `domesticQuotation`——一进 `/quotation` 页面（不管 URL 上 tab 是什么）都会被这道守卫拦截，L643 还写死了"您没有外贸报价合同的访问权限"这句提示，跟用户实际点的内销菜单对不上。

另外要注意：页面里的 `activeTab`（`useQuotationStore(sel.tab)`，L94）不能直接拿来判断该查哪个权限模块——`src/features/quotation/hooks/useInitQuotation.ts`（L20-32、L58-86）里 `setTab` 是在 `useEffect` 里异步把 URL 的 tab 同步进 store 的，首次渲染时 store 的 `tab` 还是默认值，跟 URL 对不上，会有一帧用错权限模块的竞态。判断权限时应该直接从 URL 同步取 tab（`useSearchParams()` + 已有的 `getTabFromSearchParams`，`src/features/quotation/services/quotation.service.ts` L185），不要依赖 store。

### Files in scope

- `src/features/quotation/app/QuotationPage.tsx` — L82 权限守卫改成按 tab 动态选择模块；L643 错误文案跟着区分内销/外贸；顶部 import 补 `useSearchParams` 和 `getTabFromSearchParams`

### 具体改动要求

1. 顶部 import（L5、L24 附近）补充：

```tsx
import { usePathname, useSearchParams } from 'next/navigation';
// ...
import { getHistoryTypeFromTab, saveOrUpdate, getTabFromSearchParams, type QuotationTab } from '../services/quotation.service';
```

（`useSearchParams` 加进已有的 `next/navigation` import；`getTabFromSearchParams` 加进已有的 `quotation.service` import，不用新起一行）

2. L77-82，在 `useModulePermissionGuard` 调用之前，从 URL 同步取当前 tab，据此选择要检查的权限模块：

```tsx
export default function QuotationPage() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, handleLogout } = useAppUser();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const currentTab = getTabFromSearchParams(searchParams || undefined);
  const requiredModuleId = currentTab === 'domestic' ? 'domesticQuotation' : 'quotation';
  const { ready: permissionReady, allowed: hasModuleAccess } = useModulePermissionGuard(requiredModuleId);
```

3. L642-644 错误提示跟着区分：

```tsx
  if (!hasModuleAccess) {
    return (
      <PermissionDenied
        message={currentTab === 'domestic' ? '您没有内销报价合同的访问权限' : '您没有外贸报价合同的访问权限'}
      />
    );
  }
```

### Acceptance criteria

- 普通用户只有 `domesticQuotation=1`、没有 `quotation` 权限时，访问 `/quotation?tab=domestic&docType=quotation` 和 `/quotation?tab=domestic&docType=contract`（内销报价、内销合同）都能正常打开，不再被拦截。
- 同一用户访问 `/quotation?tab=quotation`（外贸报价）或 `/quotation?tab=confirmation`（外贸合同）时，仍然正确显示"您没有外贸报价合同的访问权限"并拦截。
- 反过来，只有 `quotation=1`、没有 `domesticQuotation` 权限的用户，访问内销报价/合同时应显示"您没有内销报价合同的访问权限"并拦截；访问外贸报价/合同正常。
- 注：该口径已被 TASK-146 更新。管理员身份现在只控制后台管理入口，外贸/内销等业务模块仍需显式模块权限。
- 直接在地址栏输入 URL 首次进入内销报价/合同页面（非侧边栏点击切换、页面重新挂载）时也要正确放行，不能因为 store 里 `tab` 初始值还没被 `useInitQuotation` 的 effect 同步而误判成检查 `quotation` 权限。

### Non-goals / 红线

- 不改 `AppSidebar.tsx` 的菜单权限映射（`canCreateQuotation`/`canCreateDomesticQuotation`），那部分本来就是对的。
- 不改 migration 009 或 `src/constants/permissionModules.ts` 的权限模块注册表，权限拆分本身没问题，问题只在页面守卫没跟上。
- 不改 `src/hooks/useModulePermissionGuard.ts` 的实现（单模块检查的通用 hook 逻辑是对的，问题是 `QuotationPage.tsx` 传参写死了）。
- 不去动 `useQuotationStore` 里 `tab` 的默认值或 `useInitQuotation.ts` 的同步时序，本任务只是让权限判断改成直接读 URL，不需要也不应该改状态管理时序本身。

### Verification steps

- `npx tsc --noEmit` 通过
- `npx eslint src/features/quotation/app/QuotationPage.tsx` 无输出
- 手动验证（用后台给一个测试普通用户分别配置 `quotation`/`domesticQuotation` 两种权限组合）：
  - 只给 `domesticQuotation`：内销报价、内销合同可访问；外贸报价、外贸合同报"您没有外贸报价合同的访问权限"
  - 只给 `quotation`：外贸报价、外贸合同可访问；内销报价、内销合同报"您没有内销报价合同的访问权限"
  - 两个都给：四个都能访问
  - 两个都不给：四个都被拦截，文案跟对应类型匹配
  - 直接在地址栏输入 `/quotation?tab=domestic&docType=quotation`（不经过侧边栏点击）验证不会因为竞态误判
- `npm run build` 通过

**Status:** completed

## TASK-145：退出登录后，主内容区/侧边栏会冻结停留一段时间，才跳到登录页——补一个 logo 过渡态

**状态**：已完成（2026-07-11）
**背景来源**：用户反馈点击"退出登录"后，画面里业务页面（侧边栏+主内容区）还会停留一段时间，之后才跳到登录窗口，问是否也该像 [[TASK-142]]/[[TASK-143]] 那样在退出到登录页出现之间补一个 logo 过渡态。

### 背景（根因）

跟 TASK-142/143 是同一类"异步过渡态没人管"的问题，但方向相反、链路更长：

1. `src/components/layout/AppUserMenu.tsx` L273-283 的"退出登录"按钮点击直接调用 `onLogout()`（即 `src/hooks/useAppUser.ts` L21-35 的 `handleLogout`），点击瞬间没有任何本地过渡状态——按钮只是关掉下拉菜单，页面该长什么样还长什么样。
2. `handleLogout` 调用的是不带参数的 `signOut()`。NextAuth 默认行为：先 POST `/api/auth/signout` 清 session，然后用默认 `redirect: true` + 默认 `callbackUrl`（当前页面 URL，比如 `/dashboard`）做**整页刷新跳转**——不是 SPA 内部跳转。
3. 这段"清 session 请求 + 整页刷新"期间，浏览器按整页导航的默认行为，会一直冻结显示当前这页（侧边栏 + 主内容区），这就是用户看到的"主体部分还在"。
4. 整页刷新回到 `/dashboard` 后，`src/middleware.ts` 的 `withAuth` 发现没 session，又重定向到 `/?callbackUrl=%2Fdashboard`——等于**两次整页导航**才落到登录页 `/`。
5. 到了登录页，`src/app/page.tsx` L105-118（TASK-143 加的）才会显示 logo 过渡态——但前面两跳整页导航期间完全没有任何东西覆盖，logo 出现得太晚，跟用户描述的现象吻合。

修法思路（跟 TASK-142/143 的"控制过渡期展示什么"是同一类手法，但这里同时要收窄链路）：

- 把 `signOut()` 改成 `signOut({ redirect: false })` 之后手动 `router.push('/')`，跳过"整页刷新 `/dashboard` 再被中间件重定向到 `/`"这多余的一跳，改成一次 SPA 内部跳转（`DesktopSidebarHost.tsx` L20 本来就靠 `pathname === '/'` 隐藏侧边栏，`/page.tsx` 本来就靠 `useSession().status` 展示 logo/表单，两边逻辑都不用动）。
- 但即使去掉多余的整页跳转，点击到 `signOut()` 的 POST 请求返回、再到 `router.push('/')` 完成渲染之间，仍有一小段异步等待——这段时间业务页面还挂载着。所以要在点击"退出登录"的**瞬间**就铺一层全屏 logo 遮罩盖住当前页面（侧边栏+主内容区一起盖住），直到真正落到登录页且 session 状态确认为 `unauthenticated`（即登录表单该出现的时机）再收起遮罩，跟 `page.tsx` 自己的 logo 画面无缝衔接。

### Files in scope

- `src/hooks/useLogoutTransition.ts`（新建）—— 一个极简 Zustand store，只有 `isLoggingOut: boolean` 和 `setLoggingOut`，跟 `src/lib/permissions.ts` 用同一套 `create()` 写法
- `src/components/layout/LogoutTransitionOverlay.tsx`（新建）—— 全屏 logo 遮罩组件，读上面的 store
- `src/hooks/useAppUser.ts` —— `handleLogout` 改成先 `setLoggingOut(true)`，`signOut({ redirect: false })` 之后手动 `router.push('/')`；失败时 `setLoggingOut(false)` 并保留原有错误提示
- `src/app/providers.tsx` —— 挂载新的 `LogoutTransitionOverlay`（跟 `DesktopSidebarHost` 挂在同一层级）

### 具体改动要求

1. `src/hooks/useLogoutTransition.ts`：

```ts
import { create } from 'zustand';

interface LogoutTransitionState {
  isLoggingOut: boolean;
  setLoggingOut: (value: boolean) => void;
}

export const useLogoutTransitionStore = create<LogoutTransitionState>((set) => ({
  isLoggingOut: false,
  setLoggingOut: (value) => set({ isLoggingOut: value }),
}));
```

2. `src/components/layout/LogoutTransitionOverlay.tsx`：跟 `src/app/page.tsx` L105-118 的 logo 过渡态视觉保持一致（同一个 `LOGO_CONFIG.web.logo`、同样的 `animate-pulse`），全屏 fixed 定位、z-index 要盖过侧边栏和一切下拉菜单（`AppUserMenu` 用到 `z-[9999]`，这里用比它更高的值，比如 `z-[10000]`）：

```tsx
'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { LOGO_CONFIG } from '@/lib/logo-config';
import { useLogoutTransitionStore } from '@/hooks/useLogoutTransition';

export function LogoutTransitionOverlay() {
  const isLoggingOut = useLogoutTransitionStore((s) => s.isLoggingOut);
  const setLoggingOut = useLogoutTransitionStore((s) => s.setLoggingOut);
  const pathname = usePathname();
  const { status } = useSession();

  // 真正落到登录页、且 session 已确认为未登录（登录表单该出现的时机）才收起遮罩，
  // 跟 page.tsx 自己的 logo 画面无缝衔接，不会露出中间态。
  useEffect(() => {
    if (isLoggingOut && pathname === '/' && status === 'unauthenticated') {
      setLoggingOut(false);
    }
  }, [isLoggingOut, pathname, status, setLoggingOut]);

  if (!isLoggingOut) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex min-h-screen flex-col items-center justify-center bg-[var(--bg-primary)]">
      <Image
        src={LOGO_CONFIG.web.logo}
        alt="LC APP"
        width={96}
        height={96}
        className="object-contain animate-pulse"
        priority
      />
    </div>
  );
}
```

3. `src/hooks/useAppUser.ts`：补 `useRouter`、引入 store，`handleLogout` 改为：

```ts
import { useCallback, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { usePermissionStore } from '@/lib/permissions';
import { useLogoutTransitionStore } from './useLogoutTransition';
import { clearD1DocumentLocalState } from '@/utils/d1Sync';
import { useToast } from '@/components/ui/Toast';

export function useAppUser() {
  const permUser = usePermissionStore((state) => state.user);
  const { data: session } = useSession();
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const { showToast } = useToast();
  const router = useRouter();

  const user = {
    name: permUser?.username || session?.user?.name || session?.user?.username || '用户',
    isAdmin: permUser?.isAdmin ?? session?.user?.isAdmin ?? false,
    email: permUser?.email || session?.user?.email || null,
  };

  const handleLogout = useCallback(async () => {
    setLogoutError(null);
    useLogoutTransitionStore.getState().setLoggingOut(true);
    try {
      usePermissionStore.getState().clearUser();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('userCache');
        clearD1DocumentLocalState();
      }
      await signOut({ redirect: false });
      router.push('/');
    } catch (error) {
      useLogoutTransitionStore.getState().setLoggingOut(false);
      const message = error instanceof Error ? error.message : '退出登录失败，请稍后重试';
      setLogoutError(message);
      showToast(message, 'error');
    }
  }, [showToast, router]);

  return { user, handleLogout, logoutError };
}
```

4. `src/app/providers.tsx`：引入并挂载 `LogoutTransitionOverlay`，放在 `DesktopSidebarHost` 后面（同一层级，谁在前在后不影响，因为遮罩是 `fixed` 定位）：

```tsx
import { LogoutTransitionOverlay } from '@/components/layout/LogoutTransitionOverlay';
// ...
<DesktopSidebarHost />
<LogoutTransitionOverlay />
{children}
```

### Acceptance criteria

- 桌面端：在任意业务页面（比如 `/dashboard`、`/quotation`）点击侧边栏用户菜单里的"退出登录"，**点击的瞬间**就应该看到全屏 logo 遮罩盖住侧边栏和主内容区，不应该再看到业务页面内容冻结停留。
- 移动端：`MobileBottomTab.tsx` 里同一个"退出登录"入口（同样走 `onLogout` → `handleLogout`）行为一致，点击瞬间出现同一个 logo 遮罩。
- 遮罩出现后，应该只经过一次 SPA 内部跳转（不再是"整页刷新 `/dashboard` 再被中间件重定向到 `/`"这两跳），最终停在 `/`，遮罩收起后露出的是登录表单（`unauthenticated` 状态），不会露出中间态或空白。
- 退出登录整个过程中 URL 地址栏最多只变化一次（从原业务路径直接变成 `/`），不应该先短暂出现 `/dashboard`（说明还在走整页刷新那条旧路径）。
- `signOut` 请求失败（比如断网）时，遮罩应该收起、恢复原页面，并像现在一样弹出错误 toast（`showToast(message, 'error')`），不能卡在遮罩画面出不来。
- 不影响正常登录、`TASK-142`（侧边栏路径判断）、`TASK-143`（登录页 logo 过渡）已有行为——用普通登录（不经过退出）访问业务路由，侧边栏/内容区显示时机跟改动前一致。

### Non-goals / 红线

- 不改 `src/app/page.tsx` 现有的 logo/表单切换逻辑（TASK-143 的成果），本任务只是在它前面补一层遮罩，衔接空窗期，不重复实现。
- 不改 `src/components/layout/DesktopSidebarHost.tsx` 的路径判断逻辑（TASK-142 的成果），它本来就会在 `pathname === '/'` 时隐藏侧边栏，不需要跟新遮罩联动。
- 不改 `src/middleware.ts` 的重定向规则本身；本任务通过在客户端跳过"整页刷新触发中间件重定向"这条路径来减少跳转次数，不是去改中间件的行为。
- 不改 `src/lib/auth.ts` 的 `redirect` 回调或 NextAuth 配置。
- 不引入额外依赖（遮罩用现有 Tailwind + Next `Image`，状态管理用项目已有的 `zustand`，别加别的状态库）。
- `AppUserMenu.tsx`、`MobileBottomTab.tsx` 本身不需要改动——它们已经统一走 `onLogout` prop，这次改动全部收在 `useAppUser.ts`/新增文件里。

### Verification results

- `npx tsc --noEmit` 通过。
- 相关改动文件 ESLint 通过，无 warning / error。
- `npm run build` 通过，28/28 静态页面生成成功。
- 全仓库残留搜索通过：`signOut(` 和 `handleLogout` 均只剩 `src/hooks/useAppUser.ts` 的共享实现；Dashboard、时区汇率、全球假日三处重复退出链路已删除。
- 共享退出入口增加防重复保护：退出进行中再次调用会直接返回，不会再次请求 `signOut` 或重复导航。
- 注销请求增加 8 秒超时兜底；超时后通过 `window.location.replace('/')` 强制离开业务页面，成功或明确失败时取消定时器。
- `npx jest src/hooks/__tests__/useAppUser.test.ts --runInBand` 通过（3 项：重复退出、超时兜底调度与成功取消、失败恢复）。
- E2E 登录与退出流程通过；完整 E2E 在配置专用测试账号及所需环境变量后通过。
- 桌面端与移动端实际退出验证通过：点击后立即显示全屏 Logo，URL 从业务路由直接进入 `/`，最终显示登录表单；无业务页面冻结、中间路由或空白闪烁。
- 退出后重新登录验证通过，TASK-142 / TASK-143 既有过渡行为不受影响。
- 退出失败恢复路径验证通过：遮罩能够收起并显示错误 Toast，不会停留在过渡画面。

**Status:** completed

## TASK-146："单据历史"权限跟单据类权限脱节——首页单据筛选一直显示，History 页却报"没有可查看的单据类型权限"

**状态**：已完成（2026-07-11；生产 migration 010 待执行）
**背景来源**：用户反馈，在权限管理里，如果给某用户开了"单据历史"开关，但没给任何单据类权限（外贸报价合同/内销报价合同/箱单发票/财务发票/采购订单），该用户点开 History 页面左侧标签会报"当前账号没有可查看的单据类型权限"；但首页的单据筛选区域（搜索框 + All/1D/3D/1W/1M + 管理按钮）却仍然完整显示（用户附了截图：搜索框、时间筛选、"今天暂无 所有类型 文档"空状态都在）。用户要求：① 首页单据筛选是否显示，跟"单据历史"权限同步；② 权限管理里"单据历史"改成跟单据类权限联动的自动开关（单据类权限全为空则自动关，任一有权限则自动开），并归类到"单据"分组。

### 背景（根因）

`src/constants/permissionModules.ts` L37 里，`history`（单据历史）是一个跟 `quotation`/`domesticQuotation`/`packing`/`invoice`/`purchase` 完全独立的权限位，`category: 'management'`，管理员在 `UserDetailModal` 里可以任意单独开关它，不受单据类权限影响。

- History 页面（`src/features/history/app/HistoryPage.tsx` L83）先用 `useModulePermissionGuard('history')` 挡一层页面入口；进page之后，实际能看到哪些 tab 是另一套独立判断——`src/features/history/utils/historyPermissions.ts` L14-22 把每个 tab 映射回 `quotation`/`domesticQuotation`/`packing`/`invoice`/`purchase` 这五个单据类权限，`getPermittedHistoryTypes` 逐个检查。如果 `history=true` 但这五个都是 `false`，`availableTabs` 就是空数组，页面兜底显示 L402 那句"当前账号没有可查看的单据类型权限"。
- 首页（`src/features/dashboard/app/DashboardPage.tsx` L138-147）的 `<DashboardDocuments>` 完全不检查 `history` 权限，无条件渲染；内部 `RecentDocumentsList`（`src/components/dashboard/RecentDocumentsList.tsx` L81-121, L174-195）只根据五个单据类权限过滤"具体显示哪些类型按钮/文档"，但外层的搜索框、All/时间筛选、管理按钮这一整条 UI 永远显示，哪怕五个单据类权限全是 `false`——这就是用户截图里"筛选栏还在，只是空空如也"的原因。

两边的问题合起来看：`history` 这个独立开关的存在，让"页面入口权限"和"实际能看到的单据类型"这两件事可以互相矛盾，而首页又完全没有读这个开关。

### 修法思路

把 `history` 从"管理员手动独立设置的开关"改成"由五个单据类权限自动派生的只读状态"：单据类权限（`quotation`/`domesticQuotation`/`packing`/`invoice`/`purchase`）任一为 `true` → `history` 自动为 `true`；五个全部为 `false` → `history` 自动为 `false`。管理后台里把它挪到"单据"分组展示，但不能再手动点——这样"进 History 页面的资格"和"里面能看到的单据类型"永远保持一致，History 的兜底空状态提示理论上不会再触发（不用删，留着当防御性兜底即可）。首页拿同一个 `history` 派生值来决定整块单据筛选 UI 显示与否，跟 History 页面同步。管理员身份只控制后台权限/账号管理入口，业务模块同样按显式模块权限显示和访问。

现有数据库里已经存在不一致的历史数据（比如这次报告的账号），只在管理后台改代码不会自动纠正已有记录，需要配一条迁移脚本一次性修正。

### Files in scope

- `src/constants/permissionModules.ts` —— `history` 模块 `category` 改成 `'document'`；新增一个导出的"单据类权限模块 id 列表"常量，供 admin 和文档判断复用
- `src/features/admin/hooks/usePermissions.ts` —— 初始化和每次 toggle 单据类权限时，自动重新计算 `history` 的 `canAccess`
- `src/features/admin/components/UserDetailModal.tsx` —— `history` 这一项渲染成禁止手动点击（`disabled`），并在"单据"分组下加一行说明文字
- `src/features/dashboard/app/DashboardPage.tsx` —— `<DashboardDocuments>` 外层加 `permissionMap.permissions.history` 条件渲染
- `migrations/012_sync_history_permission_with_documents.sql`（新建，原编号 010 与 `010_merge_purchase_registration_permissions.sql` 撞车，TASK-147 重新编号）—— 一次性修正现有用户的 `history` 权限，使其跟单据类权限保持一致

### 具体改动要求

1. `src/constants/permissionModules.ts`：

```ts
// L21-25 保持不动（quotation/domesticQuotation/packing/invoice/purchase）
// ...
{ moduleId: 'history', label: '单据历史', icon: '📚', category: 'document' }, // 原为 'management'，现归入"单据"分组
// ...（customer 及之后条目不变）

/**
 * 决定"单据历史"开关自动开启/关闭的单据类模块（不含 history 本身）。
 * 任一为 true → history 自动为 true；全部为 false → history 自动为 false。
 * admin 页面（usePermissions.ts）和首页（DashboardPage.tsx 的 permissionMap.permissions.history）
 * 共用同一份判断依据，此处只是权限模块的静态 id 列表，不含派生逻辑本身。
 */
export const DOCUMENT_TYPE_MODULE_IDS = ['quotation', 'domesticQuotation', 'packing', 'invoice', 'purchase'] as const;
```

（`history` 条目物理位置可以留在原处不用挪，`UserDetailModal.tsx` L222 是按 `category` 字段 `filter` 出分组，`Array.prototype.filter` 保留原始相对顺序，只改 `category` 字段就会让它自然排在"单据"分组的最后，不需要手动调整数组顺序。）

2. `src/features/admin/hooks/usePermissions.ts`：新增派生函数，并在初始化、toggle 单据类权限两处应用：

```ts
import { PERMISSION_MODULES, getAllPermissionModules, DOCUMENT_TYPE_MODULE_IDS } from '@/constants/permissionModules';
// ...

/** 根据单据类权限重新计算 history 的 canAccess（任一为 true 则 true，否则 false） */
function deriveHistoryPermission(perms: Permission[]): Permission[] {
  const hasAnyDocumentPermission = DOCUMENT_TYPE_MODULE_IDS.some(
    (moduleId) => perms.find((p) => p.moduleId === moduleId)?.canAccess === true
  );
  const existing = perms.find((p) => p.moduleId === 'history');
  const historyEntry = { id: existing?.id ?? '', moduleId: 'history', canAccess: hasAnyDocumentPermission };
  return perms.some((p) => p.moduleId === 'history')
    ? perms.map((p) => (p.moduleId === 'history' ? historyEntry : p))
    : [...perms, historyEntry];
}
```

`initializePermissions` 里，`normalizePermissions` 之后立刻应用一次，确保打开弹窗时就能看到修正后的状态（不用等管理员先点一下别的开关）：

```ts
const initializePermissions = useCallback((userPermissions: Permission[], userIsAdmin: boolean, userIsActive: boolean) => {
  const perms = deriveHistoryPermission(normalizePermissions(userPermissions || [], userIsAdmin));
  setPermissions(perms);
  setOriginalPermissions(perms);
  // ...其余不变
}, []);
```

`togglePermission` 里，在原有的父子级联逻辑（L54-65）之后，如果这次 toggle 的是单据类权限之一，重新派生 `history`：

```ts
const togglePermission = useCallback((moduleId: string) => {
  setPermissions(prev => {
    // ...原有 existing / next / parentModule / turnedOff 逻辑保持不动...

    if ((DOCUMENT_TYPE_MODULE_IDS as readonly string[]).includes(moduleId)) {
      next = deriveHistoryPermission(next);
    }

    return next;
  });
}, []);
```

3. `src/features/admin/components/UserDetailModal.tsx`：在渲染 `PermissionToggle` 那一段（约 L234-248），`history` 不允许手动点：

```tsx
{categoryModules.map((module) => {
  const perm = permissions.find((p) => p.moduleId === module.moduleId);
  const parentEnabled = perm?.canAccess ?? false;
  const hasAdvanced = !!module.advancedFeatures?.length;
  const isAutoManagedHistory = module.moduleId === 'history';

  return (
    <div key={module.moduleId} className={hasAdvanced ? 'col-span-2 sm:col-span-3' : undefined}>
      <PermissionToggle
        moduleId={module.moduleId}
        name={module.label}
        icon={module.icon}
        isEnabled={parentEnabled}
        onToggle={togglePermission}
        disabled={isBusy || isAutoManagedHistory}
      />
      {/* ...hasAdvanced 分支不变... */}
    </div>
  );
})}
```

并在"单据"分组（`category === 'document'`）的卡片里补一行说明，紧跟 `{CATEGORY_LABELS[category]}` 那个 `<p>` 之后：

```tsx
{category === 'document' && (
  <p className="mb-2 px-0.5 text-[10px] text-gray-400 dark:text-gray-500">
    "单据历史"根据本组其它单据类权限自动开启/关闭，无需单独设置
  </p>
)}
```

4. `src/features/dashboard/app/DashboardPage.tsx`：`<DashboardDocuments>`（L138-147）外层加条件渲染，跟 L116 `{(hasInquiryAccess || hasPurchaseAccess) && (...)}` 用同一种写法：

```tsx
{permissionMap.permissions.history && (
  <DashboardDocuments
    documents={recentDocuments}
    timeFilter={timeFilter}
    typeFilter={typeFilter}
    showAllFilters={showAllFilters}
    onTimeFilterChange={setTimeFilter}
    onTypeFilterChange={setTypeFilter}
    onShowAllFiltersChange={setShowAllFilters}
    permissionMap={permissionMap}
  />
)}
```

5. `migrations/012_sync_history_permission_with_documents.sql`（新建，参考 `migrations/009_split_domestic_quotation_permission.sql` 的写法和执行方式；原本按写规格时的顺序应为 010，但跟 `010_merge_purchase_registration_permissions.sql` 撞号，TASK-147 重新编号为 012，并在其前新增了 011 给管理员账号补全权限）：

```sql
-- Migration 012: 同步"单据历史"（history）权限为单据类权限的自动派生值
-- 背景：TASK-146 —— history 原本可以独立开关，导致"开着单据历史但没有任何单据类权限"的不一致状态
--       （History 页面报"当前账号没有可查看的单据类型权限"，首页单据筛选栏却仍然显示）。
--       管理后台从这次改动起把 history 变成只读派生状态，但已有数据需要一次性修正。
-- 执行命令:
-- npx wrangler d1 execute mluonet-users --file=./migrations/012_sync_history_permission_with_documents.sql --remote

-- 1. 单据类权限全部为 0（或缺失）的账号 → 关闭 history
UPDATE Permission
SET canAccess = 0
WHERE moduleId = 'history'
  AND canAccess = 1
  AND userId IN (
    SELECT User.id FROM User
    WHERE User.id NOT IN (
        SELECT userId FROM Permission
        WHERE moduleId IN ('quotation', 'domesticQuotation', 'packing', 'invoice', 'purchase')
          AND canAccess = 1
      )
  );

-- 2a. 单据类权限任一为 1、但尚无 history 记录的账号 → 插入 history=1
INSERT INTO Permission (id, userId, moduleId, canAccess)
SELECT 'history-' || User.id AS id, User.id AS userId, 'history' AS moduleId, 1 AS canAccess
FROM User
WHERE User.id IN (
    SELECT userId FROM Permission
    WHERE moduleId IN ('quotation', 'domesticQuotation', 'packing', 'invoice', 'purchase')
      AND canAccess = 1
  )
  AND NOT EXISTS (
    SELECT 1 FROM Permission WHERE Permission.userId = User.id AND Permission.moduleId = 'history'
  );

-- 2b. 单据类权限任一为 1、但现有 history 记录是 0 的账号 → 更新为 1
UPDATE Permission
SET canAccess = 1
WHERE moduleId = 'history'
  AND canAccess = 0
  AND userId IN (
    SELECT userId FROM Permission
    WHERE moduleId IN ('quotation', 'domesticQuotation', 'packing', 'invoice', 'purchase')
      AND canAccess = 1
  );
```

### Acceptance criteria

- 管理后台打开任意用户的权限弹窗：单据类权限（外贸报价合同/内销报价合同/箱单发票/财务发票/采购订单）五个全部关闭时，"单据历史"开关应自动显示为关闭状态，且点击它没有反应（`disabled`）。管理员账号缺失的业务模块权限也应默认显示为关闭。
- 给其中任意一个单据类权限打开后，"单据历史"开关应立即自动变成打开状态（不需要额外点击"单据历史"本身）；再把这一个也关掉、且没有其它单据类权限打开时，"单据历史"应自动变回关闭。
- "单据历史"这一项在 UI 上出现在"单据"分组卡片里（`quotation`/`domesticQuotation`/`packing`/`invoice`/`purchase` 同一张卡片），不再出现在"管理"分组。
- 保存后重新打开同一个用户的权限弹窗，"单据历史"的状态应该正确地反映刚才保存的单据类权限组合（验证是持久化的，不是只有前端临时状态对）。
- 前端跑一遍 `migrations/012_sync_history_permission_with_documents.sql` 后（本地 D1 或提供 mock 数据验证 SQL 逻辑），之前"history=1 但五个单据类权限全 0"的普通账号应变成 history=0；"history=0 或缺失但至少一个单据类权限=1"的普通账号应变成 history=1；迁移不修改管理员账号（`isAdmin=1`）的既有权限行。
- 任意账号：五个单据类权限全部没有时，访问首页（`/dashboard`），单据筛选整块 UI（搜索框、All/1D/3D/1W/1M、管理按钮、文档网格/空状态）都不应该出现；给任意一个单据类权限后，这块 UI 应该正常出现，且里面的类型按钮只显示实际有权限的那些类型（`RecentDocumentsList` 原有的按类型过滤逻辑不变）。
- 任意账号：五个单据类权限全部没有时，访问 `/history`，`useModulePermissionGuard('history')` 应该直接判定无权限，显示 `PermissionDenied`（走的是页面入口这一层，不再可能出现"进了页面但里面空空如也"这种中间态）。
- 管理员账号只额外拥有 `/admin` 账号控制和权限控制入口；其它业务模块入口、页面和接口（含客户/单据/询报价代理与 AI 邮件 API）都必须按模块权限开通后才能用。

### Non-goals / 红线

- 不删除 `src/features/history/app/HistoryPage.tsx` L402 那句"当前账号没有可查看的单据类型权限"兜底文案——这次改动让它理论上不会再触发，但留着当防御性兜底没有坏处，不属于本任务范围。
- 不改 `src/components/dashboard/RecentDocumentsList.tsx` 内部按单据类型过滤显示按钮/文档的逻辑（L81-121, L174-195），那部分本来就是对的，只是外层容器加一层 `history` 门槛。
- 不改 `src/features/history/utils/historyPermissions.ts` 的 tab 权限映射逻辑，它本来就是对的，跟这次改动无关。
- 不改 `src/features/admin/components/CreateUserModal.tsx` / `src/components/admin/CreateUserModal.tsx`（新建用户）——新建用户时不设置任何权限，管理员后续打开 `UserDetailModal` 配置权限时自然会走新的派生逻辑，不需要在建号环节额外处理。
- 不改 `src/constants/permissionModules.ts` 里 `PERMISSION_MODULES` 数组里其它模块的 `category`、顺序或 `advancedFeatures` 结构，只改 `history` 这一条的 `category` 字段。
- 迁移脚本处理所有账号，按单据类权限同步 `history`；管理员不再作为例外。

### Verification results

- `npx jest src/features/admin/hooks/__tests__/usePermissions.test.ts src/features/admin/components/__tests__/UserDetailModal.test.tsx src/features/history/utils/__tests__/historyPermissions.test.ts --runInBand` 通过（含派生逻辑、只读开关、弹窗实时联动、管理员缺失业务权限不默认全开，以及管理员无单据类权限时不默认显示历史 tab）。
- `npx tsc --noEmit` 通过；相关改动文件 ESLint 无 warning / error。
- migration 010 已在内存 SQLite 中用无单据权限、有单据权限但 history=0、有单据权限但缺 history、管理员四类数据验证通过；生产远程 D1 尚待手动执行。
- `npm run build` 通过。

**Status:** completed (production migrations 011/012 executed 2026-07-11, see TASK-147)

## TASK-147：迁移文件编号撞车 + 管理员业务权限收紧前必须先补数据，否则管理员会被自己的系统锁在外面

**状态**：未开始
**背景来源**：TASK-146 落地时，实现范围被扩大到"去掉全仓库业务权限里的管理员兜底"（把所有 `permission?.canAccess ?? isAdmin` 改成 `permission?.canAccess === true`），涉及 `useModulePermissionGuard.ts`、`lib/permissions.ts`、`historyPermissions.ts`、`InquiryPage.tsx`、`UserCard.tsx`，以及 `/api/customers`、`/api/documents`、`/api/generate`、`/api/inquiry` 四个后端路由。verify 阶段发现这个策略变更是有意为之，但缺一步关键前置工作：**没有任何迁移给现有管理员账号补上完整的模块权限行**——历次迁移（`003`/`007`/`009`/`010_merge_purchase_registration_permissions`）全都写的是 `WHERE User.isAdmin = 0`，因为旧模型下管理员靠运行时兜底、本来就不需要显式权限行。旧模型下"是管理员就默认放行"被拿掉后，如果生产环境的管理员账号 Permission 表里没有把 `getAllPermissionModules()` 列出的每个模块都显式存一条 `canAccess=1`，这次改动上线后管理员会被锁在报价、箱单发票、财务发票、采购订单、客户管理、询报价、AI 邮件等几乎所有业务功能和对应 API 之外。用户已确认："确实要做，但需要先补数据"。

另外发现一个独立的小 bug：TASK-146 新建的 `migrations/010_sync_history_permission_with_documents.sql` 跟已经存在的 `migrations/010_merge_purchase_registration_permissions.sql`（TASK-111 遗留，2026-07-10）编号撞车了，两个不同内容的迁移文件用了同一个前缀，需要重新编号。

### Files in scope

- `migrations/011_backfill_admin_full_permissions.sql`（新建）—— 给现有管理员账号补全所有模块权限
- `migrations/010_sync_history_permission_with_documents.sql` → 重命名为 `migrations/012_sync_history_permission_with_documents.sql`（避免跟已有的 010 撞号；同时把文件内注释里的迁移编号、执行命令路径一并改掉）
- `CODEX_TASKS.md` —— TASK-146 章节里引用旧文件名的地方（"Files in scope"、"具体改动要求"第5点、"Non-goals"、"Verification results"里的执行说明）改成新文件名
- `docs/core/CHANGELOG.md` —— TASK-146 那条改动记录里的文件名引用
- `docs/core/CURRENT_STATE.md` —— 迁移文件列表、迁移执行状态说明里的文件名引用

### 具体改动要求

1. 新建 `migrations/011_backfill_admin_full_permissions.sql`，给所有 `User.isAdmin = 1` 的账号，把 `src/constants/permissionModules.ts` 里 `getAllPermissionModules()` 会列出的每一个 moduleId（`quotation`、`domesticQuotation`、`packing`、`invoice`、`purchase`、`inquiry`、`inquiry.batchEdit`、`order.financials`、`purchaseRegistration`、`history`、`customer`、`ai-email`、`impa`、`clock`、`holidays`、`rmb`）都补一条 `canAccess=1`（没有记录的插入，记录是 0 的改成 1；已经是 1 的不动）：

```sql
-- Migration 011: 给现有管理员账号补全所有模块的显式权限行
-- 背景：TASK-147 —— TASK-146 把全仓库业务权限判断从"?? isAdmin 兜底"改成"必须有显式 canAccess=1"，
--       管理员账号不再自动获得任何业务模块访问权。旧模型下管理员本来就不需要显式权限行（历次迁移
--       003/007/009/010_merge_purchase_registration_permissions 都特意排除了管理员），
--       如果不补这条数据，管理员会被这次策略变更锁在自己系统的业务功能和 API 之外。
--       本迁移必须在 TASK-146 的严格权限判断代码部署到生产之前（或同一批次内）执行完毕。
-- 执行命令:
-- npx wrangler d1 execute mluonet-users --file=./migrations/011_backfill_admin_full_permissions.sql --remote

WITH admin_users AS (
  SELECT id FROM User WHERE isAdmin = 1
),
modules(moduleId) AS (
  VALUES
    ('quotation'), ('domesticQuotation'), ('packing'), ('invoice'), ('purchase'),
    ('inquiry'), ('inquiry.batchEdit'), ('order.financials'), ('purchaseRegistration'),
    ('history'), ('customer'), ('ai-email'), ('impa'), ('clock'), ('holidays'), ('rmb')
)
INSERT INTO Permission (id, userId, moduleId, canAccess)
SELECT
  'admin-backfill-' || admin_users.id || '-' || modules.moduleId AS id,
  admin_users.id AS userId,
  modules.moduleId AS moduleId,
  1 AS canAccess
FROM admin_users
CROSS JOIN modules
WHERE NOT EXISTS (
  SELECT 1 FROM Permission
  WHERE Permission.userId = admin_users.id
    AND Permission.moduleId = modules.moduleId
);

UPDATE Permission
SET canAccess = 1
WHERE canAccess = 0
  AND moduleId IN (
    'quotation', 'domesticQuotation', 'packing', 'invoice', 'purchase',
    'inquiry', 'inquiry.batchEdit', 'order.financials', 'purchaseRegistration',
    'history', 'customer', 'ai-email', 'impa', 'clock', 'holidays', 'rmb'
  )
  AND userId IN (SELECT id FROM User WHERE isAdmin = 1);
```

注意：这里的 moduleId 列表是根据当前 `getAllPermissionModules()` 手动列出的一次性快照，以后新增权限模块不会自动补给管理员，这跟项目里其它迁移一样都是一次性历史修正，不是长期触发器，不需要做成动态读取。

2. 把 `migrations/010_sync_history_permission_with_documents.sql` 重命名为 `migrations/012_sync_history_permission_with_documents.sql`，文件内容不用改逻辑，只改开头注释里的编号说明和执行命令路径：

```sql
-- Migration 012: 同步"单据历史"（history）权限为单据类权限的自动派生值
-- 背景：TASK-146 —— history 原本可以独立开关，导致"开着单据历史但没有任何单据类权限"的不一致状态。
--       本迁移需要在 migrations/011_backfill_admin_full_permissions.sql 之后执行，
--       确保管理员账号已经补全单据类权限后再做 history 的派生同步。
-- 执行命令:
-- npx wrangler d1 execute mluonet-users --file=./migrations/012_sync_history_permission_with_documents.sql --remote
```

（下面三段 UPDATE/INSERT SQL 逻辑本身不用动，TASK-146 里已经改成不排除管理员的版本是对的。）

3. `CODEX_TASKS.md`：把 TASK-146 章节里所有 `migrations/010_sync_history_permission_with_documents.sql` 的引用改成 `migrations/012_sync_history_permission_with_documents.sql`（"Files in scope" 列表、"具体改动要求"第5点标题和里面的执行命令、"Non-goals"最后一条、"Verification results" 里那句手动验证说明）。

4. `docs/core/CHANGELOG.md`：TASK-146 那条记录里"新增 `010_sync_history_permission_with_documents.sql`"改成"新增 `migrations/011_backfill_admin_full_permissions.sql`（管理员权限补全）和 `migrations/012_sync_history_permission_with_documents.sql`（history 派生同步，需在补全之后执行）"。

5. `docs/core/CURRENT_STATE.md`：迁移文件列表那段代码块，把

```
009_split_domestic_quotation_permission.sql
010_sync_history_permission_with_documents.sql
```

改成

```
009_split_domestic_quotation_permission.sql
010_merge_purchase_registration_permissions.sql
011_backfill_admin_full_permissions.sql
012_sync_history_permission_with_documents.sql
```

（顺手把 `010_merge_purchase_registration_permissions.sql` 也补进这个列表——它是 TASK-111 遗留的迁移，现有列表里漏掉了，这次顺手补全，不算额外范围）。下面"生产确认"那段文字里关于 `010_sync_history_permission_with_documents.sql` 的状态说明改成分别描述 011 和 012 两条的状态，并注明 011 必须先于 012、且必须先于 TASK-146 严格权限代码上线执行。

### Acceptance criteria

- `migrations/` 目录下不再有编号重复的文件；`ls migrations/` 里 010/011/012 分别对应 `merge_purchase_registration_permissions`、`backfill_admin_full_permissions`、`sync_history_permission_with_documents` 三个不同内容。
- 用构造的测试数据验证 011：某管理员账号原本只有 3 条权限记录（比如 `quotation=1`、`history=0`、`customer=0`）→ 跑完 011 后，`getAllPermissionModules()` 里列出的全部 16 个 moduleId 都应该有一条 `canAccess=1` 的记录（原本就是 1 的不受影响，原本是 0 或缺失的都变成 1）。
- 011 不应该修改任何非管理员账号（`isAdmin=0`）的权限行。
- 012（原 010）的三段 UPDATE/INSERT 逻辑跟 TASK-146 时的版本完全一致，只有文件名和头部注释变化，不引入行为差异。
- `CODEX_TASKS.md`、`CHANGELOG.md`、`CURRENT_STATE.md` 里不再出现任何对 `migrations/010_sync_history_permission_with_documents.sql` 这个旧文件名的引用（可以用 `grep -r "010_sync_history_permission_with_documents"` 确认全仓库为空）。

### Non-goals / 红线

- 不重新讨论"是否应该去掉管理员业务权限兜底"这个策略本身——用户已经确认这是要做的，本任务只解决"先补数据再上线"这个前置条件和迁移编号撞车问题，不回滚 TASK-146 的策略变更代码。
- 不改 TASK-146 涉及的任何 `.ts`/`.tsx` 代码文件（`useModulePermissionGuard.ts`、`lib/permissions.ts`、四个 API 路由等），那些逻辑已经验证过是对的，本任务只补数据和修文件名。
- 不去动 `migrations/010_merge_purchase_registration_permissions.sql` 这个已有文件的内容，只是在文档列表里把它补上，不重新执行它。
- 011 只处理管理员账号（`isAdmin=1`），不去动普通用户的权限行——普通用户这次策略变更本来就没有行为差异（`?? isAdmin` 对非管理员原本就等价于 `=== true`，只有管理员这条分支的兜底被拿掉了）。

### Verification steps

- `grep -rn "010_sync_history_permission_with_documents" .`（排除 `node_modules`/`.git`）应该没有任何匹配
- 在本地/测试 D1（或内存 SQLite 模拟，参考 TASK-146 时用的验证方式）依次跑 011 → 012，用构造数据验证：① 管理员账号权限被补全；② 普通用户账号不受影响；③ 补全后再跑 012，管理员的 `history` 值能正确按其单据类权限（这时已经是 1）派生为 1。
- `npm run build` 通过（本任务不改代码，理论上不会影响构建，但按项目惯例仍需确认一遍）
- 手动确认：这两条迁移必须在 TASK-146 的代码变更部署到生产之前，或者在同一次发布窗口内、且 011 先于代码上线执行完毕——生产环境执行命令：
  ```bash
  npx wrangler d1 execute mluonet-users --file=./migrations/011_backfill_admin_full_permissions.sql --remote
  npx wrangler d1 execute mluonet-users --file=./migrations/012_sync_history_permission_with_documents.sql --remote
  ```

### Verification results（2026-07-11，直接在远程 D1 上执行并复查）

- `migrations/` 目录编号撞车已解决：`010_merge_purchase_registration_permissions.sql`（原有）、`011_backfill_admin_full_permissions.sql`（新建）、`012_sync_history_permission_with_documents.sql`（原 010 重命名）三个文件互不冲突；`grep -rn "010_sync_history_permission_with_documents" .` 全仓库无匹配。
- 执行 011 前复查生产 D1：两个管理员账号（roger、dex）合计有 12 条业务模块 `canAccess=0` 的显式记录（roger 10 条：`quotation`/`domesticQuotation`/`packing`/`invoice`/`purchase`/`customer`/`history`/`ai-email`/`inquiry.batchEdit`/`order.financials`；dex 2 条：`inquiry.batchEdit`/`order.financials`）——证实了背景里的风险评估：TASK-146 拿掉 `?? isAdmin` 兜底后，这两个管理员账号会被这些显式 0 值直接锁在对应业务模块之外。
- 011 的 INSERT 语句：`changes=0`（两个管理员账号本来就有全部 16 个 moduleId 的记录行，没有缺失需要插入）。
- 011 的 UPDATE 语句：`changes=12`，跟执行前复查的 12 条显式 0 记录数一致。执行后复查 `SELECT ... WHERE userId IN (roger, dex) AND canAccess = 0` 结果为空，两个管理员账号已无任何业务模块显式 0 记录。
- 012 三段 SQL 依次执行：第一段（清空无单据权限账号的 history）`changes=0`；第二段（补插 history=1）`changes=0`；第三段（history=0→1）`changes=1`（某普通账号）。
- 全表复查：`history=1 AND 五个单据类权限全 0` 或 `五个单据类权限任一为1 AND history≠1` 的账号数为 0，无残留不一致记录。
- 011、012 均已先于 TASK-146 代码变更部署到生产前执行完毕（本次改动目前仍在本地未提交，尚未部署）。

## TASK-148：左侧侧边栏分组标题改为可折叠分类（参考 Cloudflare dashboard 左侧菜单）

**状态**：已完成（2026-07-11，本次会话由 Claude 直接实现，未经 Codex）
**日期**：2026-07-11

### 背景

用户看到 dash.cloudflare.com 左侧菜单的样式（"Observe"/"构建" 等大分类下，"Investigate"/"数据分析"/"计算" 这类子分类自带 chevron，可以点击展开/收起，子项用左侧竖线缩进），想把 `AppSidebar.tsx` 里现有的分组标题（"新单据"/"登记表"/"管理"/"工具"，`NAV_GROUPS` 定义在 `src/components/layout/AppSidebar.tsx` 第104-130行）改造成同样可点击展开/收起的形式，而不是像现在这样永远全部展开、纯静态文字标签。

讨论过程中还提议加一个"最近访问"分组（参考 Cloudflare 记录具体访问过的 zone），用户明确表示当前菜单结构够简单，不需要这个功能——**本任务范围只包含分组折叠，不包含"最近访问"**。

现状代码（`AppSidebar.tsx`）：
- 组标签渲染在第285-290行：`{group.label && !isCollapsed && (<div className="app-sidebar-group-label ...">{group.label}</div>)}`，纯文字，无 chevron，不可点击。
- 紧接着第292-347行是 `visibleItems.map(...)`，不受组标签控制，永远渲染。
- `isCollapsed` 指的是桌面端整个侧边栏收缩为 56px 图标态（跟本任务的"分组折叠"是两个不同层级的概念，注意区分：整体 `isCollapsed=true` 时组标签本来就不渲染，图标平铺显示，这个已有行为本任务不能破坏）。
- `NAV_GROUPS` 里第一个分组 `id: 'home'`（首页）`label` 是空字符串，本来就不显示标题——这个分组维持现状，不参与折叠。

### Files in scope

- `src/components/layout/AppSidebar.tsx` —— 组标签改成可点击 header（文字 + chevron），根据折叠状态条件渲染 `visibleItems`，子项外层加缩进容器。
- `src/utils/sidebarGroupCollapse.ts`（新建）—— localStorage 读写 + toggle 的纯函数，风格参照同目录下已有的 `src/utils/sidebarCollapse.ts`。
- `src/utils/__tests__/sidebarGroupCollapse.test.ts`（新建）—— 覆盖新工具函数，参照已有的 `src/utils/__tests__/sidebarCollapse.test.ts` 写法。
- `SIDEBAR_DESIGN_SPEC.md` —— 在"Section Title"章节（第21-30行附近）补充分组图标（14px、颜色跟随标题文字）、chevron 交互状态和缩进线的样式值，保持文档跟实现同步（这个项目一直有维护这份文档的习惯）。

### 具体改动要求

1. 给分组数据加图标字段。`NavGroup` 接口（`AppSidebar.tsx` 第47-51行）新增一个可选字段：

   ```ts
   interface NavGroup {
     id: string;
     label: string;
     icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>; // 分组标题图标，'home' 分组不设置
     items: SidebarItem[];
   }
   ```

   `NAV_GROUPS`（第104-130行）给四个有标题的分组分别指定图标，从文件顶部已经 import 的 `lucide-react` 里补充引入：

   | 分组 id | label | 图标 | 语义 |
   |---|---|---|---|
   | `documents` | 新单据 | `FilePlus2` | 新建单据 |
   | `registration` | 登记表 | `ClipboardList` | 登记类表格 |
   | `management` | 管理 | `Settings2` | 管理功能 |
   | `tools` | 工具 | `Wrench` | 工具类 |

   `home` 分组（`label: ''`）不设置 `icon`，保持无标题、无图标。

2. 新建 `src/utils/sidebarGroupCollapse.ts`：

   ```ts
   export const GROUP_COLLAPSED_KEY = 'sidebar_group_collapsed';

   export function readCollapsedGroups(): Set<string> {
     if (typeof window === 'undefined') return new Set();
     try {
       const raw = localStorage.getItem(GROUP_COLLAPSED_KEY);
       if (!raw) return new Set();
       const arr = JSON.parse(raw);
       return Array.isArray(arr) ? new Set(arr.filter((x) => typeof x === 'string')) : new Set();
     } catch {
       return new Set();
     }
   }

   export function writeCollapsedGroups(ids: Set<string>): void {
     try {
       localStorage.setItem(GROUP_COLLAPSED_KEY, JSON.stringify(Array.from(ids)));
     } catch {
       /* ignore */
     }
   }

   export function toggleGroupCollapsed(groupId: string, current: Set<string>): Set<string> {
     const next = new Set(current);
     if (next.has(groupId)) next.delete(groupId);
     else next.add(groupId);
     writeCollapsedGroups(next);
     return next;
   }
   ```

   不需要 DOM/CSS 变量同步、不需要 `useSyncExternalStore` 订阅机制（那是给影响主内容区宽度的整体收缩态用的，参见 `sidebarCollapse.ts`；分组折叠只影响侧边栏内部显示，不影响布局宽度，不需要这么重）。

3. `AppSidebar.tsx` 组件内新增本地状态，mount 后从 localStorage 水合（避免 SSR/hydration 不一致，允许首次渲染有一次性的"先展开后可能折叠"的闪烁，这是可接受的，不用做成首屏预置脚本）：

   ```tsx
   const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
   useEffect(() => {
     setCollapsedGroups(readCollapsedGroups());
   }, []);

   function handleToggleGroup(groupId: string) {
     setCollapsedGroups((prev) => toggleGroupCollapsed(groupId, prev));
   }
   ```

4. 在 `NAV_GROUPS.map(...)` 循环内部（现有第279-350行附近），对每个分组算出：

   ```tsx
   const hasActiveItem = visibleItems.some((item) => isItemActive(item, pathname, tab, docType));
   const isGroupCollapsed = !!group.label && collapsedGroups.has(group.id) && !hasActiveItem;
   const showItems = isCollapsed || !group.label || !isGroupCollapsed;
   ```

   　`isCollapsed` 是整体侧边栏图标态那个已有变量，务必参与这个判断——图标态下必须无条件 `showItems = true`，分组折叠状态被完全忽略。

5. 组标签从纯 `<div>` 改成可点击 `<button>`，加分组图标 + chevron（`ChevronDown` 跟文件顶部已有的 `ChevronLeft`/`ChevronRight` 一起从 `lucide-react` import；分组图标就是第1步里 `NavGroup.icon` 那个组件）：

   ```tsx
   {group.label && !isCollapsed && (
     <button
       type="button"
       onClick={() => handleToggleGroup(group.id)}
       aria-expanded={!isGroupCollapsed}
       className="app-sidebar-group-label mb-2 mt-6 flex w-full items-center gap-1.5 px-3 text-xs font-semibold uppercase tracking-wide text-sidebar-section-title first:mt-0 hover:text-gray-600 dark:hover:text-gray-300"
     >
       {group.icon && <group.icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />}
       <span className="flex-1 text-left">{group.label}</span>
       <ChevronDown
         className={`h-3.5 w-3.5 shrink-0 transition-transform ${isGroupCollapsed ? '-rotate-90' : ''}`}
         strokeWidth={2}
       />
     </button>
   )}
   ```

   分组图标尺寸（14px / `h-3.5 w-3.5`）明显小于菜单项图标（20px / `h-5 w-5`），保持"标题级图标比内容级图标小"的层级关系，颜色跟随 `text-sidebar-section-title`（不用单独设色），不要做成跟菜单项一样大小/一样醒目，否则会喧宾夺主。

6. `visibleItems.map(...)` 整段包一层容器，按 `showItems` 条件渲染；有 `group.label` 且整体未收缩时加左侧缩进引导线：

   ```tsx
   {showItems && (
     <div className={!isCollapsed && group.label ? 'ml-1 border-l border-sidebar-border pl-2' : undefined}>
       {visibleItems.map((item) => { /* 原有渲染逻辑不变 */ })}
     </div>
   )}
   ```

   原有每个 item 内部的渲染逻辑（active 判断、外部链接、tooltip 的 onMouseEnter/onMouseLeave）不用改，只是多包一层外层 div。加了缩进线之后留意一下 active 态左侧品牌蓝指示条（`absolute -left-4 ...`，第316-318行附近）有没有被新的 `pl-2` 挤到跟竖线重叠或者被 nav 的 `overflow-x-hidden`（第276行）裁掉——如果视觉上有冲突，可以把指示条的 `-left-4` 适当调整（比如改成 `-left-3`），只要保证收缩线和激活指示条不重叠、不被裁切即可，具体像素值不是红线，以实际渲染效果为准。

### Acceptance criteria

- 默认状态（localStorage 里没有 `sidebar_group_collapsed`）：所有分组展开，视觉和交互跟当前完全一致，不影响现有用户。
- 点击"新单据"/"登记表"/"管理"/"工具"任一分组标题整行，chevron 从朝下变成朝左（`-rotate-90`），对应分组下的菜单项立即隐藏；再点一次恢复展开。不需要做展开/收起的过渡动画。
- 折叠状态写入 `localStorage`（key `sidebar_group_collapsed`），刷新页面后保留上次的折叠/展开状态。
- 如果某个分组里包含当前高亮激活的菜单项（`isItemActive` 返回 true 的那一项），即使 localStorage 记录该分组为折叠，也必须强制展开显示——保证用户任何时候都能看到自己所在的菜单项，这一条优先级高于存储的折叠状态。
- 桌面端整体收缩为图标态（56px 宽度，`isCollapsed=true`）时，分组折叠状态被完全忽略，所有图标照常平铺显示，不会出现"图标态下某个分组还处于折叠、图标消失"的情况——这是必须保留的既有行为。
- "首页"这个无标题分组（`group.id === 'home'`）不受影响：不出现图标、不出现 chevron，不可折叠，始终直接显示（跟其它带图标的分组标题区分开）。
- 移动端侧滑抽屉（`AppSidebar` 传了 `onClose`，即 `isMobile=true`）复用同一个 localStorage key，折叠交互跟桌面展开态一致，分组图标同样显示。
- 四个分组标题（新单据/登记表/管理/工具）左侧各自出现一个 14px 小图标（`FilePlus2`/`ClipboardList`/`Settings2`/`Wrench`），明显小于下方菜单项的 20px 图标，颜色跟标题文字一致（`text-sidebar-section-title`），不单独上色，不会比菜单项图标更显眼。
- 桌面收缩为图标态（`isCollapsed=true`）时，分组标题整行（含图标）不渲染，跟现状一致——分组图标只在展开态的标题行里出现，不会跑到收缩态的图标列表里跟菜单项图标混在一起。

### Non-goals / 红线

- 不做展开/收起的高度过渡动画，直接显示/隐藏即可，动画后续如果需要再单独提任务。
- 分组图标只加在四个有标题的分组上，不改动菜单项本身的图标（`SidebarItem.icon`）、不改 `PERMISSION_MODULE_MAP`、不改任何图标的语义映射。
- 不做跨实例实时同步——每个 `AppSidebar` 实例只在自己 mount 时读一次 localStorage，不需要引入订阅/`useSyncExternalStore` 机制。
- 不包含"最近访问"分组（用户已明确表示不需要，讨论到此为止）。
- 不改动 `NAV_GROUPS`/`NAV_ITEMS` 数据本身的分组归属、图标、权限逻辑（`PERMISSION_MODULE_MAP`、`isVisible` 等），只加折叠交互这一层。
- 不改 `isItemActive` 函数本身的判断逻辑，只是复用它的返回值来决定要不要强制展开分组。

### Verification steps

- `npx tsc --noEmit`
- `npx eslint src/components/layout/AppSidebar.tsx src/utils/sidebarGroupCollapse.ts src/utils/__tests__/sidebarGroupCollapse.test.ts`
- 跑一下项目里 `sidebarCollapse.test.ts` 用的同一套测试命令，确认新增的 `sidebarGroupCollapse.test.ts` 也能跑过。
- `npm run build` 通过。
- 手动验证（建议用户在浏览器里确认）：桌面展开态下四个分组标题左侧各自出现对应图标（新单据=FilePlus2、登记表=ClipboardList、管理=Settings2、工具=Wrench），明显比菜单项图标小一号；依次点击四个分组标题，能正常折叠/展开，chevron 方向正确；刷新页面折叠状态保留；把窗口宽度缩小到侧边栏图标态，确认分组标题行（含图标）整体不显示，只剩菜单项图标平铺、不受任何分组折叠状态影响；点开移动端汉堡菜单，分组图标和折叠交互跟桌面一致；访问一个属于被折叠分组的页面（比如先把"管理"折叠，再直接打开"客户管理"页面），确认"管理"分组会自动强制展开、能看到高亮的"客户管理"项。

### 执行记录

- 按方案原样落地，无偏离：`NavGroup` 加了可选 `icon` 字段；`NAV_GROUPS` 四个有标题分组分别接上 `FilePlus2`/`ClipboardList`/`Settings2`/`Wrench`；新建 `src/utils/sidebarGroupCollapse.ts`（`readCollapsedGroups`/`writeCollapsedGroups`/`toggleGroupCollapsed` 三个纯函数，localStorage key `sidebar_group_collapsed`，JSON 数组存被折叠的分组 id）。
- `AppSidebar.tsx`：新增 `collapsedGroups` 状态，`useEffect` 在 mount 后从 localStorage 水合；组标签从 `<div>` 改成可点击 `<button aria-expanded>`，内容为「14px 分组图标 + 文字 + `ChevronDown`」，收起态 chevron 加 `-rotate-90`；`visibleItems` 外层包一层 `showItems` 条件容器，展开态且有标题时加 `ml-1 border-l border-sidebar-border pl-2` 缩进引导线；`showItems = isCollapsed || !group.label || !isGroupCollapsed`，`isGroupCollapsed` 额外要求分组内没有当前高亮项（`hasActiveItem`），保证高亮项所在分组始终强制展开——整体收缩图标态和"首页"分组均按预期不受影响。
- 新建 `src/utils/__tests__/sidebarGroupCollapse.test.ts`，覆盖默认空集合、读写往返、toggle 增删、toggle 不改动传入的原 Set、以及 localStorage 里数据损坏/非数组/含非字符串元素时的降级行为，共 8 个用例。
- `SIDEBAR_DESIGN_SPEC.md`：Section Title 表格补充分组图标尺寸/映射、chevron 交互、缩进线、折叠持久化说明；文档开头加了一行指向本任务。

### Verification results（2026-07-11）

- `npx tsc --noEmit`：无输出，无类型错误。
- `npx eslint src/components/layout/AppSidebar.tsx src/utils/sidebarGroupCollapse.ts src/utils/__tests__/sidebarGroupCollapse.test.ts`：无输出。
- `npx jest sidebarGroupCollapse sidebarCollapse`：2 个测试文件、12 个用例全部通过。
- `npm run build`：在本次会话的沙箱环境里跑不完整——`embed-resources.js` 几秒内跑完，`next build` 进入"Creating an optimized production build"阶段后，沙箱单次 bash 调用有 45 秒硬上限、且不支持跨调用保留后台进程（`nohup ... &` 在调用结束后不会存活到下一次调用），两次尝试都在编译阶段被强制掐断，没能跑出最终结果。这个项目本身构建偏重（内嵌字体/印章资源 + 多个 PDF 生成器 + 大量路由），超过 45 秒并不意外。**建议用户本地跑一次 `npm run build` 确认最终产物没问题**，本次改动只涉及一个客户端组件（`AppSidebar.tsx` 已有 `'use client'`）和一个纯前端 utils 文件，不涉及任何 SSR/服务端逻辑，`tsc --noEmit` 全量类型检查已通过，构建失败风险较低，但仍未做最终确认。
- 未做真实浏览器交互验证（点击分组标题、刷新保留状态、图标态下的表现等），建议用户按上面"Acceptance criteria"逐条过一遍。

**追加修正（2026-07-11，同一会话）**：用户截图反馈分组图标"比例有点不太对"——首版用的是 14px（`h-3.5 w-3.5`）+ `strokeWidth 2`，跟下方 20px 菜单项图标的视觉差距不够大，加上描边比菜单项（`strokeWidth 1.75`）更粗，小图标反而显得敦实、抢眼，没有起到"标题级，比内容级小一号"的从属效果。改成 12px（`h-3 w-3`）+ `strokeWidth 1.75`（跟菜单项描边一致），chevron 同步收窄到 12px，图标与文字间距从 `gap-1.5` 收到 `gap-1`。`npx tsc --noEmit`、`npx eslint AppSidebar.tsx` 均无输出。`SIDEBAR_DESIGN_SPEC.md` 已同步更新。

**追加修正 2（2026-07-11，同一会话）**：用户反馈"太小了，收起来靠得太近，不太好点击"——12px 图标本身偏小，且组标题 `<button>` 一直没有额外的垂直内边距，可点击热区基本等于文字行高（约 16~18px），比菜单项 40px 高的点击区小很多，精准点中不容易。调整：图标/chevron 从 12px 微调到 13px（`h-[13px] w-[13px]`，在"14px 太抢眼"和"12px 太小"之间取中间值）；`<button>` 加 `py-1.5` 内边距、`rounded-md`、`hover:bg-sidebar-item-hover-bg`（跟菜单项同款 hover 背景反馈），明显扩大可点击热区；图标与文字间距恢复到 `gap-1.5`。`npx tsc --noEmit`、`npx eslint AppSidebar.tsx` 均无输出。`SIDEBAR_DESIGN_SPEC.md` 已同步更新，补了"点击区域"一行。

**追加修正 3（2026-07-11，同一会话，撤销折叠交互）**：用户三个要求一起提出——① "把分类弄成不可收"：撤销 TASK-148 最初加的分组折叠功能，组标题不再是可点击 `<button>`，改回纯展示的 `<div>`，去掉 chevron、去掉 `aria-expanded`、去掉 hover 背景/圆角/`py-1.5` 点击态样式；组件里 `collapsedGroups` 状态、`handleToggleGroup`、`isGroupCollapsed`/`showItems`/`hasActiveItem` 判断全部删除，菜单项恢复成之前的"分组内容永远显示"；`src/utils/sidebarGroupCollapse.ts` 和它的测试文件已不再被引用，一并删除（经 `allow_cowork_file_delete` 授权后才能删，工作区文件默认不让直接 rm）。② "菜单的字也小一号"：菜单项文字 `text-sm`（14px）改成 `text-xs`（12px）；组标题图标/文字本来就是 12/13px 没再动。③ "前面的线，从上面的图标往下"：子项缩进引导线（`border-l`）容器从 `ml-1` 改成 `ml-3`（12px），跟组标题图标的 `px-3` 左边缘对齐；组标题跟子项之间的间距从 `mb-2`（8px）收到 `mb-1`（4px），让引导线在视觉上更贴近正上方的图标、像是从图标延伸下来，而不是凭空冒出来。分组图标（`FilePlus2`/`ClipboardList`/`Settings2`/`Wrench`）本身保留，用户没有要求去掉。`npx tsc --noEmit`、`npx eslint AppSidebar.tsx` 均无输出；`npx jest src/components/layout src/utils/__tests__/sidebarCollapse.test.ts` 8 个用例全过。`SIDEBAR_DESIGN_SPEC.md` 同步改回"不可折叠"状态描述。**这次撤销之后，TASK-148 的最终形态是：分组标题带小图标、不可折叠、子项菜单文字改小、缩进引导线对齐图标——分组折叠这个功能已经不存在了，以后不用再假设它还在。**

**追加修正 4~8（2026-07-11，同一会话，快速连续微调）**：在追加修正 3 的基础上又做了几轮小调整，最终定稿状态如下（`SIDEBAR_DESIGN_SPEC.md` 已同步更新为定稿版本，不再保留中间态的调整记录，历史过程只保留在这里）：
- 菜单项文字试过 `text-[13px]`，又试过分组图标/菜单图标一起缩小到 12px、16px（`h-3 w-3`/`h-4 w-4`），用户反馈"字和图标小了后，看得累"——**最终菜单项文字和图标都改回最初的 14px（`text-sm`）/ 20px（`h-5 w-5`）**，没有变小。
- 分组图标（`FilePlus2`/`ClipboardList`/`Settings2`/`Wrench`）应用户要求整体去掉了，组标签改回纯文字，不再渲染图标；`NavGroup.icon` 字段和 `NAV_GROUPS` 里的图标赋值还留在代码里没删（只是不渲染），方便以后需要时快速加回来。
- 子项缩进引导线从 `ml-3` 调到 `ml-4`（16px），应用户"线可以再往右一点点"的要求。
- 收缩为图标态（56px）时，之前完全没有分组间的视觉分隔，应用户要求加了一条居中小短线：`mx-auto my-2 h-px w-6 bg-sidebar-border`，替代展开态才有的文字标签，让图标态下也能看出分组边界。

`npx tsc --noEmit`、`npx eslint AppSidebar.tsx` 每一轮修改后都跑过，均无输出。**当前定稿（2026-07-11 收尾）：分组标题纯文字、无图标、不可折叠；菜单项 14px 文字 + 20px 图标（跟 TASK-114 最初设计一致）；子项引导线 `ml-4`；收缩图标态有分组分隔小短线。** 后续如果还有微调需求，直接在这个基础上改，不用再回溯前面的中间状态。

**Status:** completed


## TASK-149：订单状态表「编辑订单」弹窗——回款月份选择器补齐 + 金额/到账金额币种改为整单联动一个按钮 + 去掉金额输入框上下箭头

**Background：** 订单状态表（`OrderTable` → `OrderRow.tsx`）行内可编辑单元格和「编辑订单」弹窗（`OrderEditModal.tsx`，TASK-125 引入）本应是同一批字段的两套编辑入口，但两边实现是各自独立写的，出现了三处不一致，用户在弹窗里对比表格截图后指出：

1. 回款月份（`orderPaymentDate`）：表格里的 `MonthPickerCell`（`OrderRow.tsx` 203–280 行）除了文本框，还有一个隐藏的 `<input type="month">` + 日历图标，可以原生月份选择器点选；弹窗里的同一字段（`OrderEditModal.tsx` 336–344 行）只是一个裸 `<input>` 文本框，没有选择器，两处体验不一致。
2. 金额（`orderAmount`）与到账金额（`orderReceivedAmount`）目前各自有独立的 ¥/$ 切换按钮——表格里 `AmountCell`（`OrderRow.tsx` 296–373 行）编辑态各有一个按钮，弹窗里 `AmountField`（`OrderEditModal.tsx` 107–130 行）两处调用（329–335 行、345–351 行）也是各自独立的 `amountCurrency`/`receivedCurrency` state。用户明确要求：**一条订单记录只应该有一种币种**，金额和到账金额永远同币种，只保留一个切换按钮统一控制（已向用户确认：完全联动，不是"默认同步、允许后续单独改"）。
3. 金额录入框是原生 `<input type="number">`，未隐藏浏览器自带的上下调节箭头，视觉多余、容易误触。项目里 `src/features/quotation/components/ItemsTable.tsx` 1283–1286 / 1318–1321 行已经有去掉这个箭头的现成写法（`[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`），照抄这个 class 组合即可，不用重新发明。

`orderAmount`/`orderReceivedAmount` 目前都是"币种符号+数字"拼在一起的自由字符串（如 `¥120000`/`$15000`，见 `src/features/inquiry/types/index.ts` 51–56 行注释），数据库/schema **不新增币种字段**，币种始终是从这两个字符串里解析出来的前缀——本任务只改"币种从哪来、谁能点按钮"，不改存储格式。

用户还提到"后续要按回款月份和不同币种做统计分析"，**这条明确说了"待后续明确再开发"，本任务不做，只在下面 Non-goals 里占位，不要顺手实现或加相关 UI**。

**Files in scope：**
- `src/features/order/components/OrderRow.tsx`
  - 把 `AmountCell` 内部私有的 `parseStored`/`formatDisplay` 逻辑对应的解析函数提升为文件级函数（如 `parseAmount`/`formatAmountDisplay`，两处调用点复用），并新增一个 `getRecordCurrency(record: InquiryRecord): Currency` 辅助函数：优先取 `orderAmount` 的币种前缀，`orderAmount` 未定义则取 `orderReceivedAmount` 的，两者都未定义则默认 `'¥'`。
  - `AmountCell` 组件改造：新增可选 props，让「金额」单元格（`field === 'amount'`）保留可点击的币种切换按钮，但按钮的 `onClick` 除了更新自己内部的 `editCurrency`，还要通过新增的回调 prop（如 `onCurrencyToggle?: (next: Currency) => void`）立即把新币种同步写回「到账金额」——即调用 `onUpdate` 时把 `orderReceivedAmount` 的前缀也一并改成同一个币种（数字部分不变；`orderReceivedAmount` 本身未定义时不用管，等它以后有值时会走 `getRecordCurrency` 自动带出正确币种）。
  - 「到账金额」单元格（`field === 'receivedAmount'`）的 `AmountCell` 不再渲染自己的币种切换按钮：改成接收一个外部传入的 `currency: Currency`（父组件传 `getRecordCurrency(record)`），编辑态里币种展示为纯文字/不可点的标签，输入框旁不再有按钮；保存时用这个外部传入的 currency 拼接前缀，不再使用内部 `editCurrency` state。
  - 两处 `AmountCell` 用法（约 549–559 行「金额」、569–579 行「到账金额」）按上面的 props 改造对应调整；「金额」这处要把 `onCurrencyToggle` 接到 `onUpdate({ orderReceivedAmount: ... })`。
  - `<input type="number" step="0.01" min="0">`（346 行）补上去箭头的 class：`[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`。
- `src/features/order/components/OrderEditModal.tsx`
  - 新增 `MonthField` 组件（仿照文件里已有的 `DateField`，60–97 行，及 `OrderRow.tsx` 里 `MonthPickerCell` 的 `toMonthISO`/`fromMonthISO` 转换逻辑 220–233 行）：文本框（placeholder `"m"`）+ 一个日历图标按钮，按钮内叠一个透明的 `<input type="month">`，点开原生月份选择器后把 `YYYY-MM` 转回纯数字月份 `m` 写回 `onChange`。
  - 336–344 行「回款月份」的裸 `<input>` 替换成 `<MonthField label="回款月份" value={paymentDate} onChange={setPaymentDate} />`。
  - 把 `amountCurrency`/`receivedCurrency` 两个 state（149、152 行）合并成一个 `currency` state；`useEffect` 里的初始化逻辑（165–171 行）改成：优先用 `parseAmount(record.orderAmount).currency`，`orderAmount` 未定义时用 `parseAmount(record.orderReceivedAmount).currency`，都未定义则 `'¥'`。
  - `AmountField` 组件（107–130 行）新增 `locked?: boolean` prop：为 `true` 时不渲染可点击的 `<button>`，改成一个视觉一致但不可交互的币种标签（同样的宽度/字号，去掉 `onClick`、`hover` 样式，避免用户误以为还能点）。
  - 「金额」的 `AmountField`（329–335 行）传 `currency={currency} onCurrencyChange={setCurrency}`（不锁定）；「到账金额」的 `AmountField`（345–351 行）传 `currency={currency} locked`（不再传 `onCurrencyChange`，或传空函数）。
  - `handleSave`（180–203 行）里 `orderAmount`/`orderReceivedAmount` 的前缀统一用同一个 `currency`。
  - `AmountField` 里的 `<input type="number">`（119–126 行）同样补上箭头隐藏 class。

**Acceptance criteria：**
- 弹窗「回款月份」字段跟表格行内的 `MonthPickerCell` 视觉、交互一致：文本框可以直接打"m"这样的数字，旁边有日历图标，点开是原生月份选择器，选完自动把 `YYYY-MM` 转成纯数字月份填回文本框。
- 表格行和弹窗里，「金额」和「到账金额」显示的币种符号永远相同；界面上只保留一个可点击的 ¥/$ 切换按钮（挂在"金额"这一侧），点一下会同时改变"金额"和"到账金额"当前显示/将要保存的币种；"到账金额"那一侧不再有可点击的币种按钮。
- 已有数据验证：如果某条历史记录 `orderAmount` 和 `orderReceivedAmount` 币种本来就不一致（脏数据），打开编辑时以 `orderAmount` 的币种为准（`orderAmount` 有值优先），保存后两者币种统一。
- 金额、到账金额的数字输入框（表格行内编辑态 + 弹窗）都不再显示浏览器原生的上下调节小箭头，鼠标悬浮/聚焦时也不出现。
- 上述改动只影响订单状态表这两个组件里的"金额/到账金额/回款月份"相关渲染，其它字段（交货/确认日期、客户订单号、执行情况、订单状态标记）行为不变。

**Non-goals / 红线：**
- 不新增数据库字段或迁移脚本：币种依然是从 `orderAmount`/`orderReceivedAmount` 字符串前缀解析出来的，不引入独立的 `orderCurrency` 存储字段。
- 不做"按回款月份 + 币种做统计分析"功能——用户已明确这是"待后续明确再开发"的占位需求，本任务范围只是把编辑体验和币种统一这两件事做好，不要顺手加统计入口、图表或汇总卡片。
- 不改 `orderPaymentDate` 的存储格式（依旧是纯数字 `m` 或 `m.D`），只补交互，不改数据结构。
- 不影响采购部登记/采购订单表（`PurchaseOrderRow.tsx` 等，TASK-126）里类似的金额/执行情况字段——那边是独立组件，不在本任务范围内，除非用户后续单独提。
- 不去动 `src/features/quotation/components/ItemsTable.tsx` 里已有的箭头隐藏写法，只是照抄同一段 class，不重构那个文件。

**Verification steps（供实现者跑）：**
- `npx tsc --noEmit`
- `npx eslint src/features/order/components/OrderRow.tsx src/features/order/components/OrderEditModal.tsx`
- `npm run build`（本仓库沙箱跑这条历史上多次因 45 秒硬超时在 Next.js 编译阶段被打断，属已知限制——建议用户本地或 CI 补跑一次完整确认）
- 手动验证（建议用户在浏览器里过一遍）：打开"编辑订单"弹窗，回款月份能用日历图标选月份；点金额旁的币种按钮，确认到账金额的币种符号跟着联动变化，且到账金额那侧没有独立可点的币种按钮；金额、到账金额输入框聚焦时鼠标悬浮数字上不出现上下箭头；表格行内编辑态重复以上验证；找一条历史"金额¥/到账金额$"不一致的脏数据记录（如没有就手动改一条测试数据模拟），确认打开编辑后以金额币种为准、保存后两者统一。

**Status:** completed（2026-07-12，Codex 实现并验证）


## TASK-150：采购订单表金额输入框去掉上下箭头 + 金额列改为独立权限开关

**Status:** completed（2026-07-12，Codex 实现，Claude 复核通过）
**日期:** 2026-07-12

### 背景

用户要求采购订单表 `/purchase-order-table` 的金额框也取消浏览器原生上下调节按钮，并且采购订单表的「金额」列要能在权限管理界面单独控制。此前采购订单表金额复用 `order.financials`，会和订单状态表的订单金额/回款/到账金额权限绑在一起，权限边界不够清楚。

### 执行记录

- `src/constants/permissionModules.ts`：在 `purchaseRegistration` 下新增二级权限 `purchaseRegistration.financials`，显示名为「采购订单表金额」，沿用现有 `advancedFeatures` 模型；父权限关闭时，现有 `usePermissions` 通用逻辑会自动关闭该子权限。
- `src/features/purchase-order-registration/app/PurchaseOrderRegistrationPage.tsx`：采购订单表金额列的可见性从 `order.financials` 改为读取 `purchaseRegistration.financials`。
- `src/features/purchase-order-registration/components/PurchaseOrderRow.tsx`：行内采购金额 `type="number"` 输入框补上隐藏原生 spinner 的 Tailwind class。
- `src/features/purchase-order-registration/components/PurchaseOrderEditModal.tsx`：编辑弹窗里的采购金额输入框同步隐藏原生 spinner。
- `src/app/api/inquiry/[[...path]]/route.ts`：把金额字段过滤拆成两组：
  - `orderAmount` / `orderPaymentDate` / `orderReceivedAmount` 仍由 `order.financials` 控制；
  - `purchaseOrderAmount` 改由 `purchaseRegistration.financials` 控制。
  GET 响应清洗和 PUT/POST 请求体清洗两条路径都同步更新，避免前端显示权限和接口字段权限不一致。
- `src/features/admin/hooks/__tests__/usePermissions.test.ts`、`src/features/admin/components/__tests__/UserDetailModal.test.tsx`：补测试，覆盖采购订单表金额开关在权限管理界面的展示，以及父权限关闭时子权限级联关闭/禁用。
- `src/features/inquiry/types/index.ts`、`src/features/purchase-order-registration/utils/purchaseOrderTableLayout.ts`：同步更新注释，避免继续把采购订单表金额描述为 `order.financials` 控制。

### 验收标准

- 采购订单表行内金额编辑态和编辑弹窗里的采购金额输入框都不显示浏览器原生上下调节按钮。
- 权限管理界面中，「采购部登记 / 采购订单表」下面出现「采购订单表金额」二级开关。
- 关闭「采购部登记 / 采购订单表」父权限时，「采购订单表金额」子权限自动关闭且不可操作。
- 采购订单表金额列只受 `purchaseRegistration.financials` 控制，不再受 `order.financials` 控制。
- API 读取和写入都遵守新权限：没有 `purchaseRegistration.financials` 时不返回/不接受 `purchaseOrderAmount`；订单状态表自己的金额字段仍保持原 `order.financials` 逻辑。
- 不新增数据库字段，不改 `purchaseOrderAmount` 的存储格式。

### 验证

- `npx tsc --noEmit`：通过。
- `npx eslint`（本次改动相关文件）：通过，无输出。
- `npm run test -- src/features/admin/hooks/__tests__/usePermissions.test.ts src/features/admin/components/__tests__/UserDetailModal.test.tsx`：2 个测试文件、7 个用例全部通过。
- `git diff --check`：通过。
- residual grep：确认采购订单表不再从 `order.financials` 读取金额列权限；`OrderPage.tsx` 保留 `order.financials` 属于订单状态表既有逻辑。

### 说明

`order.financials` 仍是独立权限，不要求同时拥有 `inquiry` 父权限；`purchaseRegistration.financials` 这次按更严格口径实现，必须同时拥有 `purchaseRegistration` 父权限才生效。这种不对称是这次拆分后显性的行为差异，但没有改变订单状态表的既有权限逻辑。


## TASK-151：修复"编辑订单"弹窗用旧快照回写 orderSubStatus，导致订单意外脱离"正常"筛选

**状态：** 已完成（2026-07-12）

**背景：**

用户反馈：订单状态表里，有些订单在编辑「执行情况」后，会从"正常"筛选（`OrderPage.tsx` 第 64–65 行 `matchesOrderStatus`）里消失。已核实"正常"筛选条件本身是对的（`record.orderSubStatus === undefined || record.orderSubStatus === 'suspended'`，即只排除撤销/善后，与用户预期一致），问题不在筛选公式，而在数据层——`orderSubStatus` 被意外写成了 `'cancelled'` 或 `'followup'`。

根因定位在 `src/features/order/components/OrderTable.tsx` 与 `src/features/order/components/OrderEditModal.tsx`（该弹窗 2026-07-10 新增，见 `OrderEditModal.tsx` 顶部注释）：

1. `OrderTable.tsx` 第 86 行：`const [editingRecord, setEditingRecord] = useState<InquiryRecord | null>(null);`，第 199 行 `onOpenEdit={setEditingRecord}` 只在用户点击打开弹窗那一刻赋值一次。弹窗打开期间，如果 store 里这条记录因为后台同步（`useInquirySync` 周期拉取 D1，或另一台设备/另一个标签页的编辑）而发生变化，`editingRecord` 这个局部快照不会跟着刷新——它是弹窗打开瞬间的冻结引用。
2. `OrderEditModal.tsx` 第 207、226 行：`subStatus` 状态只在 `useEffect(..., [isOpen, record])`（第 210–228 行）里从 `record.orderSubStatus` 初始化一次。因为上面那条，`record` 这个 prop 引用在弹窗打开期间基本不变，`subStatus` 就一直停留在弹窗刚打开时的值。
3. `handleSave`（第 234–257 行）无条件把 `orderSubStatus: subStatus` 和 `orderSubStatusRemark` 塞进保存的 patch 里（第 253–254 行），不管用户这次到底有没有碰"订单状态标记"这几个按钮。
4. 保存走 `OrderTable.tsx` 第 214 行 `onSave={(id, patch) => onUpdate(id, patch)}` → `OrderPage.tsx` 第 480 行 `onUpdate={(id, patch) => updateRecord(id, patch)}` → `useInquiryStore.updateRecord`（`inquiry.store.ts` 第 71–75 行）→ `inquiryService.update` 整条合并本地记录 → `syncUpdatedRecord` → `updateInD1` 把合并后的**完整记录**推给 D1。

净效果：只要弹窗打开时间跨越了一次后台同步/别处的状态变更，用户在弹窗里仅仅编辑"执行情况"这一个字段并保存，就会把弹窗打开那一刻的旧 `orderSubStatus` 快照重新写回去，悄悄覆盖掉期间已经发生的真实状态（包括把本该是"正常"的订单重新打上撤销/善后标记，或反向清掉别人刚打的标记）。这与本项目已知的"整条覆盖冲字段"系列问题同源（参见 `bug_inquiry_merge_pending_protection`、`bug_inquiry_restricted_view_cache_corruption`、`bug_inquiry_sync_phantom_records` 这几类历史修复），根源都是"共享 store 上，某个局部编辑态拿着旧快照做整条覆盖式保存"。

**Files in scope：**

- `src/features/order/components/OrderTable.tsx` — 把 `editingRecord: InquiryRecord | null` 改成只存 `editingRecordId: string | null`；渲染 `OrderEditModal` 时，`record` prop 改成每次从当前 `records`（该组件已有的最新数组 prop）里按 id 现查现取（如 `records.find(r => r.id === editingRecordId) ?? null`），保证弹窗拿到的始终是最新记录，而不是打开瞬间的冻结引用。
- `src/features/order/components/OrderEditModal.tsx` — 确认/依赖上面这个改动后，`useEffect`（第 210–228 行）的依赖 `record` 会在底层数据变化时拿到新的对象引用而重新初始化 `deliveryStatus`/`subStatus`/`subStatusRemark` 等本地状态，不需要额外改依赖数组本身；但要检查这一步会不会打断用户"正在弹窗里没保存的输入"（见下方验收标准的取舍要求）。

**Acceptance criteria：**

- 复现场景：打开某订单的"编辑订单"弹窗后，在弹窗仍打开时，让该记录的 `orderSubStatus` 在别处发生变化（比如另一个标签页/浏览器把它标记为"善后"，或清除已有标记），之后仅在这个已打开的弹窗里编辑"执行情况"并保存——保存后该记录的 `orderSubStatus` 应该是"别处刚变化后的最新值"，而不是弹窗打开瞬间的旧值。也就是说，本次编辑不应该把无关的 `orderSubStatus` 悄悄改回旧状态。
- 正常操作路径不受影响：用户在弹窗里点击"撤销C/悬挂P/善后S"按钮改变标记、填写情况备注、点击保存，依然按用户在弹窗里的操作生效并正确持久化。
- 如果弹窗打开期间用户已经开始编辑但还没保存（比如已经在"执行情况"输入框里打了字），此时如果底层记录因后台同步刷新导致 `record` prop 变化、`useEffect` 重新触发，不能让用户已经打的字被静默清空——需要判断当前 `deliveryStatus`/`customerNo` 等字段是否与打开时的初始值不同，如果用户已经有未保存的改动，本次弹窗刷新只更新用户明确没有碰过的字段（至少要保证不因为这个改动引入"打字打到一半被吃掉"的新问题；如果实现上一时做不到精细的按字段判断，可以退而求其次：只让"订单状态标记"（`subStatus`/`subStatusRemark`）这部分状态跟着最新记录刷新，其余表单字段维持"仅在弹窗刚打开的那次挂载时初始化一次，之后不再因为底层数据变化被重置"——两种方案任选其一，但必须在实现说明里写清楚选的是哪种，以及为什么这样不会丢用户输入）。
- `OrderTable.tsx` 里其它使用 `editingRecord`（如 `isOpen={editingRecord !== null}`、`onClose={() => setEditingRecord(null)}`）相应改成基于 `editingRecordId` 判断/重置。

**Non-goals / 红线：**

- 不改 `matchesOrderStatus`/`countByStatus`（`OrderPage.tsx` 第 61–67、198–208 行）里"正常"筛选的判定公式——已确认这段逻辑本身是对的，不要动。
- 不改 `src/worker.ts` 里 `INQUIRY_CLEARABLE_FIELDS`（第 205–211 行）和 PUT handler 里"整条记录推送 + 按 body 是否含该字段决定是否清空"的机制（第 1622–1664 行）——这是同一类问题的服务端一侧，但影响面更大（涉及所有走 `updateInD1` 全量推送的调用方，不止这个弹窗），如果本任务改完前端快照问题后 Claude/用户判断还需要动服务端这块，会另开一个 TASK，这次不要顺手改。
- 不影响 `src/features/purchase-order-registration/` 下的采购订单表/采购部登记页面——它们有自己独立的 `PurchaseOrderEditModal.tsx`/`PurchaseOrderRegistrationPage.tsx`，本任务只改订单状态表（`src/features/order/`）这一侧，除非用户后续单独提出采购订单表也有同样问题。
- 不新增数据库字段或改 `InquiryRecord` 的数据结构，只改前端组件如何取/传 `record`。

**Verification steps（供实现者跑）：**

- `npx tsc --noEmit`
- `npx eslint src/features/order/components/OrderTable.tsx src/features/order/components/OrderEditModal.tsx`
- `npm run build`（本仓库沙箱历史上多次因 45 秒硬超时在 Next.js 编译阶段被打断，属已知限制，建议用户本地或 CI 补跑一次完整确认）
- 手动验证（建议在浏览器里做，可以用两个标签页模拟"别处发生变化"）：
  1. 标签页 A 打开某条正常订单（无 撤销/悬挂/善后 标记）的"编辑订单"弹窗，不要关闭。
  2. 标签页 B 打开同一条订单，标记为"善后S"并保存。
  3. 回到标签页 A（弹窗仍开着），只编辑"执行情况"文本，点击保存。
  4. 检查这条订单最终状态：应该仍然是"善后S"（标签页 B 的改动应保留），而不是被标签页 A 的保存冲回"正常"（或反过来验证：B 清除标记，A 保存后不应该把标记重新写回去）。
  5. 额外验证：在弹窗打开时不涉及任何"别处变化"的最普通路径下（单人操作），编辑执行情况、日期、金额、状态标记等字段保存后都符合预期，没有引入新的回归。

**实现结论：**

- `OrderTable` 改为只保存编辑记录 ID，并从最新 `records` prop 实时解析弹窗记录，移除打开瞬间的冻结对象快照。
- `OrderEditModal` 的普通订单字段只在每次打开时初始化，后台同步只刷新用户尚未触碰的 C/P/S 状态区，避免覆盖正在输入的执行情况等草稿。
- 保存时只有用户明确操作过状态按钮或状态备注才提交 `orderSubStatus` / `orderSubStatusRemark`；未操作时省略这两个字段，从补丁层彻底避免无关编辑回写旧状态。
- 新增 2 个组件测试，覆盖“后台刷新不吞输入且不提交旧状态”和“用户明确修改状态优先保存”。
- 验证通过：定向 Jest（2 项）、相关 ESLint、`npx tsc --noEmit`、`npm run build`、`git diff --check`。

## 已关闭 / 不做

| 项 | 说明 |
|----|------|
| TASK-14 旧历史批量迁 D1 | 业务确认取消；旧单可随登录补推（选 B） |
| TASK-15 D1 primary 读路径 | 不做；保持 localStorage 主读 + 登录拉取 |
| X-User-* / 明文 API_TOKEN / validatePassword bug | 已在代码侧修复，见 CURRENT_STATE |

## 可选后续（非紧急）

1. E2E：补无模块权限账号的 `PermissionDenied` 断言（需专用测试账号）。
2. 权限刷新链路：`fetchPermissions` 与 `usePermissionRefresh` 仍有重叠，可继续收敛。
3. 删除 `components/admin/CreateUserModal` 兼容 re-export（确认无外部引用后）。

## 新任务怎么写

- 只在本文件追加**短规格**（背景 / 文件 / 验收），完成后把结论写入 `CHANGELOG` + `CURRENT_STATE`，不要把整段执行日志永久堆在这里。
- 大段运维记录可放临时分支或 PR 描述，不必进仓库长文。
