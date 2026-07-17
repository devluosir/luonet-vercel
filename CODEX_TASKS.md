# CODEX_TASKS.md — 任务索引（精简）

最后更新：2026-07-13

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

## TASK-152：询报价登记表搜索框支持搜索订单号

**状态：** 已完成（2026-07-12）

**背景：**

用户要求：询报价登记表（`/inquiry`）的搜索框目前只匹配询价编号、客户编号、内容简述，希望也能按订单号（`orderNo`）搜索，方便已成单记录直接用订单号定位。

**Files in scope：**

- `src/features/inquiry/hooks/useInquiryFilter.ts` — `baseFiltered` 里的关键词匹配逻辑（第 107–114 行），在现有 `record.inquiryNo`/`record.customerNo`/`record.description` 三个 `includes(kw)` 判断基础上，加一个 `(record.orderNo ?? '').toLowerCase().includes(kw)`。

**Acceptance criteria：**

- 在搜索框输入某条记录的订单号（完整或部分子串，大小写不敏感，与现有询价编号/客户编号搜索行为一致）能命中该记录。
- 原有按询价编号、客户编号、内容简述搜索的行为不变。
- 没有订单号的记录（`orderNo` 为 `undefined`）不受影响，不报错。

**Non-goals / 红线：**

- 不改搜索框的 placeholder 文案、不新增独立的"按订单号搜索"输入框或筛选维度——就是把 `orderNo` 加进现有这一个关键词搜索的判断里。
- 不改订单状态表（`OrderPage.tsx`）自己的搜索逻辑（`matchesKeyword`，已经包含订单相关字段），本任务只动询报价登记表这一处。
- 不改 `useInquiryFilter.ts` 里其它筛选条件（客户、联络人、状态角标等）。

**Verification steps（供实现者跑）：**

- `npx tsc --noEmit`
- `npx eslint src/features/inquiry/hooks/useInquiryFilter.ts`
- 如有该 hook 的现有单测，跑一下确认不回归；如没有，建议顺手补一条"按订单号子串能搜到"的用例。
- 手动验证：在询报价登记表搜索框输入一个已成单记录的订单号，确认能筛出对应行。

**实现结论：**

- 在 `useInquiryFilter` 现有关键词判断中加入 `orderNo` 的空值安全、小写子串匹配；未改 placeholder、其它筛选条件或订单状态表逻辑。
- 新增 hook 测试，覆盖订单号部分匹配、大小写不敏感、缺少订单号，以及原有询价编号/客户编号/内容简述三类搜索。
- 验证通过：定向 Jest（4 项）、相关 ESLint、`npx tsc --noEmit`、`npm run build`、`git diff --check`。

## TASK-153：修正询报价“已成单”筛选为全部成单记录

**状态：** 已完成（2026-07-12）

**背景：**

询报价登记在“全部”中能搜索到部分已有订单编号的记录，但切换到「已成单」后，带辙销C或善后S标记的记录会消失。原筛选把「已成单」定义成普通订单与悬挂P，和“所有已经成单”的业务理解不一致。

**文件与验收：**

- `useInquiryFilter.ts`：`has_order` 只判断非空 `orderNo`，普通、辙销C、悬挂P、善后S 全部纳入。
- `InquiryFilterBar.tsx`：角标与列表共用同一订单编号判定；「已辙销」「善后」继续作为可重叠细分筛选。
- `useInquiryFilter.test.ts`：覆盖四类成单状态，并确认空白/缺失订单编号不会误计入。
- 同步更新 `INQUIRY_MODULE.md`、`CURRENT_STATE.md` 与 `CHANGELOG.md`；不改数据结构、D1、订单状态表的独立状态筛选。

**验证结果：**

- 定向 Jest：`useInquiryFilter.test.ts` 5 个用例全部通过。
- 相关 ESLint、`npx tsc --noEmit`、`npm run build`、`git diff --check` 均通过。
- `npm run pre-release` 的 selector 自检通过；随后全量 Jest 被仓库既有的无关失败中断（报价解析旧 mapping 断言、报价 store 日志断言、CustomerTimeline 缺少 `ToastProvider`、Jest 误加载 Playwright E2E），本次涉及的询报价测试没有失败。

## TASK-154：修复订单“正常”筛选漏掉 `orderSubStatus: null`

**状态：** 已完成（2026-07-12）

**背景：**

FL2627、FL2629、FL2630、FL2632、FL2633、FL2637、FL2640、FL2641、FL2644、KD2601、KD2602、`KD2603(FL2605)` 等有效订单在 D1 中保存了显式 `orderSubStatus: null`。旧“正常”筛选只接受 `undefined` 或 `suspended`，导致这些无 C/P/S 标记的订单被漏掉；根因是同步层用 `null` 传递清空意图，而 Worker 将其原样保存在 JSON 中。

**实现与验收：**

- 新增共享 `isNormalOrder`，订单状态表和采购订单表的列表、角标统一兼容 `undefined` / `null` / `suspended`。
- 新增 `mergeInquiryPayload`；Worker 对五个可清空字段的显式 `null` 执行属性删除，完整记录缺字段清理规则保持不变。
- 新增迁移 013，删除既有 `Document.data.orderSubStatus = null` 并刷新 `updatedAt`/`updated_at`，确保客户端增量同步能拉到清理结果。
- 增加状态分类与 payload 合并测试；同步更新 `ORDER_STATUS_TABLE.md`、`INQUIRY_MODULE.md`、`CURRENT_STATE.md`、`CHANGELOG.md`。

**执行与验证：**

- 远端迁移 013 已执行：显式 `orderSubStatus: null` 从 18 条降为 0；上述 12 条有效订单均确认字段已删除、记录仍为 active。
- Worker 已部署至 `udb.luocompany.net`，版本 `98e92379-def9-4b5c-b3a9-340a8cf20118`。
- 定向 Jest：3 个测试文件、13 个用例全部通过；相关 ESLint、`npx tsc --noEmit`、`npm run build`、`git diff --check` 均通过。

## TASK-155：修复订单状态表回款月份等原生日期/月份选择器"清除"按钮不生效

**状态：** 已完成（2026-07-13）

**背景：**

用户反馈：订单状态表回款月份列，点开原生月份选择器后点里面的"清除"按钮没有反应，字段值没有被清空。

根因定位在 `src/features/order/components/OrderRow.tsx` 的 `MonthPickerCell`（约 271–274 行）：
```
onChange={(e) => {
  const v = fromMonthISO(e.target.value);
  if (v) onSave(v);
}}
```
浏览器原生 `<input type="month">` 点"清除"后触发的 `change` 事件里 `e.target.value` 是空字符串，`fromMonthISO('')` 按现有实现返回 `''`（falsy），于是 `if (v)` 判断为假，`onSave` 根本不会被调用——不是"清除逻辑写错了"，是"清除这个动作被守卫语句拦在了外面，从未到达保存逻辑"。

排查同一文件/同一交互模式（原生 `<input type="date">` + 隐藏 overlay + 图标）后发现，这个"`if (v)` 挡住清空"的写法被复制了 4 处，全部同一根因、同一修法：
1. `OrderRow.tsx` 里紧邻 `MonthPickerCell` 之上的日期单元格组件（约 192–195 行，`m.D` 格式的确认/交货日期一类字段）
2. `OrderRow.tsx` 的 `MonthPickerCell`（约 271–274 行，即本次用户报告的回款月份列）
3. `OrderEditModal.tsx` 的 `DateField`（约 87–90 行，「编辑订单」弹窗里日期类字段，TASK-125 引入）
4. `OrderEditModal.tsx` 的 `MonthField`（约 133–136 行，「编辑订单」弹窗回款月份，TASK-149 新增）

用户本次只报了回款月份列，但另外 3 处是完全相同的代码模式、完全相同的 bug，顺手一起修，避免用户下个月对日期列或弹窗里同一交互再报一次同样的问题。

**文件范围：**
- `src/features/order/components/OrderRow.tsx` — 上述第 1、2 处的 `onChange` 回调
- `src/features/order/components/OrderEditModal.tsx` — 上述第 3、4 处的 `onChange` 回调

**验收标准：**
- 4 处原生选择器（表格行内日期单元格、表格行内回款月份、弹窗日期字段、弹窗回款月份）点击浏览器原生"清除"按钮后，对应字段值都被清空：
  - `OrderRow.tsx` 两处：`onSave` 需要在清除时被调用并传入 `undefined`（而不是被 `if (v)` 拦截、完全不调用）
  - `OrderEditModal.tsx` 两处：`onChange` 需要在清除时被调用并传入空字符串 `''`（modal 内 `handleSave` 已有 `xxx.trim() || undefined` 逻辑，空字符串会在保存时正确转成 `undefined`，不需要额外改 `handleSave`）
- 正常选择某个日期/月份（非清除路径）的行为不变，不能引入新的解析错误
- 表格行内编辑态、弹窗编辑态分别手动验证一次清除操作

**非目标 / 红线：**
- 不改 `toISO`/`fromISO`/`toMonthISO`/`fromMonthISO` 的日期格式转换规则本身，只改"空值要不要传下去"这一个判断
- 不改动数据存储格式（`orderPaymentDate` 仍是纯数字 `m`，日期字段仍是 `m.D`）
- 不涉及采购部登记/采购订单表（`PurchaseOrderRow.tsx` 等），那边如有同样模式不在本任务范围内
- 不改动这 4 处以外的其它字段编辑逻辑（金额、执行情况、订单状态标记等，TASK-149 已处理过的金额/币种逻辑不动）

**验证步骤：**
- `npx tsc --noEmit`
- `npx eslint src/features/order/components/OrderRow.tsx src/features/order/components/OrderEditModal.tsx`
- `npm run build`（沙箱历史上多次 45 秒超时被打断，属已知限制，建议用户本地或 CI 补跑一次）
- 手动验证（建议用户在浏览器里过一遍）：订单状态表行内点开日期单元格和回款月份单元格的原生选择器，选中后点"清除"，确认单元格变回占位符（`m.D` / `m`）；打开"编辑订单"弹窗对日期字段和回款月份字段重复同样验证。

## TASK-156：采购部登记与询报价登记的询报价状态集中梳理（飞罗同步优先级 / 状态列 / 关闭状态只读化）

**状态：** 已完成（2026-07-13，本次会话由 Claude 直接实现，未经 Codex）

**背景：**

采购部登记（`purchaseSupplierStatuses` / `purchaseQuotedStatuses`）与询报价登记（`supplierStatuses` / `quotedStatuses`）共用同一条 `InquiryRecord`，此前只有"采购部普通已报价 → 同步销售侧'飞罗'为 quoted"这一条零散写在 `PurchaseInquiryEditModal.handleSave` 里的规则，且：
- 没有处理"我司无法报价""需补资料"两种更高优先级的采购状态该如何同步飞罗；
- 采购部表格状态列仍是简单的"已成单/未成单"，没有反映询价关闭、需补资料、其它供应商已报价等信息；
- "询价已关闭"在采购部弹窗里是一份独立、可编辑的历史遗留状态（`purchaseQuotedStatuses.type === 'closed'`），与销售侧真实关闭状态（`record.quotedStatuses.type === 'closed'`）脱节，采购部理论上能创建/修改一个跟销售侧不一致的"关闭"；
- 受限视图（只有 `purchaseRegistration`、无 `inquiry` 权限）此前拿不到 `quotedStatuses`，无法读到销售侧真实关闭状态。

**改动模块：**
- `src/features/purchase-registration/utils/purchaseInquiryStatus.ts`（新增）：飞罗同步（`computeSelfSupplierTarget` / `applySelfSupplierSync` / `computeSelfSupplierPatch`）、"其他 n 家已报价"去重计数（`countOtherQuotedSuppliers`）、状态列优先级（`computePurchaseMainStatus` / `formatPurchaseMainStatus`）、飞罗需补资料读取（`isSelfSupplierNeedInfo`）等纯函数，表格与弹窗共用同一套逻辑。
- `src/features/purchase-registration/components/PurchaseInquiryEditModal.tsx`：`handleSave` 改为调用 `computeSelfSupplierPatch`；按 `record.id` 从 `useInquiryStore` 最新状态解析记录（`useEffect` 依赖改成 `record?.id`，只在切换到不同记录时重置本地编辑态，后台同步不清空未保存输入）；新增销售侧需补资料/"其他 n 家已报价"/关闭状态三处只读展示。
- `src/features/purchase-registration/components/PurchaseRegistrationTable.tsx`：表头"成单状态"改为"状态"。
- `src/features/purchase-registration/components/PurchaseRegistrationRow.tsx`：状态列改用 `computePurchaseMainStatus` + `formatPurchaseMainStatus` 渲染单一主 badge。
- `src/features/inquiry/components/InquiryQuoteStatus.tsx`：新增 `unavailableLabel`（默认"已回复客户无法报价"）、`quotedTrailingContent`（默认无）、`showClosedControl`（默认 `true`）三个窄配置 props，默认值保持询报价登记页面行为不变。
- `src/app/api/inquiry/[[...path]]/restrictedView.ts`（新增，从 `route.ts` 拆出）：`sanitizeRestrictedRecord` 采购只读响应新增完整 `quotedStatuses`（只读，未裁剪成部分数组）；`PURCHASE_REGISTRATION_WRITE_FIELDS` 有意不包含 `quotedStatuses`。拆分原因：`route.ts` 顶层 `import next/server` 会在 jsdom 测试环境里因缺全局 `Request`/`Response` 而加载失败，拆成独立纯函数模块便于直接单测。
- `src/app/api/inquiry/[[...path]]/route.ts`：改为从 `./restrictedView` 导入这几个函数，行为不变。

**状态映射与优先级：**

飞罗同步（采购部保存时，按顺序取第一条满足的）：
1. `purchaseQuotedStatuses` 里勾了"我司无法报价" → 飞罗 `unavailable`，日期取该状态日期
2. 任一 `purchaseSupplierStatuses` 为 `need_info` → 飞罗 `need_info`，日期取最新一条需补资料日期
3. `purchaseQuotedStatuses` 存在普通报价 → 飞罗 `quoted`，日期取最新报价日期
4. 均不满足 → 不产生补丁，不清空/回退飞罗现状（兼容旧行为）
只在目标状态与飞罗当前状态/日期不同时才写 `supplierStatuses`，且只替换飞罗这一条。

采购部状态列主 badge（取第一条满足的）：
1. 销售侧 `quotedStatuses` 含 `closed` → "已关闭"（灰）
2. `orderNo` 非空 → "已成单"（绿）
3. `purchaseQuotedStatuses` 含 `supplemented` → "已补充信息"（蓝）
4. 任一采购供应商 `need_info`，或销售侧飞罗 `need_info` → "需补充信息"（黄）
5. 销售侧 `supplierStatuses` 里排除飞罗、按简称去重后 `quoted` 数量 > 0 → "其他 n 家已报价"（蓝）
6. 均不满足 → 空态"—"（灰）

**权限边界：**
- 受限视图（仅 `purchaseRegistration`）GET 响应新增完整只读 `quotedStatuses`，用于展示销售侧真实关闭/需补资料状态。
- `quotedStatuses` 不在 `PURCHASE_REGISTRATION_WRITE_FIELDS` 里；受限 PUT 即使请求体带了 `quotedStatuses`，`pickRestrictedPatch` 也会丢弃，采购部无法写销售侧关闭状态。
- 采购部弹窗不再提供"询价已关闭"的 checkbox/日期编辑，完全只读展示销售侧 `record.quotedStatuses`。

**历史数据兼容策略：**
- 历史 `purchaseQuotedStatuses` 中可能已有的 `type === 'closed'` 记录：不再用于判断采购部是否关闭，不在普通保存时主动删除，也不会覆盖销售侧真实关闭状态——纯粹是死数据，留着不处理。
- 飞罗同步在"四种目标都不满足"时不清空/回退现有飞罗状态，保持此前已上线的兼容策略不变。
- 未新增 D1 表、未改 `schema.sql`、未改 Worker 数据结构。

**测试：**
新增/覆盖 4 个测试文件、共 34 个用例（均通过）：
- `purchaseInquiryStatus.test.ts`（29 例）：飞罗同步四级优先级、去重计数、状态列六种优先级、需补资料读取
- `route.test.ts`（5 例，新建于 `__tests__/`，实际 import `restrictedView.ts`）：`pickRestrictedPatch` 丢弃 `quotedStatuses`、`sanitizeRestrictedRecord` 只读透传完整 `quotedStatuses`
- `InquiryQuoteStatus.test.tsx`（7 例）：默认 props 下询报价登记原有文案/可编辑关闭 checkbox 不变；窄配置 props 生效
- `PurchaseInquiryEditModal.test.tsx`（13 例）：销售侧关闭只读展示、需补资料提示、"其他 n 家已报价"、复选框文案、补丁不含 `quotedStatuses`、状态一致时不发补丁、弹窗打开期间 store 后台更新不清空未保存输入

**验证结果：**
- 定向 Jest（上述 4 个文件 + 关联套件，共 8 个测试文件）：81 用例全部通过
- `npx tsc --noEmit`：通过
- `npx eslint`（本次修改/新增文件）：无输出（首次跑出 2 处 `react/no-unescaped-entities`，已用 `&ldquo;`/`&rdquo;` 修复）
- `git diff --check`：通过
- `node scripts/pre-release-check.js`（`check:selectors`）：通过
- 全量 `npx jest`：除本次改动外，另有 3 个测试套件（`quotation` 解析、`CustomerTimeline`、`useQuotationStore`）及全部 `e2e/*.spec.ts` 失败，经确认均为改动前已存在、与本次改动的文件无关的既有问题（未触碰这些文件，`git status` 显示无变更）
- `npm run build`：沙箱单次命令 45 秒超时限制下，两次尝试都只跑到 "Creating an optimized production build ..." 阶段未等到结束，未能在本次会话完整验证，建议用户本地或 CI 补跑一次完整 `npm run build`
- 手动多权限场景验证（销售账号 `inquiry` / 采购账号仅 `purchaseRegistration`）：未在本次会话执行（沙箱无可登录的浏览器环境），建议用户按任务说明第七节步骤 1–8 手动过一遍双向流程

**尚存风险：**
- `npm run build` 未在本次会话跑完，理论上 `tsc --noEmit` + eslint 已覆盖类型和语法层面，但构建期的 tree-shaking/SSG 边界情况未实测。
- 未做真实登录态下的手动双向验证（销售↔采购两端互相看到对方状态变化），建议按文档步骤人工过一遍。
- `purchaseSupplierStatuses` 里 `need_info` 供应商若全部缺失 `quoteDate`（理论上 UI 会强制填日期，但历史脏数据不能完全排除），`computeSelfSupplierTarget` 会同步出 `quoteDate: ''` 到飞罗，未做专门兜底，属已知边界情况，未见于当前数据但值得关注。

**追加修复（同日）：** 用户反馈"采购侧没有显示已补充信息的提示"。

根因：`InquiryQuoteStatus.tsx` 里"已补充信息" checkbox 的显示条件 `hasNeedInfoSupplier` 只看组件自己收到的 `supplierStatuses`（采购部弹窗场景下这是本地 `purchaseSupplierStatuses` 的影子记录）。销售侧飞罗的 `need_info` 是通过独立的只读信号（`isSelfSupplierNeedInfo(record.supplierStatuses)`）在弹窗里单独渲染一条黄色提示，并不写回 `purchaseSupplierStatuses`——于是"飞罗需补资料"这条提示能看到，但触发"已补充信息"勾选的条件判断不到它，采购部没有入口能标记"已处理"。

修复：`InquiryQuoteStatus` 新增第 4 个窄配置 prop `extraNeedInfo?: boolean`（默认 `false`，询报价登记场景行为不变），`hasNeedInfoSupplier` 改为 `本地 supplierStatuses 是否有 need_info || extraNeedInfo`。`PurchaseInquiryEditModal.tsx` 传入 `extraNeedInfo={selfSupplierNeedInfo}`（复用已有的销售侧飞罗读取结果，未新增计算）。

- 文件：`src/features/inquiry/components/InquiryQuoteStatus.tsx`、`src/features/purchase-registration/components/PurchaseInquiryEditModal.tsx`
- 新增测试：`InquiryQuoteStatus.test.tsx` 4 例（默认不显示、本地 need_info 显示、`extraNeedInfo` 显示、勾选后正确触发 `onQuotedChange`），`PurchaseInquiryEditModal.test.tsx` 2 例（复现原 bug 场景 + 保存后 `purchaseQuotedStatuses` 含 `supplemented`）
- 验证：定向 Jest（8 个文件）87 例全部通过；`npx tsc --noEmit`、`npx eslint`（4 个改动文件）、`git diff --check` 均通过
- `npm run build` 仍未在沙箱里跑完（同上已知限制）

**追加修复 2（同日）：** 用户进一步说明"已补充信息"还有另一种来源——销售侧从客户那边拿到补充信息后，登记在**询报价登记原始** `record.quotedStatuses.type === 'supplemented'`（销售页面沿用默认 `InquiryQuoteStatus` 的"已补充信息" checkbox），这跟采购部自己标记的 `purchaseQuotedStatuses.type === 'supplemented'` 是两个完全独立的存储，此前采购部（状态列 + 编辑弹窗）只看自己那一份，看不到销售侧已经拿到资料。

修复：
- `purchaseInquiryStatus.ts` 新增 `findSalesSupplemented` / `isSalesSupplemented`（读 `record.quotedStatuses`，与已有的 `isSelfSupplierNeedInfo` 同一模式）。
- `computePurchaseMainStatus` 的"已补充信息"优先级（第 3 档）改为 `purchaseQuotedStatuses` 或销售侧 `quotedStatuses` 任一存在 `supplemented` 都命中，两个来源互不覆盖、只做"是否命中"的 OR 判断。
- `PurchaseInquiryEditModal.tsx` 新增独立的蓝色只读提示"销售侧提示：已补充信息（日期）"，与已有的"飞罗需补充信息"黄色提示、"询价已关闭"灰色提示并列，互不影响。

- 文件：`purchaseInquiryStatus.ts`、`PurchaseInquiryEditModal.tsx`
- 新增测试：`purchaseInquiryStatus.test.ts` 5 例（状态列优先级识别销售侧来源 + `findSalesSupplemented`/`isSalesSupplemented` 3 例），`PurchaseInquiryEditModal.test.tsx` 3 例（显示/隐藏/历史 `purchaseQuotedStatuses` 里的 legacy supplemented 不误触发）
- 验证：定向 Jest（8 个文件）94 例全部通过；`npx tsc --noEmit`、`npx eslint`（4 个改动文件）、`git diff --check` 均通过；`npm run build` 仍未在沙箱里跑完（同上已知限制）

**追加调整 3（同日）：** 用户提出三点：①采购部编辑弹窗里"飞罗需补充信息"和"已补充信息"两条提示要同一行显示，且"需补充信息"也要带日期；②销售侧（询报价登记编辑弹窗）也要有对称的"采购侧提示"，覆盖需补充/已补充两种情况；③确认状态列"已补充"优先级高于"需补充"。

处理：
- ①③ 逐条核实：③ 在 `computePurchaseMainStatus` 里"已补充信息"判断本来就在"需补充信息"判断之前 return，已有回归测试覆盖，代码层面无需改动，用户看到的旧行为是本次改动尚未部署所致。① 需要代码改动。
- `purchaseInquiryStatus.ts` 新增：`findSelfSupplierNeedInfo`（返回飞罗 need_info 完整记录，含日期，`isSelfSupplierNeedInfo` 改为基于它派生）；`findLatestPurchaseNeedInfo`（销售侧读取采购部 `purchaseSupplierStatuses` 里最新一条 need_info，供②使用）；`findPurchaseSupplemented`（销售侧读取采购部自己标记的 `purchaseQuotedStatuses.supplemented`，供②使用）。
- `PurchaseInquiryEditModal.tsx`：两条"销售侧提示"改成同一个 `flex flex-wrap gap-2` 容器内的 `<span>`，天然同行显示、窄屏自动换行；"飞罗需补充信息"追加日期（`selfSupplierNeedInfoEntry.quoteDate` 为空时不带括号，兜底历史脏数据）。
- `InquiryFormModal.tsx`（询报价登记编辑/新增弹窗）新增对称的只读提示区："采购侧提示：需补充信息（日期）"（黄）+"采购侧提示：已补充信息（日期）"（蓝），同样是 `flex flex-wrap` 同行布局；数据直接读 `record.purchaseSupplierStatuses` / `record.purchaseQuotedStatuses`（未经本地编辑、透传自 props，与销售侧本地编辑状态无关，不提供编辑入口）。这是本次改动首次让 `src/features/inquiry` 反向 import `src/features/purchase-registration/utils`，因为这两个字段的读取逻辑已经沉淀在 `purchaseInquiryStatus.ts` 里，不重复实现一套。

- 文件：`purchaseInquiryStatus.ts`、`PurchaseInquiryEditModal.tsx`、`InquiryFormModal.tsx`
- 新增测试：`purchaseInquiryStatus.test.ts` 12 例（`findSelfSupplierNeedInfo`/`findLatestPurchaseNeedInfo`/`findPurchaseSupplemented` 三组），`PurchaseInquiryEditModal.test.tsx` 4 例（日期展示、缺日期兜底、同行结构断言），新建 `InquiryFormModal.test.tsx` 5 例（两条提示各自展示、同行结构、无数据/新增模式不显示）
- 验证：定向 Jest（9 个文件）111 例全部通过；`npx tsc --noEmit`、`npx eslint`（6 个改动/新增文件）、`git diff --check` 均通过；`npm run build` 仍未在沙箱里跑完（同上已知限制）

## TASK-157：采购部登记表状态列加宽 + 四张登记表（询报价登记/采购部登记/订单状态表/采购订单表）支持手动拖拽调整列宽

**状态：** 已完成（2026-07-13，本次会话由 Claude 直接实现，未经 Codex）

**背景：**

用户反馈采购部登记表"询报价状态"列太窄（TASK-156 新增的状态提示装不下），并希望采购侧和销售侧全部 4 张登记表——询报价登记（`/inquiry`）、采购部登记（`/purchase-registration`）、订单状态表（`/order`）、采购订单表（`/purchase-order-table`）——每列列宽都能手动拖拽调整（不只是加宽一列）。

这 4 张表此前都是纯百分比 `<colgroup>`/`<th style>` 布局，其中 3 张（`InquiryTable`/`OrderTable`/`PurchaseOrderTable`）还各自有一套响应式断点逻辑（根据屏宽显示/隐藏部分列），只有 `PurchaseRegistrationTable` 没有断点逻辑。

**设计决策（未与用户逐条确认，属合理默认，此处说明）：**

拖拽调宽只在每张表"全列展示"的断点下启用，更窄的响应式断点完全不受影响、继续用原有百分比布局——零回归风险，不触碰已经调优过的移动端/平板列隐藏逻辑：
- `InquiryTable`：`lg` 断点（客户编号列可见即代表全列展示）
- `PurchaseRegistrationTable`：本身没有断点逻辑，全断点都启用
- `OrderTable`：`xl` 断点（含"客户订单号"，"金额/回款/到账金额"三列仍另受 `canViewFinancials` 权限控制，权限不够时该断点下也是当前用户能看到的最全列集）
- `PurchaseOrderTable`：`lg` 或 `xl`（两个断点视觉列集相同，都含"客户订单号"）

拖拽调宽断点下，表格从 `w-full`（撑满容器）改为显式像素总宽（`style={{width: 总和}}`），外层包一层 `overflow-x-auto`（`PurchaseRegistrationTable`/`OrderTable`/`PurchaseOrderTable` 原本没有这层包裹，本次统一补上；`InquiryTable` 已有）。可能的视觉副作用：默认总宽比容器窄时，表格右侧会有一小段空白（不会撑满到边框），比撑不下时出现横向滚动条更常见；用户拖宽列后可自行消除。全选框/操作列固定宽度，不参与拖拽（避免被拖没）。

**改动模块（新增）：**
- `src/components/table/useResizableColumns.ts`：通用 hook，按列 id（不用数组下标，避免权限/断点导致的列增删错位）把像素宽度存 `localStorage`；导出纯函数 `computeResizedWidth(startWidth, deltaX, minWidth)` 便于单测；列集合变化时自动给新列补默认宽度，已有列宽不受影响。
- `src/components/table/ResizeHandle.tsx`：`<th>` 右边缘的拖拽手柄（`role="separator"`），`onPointerDown` 触发拖拽，`onDoubleClick` 重置该列为默认宽度。

**改动模块（接入 4 张表）：**
- `PurchaseRegistrationTable.tsx`："询报价状态"列默认宽度从原先约 26%（对应约 234px）加宽到 340px，`localStorage` key `purchaseRegistration.tableColWidths`。
- `InquiryTable.tsx`：5 个内容列（询价编号/询价人/客户编号/内容简述/询报价状态）在 `lg` 断点接入拖拽，key `inquiry.tableColWidths`；checkbox/操作列固定不参与。
- `OrderTable.tsx`：订单编号/交货/客户/内容简述/确认日/客户订单号/执行情况 + 权限允许时的金额/回款/到账金额，在 `xl` 断点接入拖拽，key `order.tableColWidths`。
- `PurchaseOrderTable.tsx`：订单编号/内容描述/采购单号/供应商/(金额，权限允许时)/交货日期/确认日期/客户订单号/执行情况，在 `lg`/`xl` 断点接入拖拽，key `purchaseOrderTable.tableColWidths`。

**测试：**
新增 3 个测试文件、共 24 个用例（均通过）：
- `useResizableColumns.test.ts`（14 例）：`computeResizedWidth` 边界/取整/最小宽度钳制；hook 默认宽度、读取/丢弃非法 `localStorage` 脏数据、拖拽全流程（pointerdown→pointermove→pointerup）落盘、`resetColumn`、列集合新增列时旧列宽不受影响。
- `PurchaseRegistrationTable.test.tsx`（4 例）：4 个拖拽手柄渲染、"询报价状态"列默认宽度 ≥300px、拖拽后列宽变化并持久化、空记录态不渲染手柄。
- `InquiryTable.test.tsx`（3 例）：`lg` 断点渲染 5 个拖拽手柄（checkbox/操作列没有）、`md`/`sm` 断点完全不渲染手柄（验证不影响现有响应式布局）、拖拽后持久化。

jsdom 26 不支持 `PointerEvent` 构造函数，组件级集成测试改用 `new MouseEvent('pointerdown', {clientX, ...})` 冒充（只匹配 `event.type` 做 DOM 派发，不影响真实场景，因为浏览器里 `onPointerDown` 收到的就是真正的 `PointerEvent`）；`pointermove`/`pointerup` 走 `window.addEventListener` 原生监听，用带 `clientX` 属性的普通 `Event` 即可。

**验证结果：**
- 定向 Jest（3 个新文件）：24 用例全部通过
- `npx tsc --noEmit`：通过
- `npx eslint`（全部改动/新增文件）：无输出
- 全量 `npx jest`（不含 `e2e/`）：3 个测试套件、15 个用例失败，均在 `src/features/quotation/state/__tests__/useQuotationStore.test.ts`，`git status` 确认未改动 `quotation` 相关任何文件，属改动前已存在的既有问题，与本次改动无关
- `e2e/*.spec.ts`：因沙箱环境问题（Playwright 相关依赖加载失败）全部失败，属既有环境限制，与本次改动无关
- `npm run build`：未在本次会话执行（沙箱单次命令有时长限制，历史已知问题），建议用户本地或 CI 补跑一次完整验证

**尚存风险：**
- 未做真实浏览器手动验证（沙箱无可视浏览器），建议用户本地打开这 4 个页面，在桌面宽度下实际拖拽几列、刷新页面确认宽度记忆生效、双击手柄确认能重置默认宽度。
- 未做跨设备/跨浏览器 `localStorage` 同步（本来就是纯本地端偏好设置，同一账号换设备/浏览器不会带着走，符合"UI 偏好"惯例）。

**追加修复（同日）：** 用户反馈"修改后的四个表，都不到全窗了"（截图确认表格右侧有明显留白，没有撑满容器）。

根因：初版实现给每一列都设置了显式像素宽度，`<table>` 也跟着改成 `style={{width: 列宽总和}}`。当默认列宽总和小于用户实际窗口宽度时，`table-layout: fixed` 没有任何机制把"多出来的容器空间"分配给已经全部具名宽度的列——CSS 规范只在"存在未指定宽度的列"时才会把剩余空间分给它们；一旦每列都写死了宽度，浏览器就按总和渲染，多余空间原样留白，不会主动撑满。

修复：每张表挑一列本来就最"内容型"的列（内容描述/内容简述），故意不给它设置显式宽度、也不给拖拽手柄，只让其余列可拖拽；表格本身改回固定用 `w-full`（不再手动算总宽度）。这样 `table-layout: fixed` 会把 `w-full` 减去其它列显式宽度后的剩余空间全部分给这一列——表格永远撑满容器，不会留白；容器特别窄时该列可能被压缩得比较窄，由外层 `overflow-x-auto` 兜底避免真正溢出。四张表都是这个模式，不可拖拽的列固定为：`PurchaseRegistrationTable`/`PurchaseOrderTable` 的"内容描述"、`InquiryTable`/`OrderTable` 的"内容简述"。

- 文件：`PurchaseRegistrationTable.tsx`、`InquiryTable.tsx`、`OrderTable.tsx`、`PurchaseOrderTable.tsx`
- 测试调整：`PurchaseRegistrationTable.test.tsx`（拖拽手柄数量 4→3 + 新增"表格 w-full 且内容描述列无显式宽度"断言）、`InquiryTable.test.tsx`（拖拽手柄数量 5→4 + 拖拽用例改测"询报价状态"列 + 新增 w-full 断言）
- 验证：定向 Jest（`src/components/table` + 四张表所在的 5 个 feature 目录，共 13 个文件）131 例全部通过；`npx tsc --noEmit`、`npx eslint`（全部改动文件）均无输出
- 未在沙箱里跑真实浏览器验证不同窗口宽度下的实际撑满效果，建议用户本地确认。

**追加调整（同日）：** 用户提出三点：①采购部登记表"状态"列改名为"状态描述"；②列里的各状态表述都要带上最近的日期；③如果有"已补充信息"要显示"已补充信息"而不是"需补充信息"（确认优先级要求，非新逻辑——`computePurchaseMainStatus` 里 supplemented 判断本来就在 need_info 之前 return，逐条核实后代码层面无需为这一点改动，实现②的过程中额外补了一条回归测试固化这个顺序）。

处理：
- `purchaseInquiryStatus.ts`：`PurchaseInquiryMainStatus` 的每个 kind 都加上可选 `date?: string`；`computePurchaseMainStatus` 按 kind 各自取最贴切的日期来源——`closed` 取关闭记录日期；`ordered` 取 `orderConfirmDate`（可能为空）；`supplemented` 取采购部/销售侧两个来源里较新的一条；`need_info` 取采购供应商/销售侧飞罗两个来源里较新的一条；`others_quoted` 新增 `findLatestOtherQuotedDate`（排除飞罗，取其他已报价供应商里最新报价日期）。新增 `formatPurchaseMainStatus` 内部 `withDate()` 辅助函数：有日期时格式化成"label（日期）"（复用 `stripDateBrackets` 去掉方括号），日期为空/未定义时只显示 label，不带空括号、不报错。
- **过程中发现并修复一个真实回归**：初版实现直接用 `findLatestPurchaseNeedInfo(...)` 的返回值做"是否存在 need_info 供应商"的存在性判断，但这个函数内部会先按"是否有日期"过滤——如果采购供应商标了 need_info 但没填日期（历史数据/用户还没来得及填日期都可能出现），会被误判成"不存在"，状态列直接跳过 need_info 判档，错误显示成更低优先级的"其他 n 家已报价"甚至"—"。修复：存在性判断改回直接看 `status === 'need_info'`（不受日期是否存在影响），日期只在"确认存在"之后才去查、允许查不到。新增回归测试固化这个场景。
- `PurchaseRegistrationTable.tsx`：表头"状态"改为"状态描述"；该列默认宽度从 130px 加到 170px（带日期后文案变长）。
- `PurchaseRegistrationRow.tsx`：badge 的 `<span>` 加 `truncate whitespace-nowrap` + `title` 属性，避免变长后的文案在圆角 pill 里换行，超出列宽时截断显示省略号、hover 可看完整文案。

- 文件：`purchaseInquiryStatus.ts`、`PurchaseRegistrationTable.tsx`、`PurchaseRegistrationRow.tsx`
- 新增/调整测试：`purchaseInquiryStatus.test.ts` 新增 13 例（各 kind 日期来源、"取较新日期"场景、`formatPurchaseMainStatus` 带日期文案、`findLatestOtherQuotedDate`、上述回归用例），原有几条断言补上新增的 `date` 字段
- 验证：定向 Jest（`purchase-registration` 目录）77 例全部通过；`src/components/table` + 四张表所在 5 个 feature 目录（共 13 个文件）140 例全部通过；`npx tsc --noEmit`、`npx eslint`（改动文件）均无输出；`git diff --check` 通过
- `npm run build` 未在本次会话执行（沙箱单次命令有时长限制，历史已知问题）

**追加修复（同日）：** 用户反馈"手动调节列宽的呈现，有点意外，有几个列，非调节的位置被拖动，请检查"，经两轮澄清后给出精确描述："采购部登记表，拖询报价状态与状态描述之间的手柄，它的动作是询报价状态列向左扩展。另 内容描述与询报价状态间的手柄无法选中。采购订单表中也有多个列这样，前面的手柄选不中，后面的手柄调节，动的是前列的宽。四个表里都有这种现象"——确认是 4 张表通用的架构性 bug。

根因：上一条"追加修复"里引入的"不设显式宽度、吸收剩余空间"的撑满列（`PurchaseRegistrationTable`/`PurchaseOrderTable` 的"内容描述"、`InquiryTable`/`OrderTable` 的"内容简述"）被放在了每张表渲染顺序里偏靠前（第 2 列）的位置，但它后面还有多个可拖拽列。`table-layout: fixed` 下，拖动某一列右边缘手柄改变该列宽度时，多出来/减少的空间必须由"没有显式宽度"的那一列吸收/补偿——如果撑满列在被拖拽列的左边，视觉上就表现成撑满列（即"内容描述/内容简述"）的宽度反向变化，而不是被拖拽列本身在动；因为撑满列本身没有手柄，用户感知成"点错了地方""手柄选不中""动的是前一列"。

修复：把"撑满列"的位置从"第 2 列"挪到每张表渲染顺序里**实际最后一列**（撑满逻辑本身要求它必须是最后一列，之前放第 2 列是本次系列改动里的疏漏），"内容描述/内容简述"改回正常可拖拽列（带独立宽度 + 手柄）：
- `PurchaseRegistrationTable`：撑满列改为"状态描述"（原"main"列，本身就是最后一列）
- `InquiryTable`：撑满列改为"询报价状态"（可拖拽列里的最后一个，操作列 del 之前）
- `PurchaseOrderTable`：撑满列改为"执行情况"（渲染顺序里本来就是最后一列，之前误让"内容描述"抢了撑满角色）
- `OrderTable`：撑满列按权限动态决定——`canViewFinancials`（可查看金额）为真时最后一列是"到账金额"，否则是"执行情况"；两种情况下该列都改为撑满、不给手柄，`deliveryStatus` 仅在有权限查看金额时才作为普通可拖拽列纳入

- 文件：`PurchaseRegistrationTable.tsx`、`InquiryTable.tsx`、`OrderTable.tsx`、`PurchaseOrderTable.tsx`
- 测试调整：`PurchaseRegistrationTable.test.tsx`（手柄断言从"内容描述"改成"状态描述"没有手柄、撑满列断言从 `cols[1]` 改成 `cols[3]`，新增回归用例"拖拽内容描述手柄不影响询价编号列宽度"）、`InquiryTable.test.tsx`（手柄断言从"询报价状态没有手柄"改成对应新位置、拖拽用例改测"内容简述"、新增回归用例"拖拽内容简述手柄不影响客户编号列宽度"，并顺手清理一处未使用的 `container` 解构导致的 eslint 警告）；`OrderTable`/`PurchaseOrderTable` 本身没有既存测试文件，未新增
- 验证：定向 Jest（`src/components/table` + 四张表所在 5 个 feature 目录，共 13 个文件）142 例全部通过；`npx tsc --noEmit`、`npx eslint`（改动文件）均无输出；`git diff --check` 通过
- 未在沙箱里做真实浏览器拖拽验证（无可视浏览器），建议用户本地打开这 4 个页面实际拖拽确认：①拖拽方向恢复正常（列本身右边缘跟着鼠标走，不再是左边的列被动改变）；②"内容描述/内容简述"与其右侧列之间的手柄现在能正常选中拖拽
- `npm run build` 未在本次会话执行（沙箱单次命令有时长限制，历史已知问题）

**追加修复（同日）：** 用户反馈两点：①编辑询价弹窗里"询价编号"不够醒目；②某条记录编辑弹窗里已经能看到销售侧提示"已补充信息（7.10）"，但同一条记录在表格"状态描述"列里仍显示"需补充信息"。

①是纯样式问题，`PurchaseInquiryEditModal.tsx` 头部询价编号从 `text-xs text-gray-400` 改为 `text-sm font-bold text-blue-700`。

②排查后发现是一个真实的数据展示 bug，比表面看到的"已补充信息 vs 需补充信息"优先级问题更底层：`PurchaseRegistrationPage.tsx` 的 `filterableRecords`（专门为了让筛选栏"报价状态"维度按采购部自己的 `purchaseQuotedStatuses` 而不是销售侧 `quotedStatuses` 筛选，把每条记录的 `quotedStatuses` 字段整体替换成 `purchaseQuotedStatuses`）经过 `useInquiryFilter` 筛选排序后得到的 `filteredAndSorted`，未经换回就直接被 `finalRecords` 传给了 `PurchaseRegistrationTable` 渲染。也就是说表格实际渲染、状态列实际计算用的"记录"，`quotedStatuses` 字段被悄悄换成了 `purchaseQuotedStatuses`——销售侧真实登记在 `quotedStatuses` 里的 `supplemented`（已补充信息）记录，在这份"影子记录"里完全看不到，`computePurchaseMainStatus` 的第 3 档（已补充信息）判断不到内容，就跳到了第 4 档"需补充信息"。编辑弹窗之所以显示正确，是因为它按 `record.id` 直接从 `useInquiryStore` 原始 `records` 数组里重新查找，完全不经过这层影子记录，侧面印证了问题只出在 `finalRecords` 这条链路上。

修复：新增纯函数 `restoreOriginalRecords(shadowRecords, originalById)`（`purchaseInquiryStatus.ts`），在筛选/排序完成后按 id 把每条影子记录换回原始记录（找不到时原样返回，不阻塞渲染）。`PurchaseRegistrationPage.tsx` 新增 `activeRecordsById`（`activeRecords` 按 id 建的 Map），`finalRecords` 计算末尾套一层 `restoreOriginalRecords(...)`。筛选/排序判断依据仍然是影子记录（按 `purchaseQuotedStatuses` 语义，符合原设计意图），但最终渲染进表格/传给编辑弹窗的对象换回真实数据。

- 文件：`purchaseInquiryStatus.ts`、`PurchaseRegistrationPage.tsx`、`PurchaseInquiryEditModal.tsx`
- 新增测试：`purchaseInquiryStatus.test.ts` 新增 `restoreOriginalRecords` describe 块 3 例，含专门复现"影子记录覆盖导致已补充信息误判成需补充信息"的回归用例（换回前后分别断言 `formatPurchaseMainStatus` 的 label）
- 验证：`purchase-registration` 目录定向 Jest 81 例全部通过；`src/components/table` + 四张表所在 5 个 feature 目录（共 13 个文件）145 例全部通过；`npx tsc --noEmit`、`npx eslint`（改动文件）均无输出；`git diff --check` 通过
- `npm run build` 未在本次会话执行（沙箱单次命令有时长限制，历史已知问题）；未做真实浏览器验证，建议用户本地确认这条记录及类似记录的状态描述列现在显示正确

## TASK-158：善后S 支持标记"完成"，完成后归入正常单 + 徽标显示 S-OK

**状态：** 已完成（2026-07-13，本次会话由 Claude 直接实现，未经 Codex）

**背景：** 用户要求（原话）："关于善后的订单，在善后完成后，应归为正常单，请在编辑订单窗中，对于订单状态标记里的，善后被选中后，在情况备注后面，有一个善后完成选择框，并将已完成善后的单子S"红色"后面-OK"绿色"，且归到正常单列表中。当然在筛选善后列表中当然也要能显示。"

拆解为四点：①"编辑订单"弹窗，选中善后S 后在情况备注下方新增"善后完成" checkbox；②勾选后订单编号旁的字母标记从红色"S"变成红色"S" + 绿色"-OK"；③归入"正常单"筛选/统计；④"善后"细分筛选仍要能筛出这些已完成的记录（不能因为标完成就从"善后"列表里消失）。

**设计要点：**

新增字段 `orderFollowupCompleted?: boolean`（`InquiryRecord`，纯 JSON 字段，无需 D1 迁移，写法与 `orderDeliveryStatus` 等字段一致，不进 `INQUIRY_CLEARABLE_FIELDS`——未勾选时前端发 `undefined`，序列化成 `null`，读取时各处用 `!!`/`??` 处理，null 与 undefined 等价，不需要 Worker 侧特殊删除字段逻辑）。只在 `orderSubStatus === 'followup'` 时有意义，切到其它状态或取消勾选都会清空。

第④点"筛选善后列表仍要显示"其实不需要改动：`matchesOrderStatus` 对 C/P/S 细分筛选一直是 `record.orderSubStatus === filter`，与是否完成无关，只要不清空 `orderSubStatus` 本身，筛选自然继续命中——已用回归测试固化这个不变量。

**业务逻辑收敛到 `orderStatus.ts`（原本分散在多处的重复实现，本次一并收敛，降低"改一处漏一处"的风险——`isInProgressOrder` 原来在 `OrderPage.tsx` 与 `PurchaseOrderRegistrationPage.tsx` 各有一份、注释互相说"与另一处完全一致"，`getRowBgClass`/`OrderNoText` 在 `OrderRow.tsx`/`PurchaseOrderRow.tsx` 也是逐字节复制）：**
- `isFollowupCompleted(record)`：`orderSubStatus === 'followup' && !!orderFollowupCompleted`，其它三个函数都基于它判断，单一事实来源
- `isNormalOrder`：无标记/悬挂P 仍归正常，新增"善后S 且已完成"也归正常（辙销C 没有"完成"概念，不受影响）
- `isInProgressOrder`：从 `OrderPage.tsx`/`PurchaseOrderRegistrationPage.tsx` 两处重复实现收敛成这一处导出，两个页面改为直接 import；悬挂P 仍强制算进行中，善后S 完成前也强制算进行中，完成后改为按真实执行情况文字判断（不再强制“进行中”，因为"归入正常单"就意味着不再对它特殊处理）
- `getOrderRowBgClass`：从 `OrderRow.tsx`/`PurchaseOrderRow.tsx` 两处逐字节重复的 `getRowBgClass` 收敛成这一处导出；善后S 完成后不再是红色底，回到默认（无特殊底色）
- `getOrderSubStatusLetter(record)`：返回 `{ letter: 'C'|'P'|'S', completed: boolean }` 或 `null`，供 4 个渲染位置统一取用

**渲染层：**
- 新增 `src/features/order/components/OrderNoText.tsx`：从 `OrderRow.tsx`/`PurchaseOrderRow.tsx` 里两份逐字节相同的 `OrderNoText` 组件抽出来的共享组件（`PurchaseOrderRow.tsx` 已有跨 feature 复用 `DeliveryStatusCell` 的先例，这里延续同样的做法），字母标记后按 `completed` 追加绿色 `-OK`
- `InquiryRow.tsx`/`PurchaseRegistrationRow.tsx`：订单号 pill 徽标内联渲染（样式与 `OrderNoText` 不同，不抽共享组件，只共用 `getOrderSubStatusLetter`/`isFollowupCompleted` 两个逻辑函数），完成后 pill 的 `ring` 颜色也从红色恢复成绿色

**"编辑订单"弹窗（`OrderEditModal.tsx`）：** 情况备注下方新增"善后完成" checkbox，仅在 `subStatus === 'followup'` 时显示；沿用既有的 `subStatusDirtyRef` 脏检查模式（未触碰状态区时保存不带这个字段，避免用旧值覆盖其它标签页刚同步的最新完成状态，与 TASK-151 的并发保护是同一套机制）；点击 C/P/S 按钮切换到非善后状态时，本地 `followupCompleted` 状态同步清空，避免残留一个不对应任何善后状态的"已完成"标记。

**受限视图：** `restrictedView.ts` 的 `allowPurchaseOrderTable` 分支新增只读暴露 `orderFollowupCompleted`（与已有的 `orderSubStatus` 同等对待，只读不放行写入），否则仅有采购权限的用户在采购订单表看到的会一直是"S"而不是"S-OK"。

- 文件：`types/index.ts`、`orderStatus.ts`、`OrderEditModal.tsx`、`OrderNoText.tsx`（新增）、`OrderRow.tsx`、`PurchaseOrderRow.tsx`、`InquiryRow.tsx`、`PurchaseRegistrationRow.tsx`、`OrderPage.tsx`、`PurchaseOrderRegistrationPage.tsx`、`restrictedView.ts`
- 新增/调整测试：`orderStatus.test.ts` 新增 24 例（`isFollowupCompleted`/`isNormalOrder`/`isInProgressOrder`/`getOrderRowBgClass`/`getOrderSubStatusLetter` 各种组合）；`OrderEditModal.test.tsx` 新增 5 例（checkbox 显隐、勾选保存、取消勾选清空、切状态清空、未触碰状态区不覆盖）；`OrderRow.test.tsx` 新增 2 例（S/S-OK 渲染 + 行背景恢复正常）；`route.test.ts` 新增 1 例（受限视图只读暴露该字段）
- 验证：`src/features/inquiry`/`order`/`purchase-order-registration`/`purchase-registration`/`components/table`/`app/api/inquiry` 共 14 个测试套件 177 例全部通过；`npx tsc --noEmit`、`npx eslint`（改动文件）均无输出；`git diff --check` 通过；全量 `npx jest`（不含 `e2e/`）另有 3 个套件、15 个用例失败，均在 `useQuotationStore.test.ts`，`git status` 确认未改动 quotation 相关任何文件，是改动前已存在的既有问题
- `npm run build` 未在本次会话执行（沙箱单次命令有时长限制，历史已知问题）；未做真实浏览器验证，建议用户本地在订单状态表打开一条善后S 记录的"编辑订单"弹窗，勾选"善后完成"保存后确认：①订单编号旁变成 "S" 红 + "-OK" 绿；②行背景从红色恢复正常；③"正常"筛选能筛到这条；④"善后"筛选依然能筛到这条

## TASK-159：销售侧"已回复客户无法报价"状态传递到采购部登记

**状态：** 已完成（2026-07-13，本次会话由 Claude 直接实现，未经 Codex）

**背景：** 用户要求（原话）："如果销售侧，将此单归为 已回复客户无法报价，和询价已关闭，它的状态和提示也要传递到采购侧"。

排查发现"询价已关闭"（`quotedStatuses` 中 `type === 'closed'`）在 TASK-156 已经完整传递到采购侧（状态列最高优先级 + 编辑弹窗只读提示），无需改动。但"已回复客户无法报价"（`quotedStatuses` 中 `type === 'unavailable'`，销售在询报价登记页面对客户回复无法报价时勾选）此前完全没有传递到采购侧——`computePurchaseMainStatus` 不识别这个 type，编辑弹窗也没有对应的只读提示，采购部完全看不到销售已经回复客户无法报价这件事。

**注意区分两个同名字段、不同来源的"无法报价"：** 采购部自己勾选的"我司无法报价"写在 `purchaseQuotedStatuses`（用于同步销售侧"飞罗"供应商状态，`computeSelfSupplierTarget` 已有的既有逻辑，不受本次改动影响）；本次新增读取的是销售侧 `quotedStatuses` 里的 `unavailable`，是完全独立的另一份数据，只读展示给采购部，不建立任何写入通路。

**修复：**
- `purchaseInquiryStatus.ts` 新增 `findSalesUnavailable(quotedStatuses)`（模式与既有的 `findSalesSupplemented` 完全一致）；`PurchaseInquiryMainStatus` 新增 `unavailable` 档，`computePurchaseMainStatus` 优先级插入在"已关闭"之后、"已成单"之前（与"已关闭"同属销售侧终态标记，理论上不应与真实成单同时出现，出现即视为历史遗留数据未清理，仍按此优先级展示，不特殊处理）；`formatPurchaseMainStatus` 新增对应 case，文案"无法报价"，配色沿用与"已关闭"相同的灰色调（呼应 `getRecordColorState` 里"unavailable/closed 同归一类"的既有配色惯例）。
- `PurchaseInquiryEditModal.tsx` 顶部提示行（与"飞罗需补充信息"/"已补充信息"同一个 `flex flex-wrap` 容器）新增"销售侧提示：已回复客户无法报价（日期）"灰色只读提示。

- 文件：`purchaseInquiryStatus.ts`、`PurchaseInquiryEditModal.tsx`
- 新增测试：`purchaseInquiryStatus.test.ts` 新增 findSalesUnavailable 4 例 + computePurchaseMainStatus/formatPurchaseMainStatus 相关 4 例（含"closed 高于 unavailable"、"unavailable 高于 ordered"两条优先级回归）；`PurchaseInquiryEditModal.test.tsx` 新增 4 例（显示/不显示/来源隔离/与其它提示同行）
- 验证：`purchase-registration` 目录定向 Jest 92 例全部通过；`src/features/inquiry`/`order`/`purchase-order-registration`/`purchase-registration`/`components/table`/`app/api/inquiry` 共 14 个测试套件 188 例全部通过；`npx tsc --noEmit`、`npx eslint`（改动文件）均无输出；`git diff --check` 通过
- `npm run build` 未在本次会话执行（沙箱单次命令有时长限制，历史已知问题）；未做真实浏览器验证，建议用户本地在询报价登记勾选"已回复客户无法报价"后，到采购部登记确认状态列显示"无法报价（日期）"、编辑弹窗显示对应只读提示

**追加修复（同日）：** 用户反馈截图确认弹窗提示已正确显示后，进一步要求："当销售部已标记已回复客户无法报价和询价已关闭时，采购部的该记录，整条记录状态也要与销售侧相同，灰色无法报价状态"——即整行（询价编号+内容描述文字颜色）也要跟着变灰，不只是状态列的 badge。

排查发现 `PurchaseRegistrationRow.tsx` 的整行文案颜色 `mainColorClass` 此前只依据采购部自己的 `purchaseQuotedStatuses`（通过 `previewRecord` 影子记录传给 `getRecordColorState`），完全不看销售侧真实的 `quotedStatuses`——销售标记关闭/无法报价后，只要采购部自己没有独立标记，整行颜色不受影响（还是蓝/粉），只有状态列的 badge 文字会变。

修复：新增 `getPurchaseRowColorClass(record)`（`purchaseInquiryStatus.ts`），直接复用 `computePurchaseMainStatus(record).kind` 的判断结果——`closed`/`unavailable` 正好是最高两档优先级，命中即整行灰色；不满足时回退到原有规则（按 `purchaseQuotedStatuses` 判断已报价→蓝、其余→粉，与 `getRecordColorState` 逻辑一致）。这样"整行是否变灰"和"状态列 badge 显示什么"共用同一份优先级判断，不会出现口径不一致。`PurchaseRegistrationRow.tsx` 的 `mainColorClass` 计算改为直接调用这个函数（不再经过 `previewRecord` 影子记录）。

- 文件：`purchaseInquiryStatus.ts`、`PurchaseRegistrationRow.tsx`
- 新增测试：`purchaseInquiryStatus.test.ts` 新增 `getPurchaseRowColorClass` 5 例（销售侧已关闭/已无法报价强制灰色、正常按采购部数据判蓝/粉、采购部自己标记无法报价的既有规则不受影响）
- 验证：`purchase-registration` 目录定向 Jest 97 例全部通过；`src/features/inquiry`/`order`/`purchase-order-registration`/`purchase-registration`/`components/table`/`app/api/inquiry` 共 14 个测试套件 193 例全部通过；`npx tsc --noEmit`、`npx eslint`（改动文件）均无输出；`git diff --check` 通过
- `npm run build` 未在本次会话执行（沙箱单次命令有时长限制，历史已知问题）；未做真实浏览器验证，建议用户本地确认销售侧标记关闭/无法报价后，采购部登记表对应行的询价编号和内容描述文字都变灰

**追加修复（同日）：** 用户反馈"采购部登记表的编辑询价中，已报价里的'其他n家已报价'也要跟日期的"——编辑弹窗"询报价状态"区域内、"已报价"行尾部的"其他 n 家已报价"只读提示（`quotedTrailingContent`）此前没有带日期，只有状态列的同名 badge 带了日期（TASK-157 起）。

修复：`PurchaseInquiryEditModal.tsx` 新增读取 `findLatestOtherQuotedDate(record.supplierStatuses)`（与状态列共用同一个工具函数，不重复实现），拼进 `quotedTrailingContent` 文案，格式与状态列一致："其他 n 家已报价（日期）"，日期缺失时只显示数量、不带空括号。

- 文件：`PurchaseInquiryEditModal.tsx`
- 测试调整：`PurchaseInquiryEditModal.test.tsx`"其他 n 家已报价"describe 块更新为断言带日期的完整文案，新增一例覆盖日期缺失时不带空括号
- 验证：`purchase-registration` 目录定向 Jest 98 例全部通过；`src/features/inquiry`/`order`/`purchase-order-registration`/`purchase-registration`/`components/table`/`app/api/inquiry` 共 14 个测试套件 194 例全部通过；`npx tsc --noEmit`、`npx eslint`（改动文件）均无输出；`git diff --check` 通过
- `npm run build` 未在本次会话执行（沙箱单次命令有时长限制，历史已知问题）

## TASK-160：订单状态表 / 采购订单表金额列改左对齐

**状态：** 已完成（2026-07-13，本次会话由 Claude 直接实现，未经 Codex）

**背景：** 用户反馈（原话）："将订单状态表格，采购订单表，使金额的列靠左排列吧，现在靠右排列，在拖动列宽的时候，它不是很自然"。TASK-157 起这两张表接入了拖拽调宽，金额类列（金额/到账金额/采购金额）此前表头和单元格文字都是右对齐——拖拽调宽时，右对齐文字的"锚点"在列右边缘，恰好和拖拽手柄所在位置重叠/贴近，视觉上不如左对齐列（文字锚点在左边缘，远离拖拽手柄）自然。

**修复：** 只改对齐方式（左对齐），不改数据/校验/格式化逻辑：
- `OrderTable.tsx`："金额"/"到账金额"表头从 `headerCellRightClass`（内部即 `headerCellOverflowRightClass`，`text-right`）改为左对齐的 `headerCellClass`（`headerCellOverflowClass`，`text-left`），"金额"列同时改用与其它列一致的 `th('amount')` 辅助函数；不再使用的 `headerCellRightClass` 本地别名与 `headerCellOverflowRightClass` 引入一并删除。
- `OrderRow.tsx`：`AmountCell`（金额/到账金额共用同一个组件）编辑态 `<input>` 和只读态 `<span>` 都去掉 `text-right`。
- `PurchaseOrderTable.tsx`："金额"表头从 `headerCellOverflowRightClass` 改为 `th('amount')`（左对齐），不再使用的 `headerCellOverflowRightClass` 引入一并删除。
- `PurchaseOrderRow.tsx`：`AmountEditCell` 编辑态 `<input>` 和只读态 `<span>` 都去掉 `text-right`。
- 未改动：两个"编辑订单"/"编辑采购订单"弹窗（`OrderEditModal.tsx`/`PurchaseOrderEditModal.tsx`）里的金额输入框——那是独立弹窗字段，不参与表格列宽拖拽，用户反馈的问题只出现在表格里，弹窗字段保持原有右对齐不受影响。

- 文件：`OrderTable.tsx`、`OrderRow.tsx`、`PurchaseOrderTable.tsx`、`PurchaseOrderRow.tsx`
- 测试：纯 CSS 对齐调整，未新增/修改测试断言（现有测试均未对这些 className 做过硬编码断言）；跑了全部既有相关测试确认无回归
- 验证：`src/features/inquiry`/`order`/`purchase-order-registration`/`purchase-registration`/`components/table`/`app/api/inquiry` 共 14 个测试套件 194 例全部通过；`npx tsc --noEmit`、`npx eslint`（改动文件）均无输出；`git diff --check` 通过
- `npm run build` 未在本次会话执行（沙箱单次命令有时长限制，历史已知问题）；未做真实浏览器验证，建议用户本地确认两张表的金额/到账金额/采购金额列文字改为左对齐，且拖拽调宽手感符合预期

## TASK-161：采购侧"我司无法报价"也要传递到销售侧"采购侧提示"

**状态：** 已完成（2026-07-13，本次会话由 Claude 直接实现，未经 Codex）

**背景：** 用户要求（原话）："采购侧的需补充信息，和已补充信息，无法报价，也要在销售侧有提醒'采购侧提示'的文字"。询报价登记编辑/新增弹窗（`InquiryFormModal.tsx`）此前只对称展示了"采购侧提示：需补充信息（日期）"和"采购侧提示：已补充信息（日期）"（TASK-156 起），漏了采购部勾选"我司无法报价"（`purchaseQuotedStatuses.type === 'unavailable'`）这一档——销售侧完全看不到采购部已经确定无法报价。

**修复：**
- `purchaseInquiryStatus.ts` 新增 `findPurchaseUnavailable(purchaseQuotedStatuses)`（模式与既有的 `findPurchaseSupplemented` 完全一致）；顺带把 `computeSelfSupplierTarget` 内部原本内联的 `quoted.find(s => s.type === 'unavailable')` 判断也改为调用这个新导出函数，避免同一条判断逻辑写两遍。
- `InquiryFormModal.tsx` 顶部提示行（与"需补充信息"/"已补充信息"同一个 `flex flex-wrap` 容器）新增"采购侧提示：我司无法报价（日期）"灰色只读提示（配色与"已关闭"/"无法报价"等终态提示保持一致的灰色调）。

- 文件：`purchaseInquiryStatus.ts`、`InquiryFormModal.tsx`
- 新增测试：`purchaseInquiryStatus.test.ts` 新增 `findPurchaseUnavailable` 4 例（含"与销售侧 findSalesUnavailable 是独立字段"的隔离回归）；`InquiryFormModal.test.tsx` 新增 2 例（显示带日期、三条提示同行显示）
- 验证：`src/features/inquiry`/`order`/`purchase-order-registration`/`purchase-registration`/`components/table`/`app/api/inquiry` 共 14 个测试套件 200 例全部通过；`npx tsc --noEmit`、`npx eslint`（改动文件）均无输出；`git diff --check` 通过
- `npm run build` 未在本次会话执行（沙箱单次命令有时长限制，历史已知问题）；未做真实浏览器验证，建议用户本地在采购部登记勾选"我司无法报价"后，到询报价登记编辑该记录，确认顶部出现"采购侧提示：我司无法报价（日期）"

## TASK-162：四张登记表轮询跨标签去重 + 自适应降频，降低 Vercel Fluid Active CPU

**状态：** 已完成，待部署后指标观察（P0，2026-07-13）

### 背景

`/inquiry`、`/order`、`/purchase-registration`、`/purchase-order-table` 都挂载 `useInquirySync`。当前每个可见标签页每 60 秒请求一次 `/api/inquiry/meta`，每小时强制整表同步一次；同时根 `Providers` 还会每 90 秒请求 `/api/auth/permissions-meta`、每 5 分钟请求 `/api/auth/session`。单个持续可见的登记表标签页稳定状态约产生 `60 + 40 + 12 = 112` 次 Vercel Function 调用/小时，多个窗口或标签页会继续叠加。

现有可见性保护只能挡住 `document.visibilityState === 'hidden'` 的周期询报价/权限检查，仍有四个浪费点：

1. 多个可见窗口各自独立轮询，没有按用户/视图跨标签去重。
2. 页面长时间无操作仍保持 60 秒询报价轮询。
3. `/api/inquiry/meta` 失败会退化成每 60 秒整表同步，异常期间反而放大 CPU。
4. NextAuth 每 5 分钟只是重读现有 JWT claims，不会从 D1 刷新权限；后台标签页也会保留这个定时请求，实际权限更新已由 `usePermissionChangeWatcher` 负责。

### 目标方案

#### 1. 询报价同步：按用户、按视图组协调

- 新增轻量跨标签协调器，优先使用 Web Locks + `BroadcastChannel`，并提供不支持这些 API 时的安全降级。协调 key 必须包含当前用户名和视图组：`full`（询报价登记/订单状态表）与 `restricted`（采购部登记/采购订单表）继续严格隔离，禁止合并水位。
- 协调器必须提供双层 kill switch：全局使用 `NEXT_PUBLIC_INQUIRY_SYNC_COORDINATOR_ENABLED=false` 关闭，另以 `localStorage.setItem('inquiry_sync_coordinator_disabled', '1')` 作为单浏览器诊断开关。开关只允许退回“逐标签独立但仍遵守自适应频率/前后台保护”的同步模式，禁止把同步整体关闭；全局环境变量的变更允许通过一次 Vercel 重新部署生效，不要求引入新的远程配置接口。
- 同一用户、同一视图组在同一浏览器内，同一时刻最多一个标签页请求 meta 或执行数据同步；同步完成后广播通知，同组其它标签页从现有 localStorage 重新装载 store，不再重复请求 D1。
- Web Locks 正常释放之外，fallback lease 还必须有明确的 owner id、heartbeat 和 TTL；leader 标签崩溃、关闭、切到后台或长时间失去响应后，符合条件的前台 follower 必须在 30 秒内接管，不能永久停留在“已有 leader”的假状态。
- 只有 `document.visibilityState === 'visible' && document.hasFocus()` 的标签页参与周期轮询；`hidden`、窗口失焦、最小化时停止。恢复可见并获得焦点后立即补检，但增加 30 秒最小节流，避免频繁切窗产生请求风暴。
- 改成自适应频率：最近 5 分钟发生过键盘、指针或触摸操作时，每 2 分钟检查 meta；连续 5 分钟无操作后，每 10 分钟检查。空闲后的第一次用户操作立即补检，然后恢复 2 分钟频率。
- 活跃检测只监听 `pointerdown`、`keydown`、`touchstart` 这类离散事件，禁止监听 `pointermove`、`mousemove`、`scroll` 等连续高频事件。适用的监听器使用 `passive: true`；多个事件共用同一个 leading throttle，最多每 1 秒更新一次活跃时间，禁止为每次事件新建 debounce timer。处理函数只更新 `useRef` 时间戳，不写 React state、不触发渲染、不持续写 localStorage，并在 hook 停用或组件卸载时完整清理，避免优化轮询时反而增加主线程开销。
- 强制整表兜底从 1 小时调整为 6 小时；首次无水位、切换账号、持久化基准失效时仍立即整表同步。完整视图和受限视图分别维护上次整表时间。
- 初次挂载时如果页面不可见或窗口未聚焦，不立即同步，等待首次可见/聚焦事件。

#### 2. 失败策略：meta 失败不能触发整表

- `getMeta()` 失败时保留现有数据，不再调用 `fullSync()`；按 `1 → 2 → 5 → 10` 分钟指数退避重试，成功后恢复正常频率。
- 只有“没有可用基准”“已到 6 小时整表兜底时间”或用户明确触发强制同步时允许整表拉取。网络/Worker/meta 单点失败不能成为整表条件。
- 任一 meta、增量或整表请求都要保持 single-flight；组件卸载、失焦或切到后台后取消后续调度，已发出的请求允许安全结束但不得更新已卸载组件。

#### 3. 清理全局空轮询

- `SessionProvider` 的 `refetchInterval` 从 5 分钟改为 24 小时，并设置 `refetchWhenOffline={false}`；保留首次 session 获取、跨标签登录/退出广播和权限变更后的既有 `silent-refresh`。不要依赖 session 定时重读来刷新权限，因为当前 JWT callback 不会在普通 `GET /api/auth/session` 时查询 D1。
- `usePermissionChangeWatcher` 从每 90 秒改为每 3 分钟，并按用户名做跨标签 single-flight；后台/失焦停止，恢复前台立即补检但受 30 秒最小节流约束。
- 权限变化由协调标签页完成 `silent-refresh` 后广播；其它同账号标签页再重载并读取更新后的共享 cookie，避免每个标签页分别执行权限刷新请求。

### Files in scope

- `src/features/inquiry/hooks/useInquirySync.ts`
- `src/features/inquiry/services/inquiry.service.ts`
- 新建 `src/features/inquiry/services/inquirySyncCoordinator.ts`（或同职责的窄模块）
- 四个页面调用方：传入稳定的当前用户标识；不得改变现有 `pushLocal`/`mergeLocal` 权限语义
- `src/hooks/usePermissionChangeWatcher.ts`
- `src/app/providers.tsx`
- 对应 Jest 测试文件

### 验收标准

- 单个持续操作的前台登记表：询报价 meta 不超过 30 次/小时；连续空闲后不超过 6 次/小时。
- 同一用户打开多个同组登记表标签页，请求数不随标签页数量线性增长；完整视图组与受限视图组最多各保留一条独立同步链路。
- 全局或单浏览器 kill switch 关闭协调器后，四张表仍能按逐标签独立模式正常同步；不能出现“为了降级而停止同步”的情况。
- leader 标签直接关闭、崩溃、进入后台或停止 heartbeat 后，前台 follower 在 30 秒内接管；旧 leader 恢复后不得与新 leader 并发同步。
- 标签页隐藏、窗口失焦或最小化 30 分钟期间，不产生询报价 meta、询报价数据或权限 meta 请求；重新聚焦后只补一次检查。
- meta 连续失败 30 分钟时，不出现 `/api/inquiry?limit=...` 无 `since` 的周期整表请求；重试间隔符合退避序列。
- 正常协作编辑时：活跃用户最多约 2 分钟看到其它设备更新；空闲页面在用户重新操作或重新聚焦时立即补检。
- 同组其它标签页收到同步完成广播后，列表数据自动更新；不同视图组水位和字段完整度互不污染。
- 权限变更在前台最长约 3 分钟自动生效；多个标签页只执行一次权限刷新，其它标签页正确重载。
- `/api/auth/session` 不再每 5 分钟出现；登录、退出、30 天 JWT 有效期、管理员/普通用户权限刷新流程均无回归。
- 高频鼠标移动、页面滚动不会延长活跃窗口、触发 React 渲染或增加网络请求；离散活跃事件监听器不存在重复注册和卸载残留。
- 部署前记录 Network 基线；部署后观察 2–3 个工作日的 Vercel Function Invocations 与 Fluid Active CPU，目标是单个长期打开且大部分时间空闲的登记表场景，周期 Function 调用量较当前降低至少 70%。

### 测试与验证

- `useInquirySync` fake timers：前台活跃/空闲频率、hidden、blur/focus、首次后台挂载、30 秒节流、6 小时整表、meta 失败退避。
- 跨标签协调器：同用户同组只请求一次、跨组隔离、广播后 store 重载、API 不支持时安全降级。
- 协调器故障测试：两个 kill switch、leader heartbeat/TTL、leader 异常退出后 follower 接管、旧 leader 恢复后的双 leader 防护。
- 活跃检测测试：只注册约定的离散事件；`pointermove`/`scroll` 不更新时间戳；1 秒内连续离散事件只更新一次；事件只改 ref、不造成额外渲染或残留 debounce timer；停用和卸载后监听器完整移除。
- 权限 watcher：多标签只刷新一次、广播后其它标签重载、后台不轮询、恢复前台补检。
- 回归运行 `npx jest useInquirySync inquiry.service usePermissionChangeWatcher --runInBand`、`npx tsc --noEmit`、目标文件 ESLint、`npm run build`。
- 手动用两个普通窗口 + 一个隐私窗口验证：同账号跨标签去重、不同账号隔离、完整/受限权限字段安全、编辑弹窗内容不被后台广播清空。
- Network 面板单独过滤 `/api/auth/session`：登录后的首次 session 请求保留，随后观察超过原 5 分钟周期，确认不再出现旧的周期请求；同时验证登录、退出、跨标签退出和权限变更后的 `silent-refresh` 仍正常。24 小时间隔本身通过配置断言或 `SessionProvider` 包装层测试确认，不要求人工等待 24 小时。

### Non-goals / 红线

- 不把 Worker `API_TOKEN` 或任何长期凭证下发浏览器，不把 meta 接口改成公开接口。
- 不引入 SSE/WebSocket/Cloudflare Durable Objects；先完成低风险客户端降频与去重。
- 不合并完整视图和受限视图的水位，不改变 `mergeFromD1`/`mergeFieldsOnly`/pending 队列的数据保护语义。
- 不取消权限自动刷新，只把它跨标签去重并从 90 秒调整到 3 分钟。
- 不以牺牲本地未提交编辑、删除同步或账号隔离为代价换取请求数下降。

### 实施结果

- 新增通用跨标签协调器与询报价同步协调层：Web Locks 优先，BroadcastChannel 通知，localStorage lease/heartbeat/TTL 降级；按用户名和 `full`/`restricted` 视图组隔离，并提供环境变量与单浏览器双 kill switch。
- `useInquirySync` 已改为前台且聚焦才调度，活跃 2 分钟、空闲 10 分钟、强制整表 6 小时；只监听节流后的离散活跃事件。meta/数据请求失败按 `1 → 2 → 5 → 10` 分钟退避，失败不再触发整表，现有合并水位和 pending 队列语义保持不变。
- 权限检查改为每 3 分钟、按用户跨标签 single-flight；`SessionProvider` 定时重读改为 24 小时并关闭离线 refetch。四张登记表均传入稳定用户标识。
- `pullFromD1()` 改为失败抛错后，已同步补齐共享调用方 `CustomerActivityFeed` 的 catch：网络失败保留现有活动数据、结束刷新状态，不再产生未处理 Promise rejection；新增拒绝路径回归测试。
- 修复受限视图先写入空缓存时产生的残缺记录：完整视图在 `updatedAt` 相同的情况下，也会补齐 D1 实际带回而本地缺失的 `inquirer`、`customerNo`、`customerId`、`contactId` 等字段；只补缺失键，不覆盖本地已有值，pending 保护保持不变。
- 验证：TASK-162 相关 6 个 Jest 套件 38 例通过；四张登记表此前相关回归 17 个套件 218 例通过；`npx tsc --noEmit`、改动文件 ESLint、`npm run build`、`git diff --check` 通过。浏览器登录态下四张登记表均正常加载、交互；本次自愈修复后 dex 的询价人和客户编号列已正常显示。
- 全量 Jest 当前仍有与本任务无关的既有失败：客户时间轴缺少 ToastProvider、报价 store 日志断言、增强解析映射断言，以及 Jest 误收集 Playwright E2E；TASK-162 改动覆盖的套件全部通过。Vercel Function Invocations / Fluid Active CPU 的 2–3 个工作日观察留作部署后运维验收。

## TASK-163：新建采购侧供应商管理主档，并关联采购登记 / 采购订单表 / 正式采购单

**状态：** 已完成代码实现与后端基础设施部署（P1，2026-07-14；D1 migration 014、Worker 已上线；待 GitHub/Vercel 发布、真实采购账号及新旧采购单 PDF 人工验收）

### 背景

现有 `/customer` 下的“客户 / 供应商 / 收货人”属于销售侧资料库，三者共用 D1 `Customer` / `Contact`，访问权限统一是 `customer`。采购侧目前没有供应商主档，而是存在三套互不关联的自由文本：

- 采购部登记：`InquiryRecord.purchaseSupplierStatuses[].supplierShortName`
- 采购订单表：`InquiryRecord.purchaseOrderSupplier`
- 正式采购单 `/purchase`：`PurchaseOrderData.attn`，当前自动完成实际从 `purchase_history` 反推，而不是读取供应商主档

这导致同一家采购供应商在不同入口重复输入、别名无法合并、使用情况无法可靠统计，也无法由采购权限独立维护。

### 架构决策

1. 新建独立采购供应商模块，不在现有 `/customer` 增加 tab，不扩展 `Customer.type`：
   - 页面：`/purchase-supplier`
   - feature：`src/features/purchase-supplier/`
   - Next API：`/api/purchase-suppliers`
   - 权限 moduleId：`purchaseSupplier`
   - D1：新增 `PurchaseSupplier`、`PurchaseSupplierContact`
2. 采购供应商是公司级共享主数据，不按 `created_by` 隔离；`created_by` / `updated_by` 只用于审计。
3. 采购业务采用“主档 ID + 单据文本快照”双存储：主档用于选择、关联和统计，历史页面/PDF继续读取创建单据时保存的名称、地址、联系人等快照。修改或归档主档不得改变旧单据与旧 PDF 内容。
4. 现有销售侧 `Customer.type='supplier'`、销售询报价 `supplierStatuses` 及其候选来源保持不变；允许提供显式“复制为采购供应商”操作，但禁止自动复制或双向同步两套主档。

### D1 模型

`PurchaseSupplier` 最小字段：

```text
id, code, name, short_name, address,
data, status(active/archived),
created_by, updated_by, created_at, updated_at
```

`PurchaseSupplierContact` 最小字段：

```text
id, supplier_id, name, short_name, email, phone,
is_primary, sort_order, status(active/archived),
created_at, updated_at
```

- `code` 写入前统一 `trim`，空字符串存为 `NULL`；非空 code 的唯一性以数据库约束为最终事实来源，不能只做应用层“先查后插”。`schema.sql` 必须增加大小写不敏感的 partial unique index，例如：

  ```sql
  CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_supplier_code_unique
  ON PurchaseSupplier(code COLLATE NOCASE)
  WHERE code IS NOT NULL AND code != '';
  ```

  应用层可以先查并给出友好提示，但仍要捕获并发写入触发的 D1 unique constraint，统一返回 HTTP 409；名称只做重复提示，不加唯一约束，避免误伤同名分公司。
- `data` 第一期只承载采购侧扩展字段：供应产品/业务范围、供应商类型、默认付款条件、默认币种、备注。银行税务、评级、证书、附件不在本任务首期范围。
- 删除使用归档，不做硬删除；归档后不出现在新建候选中，历史关联仍可读取。
- 基础资料与联络人应通过一个服务端保存入口校验并批量写入，避免出现“公司已保存、联络人保存失败”的半成功状态。

### 类型与关联字段

不得复用 `SupplierQuoteStatus.id` 作为供应商主档 ID；该字段当前是状态条目 ID。新增独立字段：

```ts
type PurchaseSupplierQuoteStatus = SupplierQuoteStatus & {
  purchaseSupplierId?: string;
};

// InquiryRecord.purchaseSupplierStatuses 改用上面的采购专属类型
purchaseOrderSupplierId?: string;
purchaseOrderSupplier?: string; // 保留名称快照

// PurchaseOrderData
purchaseSupplierId?: string;
supplierName?: string;           // 标准名称快照
attn: string;                    // 继续保留完整打印快照，兼容现有 PDF
```

所有新 ID 字段必须可选；旧记录只有文本时仍能读取、搜索、编辑、导出和生成 PDF。

`purchaseOrderSupplierId` 是 `InquiryRecord` 顶层字段，必须同步加入采购受限视图的显式白名单：

- `PURCHASE_ORDER_TABLE_WRITE_FIELDS`：PUT 允许写入，否则采购订单表保存时会被静默丢弃。
- `sanitizeRestrictedRecord(... allowPurchaseOrderTable)`：GET 返回该字段，否则同步拉取后本地关联 ID 会消失。
- `restrictedView.ts` 对应测试同时覆盖“允许读”“允许写”“其它未知字段仍被丢弃”。

`purchaseSupplierStatuses[].purchaseSupplierId` 嵌套在已整体放行的 `purchaseSupplierStatuses` 内，不需要再加顶层白名单，但必须补嵌套数据保留的回归断言。

### 权限规则

- 在 `PERMISSION_MODULES` 新增顶级管理模块 `purchaseSupplier`，桌面端和移动端都放入“管理”分组，导航名称“采购供应商”。
- `/purchase-supplier` 页面和主档新增/编辑/归档：要求 `purchaseSupplier`。
- 读取采购供应商候选：拥有 `purchaseSupplier`、`purchaseRegistration`、`purchase` 任一权限即可；写请求只能由 `purchaseSupplier` 放行。
- OR 权限逻辑统一落在新的 Next API 代理层：在不依赖 `next/server` 的窄 helper（如 `src/app/api/purchase-suppliers/access.ts`）中由 session permissions 计算 `{ canRead, canWrite }`，模式参考 `restrictedView.ts` 的显式 flags，便于纯函数测试；不要直接复用 `RestrictedViewFlags`，因为它只描述 Inquiry 字段裁剪。GET 要求 `canRead`，POST/PUT/DELETE 要求 `canWrite`；Worker 只负责 Bearer、字段校验和 D1 操作。
- 本地离线缓存使用 `purchase_supplier_cache_v1:<normalizedUserId>` 这类按当前登录用户命名空间隔离的 key，禁止复用现有 `supplier_cache_v2`。缓存 service 在无有效 session 或 `canRead=false` 时禁止读取缓存兜底。
- 新增 `clearPurchaseSupplierLocalState(userId?)`：`useAppUser.handleLogout` 必须在清空 permission user 之前用当前 user id 调用；另在 `Providers` 挂载一个窄的 cache access guard，权限初始化完成后如果当前账号从“任一可读权限”变为全部不可读，清除该账号缓存。权限刷新后的页面 reload 不能成为遗漏清理的理由；重新启动页面时 guard 也必须补清。

### 三个采购入口接入

#### 1. 采购部登记 `/purchase-registration`

- 供应商新增/编辑改为从采购供应商主档选择，保存 `purchaseSupplierId + supplierShortName` 快照。
- 候选来源改为“有效采购供应商主档 + 历史未关联文本兜底”，不能继续只从 `purchaseSupplierStatuses` 历史去重。
- 第一阶段保留自由输入；未选择主档的记录显示“未关联”，并提供“待关联供应商”筛选。
- 不改变销售侧 `supplierStatuses` / `quotedStatuses` 与“飞罗”同步规则。

#### 2. 采购订单表 `/purchase-order-table`

- 行内编辑和 `PurchaseOrderEditModal` 都接入同一个采购供应商选择器。
- 保存 `purchaseOrderSupplierId + purchaseOrderSupplier` 名称快照。
- 筛选仍按订单上的名称快照统计，避免主档改名后历史筛选结果突变；可增加“待关联供应商”筛选。
- 同时修复该弹窗现有的冻结快照/整表覆盖风险，不能把新字段接到旧保存模式上：
  1. `PurchaseOrderTable` 只保存 `editingRecordId`，弹窗按 id 从完整 `useInquiryStore.records` 解析最新记录，不能从当前筛选后的 `records` props 保存打开瞬间的对象快照；后台同步或记录离开当前筛选时，弹窗也不能因此悄然改用旧对象或错误覆盖。
  2. 表单每次打开一条新 id 时初始化一次，避免后台刷新吞掉用户正在输入的内容；同时保存初始 draft/baseline 或维护逐字段 dirty 状态。
  3. `handleSave` 只提交相对初始值真正变化的字段，未操作字段不得进入 patch。`purchaseOrderSupplierId + purchaseOrderSupplier` 是一个原子字段组：从主档选择时一起写，自由修改名称时清空旧 ID，清空供应商时两者一起清空。
  4. 增加回归测试：弹窗打开后 store 后台更新一个未操作字段，用户只修改供应商并保存，后台的新值必须保留；反向只修改其它字段时，后台更新后的供应商 ID/名称也不得被旧本地状态覆盖。

#### 3. 正式采购单 `/purchase`

- 必须修改当前真实渲染的 `PurchaseBaseInfo` / `SupplierField` 链路；仓库中的 `components/sections/SupplierSection.tsx` 当前未被 `PurchaseForm` 使用，不能只修改该死代码路径。
- 选择主档后写入 `purchaseSupplierId`、`supplierName`，并把名称、主联络人、电话、邮箱、地址格式化进现有 `attn` 打印快照。
- 当前 `purchaseHistory.ts` 直接把完整 `data.attn` 写入 `supplierName`，仓库里没有“取第一行”的现成实现。新增并集中测试一个纯函数（如 `resolvePurchaseSupplierSnapshotName`）：显式 `data.supplierName.trim()` 优先；否则对 legacy `attn` 统一换行符、取第一条非空行并 trim；如果没有换行就返回整段 trim 后文本；全部为空才返回空值/未命名兜底。禁止在多个页面各写一份切分规则。
- `purchaseHistory.supplierName` 新记录使用标准 `supplierName`，旧记录经上述 helper 做显示/搜索 fallback；D1 `Document.customer_name` 旧记录仍可能是完整 attn、新记录是标准名称，这是允许的兼容状态，不批量重写旧值。
- 本地历史搜索、历史页、Dashboard 最近单据、导入导出和 D1 pull 后的搜索必须对新旧记录保持一致：至少按“标准 supplierName + legacy 顶层 supplierName + data.attn”组成兼容搜索文本，保证同一个公司名能同时命中新旧记录。不能假设 legacy attn 一定有规范换行，也不能仅凭第一行自动关联主档。
- PDF 生成器第一期不改数据来源，继续读取单据快照；必须手动生成采购单 PDF 验证排版。

### 历史数据整理

1. 提供只读扫描脚本或管理端候选报告，汇总并标准化以下来源：
   - `purchaseSupplierStatuses[].supplierShortName`
   - `purchaseOrderSupplier`
   - `purchase_history[].data.attn` / `supplierName`
2. 采购人员人工确认重复项、别名和主档，不允许根据模糊名称自动建档或自动合并。
3. 仅对标准化后唯一、明确匹配的记录回填 ID；不确定项保留文本并标记未关联。
4. 回填只新增关联 ID，不改旧名称、地址、联系人和 PDF 快照。

### Files in scope

- `schema.sql`
- `src/worker.ts`
- 新建 `src/app/api/purchase-suppliers/[[...path]]/route.ts`
- 新建 `src/app/api/purchase-suppliers/access.ts`（或同职责的纯权限 helper）及测试
- `src/app/api/inquiry/[[...path]]/restrictedView.ts`
- `src/app/api/inquiry/[[...path]]/__tests__/route.test.ts`
- 新建 `src/features/purchase-supplier/`（types/services/app/components/tests）
- `src/constants/permissionModules.ts`
- `src/components/layout/AppSidebar.tsx`
- `src/components/layout/MobileBottomTab.tsx`
- `src/utils/mapPermissions.ts` 及相关权限测试
- `src/hooks/useAppUser.ts`
- `src/app/providers.tsx`（挂载采购供应商 cache access guard）
- `src/features/inquiry/types/index.ts`
- `src/features/inquiry/components/InquiryQuoteStatus.tsx`（只做可复用选项结构所需的最小改动，销售侧行为不变）
- `src/features/purchase-registration/`
- `src/features/purchase-order-registration/`
- `src/types/purchase.ts`
- `src/features/purchase/components/PurchaseBaseInfo.tsx`
- `src/utils/purchaseHistory.ts`
- `src/utils/d1Pull.ts`
- `src/features/history/services/history.service.ts`
- `src/utils/historyImportExport.ts`
- `src/components/dashboard/RecentDocumentsList.tsx`
- 对应模块文档；完成后更新 `docs/core/CURRENT_STATE.md` 与 `docs/core/CHANGELOG.md`

### 验收标准

- 没有 `customer` 权限、但有采购权限的用户可以读取采购供应商候选；没有 `purchaseSupplier` 时不能新增、编辑或归档主档。
- `purchaseSupplier` / `purchaseRegistration` / `purchase` 三种单独持权账号都能 GET；三者全无时 GET 为 403；只有 `purchaseSupplier` 能执行写请求。
- 销售侧客户管理和询报价供应商候选中不会出现采购供应商。
- 三个采购入口选择同一主档后均保存正确 ID，同时保留各自文本快照。
- 仅有 `purchaseRegistration` 的受限视图账号保存并重新拉取采购订单后，`purchaseOrderSupplierId` 不会被 PUT 白名单或 GET 清洗丢弃；嵌套的 `purchaseSupplierStatuses[].purchaseSupplierId` 同样保留。
- 主档改名、修改地址或归档后，旧采购登记、采购订单表、正式采购单和历史 PDF 内容不变。
- 历史纯文本记录无需迁移即可正常读取；精确回填 ID 后不改变原文本。
- 同一个供应商名搜索时，legacy 完整 attn 记录、新标准名称记录、本地记录和 D1 pull 回来的混合记录都能被命中；导出后重新导入仍保留可搜索名称与原始 attn 快照。
- 归档供应商不出现在新建候选中，但历史详情和使用统计仍可访问。
- 多账号切换和权限撤销后不会通过 localStorage 读取无权限缓存。
- 两个并发请求创建大小写不同但语义相同的非空 code 时，数据库只允许一个成功，另一个返回明确的 409；空 code 可存在多条。
- 采购订单编辑弹窗只提交用户实际修改的字段，后台同步对未操作字段的更新不会被弹窗保存回滚。
- 新增/编辑联络人时主联络人规则稳定；保存失败不能留下半完成主档。
- 采购供应商超过 500 条时仍可通过服务端搜索/分页使用，选择器不得依赖一次性全量拉取。

### 测试与验证

- Worker/API：Bearer、GET OR 权限/写权限矩阵、字段校验、分页搜索、归档、联络人批量保存、并发重复 code 返回 409。
- Inquiry 受限视图：`purchaseOrderSupplierId` GET/PUT 白名单、嵌套 `purchaseSupplierId` 保留、未知字段继续裁剪。
- Service/组件：按账号缓存隔离、登出清理、权限撤销/reload 后清理、无权限禁止 cache fallback、主联络人、选择器搜索、未关联自由文本兜底。
- 采购登记/采购订单表：ID + 快照保存、销售字段不被覆盖、旧记录回归；`PurchaseOrderEditModal` 用 store 最新记录且只提交 dirty/diff patch 的并发回归测试。
- 正式采购单：新建、编辑、复制、草稿、历史保存/D1 双写、CRLF/LF/前导空行/无换行/空 attn fallback，以及新旧记录混合搜索与导入导出。
- 定向 Jest + `npx tsc --noEmit` + 目标文件 ESLint + `npm run check:selectors` + `npm run build`。
- 手动用采购用户和销售用户分别验证权限与候选隔离；至少生成一次新采购单 PDF 和一次旧采购单 PDF 做视觉对比。

### Non-goals / 红线

- 不把现有 `Customer/Contact` 重构成通用 BusinessParty，也不修改 `Customer.type` CHECK。
- 不自动复制、合并或同步销售供应商与采购供应商。
- 不强制旧记录立即关联主档，不因缺少 ID 阻塞现有采购流程。
- 不用主档实时数据渲染旧单据/PDF，不因主档修改批量回写历史快照。
- 不顺手重写采购 PDF、采购 store 或已稳定的销售/采购状态同步规则。

## TASK-164：采购供应商列表简化 + 详情页（信息编辑 + 自动活动列表）

**状态：** 已完成（2026-07-14；TASK-163 已部署）

**背景：** TASK-163 落地的 `/purchase-supplier`（`src/features/purchase-supplier/app/PurchaseSupplierPage.tsx`）目前是一张平铺列表（简称/编码、供应商全称、主联系人、电话、操作），编辑走 `PurchaseSupplierFormModal` 弹窗一次性提交整份表单，没有独立详情页。用户希望参照现有客户管理模块的详情页体验（`src/app/customer/detail/page.tsx` + `src/features/customer/app/CustomerDetailPage.tsx` + `CustomerInfoCard.tsx` 的逐字段编辑、`CustomerActivityFeed.tsx` 的活动列表）重做这块：列表页只保留四个核心字段，点进详情页做字段级编辑，并展示一个自动关联的活动列表。

已跟用户确认："活动列表"指自动关联采购部登记表中的记录（不是手动时间线/备注），并在记录已转为正式订单时给出提示——不需要新增数据表，纯前端从现有 `useInquiryStore` 派生，模式对应 `CustomerActivityFeed.tsx` 对 `customer` 类型走的"询价记录派生 feed"（不是 supplier 类型现在那种一行"使用情况"文字，也不是手动 `CustomerEvent` 时间线）。

**Files in scope：**
- `src/features/purchase-supplier/app/PurchaseSupplierPage.tsx` — 表头/每行列改为 简称、全称、主联系人、供货范围（取 `supplier.data.supplyScope`，空值显示"—"）；去掉电话列；点击整行（除"归档"按钮外）跳转 `/purchase-supplier/detail?id=${supplier.id}`；行内"编辑"铅笔按钮移除（编辑收敛到详情页），"新增采购供应商"仍用现有 `PurchaseSupplierFormModal` 弹窗创建。
- 新建 `src/app/purchase-supplier/detail/page.tsx` — 路由壳层，仿 `src/app/customer/detail/page.tsx`，从 `useSearchParams` 取 `id`，渲染下面的 Detail 组件。
- 新建 `src/features/purchase-supplier/app/PurchaseSupplierDetailPage.tsx` — 仿 `CustomerDetailPage.tsx` 结构：`AppLayout` + 面包屑（首页 / 采购供应商 `/purchase-supplier` / 供应商名称）、加载态、未找到态、`usePurchaseSupplierAccess()` 权限门（无 `purchaseSupplier`/`purchaseRegistration`/`purchase` 任一权限时 `PermissionDenied`；只有 `canRead` 无 `canWrite` 时只读展示，不显示编辑控件）。
- 新建 `src/features/purchase-supplier/components/PurchaseSupplierInfoCard.tsx` — 仿 `CustomerInfoCard.tsx` 的逐字段编辑体验（每个字段独立编辑/保存，不是整表单一次提交）：名称、简称、编码、地址、联系人列表（复用/参考现有 `PurchaseSupplierFormModal` 里的联系人管理 UI，包含主联系人标记）、`data` 里的供应产品/业务范围、供应商类型、默认付款条件、默认币种、备注。保存仍走 `savePurchaseSupplierService`（现有 `purchaseSupplierService.ts` 的 save 接口），只是从"一次提交整份表单"改成"每个字段区块各自触发保存"，保存失败要有单独的错误提示，不能因为一个字段保存失败影响其它已保存字段的展示状态。
- 新建 `src/features/purchase-supplier/components/PurchaseSupplierActivityFeed.tsx` — 仿 `CustomerActivityFeed.tsx`：从 `useInquiryStore((s) => s.records)` 中筛选 `record.purchaseSupplierStatuses?.some(s => s.purchaseSupplierId === supplier.id)` 的记录，按 `inquiryDate`/`updatedAt` 倒序渲染列表；每条展示询价编号 `inquiryNo`、客户询价编号 `customerNo`、该记录里对应这个供应商的 `PurchaseSupplierQuoteStatus`（报价日期/状态，如有），以及当 `record.orderNo?.trim()` 非空时的"已转订单"徽章（复用 `getInquiryQuoteStatusBadge` 的徽章样式规则或就近抽一个同风格的最小 badge helper，不必强行复用整个 `inquiryTimelineService.ts`，因为那个文件的匹配逻辑是给"客户别名模糊匹配"设计的，采购供应商这里是精确 ID 匹配，没有别名问题）。列表本身只读展示 + 一个跳转到 `/purchase-registration`（或定位到该询价编号）的入口，不在这个页面里放编辑询价记录的弹窗——询价记录的编辑入口继续只在 `/purchase-registration`。
- `src/features/purchase-supplier/types/index.ts` — 按需补充 activity item 的最小类型（如 `PurchaseSupplierActivityItem`）。
- `src/features/purchase-supplier/services/purchaseSupplierService.ts` — 如果需要一个纯函数把 `InquiryRecord[]` + `supplierId` 转成 activity 列表，放在这或新建同 feature 下的 `services/purchaseSupplierActivity.ts`，保持是同步纯函数、不发新网络请求（数据来源仍是 inquiry store 已同步好的数据）。

**验收标准：**
- 列表页表头及每行只显示 简称、全称、主联系人、供货范围 四列；点击行体（归档按钮除外）跳转到详情页，URL 带对应 `id`。
- 详情页字段可以逐项编辑并独立保存，不需要打开一次性大表单；联系人的主联系人规则、保存失败提示与 TASK-163 已有规则保持一致。
- 详情页"活动列表"只包含 `purchaseSupplierStatuses` 里带有该供应商 id 的询价记录，按时间倒序；含 `orderNo` 的记录显示"已转订单"一类的醒目提示；不含 orderNo 的正常显示报价状态。
- 活动列表为只读 + 跳转，不提供就地编辑询价记录的入口。
- 只有读权限、没有写权限的账号可以打开详情页浏览四个核心字段和活动列表，但看不到任何编辑控件（输入框、保存按钮、联系人增删）。
- 归档状态的供应商详情页仍可正常打开、正常显示历史活动列表；列表页新建候选/选择器不受本任务影响，沿用 TASK-163 已有的归档过滤规则。
- 未选择任何供应商访问详情页路由（缺 `id` 或 id 不存在）时展示明确的"未找到"提示，不白屏。

**Non-goals / 红线：**
- 不新增任何数据库表（不做 `PurchaseSupplierEvent` 或类似手动时间线/备注表）；"活动列表"必须是从现有 `InquiryRecord` 派生的只读视图。
- 不修改 `purchaseSupplierStatuses`/`purchaseSupplierId`/`purchaseOrderSupplierId` 字段结构、不改询价记录的同步/合并逻辑、不改 `restrictedView.ts` 白名单。
- 不在采购供应商详情页里新增询价记录的编辑功能，编辑入口继续只在 `/purchase-registration`。
- 不改动 TASK-163 已实现的 Worker/Next API/权限/缓存逻辑，本任务只涉及前端列表与详情页展示层。

**测试与验证：**
- `npx tsc --noEmit`、改动/新建文件定向 ESLint。
- 新建组件的 Jest：活动列表按 supplierId 精确匹配（含多条命中、零命中、含 orderNo 的记录正确显示提示）、详情页权限门（无权限/只读/可写三种状态）、信息卡片单字段保存失败不影响其它字段展示。
- `npm run build`（注意：沙箱里单次 build 曾在 45 秒内跑不完，只到 "Creating an optimized production build" 之前，建议本地或 CI 完整跑一次，不要只凭沙箱结果判断通过）。
- 手动浏览器验证：列表四列展示、点击行跳转详情页、字段级编辑保存、活动列表正确关联并展示"已转订单"提示、只读账号看不到编辑控件。

**Status:** completed（2026-07-14）

## TASK-165：采购供应商详情页视觉微调（字段间距收紧 + 活动记录单行化）

**状态：** 已完成（2026-07-14）

**背景：** TASK-164 上线后用户对照真实截图（供应商"盐城豪泰"详情页）反馈两处间距问题：1）"基本信息"/"采购设置"字段展示区域行间距偏松，页面显得空旷；2）"采购活动"列表每条记录目前占三行（第一行 编号+报价状态徽章+已转订单徽章，第二行"客户询价编号：xxx"，第三行"报价日期：xxx"，右侧另有独立日期），希望收紧成一行展示。这是纯视觉/布局调整，不涉及数据逻辑。

**Files in scope：**
- `src/features/purchase-supplier/components/PurchaseSupplierInfoCard.tsx` — 收紧 `FIELD_GROUPS` 渲染区域的间距：分组容器（当前每个分组 `px-5 py-4`）、字段网格（当前 `dl` 用 `gap-x-8 gap-y-1`）、单个字段外层（当前每个字段 `py-2`，`dt` 下方 `mb-1`）整体收紧。不需要逐字段给出精确像素值，以明显比当前实现更紧凑、减少字段之间的空白为准，同时保持编辑态（input/textarea + 保存/取消按钮）和只读态的可点击区域不因为收紧间距而变得难以点击。
- `src/features/purchase-supplier/components/PurchaseSupplierActivityFeed.tsx` — 每条活动记录（`<article>`，当前拆成"编号+状态徽章"一行、"客户询价编号"一行、"报价日期(+订单号)"一行、右侧独立更新时间）改成单行布局：询价编号、报价状态徽章、已转订单徽章（如有）、客户询价编号、报价日期、订单号（如有）、时间，在桌面宽度下同一行内用分隔符/间距依次排开，内容过长用 `truncate` 处理；窄屏（移动端）允许换行，不强求单行。

**验收标准：**
- "基本信息"和"采购设置"字段区域的行间距比当前实现明显更紧凑，不再有大片空白；编辑/保存/取消交互和可点击区域不受影响。
- 桌面宽度下"采购活动"列表每条记录只占一行（不是当前的三行堆叠），且这一行内仍完整包含：询价编号、报价状态徽章、已转订单徽章（命中时）、客户询价编号、报价日期、订单号（有单时）、更新/询价时间；移动端可换行。
- 精确匹配逻辑（`derivePurchaseSupplierActivities` 按 `purchaseSupplierId`）、排序、空状态、"已转订单"判定、只读/可写权限门等现有行为完全不变，这次只改样式和布局。

**Non-goals / 红线：**
- 不改变活动列表的数据来源、匹配/排序逻辑，不改字段编辑保存逻辑，不改权限门（`canRead`/`canWrite`）。
- 不改动 `/purchase-supplier` 列表页的展示结构——注意：列表页后续又收到新一轮反馈，已在 TASK-166 里改列布局，TASK-166 的范围会覆盖/取代这一条非目标，实施顺序上两个任务谁先谁后都要保证最终列表页布局以 TASK-166 为准。
- 不为了让单行更紧凑而删减字段信息（询价编号/状态/客户询价编号/报价日期/订单号/时间都要保留，只是布局改成一行）。

**测试与验证：**
- `npx tsc --noEmit`、改动文件 ESLint。
- 现有 `purchaseSupplierActivity.test.tsx`、`PurchaseSupplierInfoCard.test.tsx` 等测试需要继续通过；如果布局调整导致某些 `getByText`/`getByRole` 定位方式失效，同步更新测试选择器，而不是为了迁就旧测试选择器改回原来的堆叠布局。
- 手动对照本次反馈的截图（供应商"盐城豪泰"）复验一次，确认间距和单行布局符合预期。

**Status:** completed（2026-07-14）

## TASK-166：采购供应商列表改版（全称/简称堆叠）+ 详情页真删除按钮 + 采购部登记精确跳转

**状态：** 已完成（2026-07-14）

**背景：** 用户对采购供应商模块继续给反馈，这次范围比 TASK-165 的纯间距微调更大，涉及三处：

1. 列表页（`PurchaseSupplierPage.tsx`）目前"简称"和"全称"分两列平铺；希望改成客户管理模块 `src/features/customer/components/ProfileListParts.tsx`（`ProfileShortName` 组件）+ `SupplierList.tsx` 的样式——**全称作为主行（加粗），简称作为全称下方的第二行小字**，供货范围仍是独立一列，整体行间距也要收紧。
2. 详情页要有"归档"和"删除"两个独立图标按钮。**已跟用户确认："删除"是真正的物理删除**，不是现有代码里"归档/删除"混用的软删除语义（现有 `handleDeleteCustomer`/`handleArchivePurchaseSupplier` 底层都只是 `UPDATE ... SET status='archived'`，这个代码库至今没有真正 `DELETE FROM` 业务主数据表的先例，这次是第一次引入真正的硬删除操作，需要谨慎处理）。
3. 详情页"打开采购部登记"链接（`PurchaseSupplierActivityFeed.tsx` 第 50-55 行，当前硬编码 `href="/purchase-registration"`）点击后应该带上筛选条件跳转：定位到"此供应商"，并且把采购部登记默认的当月筛选重置为"全部"。`PurchaseRegistrationPage.tsx` 用的 `useInquiryFilter`（`src/features/inquiry/hooks/useInquiryFilter.ts`）里 `timeRange` 默认是 `month:<当月>`（`getDefaultFilter()`），不是"全部"，如果只传供应商不重置时间范围，历史月份的记录会被当月默认筛选挡住看不到。

**Files in scope：**

- `src/features/purchase-supplier/app/PurchaseSupplierPage.tsx` — 名称列改成参考 `ProfileShortName` 的堆叠样式：主行显示 `supplier.name`（全称，加粗），下方小字显示 `supplier.shortName`（若有，无则不渲染第二行）；表头去掉独立的"简称"列标题；供货范围保留独立列；行容器纵向 padding 进一步收紧（参考 TASK-165 对详情页的收紧幅度，不需要精确像素值）。
- `src/features/purchase-supplier/app/PurchaseSupplierDetailPage.tsx` 和 `src/features/purchase-supplier/components/PurchaseSupplierInfoCard.tsx` — `PurchaseSupplierInfoCard.tsx` 当前头部（约第 182-202 行）右侧只有"只读"徽章，`canWrite` 为真时需要在这个头部区域新增"归档"和"删除"两个图标按钮（新增 `onArchive`/`onDelete` 两个 props，由 `PurchaseSupplierDetailPage.tsx` 传入并接住回调）；归档复用 `PurchaseSupplierPage.tsx` 里已有的确认弹窗交互模式和 `archivePurchaseSupplier` 服务，删除走下面新增的真删除服务，删除成功后从详情页跳转回 `/purchase-supplier` 列表页并提示"已删除"。
- `src/features/purchase-supplier/services/purchaseSupplierService.ts` — 新增 `deletePurchaseSupplierPermanently(id: string): Promise<void>`（区别于现有 `archivePurchaseSupplier`），调用下面新的 Worker 硬删除路由。
- `src/app/api/purchase-suppliers/[[...path]]/route.ts` 与 `src/worker.ts` — 新增一个和现有归档路由 `DELETE /api/purchase-suppliers/:id`（映射到 `handleArchivePurchaseSupplier`）**路径不同**的真删除路由，例如 `DELETE /api/purchase-suppliers/:id/hard-delete`（用独立路径段，不要用 query 参数区分，避免误触发）。Worker 侧新增 `handleHardDeletePurchaseSupplier`：仍需 `verifyBearerToken` + 与创建/归档一致的权限校验（`purchaseSupplier` 写权限）；执行前显式 `DELETE FROM PurchaseSupplierContact WHERE supplier_id = ?` 再 `DELETE FROM PurchaseSupplier WHERE id = ?`（两条语句放进同一个 `env.USERS_DB.batch()`，不要依赖 D1 是否默认开启外键级联，显式删两张表更保险）；成功返回 200/204，删除后按同一 ID `GET` 应该 404。
- `src/features/purchase-supplier/app/PurchaseSupplierDetailPage.tsx`（或就近放在触发删除的地方）——删除前的二次确认弹窗文案要包含"此操作不可撤销、将永久移除该供应商主档"的明确警示；如果 `derivePurchaseSupplierActivities(records, supplier.id)` 返回的关联采购活动数量 > 0，确认弹窗要额外提示"该供应商仍关联 N 条采购登记记录，删除后这些记录只保留原始文本快照，供应商 ID 关联会失效"，但不强行阻止删除（只是更强的警示文案）；文案还要如实说明这个数字只覆盖询价登记，不覆盖正式采购单历史（`purchase_history` 存在客户端 localStorage，服务端拿不到，属于已知的检查盲区），不能让用户误以为这是全量关联统计。
- `src/features/purchase-registration/app/PurchaseRegistrationPage.tsx` — 用 `useSearchParams()`（Next.js app router）读取新增的 `purchaseSupplierId` 和可选 `supplierName` 两个 query 参数；如果外层 `src/app/purchase-registration/page.tsx` 目前没有包 `Suspense`，按 Next 14 要求补上，避免构建报 "useSearchParams should be wrapped in a suspense boundary"。挂载时如果存在 `purchaseSupplierId`，用 `setFilter` 把 `timeRange` 强制设为 `'all'`，并把供应商筛选设置为按 ID 精确匹配（见下一条），而不是依赖现有按名称字符串匹配的 `supplier` state。
  - `recordMatchesSupplier`（当前第 23-27 行，逻辑是 `status.supplierShortName === supplier` 纯名称匹配）需要升级成同时支持"按 ID 精确匹配"：新增一个 `supplierId` 维度（比如 `const [supplierId, setSupplierId] = useState('')`），匹配函数改成优先判断 `supplierId` 非空时 `(record.purchaseSupplierStatuses ?? []).some((status) => status.purchaseSupplierId === supplierId)`，否则回退到现有按 `supplierShortName` 字符串匹配的旧逻辑（保留给没有主档 ID 的历史自由文本和现有手动下拉筛选使用，不要破坏现有行为）。这是因为供应商改名后旧记录的名称快照会跟主档当前名称不一致，按 ID 筛选才能在改名后依然准确命中，纯名称匹配在这种场景下会漏结果。
  - 深链接进入时的 URL 形如 `/purchase-registration?purchaseSupplierId=<id>&supplierName=<shortName>`，`PurchaseSupplierActivityFeed.tsx`（当前硬编码 `href="/purchase-registration"`）需要改成动态拼接这个 URL。

**验收标准：**

- 列表页每行只显示：全称（主行加粗）+ 简称（下方小字，若无简称则不显示这一行）、主联系人、供货范围；不再有单独的"简称"列标题；整体行间距比当前实现更紧凑。
- 详情页顶部能看到独立的"归档"和"删除"两个图标按钮（仅 `canWrite` 为真时可见）；点击"删除"前必须二次确认，文案清楚说明是不可撤销的永久删除，且如有关联采购活动要显示对应数量和"仅覆盖询价登记、不覆盖正式采购单历史"的说明。
- 确认删除后，Worker 端真正执行 `DELETE FROM PurchaseSupplier`（及其联系人），之后用同一个 ID `GET /api/purchase-suppliers/:id` 应返回 404，而不是仍能读到（用来和"归档"区分：归档后按 ID 还能读到，只是不出现在候选列表里；删除后按 ID 彻底读不到）。
- 删除成功后跳转回列表页，原供应商不再出现在列表和任何候选选择器里。
- 归档功能保持现状不变（按钮、确认文案、行为都不受本任务影响），删除是新增的独立能力，不能把现有归档误改成走新的硬删除接口。
- 从供应商详情页点击"打开采购部登记"，落地页面自动：a) 时间范围筛选变成"全部"（不是当月）；b) 供应商筛选精确定位到这个供应商主档 ID 关联的记录（哪怕这些记录的名称快照跟主档当前名称不一样，只要 `purchaseSupplierId` 匹配就要能筛出来）。
- 采购部登记页面原有的手动"供应商"下拉筛选（按名称字符串）行为不受影响，两套筛选逻辑（按 ID 深链接 / 按名称手动选择）可以共存，不冲突。

**Non-goals / 红线：**

- 不改动现有"归档"功能的语义和实现，归档依然是软删除（`status='archived'`），只是现在多了一个真正物理删除的独立入口。
- 不试图让删除前的关联检查做到全量覆盖正式采购单历史，文案里如实说明覆盖范围即可，不做虚假的"全量安全"承诺，也不新增服务端接口去扫 `purchase_history`。
- 不改动询报价登记表/订单状态表的筛选逻辑和 UI，只在采购部登记页面新增 ID 感知的供应商筛选维度，不影响 `/inquiry`、`/order` 等其它使用 `useInquiryFilter` 的页面。
- 不改 D1 schema、不改 `PurchaseSupplierContact` 外键约束定义。

**测试与验证：**

- `npx tsc --noEmit`、改动/新建文件定向 ESLint。
- Worker/API：新硬删除路由的 Bearer/权限矩阵、删除后 `GET` 返回 404、联系人一并被删除（数据库层面验证，不只是接口返回）、归档路由行为不受影响的回归测试。
- 前端：`recordMatchesSupplier` 升级后的单测（按 ID 精确匹配、无 ID 回退按名称匹配、改名后旧记录仍能按 ID 命中三种场景）；深链接 URL 参数解析后 `timeRange`/供应商筛选被正确设置的组件测试；删除确认弹窗文案（含/不含关联活动两种情况）的组件测试；列表页全称/简称堆叠展示的组件测试。
- `npm run build`（沙箱里单次可能跑不满 45 秒，建议本地/CI 补一次完整验证）。
- 手动验证：真实删掉一个测试用的采购供应商，确认它从数据库彻底消失（不是列表隐藏）；从详情页点"打开采购部登记"确认落地页确实是全部时间范围且已经按这个供应商筛选好。

**Status:** completed（2026-07-14）

## TASK-167：采购活动列表字段纠正——去掉客户询价编号，改显示内容描述

**状态：** 已完成（2026-07-14）

**背景：** `PurchaseSupplierActivityFeed.tsx` 里"采购活动"每条记录当前显示"客户询价编号：{activity.customerNo}"。用户反馈：客户询价编号是销售侧字段，不应该出现在采购供应商详情页这个采购侧视图里；这里应该显示的是采购部登记表里对应记录的"内容描述"（`InquiryRecord.description`，也是 `PurchaseOrderEditModal.tsx` 只读区域"内容描述"用的同一个字段，采购权限本来就可读写这个字段，`PURCHASE_REGISTRATION_WRITE_FIELDS` 里已经包含 `description`）。

**Files in scope：**

- `src/features/purchase-supplier/types/index.ts` — `PurchaseSupplierActivityItem`（第 49-57 行）把 `customerNo: string` 字段改成 `description: string`。
- `src/features/purchase-supplier/services/purchaseSupplierActivity.ts` — `derivePurchaseSupplierActivities` 里（第 24-32 行）把 `customerNo: record.customerNo` 改成 `description: record.description`。
- `src/features/purchase-supplier/components/PurchaseSupplierActivityFeed.tsx` — 第 84-89 行的"客户询价编号：{activity.customerNo || '—'}"（含 `title` 属性里的同一段文案）改成展示 `activity.description || '—'`，标签文案自行判断是否需要保留前缀（如"内容："）还是像询价编号一样直接展示，保持这一行其余字段（报价状态、已转订单、报价日期、订单号、时间）的展示逻辑不变。
- 同步更新 `src/features/purchase-supplier/services/__tests__/purchaseSupplierActivity.test.tsx` 里依赖 `customerNo`/"客户询价编号：xxx" 的测试断言和测试数据构造。

**验收标准：**

- "采购活动"列表不再出现"客户询价编号"字样或对应数据。
- 每条记录改为显示这条询价记录在采购部登记表里的"内容描述"（`record.description`），为空时显示"—"。
- 其余字段（询价编号、报价状态徽章、已转订单徽章、报价日期、订单号、时间）展示不变；单行布局、精确匹配、排序、空状态等 TASK-165/166 已实现的行为不变。

**Non-goals / 红线：**

- 不改变 `derivePurchaseSupplierActivities` 的匹配/排序逻辑，只改它返回的字段内容。
- 不改动询价记录本身的数据结构、权限或同步逻辑，`description` 字段的读写权限已经存在，这里只是换一个展示字段。
- 不涉及列表页、Worker 硬删除、采购部登记深链接等 TASK-166 已完成的其它能力。

**测试与验证：**

- `npx tsc --noEmit`、改动文件 ESLint。
- `purchaseSupplierActivity.test.tsx` 更新后继续通过，覆盖 description 为空和有值两种情况。
- 手动打开一个有采购活动记录的供应商详情页，确认展示的是内容描述而不是客户询价编号。

**Status:** completed（2026-07-14）

## TASK-168：详情页信息卡片——"基本信息"与"采购设置"改成并排两栏

**状态：** 已完成（2026-07-14）

**背景：** `PurchaseSupplierInfoCard.tsx` 当前把"基本信息"和"采购设置"两个 `FIELD_GROUPS` 渲染成上下堆叠的两块（外层 `divide-y` 包裹，每块 `px-5 py-3` 各占整行宽度，见第 230-299 行）。用户希望这两块在桌面宽度下改成左右并排的两个区域，而不是上下堆叠。

**Files in scope：**

- `src/features/purchase-supplier/components/PurchaseSupplierInfoCard.tsx` — 把当前包裹 `FIELD_GROUPS.map(...)` 的容器从纵向 `divide-y` 堆叠改成桌面宽度下左右并排的两栏（例如外层用 `grid grid-cols-1 md:grid-cols-2` 之类的布局，两栏之间加一条竖直分隔线或每栏各自加边框，替代原来靠 `divide-y` 横线分隔的视觉效果）；窄屏/移动端保持原来的上下堆叠，不强求并排。
  - 因为并排后每个区域的可用宽度大约减半，各区域内部 `dl` 目前用的 `md:grid-cols-2`（组内两个字段并排，比如"供应商全称"和"简称"）在这个新宽度下容易显得拥挤，需要相应调整（比如组内字段改成单列纵向排列，或者把两字段并排的断点从 `md` 上调到 `lg`），不要出现桌面宽度下四列挤在一起、字段被压得很窄的情况。
  - "联系人"区域（第 301 行往下）不受影响，继续在两栏区域下方占满整行宽度。

**验收标准：**

- 桌面宽度下"基本信息"和"采购设置"是左右并排的两个区域，视觉上能分清是两个独立分区（边框或分隔线，不是简单挤在一起）。
- 窄屏/移动端下两个区域仍然按原来的方式上下堆叠，不强行并排导致字段挤压。
- 并排后组内字段不会因为宽度变窄而挤压变形；"供应商全称"这类多字符字段在变窄的列宽下依然可读。
- 编辑/保存/取消交互、字段值展示、联系人区域功能均不受影响。

**Non-goals / 红线：**

- 不改变字段清单、数据结构、保存逻辑、权限门。
- 不改动"联系人"区域和详情页头部（归档/删除按钮、只读徽章）的布局。
- 不涉及列表页、活动列表、采购部登记跳转等其它已完成任务的范围。

**测试与验证：**

- `npx tsc --noEmit`、改动文件 ESLint。
- 现有 `PurchaseSupplierInfoCard.test.tsx` 继续通过；如果测试里有依赖具体 DOM 结构/class 的断言因为布局调整失效，同步更新断言，不要为了迁就旧断言退回堆叠布局。
- 手动对比桌面宽度和窄屏宽度下的实际效果。

**Status:** completed（2026-07-14）

## TASK-169：询报价登记表去掉"操作"列，编辑弹窗左下角加真删除入口

**状态：** 已完成（2026-07-14）

**背景：** 上一轮对话确认了询报价登记的删除现状——本地 `inquiry.service.ts` 的 `remove()` 只是把记录从 localStorage 过滤掉（另记一份"墓碑" `inquiry_deleted_ids` 防止被同步拉回），服务端 `src/worker.ts` 第 1738-1748 行的 DELETE 分支也只是 `UPDATE Document SET status='deleted'`，从不真正删行（注释里写的"之后可由定时任务清理"这个清理任务从未实现）。当时讨论了两条路：一次性手动清库，或者做成正式功能。用户选择了后者，这次给出具体交互：

1. `InquiryTable.tsx`（表头第 175 行"操作"）+ `InquiryRow.tsx`（第 98-108 行，`Trash2` 图标调用 `onDelete`，即现有的软删除入口）——把这一列整个去掉。行本身已经有 `onClick={() => onEdit(record)}`（第 37 行）打开编辑弹窗，去掉操作列不影响进入编辑的入口。
2. `InquiryFormModal.tsx`（编辑询价窗口，第 580-595 行是当前"取消/保存修改"按钮行，`flex items-center justify-end gap-2`）——左下角新增一个硬删除图标按钮，和右侧的取消/保存变成同一行两端对齐（`justify-between`）。这里的"删除"是真正的物理删除，不是现有 `removeRecord` 那种软删除。

**Files in scope：**

- `src/features/inquiry/components/InquiryTable.tsx` — 去掉表头"操作"列（第 175 行一带）；`onDeleteRecord` prop 及相关列宽/拖拽豁免逻辑（第 16、58、72 行提到的"操作列"注释）一并清理，不要留下指向已删除列的死配置。
- `src/features/inquiry/components/InquiryRow.tsx` — 去掉最后一个 `<td>`（第 98-108 行的删除按钮单元格）和不再使用的 `onDelete` prop、`Trash2` import。
- `src/features/inquiry/components/InquiryFormModal.tsx` — `InquiryFormModalProps`（第 75-82 行）新增可选 `onDelete?: (recordId: string) => void`；只在 `mode === 'edit'` 且 `record` 存在且外部传了 `onDelete` 时，在第 580-595 行的按钮行左侧渲染一个 `Trash2` 图标按钮（`justify-between` 布局，左边删除图标，右边保持"取消/保存修改"）。点击后二次确认（文案强调"物理删除、不可撤销"，如果 `record.orderNo` 有值要额外提示"该记录已生成订单号 {orderNo}，删除前请确认"），确认后调用 `onDelete(record.id)` 并关闭弹窗。**这个 prop 必须是可选的**——`src/features/customer/components/CustomerActivityFeed.tsx` 也在用同一个 `InquiryFormModal` 编辑询价记录，这次只在 `InquiryPage.tsx` 这个调用点传 `onDelete`，`CustomerActivityFeed.tsx` 那个调用点不传，不显示删除图标，不要连带在客户详情页也加上这个入口。
- `src/features/inquiry/app/InquiryPage.tsx` — 现有 `handleDeleteRecord`（第 282 行起）和"操作"列的软删除是同一套，这次要保留它给批量删除（`handleBatchDelete`，第 250 行起，走勾选框+工具栏，需要 `inquiry.batchEdit` 权限）继续用，不要动；新增一个单独的硬删除处理函数，传给 `InquiryFormModal` 的新 `onDelete` prop，二次确认后调用下面新增的服务函数。
- `src/features/inquiry/services/inquiry.service.ts` — 新增 `hardDelete(id: string): Promise<void>`（区别于现有 `remove()`/`deleteFromD1()`），需要：a) 调用新 Worker 硬删除路由并等待响应（不要用现有 `enqueueAndTry` 那种 fire-and-forget 重试队列模式——那套异步重试机制正是历史上"幽灵记录"[[bug_inquiry_sync_phantom_records]]的根因，物理删除这种不可逆操作必须同步等结果、失败要能在 UI 上明确提示，不能静默重试或静默失败）；b) 成功后把本地 `inquiry_records`/`inquiry_deleted_ids` 也同步清理掉这条记录，本地状态和服务端保持一致。
- `src/worker.ts` — 在 `handleInquiryRequest` 里新增一个和现有软删除 `DELETE /api/inquiry/:id`（第 1738 行 `itemMatch` 分支）**路径不同**的真删除分支，例如新增正则匹配 `/^\/api\/inquiry\/([^/]+)\/hard-delete$/`，执行真正的 `DELETE FROM Document WHERE id = ? AND type = 'inquiry'`（不是 `UPDATE ... SET status`）。`verifyBearerToken` 已经在函数顶部（第 1599 行）统一检查，不需要重复加。
- `src/app/api/inquiry/[[...path]]/route.ts` — 经核实这层是通用路径转发（第 67-70 行把 `pathSegments` 原样拼给 Worker），且现有逻辑已经把 DELETE 方法限定为只有完整 `inquiry` 权限（非受限视图）才能发起（第 54-56 行），新的 `.../hard-delete` 子路径会自动复用这个权限门槛，**不需要改这个文件**——除非实现时发现还有别的地方专门按路径段数硬编码校验（比如别处对 `/api/inquiry/:id` 做了严格的"只能两段"校验），如果有，需要相应放行三段路径。

**验收标准：**

- 询报价登记表不再有"操作"列，行点击依然能打开编辑询价弹窗。
- 编辑询价弹窗左下角有删除图标（仅编辑模式，且只在 `InquiryPage.tsx` 这条路径出现，客户详情页的询价编辑弹窗不受影响）；点击后二次确认，确认后这条记录在 D1 里被真正 `DELETE`，之后同 ID `GET` 查不到（哪怕带 30 天软删除宽限期的查询也查不到，因为行已经不存在，不是状态变化）。
- 已生成订单号的记录删除前，确认弹窗要有针对性的额外提示。
- 现有批量删除（勾选框+工具栏，`inquiry.batchEdit` 权限）行为完全不变，继续走软删除。
- 硬删除调用失败时（网络错误、权限不足等）要有清晰的错误提示，本地数据不能在服务端确认成功之前就被移除；不能复用现有的 fire-and-forget 重试队列。

**Non-goals / 红线：**

- 不改动批量删除功能的软删除语义。
- 不在客户详情页的询价编辑弹窗（`CustomerActivityFeed.tsx` 的调用点）加删除入口。
- 不新增/修改询报价相关的权限模块，沿用现有 `inquiry` 权限门槛。
- 不处理已存在的历史软删除数据清理（这是另一件事，上次讨论过，如果之后需要可以单独立项）。
- 不改动询报价的同步/合并逻辑（`mergeFromD1`/`mergeFieldsOnly`），只新增一个独立的硬删除调用路径。

**测试与验证：**

- `npx tsc --noEmit`、改动文件 ESLint。
- Worker：新硬删除路由 Bearer 校验、真删除后 `GET` 查不到、对现有软删除路由无影响的回归测试。
- 前端：`InquiryFormModal.tsx` 删除图标仅在 `mode==='edit'` 且传了 `onDelete` 时出现的组件测试；确认弹窗文案（含/不含订单号两种情况）；`InquiryPage.tsx` 硬删除失败时不移除本地数据的测试；`InquiryTable.tsx`/`InquiryRow.tsx` 去掉操作列后行点击仍正常打开编辑的回归测试；批量删除路径不受影响的回归测试。
- `npm run build`（沙箱可能跑不满 45 秒，建议本地/CI 补一次完整验证）。
- 手动验证：真实创建一条测试询价记录，用新删除入口删掉，确认数据库里彻底查不到；确认客户详情页的询价编辑弹窗没有出现删除图标。

**Status:** completed（2026-07-14）

## TASK-170：采购供应商详情页"采购设置"字段两两并排

**状态：** 已完成（2026-07-14）

**背景：** TASK-168 把"基本信息"和"采购设置"改成左右并排两栏后，为了避免并排后字段拥挤，把两个组内部的字段都改成了纵向单列（`PurchaseSupplierInfoCard.tsx` 第 230-234 行，`<dl className="grid">` 没有列定义，`FieldDefinition` 的 `multiline` 也不再影响布局）。用户对照截图反馈"采购设置"这一栏里希望"供应产品/业务范围"和"供应商类型"同一行，"默认付款条件"和"默认币种"同一行；"基本信息"这一栏和"备注"字段不用动。

**Files in scope：**

- `src/features/purchase-supplier/components/PurchaseSupplierInfoCard.tsx` — 把 `FIELD_GROUPS`（第 39-59 行）的数据结构从"一个组一份扁平 `fields` 数组"改成"一个组是若干行，每行 1-2 个字段"（比如 `rows: FieldDefinition[][]`），明确指定："采购设置"组的行是 `[data.supplyScope, data.supplierType]`、`[data.paymentTerms, data.defaultCurrency]`、`[data.remark]`（备注单独一行）；"基本信息"组维持现状，每行仍是单个字段（`[name]`、`[shortName]`、`[code]`、`[address]`），不要顺带把"供应商全称"和"简称"也拼到一行——这次反馈只针对"采购设置"。渲染逻辑相应调整：一行两个字段时用 `grid grid-cols-2 gap-x-4`（或类似），一行一个字段时保持现在的整行宽度；`multiline` 的字段（`supplyScope`/`address`/`remark`）编辑态仍然渲染成 `textarea`，只是现在可能只占半行宽度（`supplyScope` 和 `supplierType` 并排时），不需要再靠 `multiline` 自动撑满整行——这个横向宽度和是否用 `textarea` 是两回事，不要因为改了并排布局就误把 `supplyScope` 的编辑框也改成单行 `input`。

**验收标准：**

- "采购设置"栏里"供应产品 / 业务范围"和"供应商类型"在同一行；"默认付款条件"和"默认币种"在同一行；"备注"单独占一行。
- "基本信息"栏的字段布局和现在完全一样（每个字段各占一行），不受本次改动影响。
- "供应产品 / 业务范围"编辑态仍然是多行 `textarea`（不是单行 `input`），即使现在和"供应商类型"并排、宽度变窄。
- 只读展示、编辑/保存/取消交互、字段校验（比如全称不能为空）均不受影响。

**Non-goals / 红线：**

- 不改动"基本信息"栏的字段顺序或布局。
- 不改字段清单、数据结构（`PurchaseSupplierData` 的字段名）、保存逻辑、权限门。
- 不涉及联系人区域、详情页头部按钮、活动列表等其它已完成任务的范围。

**测试与验证：**

- `npx tsc --noEmit`、改动文件 ESLint。
- 现有 `PurchaseSupplierInfoCard.test.tsx` 继续通过；如果有依赖具体字段顺序/DOM 结构的断言因为改成"行"数据结构而失效，同步更新，不要因此改回单列布局。
- 手动对照本次反馈截图（供应商"上海比泽尔"），确认两组配对和"基本信息"不受影响。

**Status:** completed（2026-07-14）

## TASK-171：采购供应商列表页去掉归档按钮

**状态：** completed（2026-07-15）

**背景：** 采购供应商列表页（`/purchase-supplier`）每一行末尾有一个「归档」图标按钮，用户要求把这个入口从列表页去掉。详情页（`PurchaseSupplierDetailPage.tsx`）里也有归档功能（第 118-131 行 `handleArchive`，通过 `onArchive={handleArchive}` 传给某个头部组件），这次反馈只针对列表页，详情页的归档不用动，服务层 `archivePurchaseSupplier`（`purchaseSupplierService.ts` 第 231 行）和 worker 端点（`src/worker.ts` `handleArchivePurchaseSupplier`）仍被详情页使用，不能删除。

**Files in scope：**

- `src/features/purchase-supplier/app/PurchaseSupplierPage.tsx` —
  - 删除第 129-142 行整个 `{canWrite && <div className="flex gap-1">...</div>}` 块（归档按钮及其外层容器）。
  - 删除第 66-75 行的 `handleArchive` 函数。
  - 清理因此变成未使用的引用：第 4 行 `Archive` 图标 import、第 12 行 `archivePurchaseSupplier` import、第 8 行 `useConfirm` import 及第 21 行 `confirm` 变量（确认它们在文件里没有被其它地方使用后再删，若还有用到就保留）。

**验收标准：**

- 采购供应商列表页每一行不再显示归档图标按钮。
- 点击整行仍然正常跳转到供应商详情页（`router.push` 行为不受影响）。
- 新建/编辑供应商（`showForm` / `handleSave`）功能不受影响。
- 详情页的归档功能（`PurchaseSupplierDetailPage.tsx`）保持不变，仍可正常归档。

**Non-goals / 红线：**

- 不删除 `archivePurchaseSupplier`（`purchaseSupplierService.ts`）或 worker 端点 `handleArchivePurchaseSupplier`，详情页仍依赖。
- 不改动详情页的归档按钮/逻辑。
- 不改列表页其它功能（搜索、新增、权限门 `canRead`/`canWrite`）。

**测试与验证：**

- `npx tsc --noEmit`、改动文件 ESLint。
- 更新 `src/features/purchase-supplier/app/__tests__/PurchaseSupplierPage.test.tsx` 第 89-97 行「点击归档按钮不会触发行跳转」这条用例——归档按钮已删除，此用例需要删除或改写；同时移除该测试文件里为 `archivePurchaseSupplier` 打的 mock（若不再被引用）。
- 手动检查列表页渲染，确认归档按钮不再出现。

**Status:** completed（2026-07-15）

## TASK-172：采购供应商页副标题/新增按钮/联系人排布 + 采购部登记表表头压缩

**状态：** completed（2026-07-15）

**背景：** 用户反馈四点，分两组文件：（1）采购供应商列表页（`/purchase-supplier`）副标题文案要去掉、小屏下新增按钮要和标题同一行、小屏下每条记录的"主联系人"和"供货范围"要放同一行；（2）采购部登记表（`/purchase-registration`）在中屏/小屏时表头行整体过高，应该压缩（用户确认：表头行比数据行占用的空间明显偏大，需要减小表头的上下内边距）。

**Files in scope：**

- `src/features/purchase-supplier/app/PurchaseSupplierPage.tsx` —
  1. 删除第 75 行 `<p className="mt-1 text-sm text-gray-500">采购侧独立主数据，不与销售侧客户管理中的供应商混用。</p>`（副标题整段去掉，`<div>` 容器里只剩 `<h1>`）。
  2. 第 72 行 `mb-6 flex flex-wrap items-center justify-between gap-3` 去掉 `flex-wrap`（改成 `mb-6 flex items-center justify-between gap-3`），避免小屏下新增按钮换到标题下一行；同时给第 73 行标题容器 `<div>` 加 `min-w-0`，给第 77 行 `<Button>` 加 `shrink-0`，防止标题过长时把按钮挤出可视区或撑破一行布局。
  3. 第 108-115 行（供应商姓名/联系人/供货范围三个直接子元素）：小屏（默认，无 `md:` 前缀）时外层 `grid` 没有列定义，三个子元素各自单独占一行；现在要求小屏下"主联系人"和"供货范围"这两个子元素合并到同一行，供应商名称保持单独一行。做法：把第 114-115 行的联系人 `<div>` 和供货范围 `<div>` 包进一个新的 wrapper `<div className="flex items-center justify-between gap-2 md:contents">`，wrapper 在小屏下用 `flex` 把两者并排显示（联系人靠左、供货范围靠右），在 `md:` 断点用 `contents`（`display:contents`）让 wrapper 本身消失，使联系人和供货范围重新变成外层 `grid-cols-[1.8fr_1fr_1.3fr]` 的直接子项，md+ 端的三列布局必须保持和现在完全一样。

- `src/features/purchase-registration/components/PurchaseRegistrationTable.tsx` —
  4. 第 35 行 `const th = ${headerCellOverflowClass} relative;` 复用了 `@/components/table/tableHeaderStyles` 里的共享样式 `headerCellOverflowClass`（`px-2 py-2.5 ...`）。这个样式同时被 `InquiryTable.tsx`、`PurchaseOrderTable.tsx`、`OrderTable.tsx` 三个其它表格复用，**不要改 `tableHeaderStyles.ts` 本身**，否则会连带改变那三张表的表头，超出本次范围。改法：只在本文件内新建一个采购部登记表专用的 `th` 样式常量（内容基于 `headerCellOverflowClass` 复制展开，把 `py-2.5` 改小，比如先试 `py-1.5`），只应用在本表格的 `<th>` 上（第 63/67/71/75 行）。目标是表头行的视觉高度接近数据行（`PurchaseRegistrationRow.tsx` 单元格是 `py-2`），不要求像素级一致，改完后目测对比一下表头和第一条数据行的高度比例，如果还是明显偏高可以再往下调，但不要小到文字被裁切或贴边。

**验收标准：**

- 采购供应商列表页不再显示"采购侧独立主数据，不与销售侧客户管理中的供应商混用。"这句副标题。
- 在窄屏（如 375px 宽）下，"采购供应商"标题和"新增采购供应商"按钮始终在同一行，不换行。
- 在窄屏下，每条供应商记录里"主联系人"和"供货范围"两个值显示在同一行；供应商名称仍单独占一行。
- md 及以上宽度时，采购供应商列表的三列（供应商 / 主联系人 / 供货范围）表头和数据对齐方式与改动前完全一致（用 `md:contents` 验证不会破坏现有桌面端布局）。
- 采购部登记表的表头行高度明显压缩，不再有截图里那种表头比数据行高出一大截的观感；`InquiryTable`、`PurchaseOrderTable`、`OrderTable` 三张表的表头样式和高度不受影响（因为改动没有碰共享的 `tableHeaderStyles.ts`）。

**Non-goals / 红线：**

- 不改 `src/components/table/tableHeaderStyles.ts` 里的共享导出（`headerRowClass`/`headerCellClass`/`headerCellOverflowClass` 等），会影响其它三张表。
- 不改采购供应商列表页的搜索、新增供应商弹窗、权限门（`canRead`/`canWrite`）、路由跳转等逻辑。
- 不改采购部登记表的列宽拖拽（`useResizableColumns`）、`table-fixed` 布局、四列的内容渲染逻辑，只动表头单元格的内边距。
- 不新增"状态描述"列在小屏下的显示/隐藏逻辑，这次只针对表头行高。

**测试与验证：**

- `npx tsc --noEmit`、改动文件 ESLint。
- 现有 `PurchaseSupplierPage.test.tsx` 继续通过；如果有依赖副标题文案或者联系人/供货范围 DOM 结构的断言因改动失效，同步更新，不要为了让测试通过而改回原布局。
- 手动在窄屏（约 375px）和中等宽度（约 768px）下分别查看两张表格，确认四项改动都生效，且 md+ 桌面宽度下两张表格的既有布局没有回归。

**Status:** completed（2026-07-15）

**Follow-up（2026-07-15）：** 对照询报价登记表后确认，中屏表头异常不是单纯 padding 问题，而是前三列固定宽度合计超过容器后，最后一列被压到 0px 并逐字换行。采购部登记表已恢复复用共享表头样式，四个标题统一使用 `h-6` 单行截断，并按当前拖拽列宽动态设置表格最小宽度、为”状态描述”保留至少 180px。768px 实测表头 44.5px、数据行 49px，与询报价登记表一致。

## TASK-173：采购订单表"供应商"支持一单多家（多选）+ "采购单号"也改成弹窗编辑

**状态：** completed（2026-07-15）

**背景：** 两件事一起做，都是把"采购订单表"某一列从表格行内直接编辑改成点击打开"编辑采购订单"弹窗（`PurchaseOrderEditModal.tsx`）编辑，动的是同一个文件（`PurchaseOrderRow.tsx`）、同一个 `EditField` 联合类型，所以合并成一个任务一起改，避免分两次改同一处代码互相冲突。

1. **供应商支持多选：** 采购订单表（`/purchase-order-table`）"供应商"这一列目前是单值字段（`InquiryRecord.purchaseOrderSupplier` 字符串 + `purchaseOrderSupplierId` 主数据 ID），行内点击即可编辑（`PurchaseOrderRow.tsx` 里的 `EditableText` + datalist）。用户反馈：有时一个采购订单会拆给两家及以上供应商，需要支持多选。已与用户确认交互方案：**行内不再直接编辑，点击"供应商"单元格（和点击"订单编号"单元格一样）打开弹窗，在弹窗里用"标签列表 + 搜索添加"的方式管理多个供应商**，不做表格行内的紧凑多选下拉。

2. **采购单号改弹窗编辑：** 用户接着要求"采购单号"也一并改成同样的模式——现在"采购单号"单元格（`PurchaseOrderRow.tsx` 第 334-347 行）还是行内直接点击变输入框、失焦保存；弹窗（`PurchaseOrderEditModal.tsx` 第 250-257 行）本来就已经有"采购单号"这个可编辑字段了，字段本身、`buildPurchaseOrderDirtyPatch`、`restrictedView.ts` 白名单里都已经支持这个字段的读写，**这部分不需要动数据模型和弹窗，只需要把表格行内那份编辑入口去掉，改成点击打开弹窗**。

这个字段是”采购订单表专属字段，无需 D1 迁移”（见 `InquiryRecord` 类型注释），但**有一个例外必须处理**：受限视图（只有 `purchaseRegistration` 权限、没有 `inquiry` 权限的账号，比如纯采购部同事）通过 `src/app/api/inquiry/[[...path]]/restrictedView.ts` 的字段级白名单读写这些字段——`purchaseOrderSupplier`/`purchaseOrderSupplierId` 已经在 `PURCHASE_ORDER_TABLE_WRITE_FIELDS` 里，新字段如果不加进这个白名单，受限视图用户会读不到、也存不进多供应商数据（历史上这个项目在受限视图字段遗漏上出过好几次真实 bug，参考 memory 里的”受限视图污染本地缓存崩溃””询报价同步幽灵记录”，这次务必把新字段补全到读写两处）。

**总体思路：** 新增一个数组字段 `purchaseOrderSuppliers?: Array<{ id?: string; name: string }>` 作为权威数据源；保留旧的 `purchaseOrderSupplier`/`purchaseOrderSupplierId` 两个字段不删除，新代码保存时把数组第一项镜像写回这两个旧字段（多设备/旧缓存场景下的降级兼容，与项目里”新增字段不删旧字段”的既有惯例一致），所有读取供应商的地方统一通过一个新的 helper 函数，数组为空时自动 fallback 到旧的单值字段包一层，这样存量订单（还没有 `purchaseOrderSuppliers`）不用做数据迁移也能正常显示。

**Files in scope：**

1. `src/features/inquiry/types/index.ts` —
   - 新增导出类型 `export interface PurchaseOrderSupplierEntry { id?: string; name: string }`。
   - 在 `InquiryRecord` 里第 76-79 行附近新增 `purchaseOrderSuppliers?: PurchaseOrderSupplierEntry[];`，注释写明”权威字段，支持一单多家供应商；`purchaseOrderSupplier`/`purchaseOrderSupplierId` 保留作为旧数据 fallback 和降级兼容镜像，不再是编辑入口”。不要删除 `purchaseOrderSupplier`/`purchaseOrderSupplierId` 这两行。

2. 新建 `src/features/purchase-order-registration/utils/purchaseOrderSuppliers.ts` —
   - `getPurchaseOrderSuppliers(record): PurchaseOrderSupplierEntry[]`：`record.purchaseOrderSuppliers` 非空数组时直接返回；否则如果 `record.purchaseOrderSupplier` 有值，返回 `[{ id: record.purchaseOrderSupplierId, name: record.purchaseOrderSupplier.trim() }]`；都没有则返回 `[]`。
   - `formatPurchaseOrderSuppliers(entries): string`：`entries.map(e => e.name).join('、')`，空数组返回空字符串。
   - 附带一个新测试文件 `__tests__/purchaseOrderSuppliers.test.ts`，覆盖：数组字段优先、fallback 到旧字段、都为空返回 `[]`/`''`。

3. `src/features/purchase-supplier/components/PurchaseSupplierPicker.tsx` — 新增两个可选 prop，都不改变现有默认行为（`PurchaseBaseInfo.tsx` 里的另一处单选用法不受影响）：
   - `clearOnSelect?: boolean`（默认 `false`）：为 `true` 时，点击下拉建议项后把输入框清空（`setQuery('')`）而不是填入选中的名称，用于”选中即添加到列表、输入框留着继续加下一个”的场景。
   - `onEnter?: () => void`：输入框 `onKeyDown` 里 `key === 'Enter'` 时调用（`e.preventDefault()`），用于”自由文本直接回车提交”的场景。

4. `src/features/purchase-order-registration/components/PurchaseOrderEditModal.tsx` —
   - 状态从 `purchaseOrderSupplier`/`purchaseOrderSupplierId` 两个 `useState` 改成 `const [suppliers, setSuppliers] = useState<PurchaseOrderSupplierEntry[]>([]);` + 一个 `const [addSupplierName, setAddSupplierName] = useState('');`（搜索添加框自己的输入态）。
   - 打开弹窗的 `useEffect`（第 109-131 行）里用 `getPurchaseOrderSuppliers(record)` 初始化 `suppliers`，`initialValuesRef.current` 记录 `purchaseOrderSuppliers: getPurchaseOrderSuppliers(record)` 作为 diff 基线（不再记录旧的两个单值字段）。
   - 第 258-269 行”供应商”字段区块改成：
     - 已选供应商渲染成一排可关闭的标签（`suppliers.map`，每个标签一个删除按钮，点击从 `suppliers` 里移除对应项，用 index 定位即可，不需要额外唯一 key 逻辑之外的东西）。
     - 下面放 `PurchaseSupplierPicker`，`value={addSupplierName}`、`clearOnSelect`、`onChange`：如果 `selection.id` 存在（用户点了下拉里的主数据条目）直接调用一个本地 `addSupplier({ id: selection.id, name: selection.name })` 并清空 `addSupplierName`；否则只更新 `addSupplierName`（用户还在打字）。`onEnter={() => addSupplier({ name: addSupplierName })}`（自由文本回车追加，追加后同样清空 `addSupplierName`）。`addSupplier` 内部按 `name`（trim 后）去重，已存在同名的不重复添加，`name` 为空直接忽略。
     - placeholder 改成类似”搜索或输入新增供应商，回车添加”。
   - `handleSave`（第 146-163 行）：`nextValues` 里把 `purchaseOrderSupplier`/`purchaseOrderSupplierId` 两行改成：
     ```
     purchaseOrderSuppliers: suppliers,
     purchaseOrderSupplier: suppliers[0]?.name,
     purchaseOrderSupplierId: suppliers[0]?.id,
     ```
     `buildPurchaseOrderDirtyPatch` 的调用方式不变，但要配合第 5 点改掉该函数内部的字段处理逻辑。

5. `src/features/purchase-order-registration/utils/purchaseOrderPatch.ts` —
   - `PURCHASE_ORDER_EDITABLE_FIELDS` 加入 `'purchaseOrderSuppliers'`（保留 `'purchaseOrderSupplier'`/`'purchaseOrderSupplierId'` 两项不删，它们仍然是要写回的镜像字段）。
   - 因为数组不能用 `!==` 比较，把现有第 26-29 行的特殊处理换成：判断 `JSON.stringify(next.purchaseOrderSuppliers ?? []) !== JSON.stringify(baseline.purchaseOrderSuppliers ?? [])`，为真时把 `purchaseOrderSuppliers`、`purchaseOrderSupplier`（`next.purchaseOrderSuppliers?.[0]?.name`）、`purchaseOrderSupplierId`（`next.purchaseOrderSuppliers?.[0]?.id`）三个字段一起写进 `patch`（三者要么都写、要么都不写，和现在”供应商名称/ID 成对进出”的既有逻辑保持同一个思路）。
   - 同步更新 `src/features/purchase-order-registration/utils/__tests__/purchaseOrderPatch.test.ts` 里依赖旧单值字段 diff 的用例，改成基于 `purchaseOrderSuppliers` 数组构造 baseline/next。

6. `src/features/purchase-order-registration/components/PurchaseOrderRow.tsx` —
   - 第 39 行 `EditField` 联合类型去掉 `'purchaseOrderSupplier'` 和 `'purchaseOrderNo'`，改动后应该只剩 `'amount' | 'deliveryDate' | 'deliveryStatus' | null`。
   - 第 290 行 props 接口删掉 `supplierOptions: Array<{ id: string; name: string }>`（不再需要，多选管理已经搬到弹窗，弹窗里的 `PurchaseSupplierPicker` 自己联网拉取主数据，不依赖这个 prop）。
   - 第 334-347 行"采购单号"单元格（`purchaseOrderNoCol && (...)` 包裹的部分）：把里面的 `EditableText` 换成只读展示 + 点击打开弹窗，写法参照第 311-327 行"订单编号"单元格那套模式（`role="button" tabIndex={0} onClick={() => onOpenEdit?.(record)}`、`onKeyDown` 处理 Enter/Space、hover 态 class、`title` 属性），值直接用 `record.purchaseOrderNo`，为空时展示"采购单号"占位文案（灰色，和其它空值单元格一致）。`purchaseOrderNoCol` 这个小屏隐藏逻辑保持不变。
   - 第 349-366 行"供应商"单元格改成只读展示：用 `getPurchaseOrderSuppliers(record)` + `formatPurchaseOrderSuppliers(...)` 拿到显示文本，为空时展示"供应商"占位文案（灰色，和其它空值单元格一致），同样包一层点击打开弹窗（`role="button" tabIndex={0} onClick={() => onOpenEdit?.(record)}`，`onKeyDown` Enter/Space，hover 态），`title` 属性放完整供应商名单方便悬停查看被截断的长列表。
   - "采购单号"和"供应商"两处都改完后，`EditableText` 组件（原第 44-96 行的定义）在这个文件里就没有调用点了，**连同它的定义和 `EditableTextProps` interface 一起删除**，不要留死代码。

7. `src/features/purchase-order-registration/components/PurchaseOrderTable.tsx` —
   - `PurchaseOrderTableProps` 接口删掉 `supplierOptions: Array<{ id: string; name: string }>`。
   - 渲染 `<PurchaseOrderRow>` 那里（第 182-191 行）去掉 `supplierOptions={supplierOptions}` 这一行传参。

8. `src/features/purchase-order-registration/app/PurchaseOrderRegistrationPage.tsx` —
   - `matchesKeyword`（第 60-70 行）：`record.purchaseOrderSupplier` 换成 `...getPurchaseOrderSuppliers(record).map((s) => s.name)`（展开进那个数组里一起参与关键词匹配，多个供应商任意一个命中都算匹配）。
   - `supplierOptions`（第 143-148 行，供筛选栏下拉用）：改成 `Array.from(new Set(orderRecords.flatMap((r) => getPurchaseOrderSuppliers(r).map((s) => s.name.trim())).filter(Boolean))).sort(...)`（原排序逻辑不变）。
   - `supplierFilter` 匹配（第 164-165 行）：`(!supplierFilter || getPurchaseOrderSuppliers(record).some((s) => s.name.trim() === supplierFilter))`。
   - 清理现在变成死代码的东西：`purchaseSuppliers` state（第 95 行）、`purchaseSupplierAccess`（第 96 行）、加载 `fetchPurchaseSuppliers` 的 `useEffect`（第 109-116 行）、`purchaseSupplierOptions` memo（第 149-152 行）、传给 `<PurchaseOrderTable supplierOptions={purchaseSupplierOptions} />` 的这一行 prop（第 262 行），以及相应变得多余的 import（`usePurchaseSupplierAccess`、`fetchPurchaseSuppliers`、`PurchaseSupplier` 类型）——这条链路原本只是为了给 Row 的行内 datalist 提供选项，弹窗自己会联网拉取主数据，不再需要 Page 层重复维护这份状态。删之前确认这些变量/import 在文件里确实没有被别的地方引用。

9. `src/app/api/inquiry/[[...path]]/restrictedView.ts` —
   - `PURCHASE_ORDER_TABLE_WRITE_FIELDS`（第 25-33 行）加入 `'purchaseOrderSuppliers'`。
   - `sanitizeRestrictedRecord` 的 `flags.allowPurchaseOrderTable` 分支（第 70-83 行）加入 `result.purchaseOrderSuppliers = record.purchaseOrderSuppliers;`。
   - 这一步是本次改动里唯一真正touch 受限视图权限白名单的地方，**红线部分特别强调不要漏掉**。

**验收标准：**

- 采购订单表”供应商”列不再能行内直接点击编辑；点击该单元格（或订单编号单元格）都能打开”编辑采购订单”弹窗。
- 弹窗里能看到当前订单已有的供应商标签列表，每个标签可以单独删除；搜索框选中主数据里的供应商会立刻加入标签列表并清空搜索框，可以连续加好几家；自由输入一个不在主数据里的供应商名称、按回车，也能加入标签列表。
- 保存后，供应商单元格显示所有供应商名称（用”、”连接），刷新页面或重新打开弹窗后多供应商数据仍然存在。
- 存量订单（这次改动前保存的、只有旧版 `purchaseOrderSupplier` 单值）不用做任何数据迁移，依然能在列表和弹窗里正常显示这一家供应商；打开弹窗编辑并保存后自动升级成新的数组字段。
- “供应商”筛选下拉：选项来自所有订单里出现过的供应商名称去重集合；选中某个供应商后，只要订单的供应商列表里包含这一家（不要求是唯一或第一家），就应该出现在筛选结果里。
- 关键词搜索命中任意一家供应商名称都算命中。
- 只有 `purchaseRegistration` 权限（无 `inquiry` 权限）的受限视图账号，能正常读到、也能正常保存多供应商数据——这条必须实际验证，不能只看桌面端普通账号。
- 采购订单表"采购单号"列不再能行内直接点击编辑；点击该单元格能打开弹窗，且弹窗里"采购单号"输入框能正常编辑、保存，保存后表格里对应单元格立刻显示新值。小屏下"采购单号"列隐藏的行为不受影响（`purchaseOrderNoCol` 逻辑不变）。
- 改动完成后 `EditableText` 组件已被删除（两处调用都改掉了），`tsc`/eslint 不报未使用变量/组件。

**Non-goals / 红线：**

- 不要删除 `purchaseOrderSupplier`/`purchaseOrderSupplierId` 这两个旧字段（类型定义、restrictedView 白名单里都保留），只是不再作为编辑入口，继续写入作为降级兼容镜像。
- 不要漏掉 `restrictedView.ts` 里 `PURCHASE_ORDER_TABLE_WRITE_FIELDS` 和 `sanitizeRestrictedRecord` 两处新增字段的登记——这是本次改动里唯一涉及受限视图权限白名单的地方，历史上这类遗漏在本项目里造成过真实的数据不同步 bug。
- 不改 `PurchaseSupplierPicker.tsx` 里已有的默认行为（`PurchaseBaseInfo.tsx` 那处单选用法不能受影响），新增的两个 prop 必须是可选且默认关闭。
- 不改询报价登记 / 采购部登记表里已有的、结构不同的多供应商机制（`supplierStatuses`/`purchaseSupplierStatuses`，那是报价状态追踪，字段里带日期/状态，跟这次"采购订单表按订单拆多家供应商"是两回事，不要混用或复用那一套组件）。
- 不改弹窗（`PurchaseOrderEditModal.tsx`）里"采购单号"字段本身的实现，它已经是可用的，不需要动；也不改 `buildPurchaseOrderDirtyPatch`、`restrictedView.ts` 白名单里 `purchaseOrderNo` 的部分——它已经在两处都放行了，不需要新增字段（这条只对供应商字段成立，供应商需要新增字段登记，见上面红线第二条）。
- 不改采购订单表其它列（金额、交货日期、执行情况）的编辑方式，也不涉及订单编号单元格已有的打开弹窗逻辑。
- 不改 D1 schema、`worker.ts`（这些字段本来就不经过 worker.ts 的具名列，保持"无需 D1 迁移"的现状）。

**测试与验证：**

- `npx tsc --noEmit`、改动文件 ESLint。
- 新增 `purchaseOrderSuppliers.test.ts`；更新 `purchaseOrderPatch.test.ts`；如果 `PurchaseOrderRow`/`PurchaseOrderEditModal`/`route.test.ts` 有依赖旧单值字段编辑交互或白名单的断言因改动失效，同步更新或补充新用例（尤其是 `route.test.ts` 里针对 `PURCHASE_ORDER_TABLE_WRITE_FIELDS` 和 `sanitizeRestrictedRecord` 的用例，要补一条覆盖 `purchaseOrderSuppliers`）；"采购单号"行内可编辑相关的旧断言改成"点击打开弹窗"。
- 手动测试：新建/编辑一个订单，加两家供应商（一家选主数据、一家自由输入），保存后刷新页面确认都还在；用一个只有 `purchaseRegistration` 权限的测试账号重复一遍，确认受限视图下同样能读写成功；用一条改动前就存在的旧订单（只有单值供应商）打开弹窗，确认能正常显示、编辑、加第二家供应商后保存成功；点击采购单号单元格能打开弹窗，弹窗里改采购单号保存后表格同步更新，小屏下该列隐藏正常。

**Status:** completed（2026-07-15）

**完成说明：** 已完成一单多家供应商的标签式弹窗编辑、旧单值字段自动 fallback/首项镜像、采购单号弹窗编辑入口、多供应商搜索筛选及受限视图读写白名单；新增 helper、patch、弹窗、表格行、选择器和 API 权限测试。`npx tsc --noEmit`、改动文件 ESLint、生产构建及本地响应式页面验收均通过。当前没有“仅 purchaseRegistration、无 inquiry”专用测试账号，受限视图本轮完成了 GET 清洗/PUT 白名单自动测试，但未执行该专用账号的真实保存验收。

## TASK-174：订单状态表去掉全部行内编辑，改成点击整行打开"编辑订单"弹窗

**状态：** completed（2026-07-15）

**背景：** 用户要求订单状态表（`/order`）、采购部登记（`/purchase-registration`）、采购订单表（`/purchase-order-table`）三张表都去掉行内编辑，改成跟询报价登记表（`/inquiry`，`InquiryRow.tsx`）一样——点击整行打开编辑弹窗，弹窗才是唯一编辑入口。三张表分拆成三个任务（本任务 + TASK-175 + TASK-176），先做订单状态表这个字段最多、风险最高的。

参考模型 `InquiryRow.tsx`：整个 `<tr>`上挂 `onClick={() => onEdit(record)}`，所有 `<td>` 都是纯只读展示（不带 `role="button"`/`onClick`），只有批量选择 checkbox 那一格用 `onClick={(e) => e.stopPropagation()}` 挡住冒泡。

订单状态表现状：`OrderRow.tsx` 里有 7 个行内可编辑字段（交货日期、确认日期、客户订单号、执行情况+收货人、金额、回款月份、到账金额），分别由本文件内定义的 `EditableCell`/`DatePickerCell`/`MonthPickerCell`/`AmountCell` 四个组件 + 共享组件 `DeliveryStatusCell`（`@/features/order/components/DeliveryStatusCell.tsx`）渲染；`onOpenEdit` 目前只挂在"订单编号+询价编号"那一格的内层 `<div>` 上。好消息是 `OrderEditModal.tsx` 早就已经覆盖了这 7 个字段外加撤销C/悬挂P/善后S 状态标记（弹窗顶部注释写着"行内单元格点击编辑保留、并存，不是替代关系"——这次就是要把"并存"改成"只保留弹窗"），**不需要新增弹窗字段，只需要把行内编辑拿掉**。

**Files in scope：**

- `src/features/order/components/OrderRow.tsx` —
  - 删除 `EditField` 类型、`activeField`/`setActiveField`/`activate`/`cancel`，以及本文件内定义的 `EditableCell`、`DatePickerCell`、`MonthPickerCell`、`AmountCell` 四个组件（连同它们各自的 props interface）。这四个组件都只有"编辑"和"只读"两个渲染分支，**只读分支的 JSX/class 原样保留、去掉 `role="button"`/`tabIndex`/`onClick`/`onKeyDown`/`cursor-text` 这些交互相关的部分**，直接内联到对应单元格里（其余格式化逻辑——`stripDateBrackets`、`formatAmountDisplay`、`parseAmount`、`getRecordCurrency` 这些纯函数不变，继续复用）。
  - `<tr>` 开头（第 434 行）加上 `onClick={() => onOpenEdit?.(record)}`，`cursor-pointer` class（参照 `InquiryRow.tsx` 的 `group cursor-pointer` 写法，注意保留现有 `getOrderRowBgClass(record)` 背景色逻辑）。批量选择 checkbox 那一格（第 438-448 行）已经有 `onClick={(e) => e.stopPropagation()}`，不用改。
  - "订单编号+询价编号"那一格（第 450-467 行）目前自己也有 `role="button"`/`onClick={() => onOpenEdit?.(record)}`——这次改成 tr 级点击后，这一格自己的 `role`/`tabIndex`/`onClick`/`onKeyDown`/`cursor-pointer` 都可以去掉（避免和 tr 的点击重复触发两次 `onOpenEdit`），只保留 `title` 提示文案和内容展示。
  - "执行情况"单元格（第 530-544 行）不再渲染 `DeliveryStatusCell`（`editing` 分支），改成内联只读展示（状态文字 + 收货人，参照 `DeliveryStatusCell.tsx` 第 163-183 行"非 editing"分支的 JSX/class，去掉交互部分），文件顶部 `import { DeliveryStatusCell } from './DeliveryStatusCell';` 也去掉。
  - `OrderRowProps` 里的 `onUpdate: (patch: Partial<InquiryRecord>) => void` 不再被用到（所有 patch 现在都走弹窗自己的 `onSave`），删掉这个 prop 和函数体里对应的解构；`OrderTable.tsx` 渲染 `<OrderRow>` 那里（第 300-313 行附近）去掉 `onUpdate={(patch) => onUpdate(record.id, patch)}` 这一行传参（`OrderTable` 自己的 `onUpdate` prop 不用动，弹窗的 `onSave` 还在用）。

**验收标准：**

- 订单状态表任何一行的任意单元格（交货日期、确认日期、客户订单号、执行情况、金额、回款月份、到账金额）点击后都不再出现行内输入框/原生日期选择器，而是打开"编辑订单"弹窗，且弹窗里对应字段的当前值正确。
- 点击行内任意位置（不含批量选择 checkbox）只触发一次 `onOpenEdit`，不会重复弹出/重复触发。
- 批量选择 checkbox 继续正常工作，点击 checkbox 不会同时打开弹窗。
- 善后 S/S-OK 徽标、行背景色（`getOrderRowBgClass`）等既有只读展示逻辑不受影响。
- 弹窗内编辑保存后，表格对应单元格立刻显示新值（这条本来就该成立，因为弹窗保存路径没变，只是确认一下没有回归）。

**Non-goals / 红线：**

- 不改 `OrderEditModal.tsx`，它已经覆盖所有字段，不需要新增。
- 不改 `DeliveryStatusCell.tsx` 这个共享组件文件本身（`PurchaseOrderRow.tsx` 目前还在用它，TASK-176 会处理那边；这个组件到 TASK-176 完成后如果彻底没人用了，由 TASK-176 里统一判断是否要删除导出，这个任务不要动它）。
- 不改批量选择、排序（`onSortToggle`）、断点响应式列显隐（`orderTableLayout.ts`）逻辑。
- 不改 D1/worker 相关代码，这次纯前端交互调整。

**测试与验证：**

- `npx tsc --noEmit`、改动文件 ESLint。
- `OrderRow.test.tsx` 现有用例大量依赖原生日期/月份选择器的行内编辑交互（`screen.getAllByLabelText('选择日期')` 等），这些用例需要整体重写成"点击行触发 `onOpenEdit`"的断言，参照 TASK-173 里 `PurchaseOrderRow.test.tsx` 的写法（渲染 + `fireEvent.click`/`keyDown` on `<tr>` 或某个单元格，断言 `onOpenEdit` 被调用、且没有出现 `input`/`select`）。善后 S/S-OK 徽标和行背景色两个既有用例应该继续通过，不用改。
- 手动测试：桌面宽度下点开订单状态表任意一行，确认弹窗打开且字段齐全；勾选批量选择 checkbox 不触发弹窗；金额/回款月份/到账金额（需要财务权限账号）显示正确。

**Status:** completed（2026-07-15）

**完成说明：** 订单状态表 7 个字段已全部改为只读展示，点击任意业务单元格统一打开“编辑订单”弹窗；原生日期/月选择器及行内文本、金额、执行情况编辑状态均已删除。批量 checkbox 继续阻止冒泡，C/P/S 与 S-OK 展示保持不变。

## TASK-175：采购部登记去掉"内容描述"行内编辑

**状态：** completed（2026-07-15）

**背景：** 与 TASK-174 同一批需求的第二部分。采购部登记（`/purchase-registration`）的 `PurchaseRegistrationRow.tsx` 其实已经是"点击整行打开编辑弹窗"模式了（`<tr onClick={() => onEditRecord(record)}>`），**唯一的例外**是"内容描述"这一格自己 `onClick={(e) => e.stopPropagation()}` 挡住冒泡、改成行内 `EditableText` 编辑。"编辑询价"弹窗（`PurchaseInquiryEditModal.tsx`）里本来就已经有"内容描述"这个可编辑输入框（`localDescription` state，第 117-129 行），所以这次同样是纯粹的"拿掉行内入口"，不需要新增弹窗字段。

**Files in scope：**

- `src/features/purchase-registration/components/PurchaseRegistrationRow.tsx` —
  - 删除本文件内定义的 `EditableText` 组件（第 12-61 行，注意这是这个文件自己的一份定义，跟 `PurchaseOrderRow.tsx` 里已经在 TASK-173 删掉的那个同名组件是两回事，互不影响）、`EditField` 类型、`activeField`/`setActiveField`。
  - "内容描述"单元格（第 116-129 行）：去掉 `onClick={(e) => e.stopPropagation()}`，把 `EditableText` 换成纯只读展示（参照它"非 editing"分支的 JSX/class，去掉交互部分），值用 `record.description`，为空时展示"内容描述"占位文案（灰色，和其它空值单元格一致）。
  - `PurchaseRegistrationRowProps` 里的 `onUpdate: (patch: Partial<InquiryRecord>) => void` 不再被用到，删掉这个 prop 和函数体解构；`PurchaseRegistrationTable.tsx` 渲染 `<PurchaseRegistrationRow>` 那里（第 88 行）去掉 `onUpdate={(patch) => onUpdate(record.id, patch)}` 这一行；`PurchaseRegistrationTable.tsx` 自己的 `onUpdate` prop（interface 第 14 行、解构第 39 行）确认没有其它用途后一并删掉；`PurchaseRegistrationPage.tsx` 渲染 `<PurchaseRegistrationTable>` 那里（第 248 行附近）去掉 `onUpdate={(id, patch) => patchRecordForView(id, patch)}` 这一行传参——**注意 `patchRecordForView` 本身不要删**，它同一个 Page 里第 256 行的弹窗 `onSave={(id, patch) => patchRecordForView(id, patch)}` 还在用。

**验收标准：**

- 采购部登记表"内容描述"单元格点击后不再出现行内输入框，而是（跟点这一行其它地方一样）打开"编辑询价"弹窗，弹窗里能正常编辑内容描述并保存，保存后表格立刻显示新值。
- 点击行内任意位置只触发一次打开弹窗，不重复。
- "询报价状态"预览列（`InquiryQuoteStatusDisplay`）、状态徽标列的展示和点击行为不受影响（它们本来就不是行内可编辑的，这次不用动）。

**Non-goals / 红线：**

- 不改 `PurchaseInquiryEditModal.tsx`，它已经有内容描述字段。
- 不改 `InquiryQuoteStatusDisplay` 组件（询报价状态预览，跟这次的"内容描述"字段无关）。
- 不改采购部登记的筛选、供应商关联等其它逻辑。

**测试与验证：**

- `npx tsc --noEmit`、改动文件 ESLint。
- `PurchaseRegistrationTable.test.tsx` 现有用例如果断言了"内容描述"行内可编辑交互，同步更新为"点击打开弹窗"；如果没有直接测到这部分可以补一条。
- 手动测试：点击采购部登记任意一行（含"内容描述"格）都能打开弹窗，弹窗里改内容描述保存后表格同步更新。

**Status:** completed（2026-07-15）

**完成说明：** 采购部登记“内容描述”已取消独立行内输入，点击该格与其它格一致打开“编辑询价”弹窗；`PurchaseRegistrationRow` → Table → Page 的无用 `onUpdate` prop 链已清理，弹窗保存路径保持不变。

## TASK-176：采购订单表收尾——去掉剩余行内编辑，改成点击整行打开弹窗

**状态：** completed（2026-07-15）

**背景：** TASK-173 已经把"供应商"和"采购单号"改成点击对应单元格打开"编辑采购订单"弹窗，但用的是单元格级 `onClick`，不是整行点击；"金额""交货日期""执行情况"这三个字段目前还是行内编辑（本文件内定义的 `AmountEditCell`/`DateEditCell` + 共享组件 `DeliveryStatusCell`）。这个任务收尾：把剩下三个字段的行内编辑也拿掉，并把点击目标从"几个单独的单元格"统一收敛成"整行"，跟询报价登记 `InquiryRow.tsx` 的模式完全一致。`PurchaseOrderEditModal.tsx` 已经覆盖交货日期、执行情况、金额这三个字段（TASK-173 之前就有），不需要新增弹窗字段。

**依赖：** 请在 TASK-173 之后做（现在 TASK-173 状态是 completed，可以直接开始）。

**Files in scope：**

- `src/features/purchase-order-registration/components/PurchaseOrderRow.tsx` —
  - 删除 `EditField` 类型、`activeField`/`setActiveField`/`activate`/`cancel`，以及本文件内定义的 `AmountEditCell`、`DateEditCell` 两个组件（连同 props interface）。两者只读分支的 JSX/class 保留、去掉交互部分，内联到"金额""交货日期"两个单元格。
  - "执行情况"单元格不再渲染 `DeliveryStatusCell`（`editing` 分支），改成内联只读展示（参照该组件"非 editing"分支的 JSX/class，去掉交互部分），文件顶部对 `DeliveryStatusCell` 的 import 去掉。
  - `<tr>` 开头加上 `onClick={() => onOpenEdit?.(record)}` + `cursor-pointer`（参照 `InquiryRow.tsx`/TASK-174 改完后的 `OrderRow.tsx`）。
  - "订单编号"、"采购单号"、"供应商"这三个单元格目前各自都有 `role="button"`/`onClick={() => onOpenEdit?.(record)}`（TASK-173 加的），改成 tr 级点击后这三处的 `role`/`tabIndex`/`onClick`/`onKeyDown`/`cursor-pointer` 都去掉，避免和 tr 点击重复触发，只保留 `title`/展示内容。
  - `PurchaseOrderRowProps` 里的 `onUpdate: (patch: Partial<InquiryRecord>) => void` 不再被用到，删掉这个 prop 和解构；`PurchaseOrderTable.tsx` 渲染 `<PurchaseOrderRow>` 那里去掉 `onUpdate={(patch) => onUpdate(record.id, patch)}` 这一行（`PurchaseOrderTable`/`PurchaseOrderRegistrationPage` 自己的 `onUpdate` 不用动，弹窗 `onSave` 还在用）。
- `src/features/order/components/DeliveryStatusCell.tsx` — 这个任务完成后，`OrderRow.tsx`（TASK-174 改完）和 `PurchaseOrderRow.tsx`（本任务）应该都不再 import/渲染 `DeliveryStatusCell` 这个组件本身了（`STATUS_PRESETS` 常量两个弹窗还在用，不能删）。确认这一点后，把 `DeliveryStatusCell` 这个函数组件的导出一并删掉，避免留死代码；如果有专门测试这个组件的测试文件，一并处理（删除或按需保留，视测试内容而定）。**如果 TASK-174 还没完成、`OrderRow.tsx` 仍在用它，这一步先跳过，只做 `PurchaseOrderRow.tsx` 那部分**，不要因为这个任务提前删掉别的表还在用的组件。

**验收标准：**

- 采购订单表任意一行点击后（不管点哪个单元格）都打开"编辑采购订单"弹窗，且只触发一次，不重复。
- "金额""交货日期""执行情况"三个字段不再能行内编辑（无输入框/日期选择器/预设按钮弹出），只读展示正确（含空值占位、`canViewFinancials` 权限门控——没有财务权限时金额列本来就不渲染，这个逻辑不变）。
- 小屏下"采购单号"列隐藏、其它响应式列宽逻辑不受影响。
- 如果 `DeliveryStatusCell` 组件在两张表都不再引用后被删除，`tsc`/eslint 不报错，`STATUS_PRESETS` 仍可正常从该文件导入。

**Non-goals / 红线：**

- 不改 `PurchaseOrderEditModal.tsx`。
- 不改 TASK-173 已经做好的供应商多选、采购单号弹窗编辑的数据逻辑，这次只动"点击目标从单元格收敛到整行"这一层。
- 不要在 `OrderRow.tsx`（TASK-174 范围）还没改完时就删除 `DeliveryStatusCell` 组件导出。

**测试与验证：**

- `npx tsc --noEmit`、改动文件 ESLint。
- `PurchaseOrderRow.test.tsx`（TASK-173 新增）里针对"点击采购单号/供应商单元格各自触发一次 `onOpenEdit`"的用例，改成"点击行内任意单元格都只触发一次"；新增/更新用例覆盖金额、交货日期、执行情况三个格子点击后不出现行内编辑控件、且触发 `onOpenEdit`。
- 手动测试：桌面和小屏下分别点开采购订单表任意一行，确认弹窗打开、字段齐全，行内不再有任何可编辑控件。

**Status:** completed（2026-07-15）

**完成说明：** 采购订单表金额、交货日期、执行情况已取消行内编辑，订单编号、采购单号、供应商等全部单元格统一由整行点击打开“编辑采购订单”弹窗；小屏采购单号隐藏和金额权限门保持不变。已无调用方的 `DeliveryStatusCell` 组件删除，弹窗仍需的 `STATUS_PRESETS` 移至独立 `deliveryStatusPresets.ts`。

## TASK-177：采购部登记编辑弹窗——手动录入供应商名称自动建档并关联

**背景：** 采购部登记"编辑询价"弹窗（`PurchaseInquiryEditModal.tsx`）里的"供应商"输入框，复用的是询报价登记共享组件 `InquiryQuoteStatus.tsx` 的 `submitSupplier()`（第 186-205 行）。它允许从 datalist 选已有采购供应商主档（带上 `purchaseSupplierId`），也允许直接手动输入一个不在候选列表里的新名字（这时 `purchaseSupplierId` 留空，只存 `supplierShortName` 纯文本）。这类未关联主档的记录已经有一套"待关联供应商"识别机制（`PurchaseRegistrationPage.tsx` 的 `recordMatchesSupplierLink`，第 33-40 行；`SupplierStatusTag` 的"未关联"提示），但目前只能提示、不能自动补上——用户得额外跑一趟"采购供应商"页面手动新建再回来选择，容易漏做。这次把"手动输入新名字保存后自动在采购供应商建档并关联"补上，去掉这道额外步骤。

**Files in scope：**

- `src/features/inquiry/components/InquiryQuoteStatus.tsx` — `InquiryQuoteStatusProps` 新增可选 prop `onEnsurePurchaseSupplier?: (name: string) => Promise<{ id: string; name: string } | undefined>`（放在 `supplierOptions` prop 附近，第 36 行后，注释写清楚只有采购部登记场景会传入，询报价登记场景不传、行为不变）；`submitSupplier()` 改成 async 函数（第 186-205 行），当 `payload.purchaseSupplierId` 没有通过 datalist 精确匹配设置、且 `payload.supplierShortName` 非空、且外部传入了 `onEnsurePurchaseSupplier` 时，await 调用它，返回值带 `id` 就写入 `payload.purchaseSupplierId`；触发点（"确认"按钮 `onClick`、`onKeySupplier` 里的 Enter）要能正确处理这个函数变成 async 后的行为，不需要额外 loading UI。
- `src/features/purchase-registration/components/PurchaseInquiryEditModal.tsx` — 给 `<InquiryQuoteStatus>`（第 156-173 行）新增 `onEnsurePurchaseSupplier` 实现：trim 后的 name 先用 `fetchPurchaseSuppliers({ userId, canRead, search: name, limit: 10 })`（`src/features/purchase-supplier/services/purchaseSupplierService.ts`）查一次，结果里按 `(shortName || name).trim().toLowerCase() === name.trim().toLowerCase()` 精确匹配（不是模糊匹配），命中就返回 `{ id, name: shortName || name }`；没命中则调用 `savePurchaseSupplier({ name, shortName: name, contacts: [], data: {} })` 新建一条主档（`PurchaseSupplierInput` 要求 `contacts`/`data` 必填，见 `src/features/purchase-supplier/types/index.ts` 第 33-41 行），返回新建结果的 `{ id, name: shortName || name }`；`userId`/`canRead` 用本文件新增 import 的 `usePurchaseSupplierAccess()`（参照 `PurchaseSupplierPicker.tsx` 第 5、30 行用法）；缺少读写权限或接口报错时返回 `undefined`，让 `submitSupplier()` 按"仍保存但不关联"兜底，不阻塞保存、不弹错误提示（比照 `PurchaseRegistrationPage.tsx` 第 81 行"主数据不可用时仍可编辑历史自由文本"的容错风格）。

**验收标准：**

- 在"编辑询价"弹窗点"+ 供应商"，手动输入一个采购供应商主档里不存在的名字并保存：保存后该记录 `purchaseSupplierStatuses` 对应条目带上了新的 `purchaseSupplierId`；打开"采购供应商"列表页能看到新增的一条同名记录。
- 输入的名字如果和某条现有主档的 `name` 或 `shortName` 完全一致（忽略首尾空格、大小写），保存后关联到那条已有主档的 id，不重复新建。
- 从 datalist 下拉选择已有供应商（原有行为）不受影响，仍直接带 id，不会多打一次查重请求。
- 询报价登记页面（客户管理供应商库场景，不传 `onEnsurePurchaseSupplier`）的供应商输入行为不变。
- 无采购供应商读写权限、或接口请求失败时，供应商状态仍保存成功（不带 `purchaseSupplierId`，与当前行为一致），不阻塞弹窗保存、不出现未处理的 Promise 报错。

**Non-goals / 红线：**

- 不改 `purchase-suppliers` worker 端点（`src/worker.ts` 的 `handleCreatePurchaseSupplier` 等）、不加服务端按名称去重的唯一约束——查重逻辑放客户端这一层，服务端契约不变。
- 不批量回填历史记录里已存在的、没有 `purchaseSupplierId` 的 `purchaseSupplierStatuses`——这次只处理"新保存"这一刻的行为，历史数据批量修复不在本任务范围。
- 不动询价同步/合并层（`inquiry.store`、`useInquirySync`）。

**测试与验证：**

- `npx tsc --noEmit`
- `npx eslint src/features/inquiry/components/InquiryQuoteStatus.tsx src/features/purchase-registration/components/PurchaseInquiryEditModal.tsx`
- `PurchaseInquiryEditModal.test.tsx`、`InquiryQuoteStatus` 相关测试（如存在）跑通；新增至少一条用例覆盖"手动输入新名字保存后 `onEnsurePurchaseSupplier` 被调用且返回的 id 写回 payload"。
- 手动测试：按验收标准五条场景各跑一遍（含无权限/接口失败场景，可临时改权限或断网模拟）。

**Status:** completed（2026-07-16）

**完成说明：** 采购部登记弹窗自由输入供应商时新增客户端精确查重与自动建档，成功后把主档 ID 写回本次状态；无权限或接口失败继续保存自由文本，不阻塞编辑。

## TASK-178：采购部登记表按主档 purchaseSupplierId 现查供应商名字展示（主档改名同步显示）

**依赖：** 建议在 TASK-177 之后做——需要先有 `purchaseSupplierId` 才有东西可以关联展示；TASK-177 完成前也可以用后台已有 `purchaseSupplierId` 的旧记录验证展示逻辑，但正式验收以 TASK-177 完成后端到端为准。

**背景：** TASK-177 让新录入的供应商名字能自动关联 `purchaseSupplierId`，但已关联记录目前展示用的都是保存那一刻写死的 `supplierShortName` 快照（`SupplierStatusTag.tsx` 第 16-18 行、`InquiryQuoteStatusDisplay.tsx` 第 22-26 行都直接读这个字段）。之后如果有人在"采购供应商"页面把某条主档改名，已关联的历史询价记录不会跟着变——改的是主档表 `PurchaseSupplier`，不会触碰 Inquiry 表里几万条 `purchaseSupplierStatuses` JSON 快照。项目 memory 记录过询价同步层很脆弱（幽灵记录、受限视图整条覆盖、pending 保护不对称等历史 bug），批量改写每条历史 inquiry 记录风险很高，不走"改名时批量回写快照"的路子。这次改成"展示时用 `purchaseSupplierId` 现查主档当前名字"，不改快照本身、不碰同步层。

**Files in scope：**

- `src/features/purchase-registration/app/PurchaseRegistrationPage.tsx` — 已在第 64、79-83 行拉取 `purchaseSuppliers: PurchaseSupplier[]`；新增一个 `useMemo` 转成 `Map<string, string>`（id → `shortName || name`），命名 `purchaseSupplierNameById`；分别传给第 246-249 行的 `<PurchaseRegistrationTable>` 和第 252-257 行的 `<PurchaseInquiryEditModal>`（各新增一个 prop）。同时顺带解决"供应商"筛选下拉新旧名字并存的问题：
  - 顶部"供应商"筛选下拉（`secondarySelect`，第 229-237 行）用的候选列表 `supplierOptions`（第 122-132 行，目前直接收集历史 `supplierShortName` 原始文本）改成：对每条 `purchaseSupplierStatuses`，如果有 `purchaseSupplierId` 且能在 `purchaseSupplierNameById` 里查到，取查到的当前名字；查不到（未关联的历史自由文本）保留原始 `supplierShortName`；再统一去重排序。这样改名后旧名字不会作为独立选项残留。
  - `recordMatchesSupplier`（第 23-31 行，模块级导出函数）在没有 `supplierId`、只按字符串 `supplier` 匹配那个分支（第 28-30 行）里，同样要把每条状态先解析成"有 id 就用 `purchaseSupplierNameById` 查当前名字，没有就用原始 `supplierShortName`"，再跟 `supplier` 比较，而不是直接比较原始存储值——否则筛选下拉选了新名字之后，反而找不到那些数据库里还存着旧名字快照的历史记录。给这个函数新增一个可选参数 `nameById?: Map<string, string>`，调用处（第 149、169 行 `supplierFilteredBase`/`finalRecords` 的 `.filter`）都要把 `purchaseSupplierNameById` 传进去；该函数已有测试（如有）需要同步更新调用签名。
- `src/features/purchase-registration/components/PurchaseRegistrationTable.tsx` — `PurchaseRegistrationTableProps` 新增 `purchaseSupplierNameById: Map<string, string>`，透传给第 84-88 行渲染的 `<PurchaseRegistrationRow>`。
- `src/features/purchase-registration/components/PurchaseRegistrationRow.tsx` — 新增同名 prop，构造 `previewRecord`（第 20-24 行）时，把 `purchaseSupplierStatuses` 里每一条有 `purchaseSupplierId` 且能在 map 里查到值的条目，`supplierShortName` 替换成 map 查到的当前名字（查不到、或没有 `purchaseSupplierId` 的条目保持原样，兼容历史自由文本数据）。
- `src/features/purchase-registration/components/PurchaseInquiryEditModal.tsx` — `PurchaseInquiryEditModalProps` 新增同名 prop；构造 `shimRecord`（第 53-56 行）之前，对用于展示的 `localSuppliers` 副本做同样替换。**注意**：这一步只影响传给 `InquiryQuoteStatus` 用于显示的数据，`handleSave`（第 77-94 行）里 `patch.purchaseSupplierStatuses = localSuppliers` 必须继续使用未做展示替换的原始 `localSuppliers`，否则会把"当前主档名字"错误固化成新快照，违背这次"不改快照本身"的前提。

**验收标准：**

- 在"采购供应商"页面把一条已有主档的简称或全称改掉并保存后，不刷新页面直接返回"采购部登记"表格页，任何之前关联到这条主档（`purchaseSupplierId` 匹配）的询价记录，在表格行预览（询报价状态列）和"编辑询价"弹窗里显示的都是改名后的新名字。
- 没有关联 `purchaseSupplierId` 的历史自由文本供应商条目，展示行为不受影响，仍显示原来存的 `supplierShortName`。
- 打开"编辑询价"弹窗、不做任何修改直接点"保存修改"，`purchaseSupplierStatuses` 里已关联条目的 `supplierShortName` 字段值保持原样、不被替换成新名字——用来验证"仅展示时替换，不改实际存储数据"这条红线。
- 询报价登记（`/inquiry`）页面的供应商展示逻辑不受影响，新 prop 只加在采购部登记这几个组件上，不会传给询报价登记复用的 `InquiryQuoteStatusDisplay`/`SupplierStatusTag` 调用点。
- 改名前后，采购部登记表顶部"供应商"筛选下拉里同一家供应商只出现一个（当前）名字，不会新旧名字并存成两条选项；选中新名字后，之前用旧名字保存的历史记录（只要 `purchaseSupplierId` 关联到这家供应商）也能被正确筛出来，不会因为存储的是旧名字快照而漏筛。
- 没有关联 `purchaseSupplierId` 的历史自由文本供应商，筛选下拉行为不受影响，仍按原始 `supplierShortName` 出现和匹配。

**Non-goals / 红线：**

- 不批量回写 D1 里任何一条 inquiry 记录的 `purchaseSupplierStatuses` 快照——这是本任务存在的前提，不要为了省事改成保存时顺带更新快照。
- 不改 `inquiry.store`、`useInquirySync`、任何合并/同步逻辑。
- 不改 `SupplierStatusTag.tsx`、`InquiryQuoteStatusDisplay.tsx` 本身的 props/渲染逻辑——替换发生在调用方传入的 record 数据里（"影子记录"模式，参照本文件已有的 `previewRecord`/`shimRecord` 写法）。
- 不改 `InquiryFilterBar.tsx` 的 `SecondarySelectConfig` 类型（`options: string[]`）——沿用字符串选项，不改成 id+name 结构，避免影响询报价登记页面对同一个共享组件的用法。
- 不动"采购订单"模块（`src/types/purchase.ts` 的 `PurchaseOrderData.supplierName`）——那是单据创建时的标准名称快照，按设计不随主档改名变化，不在本任务范围内。
- 不实现"改名时通知/提醒"等额外功能，只做展示层现查。

**测试与验证：**

- `npx tsc --noEmit`
- `npx eslint` 改动的 4 个文件
- `PurchaseInquiryEditModal.test.tsx`、`PurchaseRegistrationRow`/`PurchaseRegistrationPage` 相关测试（如存在）跑通；新增用例覆盖：(a) 传入 `purchaseSupplierNameById` 后 unlinked 条目和 linked 条目分别的展示名字；(b) 保存后传给 `onSave` 的 patch 里 `supplierShortName` 未被替换；(c) `recordMatchesSupplier` 传入 `nameById` 后，按解析后的新名字筛选也能命中存储的是旧名字快照的记录；(d) 筛选下拉 `supplierOptions` 去重后同一供应商只出现一次当前名字。
- 手动测试：按验收标准六条场景各跑一遍，包括在"采购供应商"页面改名后回到"采购部登记"页面检查筛选下拉候选项。

**Status:** completed（2026-07-16）

**完成说明：** 采购部登记表、编辑弹窗和供应商筛选改为按 `purchaseSupplierId` 解析主档当前名称；主档改名后展示与筛选同步更新，未关联自由文本和历史名称快照保持不变。

## TASK-179：采购订单表"编辑采购订单"弹窗——精简只读信息区，收紧可编辑区栅格

**背景：** 用户反馈"编辑采购订单"弹窗（`PurchaseOrderEditModal.tsx`）顶部只读信息区字段太分散、每项各占半行，其中"客户询价编号"对采购订单场景是冗余的——弹窗下方本来就已经展示"客户订单号"，同一份含义在采购流程里没必要出现两次。同时可编辑区"交货日期""执行情况""采购金额"三个字段目前各自独占一整行，用户希望收紧成一行三列。项目里已经有现成的三列一行写法可以参照：`src/features/order/components/OrderEditModal.tsx` 第 412-430 行的"金额/回款月份/到账金额"（`grid gap-3 sm:grid-cols-3`），这次照同样的模式改。

**Files in scope：**

- `src/features/purchase-order-registration/components/PurchaseOrderEditModal.tsx` —
  - 只读信息区（第 202-250 行 `<dl>`）：删除"客户询价编号"这一项（第 213-218 行）。把原本 `sm:grid-cols-2` 的单一 `<dl>` 拆成两个 `grid-cols-1 sm:grid-cols-3` 的分组行（`<dl>` 可以嵌套 `<div>` 分组，不影响语义，不需要拆成多个 `<dl>`）：第一行三列依次是"订单编号""询价编号""联络人"（分别是现有第 203-208、209-212、219-222 行的 dt/dd，内容和样式原样保留，只改分组结构）；第二行三列依次是"内容描述""客户订单号""确认日期"（分别是现有第 223-228、233-238、229-232 行的 dt/dd，**注意顺序和现有源码不同**，需要重新排成"内容描述→客户订单号→确认日期"）。"订单状态标记"条件块（第 239-249 行，原 `sm:col-span-2`）放在这两行分组之后单独一行，不受 3 列限制，条件渲染逻辑和样式不变。
  - 可编辑区（第 261-380 行）：把"交货日期"（`<DateField>`，第 309 行）、"采购金额"（第 358-379 行 `canViewFinancials` 条件块）、"执行情况"（第 311-356 行）三个字段合并进同一个响应式栅格，顺序为 交货日期 → 采购金额 → 执行情况。按用户追加要求，桌面宽度为 25% / 25% / 50%，小屏日期和金额各占半行、执行情况独占下一行；没有 `canViewFinancials` 权限时，桌面为约 1/3 / 2/3，小屏纵向堆叠。三个字段现有内部结构和交互保持不变。
  - 顶部"采购单号"/"供应商"那组 `grid gap-3 sm:grid-cols-2`（第 261-307 行）不受影响，保持原样。

**验收标准：**

- 打开"编辑采购订单"弹窗，只读信息区不再显示"客户询价编号"。
- 只读信息区第一行同一行内依次显示"订单编号""询价编号""联络人"三项；第二行同一行内依次显示"内容描述""客户订单号""确认日期"三项；有"订单状态标记"时仍在这两行下方单独一行展示，样式（红色字体等）不变。
- 可编辑区在桌面宽度下按“交货日期 25% / 采购金额 25% / 执行情况 50%”展示；无财务权限时按约 1/3 / 2/3 展示，不留下明显错位或报错。
- 小屏幕（`sm` 断点以下）只读分组退化为单列；交货日期与采购金额同一行各占一半，执行情况独占下一行，且不出现横向溢出。无财务权限时两个字段纵向堆叠。
- 原有编辑/保存逻辑（`handleSave`、`buildPurchaseOrderDirtyPatch`）不受影响，字段值和保存行为与改版前一致，只是布局变化。

**Non-goals / 红线：**

- 不改这些字段的数据来源、可编辑/只读归属（哪些字段能编辑、哪些只读要跳转到订单状态表编辑的规则不变）。
- 不改"供应商"多选、`PurchaseSupplierPicker`、执行情况预设按钮/收货人下拉的交互逻辑本身，只调整外层容器的栅格布局。
- 不动 `src/features/order/components/OrderEditModal.tsx`（订单状态表自己的编辑弹窗），只是参考它的三列写法，不修改它本身。
- 不改询价/订单状态表联动逻辑或 `buildPurchaseOrderDirtyPatch`。

**测试与验证：**

- `npx tsc --noEmit`
- `npx eslint src/features/purchase-order-registration/components/PurchaseOrderEditModal.tsx`
- 现有测试（如 `PurchaseOrderEditModal.test.tsx` 若存在）跑通，如果测试里对只读信息区字段顺序/结构有强断言，同步更新。
- 手动测试：桌面宽度和小屏宽度下各打开一次"编辑采购订单"弹窗，核对以上验收标准五条；有/无财务权限账号各测一次。

**Status:** completed（2026-07-16）

**完成说明：** 已移除“客户询价编号”，按规格重排只读信息；编辑区最终采用桌面 25% / 25% / 50%，小屏“交货日期 + 采购金额”同行、“执行情况”下一行的布局。无财务权限分支同步适配，保存与字段交互逻辑未改。

## TASK-180：订单状态表"编辑订单"弹窗——精简只读信息区，重排客户订单号/执行情况与金额相关字段

**背景：** 跟 TASK-179 是同一批 UI 收紧诉求，这次是订单状态表自己的"编辑订单"弹窗（`src/features/order/components/OrderEditModal.tsx`，跟 TASK-179 改的采购订单表 `PurchaseOrderEditModal.tsx` 是两个独立文件，互不影响）。只读信息区要去掉冗余的"客户询价编号"；可编辑区原本"金额/回款月份/到账金额"独立一行三列（第 412-430 行），这次要拆开，金额挪去跟"客户订单号"同一行、回款月份和到账金额挪去跟"执行情况"同一行，并且各自按指定比例分栏。

**Files in scope：**

- `src/features/order/components/OrderEditModal.tsx` —
  - 只读信息区（第 313-340 行 `<dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">`）：删除"客户询价编号"这一项（第 324-329 行，`sm:col-span-2`）。删除后剩余"订单编号""询价编号""联络人""内容简述"四项自然落入原有 `sm:grid-cols-2` 两行两列，不需要额外调整分组结构。
  - "客户订单号"（现第 355-363 行独占一行的输入框）与"金额"（现在第 414-420 行的 `AmountField`，属于第 412-430 行 `canViewFinancials &&` 区块的一部分）合并到同一行：新建 `<div className="grid gap-3 sm:grid-cols-4">` 容器放在原"客户订单号"所在位置（交货/确认日期那一行之后），"客户订单号"输入框外层包 `sm:col-span-3`（占 75% 宽），"金额" `AmountField` 外层包 `sm:col-span-1`（占 25% 宽）且继续保持 `canViewFinancials &&` 条件渲染——没有财务权限时这一格不渲染，"客户订单号"仍保持 `sm:col-span-3`，不自动占满整行，栅格留空即可，不需要额外补位逻辑。
  - "执行情况"（现第 364-410 行，含输入框、预设按钮行、条件收货人下拉，整块结构不变）与"回款月份"（`MonthField`，现第 421 行）、"到账金额"（`AmountField locked`，现第 422-428 行）合并到同一行：新建 `<div className="grid gap-3 sm:grid-cols-4">` 容器放在原"执行情况"所在位置，"执行情况"整块外层包 `sm:col-span-2`（占 50% 宽，内部结构不变，只是整体收窄），"回款月份""到账金额"各自外层包 `sm:col-span-1`（各占 25% 宽），这两项继续整体包在 `canViewFinancials &&` 条件里——没有财务权限时这两格都不渲染，"执行情况"仍保持 `sm:col-span-2`，不自动占满整行。
  - 原第 412-430 行那个独立的"金额/回款月份/到账金额"三列一行 `canViewFinancials` 区块整体删除（三个字段已分别挪到上面两行里，不要留重复渲染）。
  - "交货日期"/"确认日期"那一行（第 351-354 行 `grid gap-3 sm:grid-cols-2`）不受影响，位置和布局保持不变。

**验收标准：**

- 打开"编辑订单"弹窗，只读信息区不再显示"客户询价编号"。
- 有财务权限时：同一行内"客户订单号"明显更宽（约 75%）、"金额"约 25%；另一行内"执行情况"占约 50%、"回款月份""到账金额"各占约 25%。
- 没有财务权限时：那一行只显示"客户订单号"（不自动占满整行），另一行只显示"执行情况"（不自动占满整行），"金额""回款月份""到账金额"三项均不渲染，不报错、不留下明显错位。
- 小屏幕（`sm` 断点以下）上述两行都退化为单列纵向堆叠，不出现横向溢出。
- "交货日期""确认日期"那一行的位置、布局、逻辑不受影响。
- 原有保存逻辑（`handleSave`）不受影响，字段值和保存行为与改版前一致，只是布局变化。

**Non-goals / 红线：**

- 不改这些字段的数据来源、可编辑范围、`canViewFinancials` 权限门控的判定逻辑本身，只调整判断结果之后"渲染成几列、占多宽"这一层。
- 不改"执行情况"预设按钮、收货人下拉的交互逻辑本身。
- 不动"订单状态标记"区块（第 433-505 行）和撤销C/悬挂P/善后S 相关逻辑。
- 不动 `src/features/purchase-order-registration/components/PurchaseOrderEditModal.tsx`（TASK-179 范围的采购订单表弹窗）——这是订单状态表自己的弹窗，两者相互独立，不要把改动混到一起。
- 不改 `AmountField`/`MonthField`/`DateField` 这几个内部辅助组件本身的 props/实现，只调整调用方外层容器的 class。

**测试与验证：**

- `npx tsc --noEmit`
- `npx eslint src/features/order/components/OrderEditModal.tsx`
- 现有测试（如 `OrderEditModal.test.tsx` 若存在）跑通，如果测试里对只读信息区字段结构、或金额/回款月份/到账金额的分组结构有强断言，同步更新。
- 手动测试：桌面宽度和小屏宽度下各打开一次"编辑订单"弹窗，核对以上验收标准；有/无财务权限账号各测一次。

**Status:** completed（2026-07-16）

**完成说明：** 已移除“客户询价编号”，并将客户订单号/金额重排为 75% / 25%，执行情况/回款月份/到账金额重排为 50% / 25% / 25%；小屏只读区按订单编号/联络人、询价编号/内容简述两组同排，交货日期/确认日期同排，金额/回款月份/到账金额三等分同排。无财务权限分支保留指定跨度，字段交互、权限判断和保存逻辑未改。

## TASK-181：管理后台"用户详情"弹窗布局调整——开关挪顶部 + 去提示语 + 登记表分两列

**背景：** `src/features/admin/components/UserDetailModal.tsx` 当前布局：顶部只有用户信息+关闭按钮；下方独立一个"账户设置"分区放管理员/账户两个开关；再下方"模块权限"区域，isAdmin 为 true 时会多出一条蓝色提示"管理员身份只控制后台管理入口，业务模块仍按以下开关授权"；"登记表"分类框内两个父模块（`inquiry` 询报价登记表/订单状态表、`purchaseRegistration` 采购部登记/采购订单表）目前用通用的 `grid-cols-2 sm:grid-cols-3` + 有子开关的模块 `col-span-2 sm:col-span-3` 撑满整行，导致两个父模块及各自子开关整体纵向堆叠占用大量竖向空间。这次是纯布局调整，不改权限数据/开关逻辑。

**Files in scope：**

- `src/features/admin/components/UserDetailModal.tsx` —
  - **头部（第 129-148 行 用户信息头）：** 在关闭按钮（第 141-147 行）左侧、用户名/邮箱信息块（第 135-140 行）右侧，插入管理员开关和账户开关。两个开关复用已有 `Toggle` 组件（第 22-40 行）和图标（`Shield`/`Power`，已从 lucide-react 引入），做成图标+开关的紧凑组合（不需要保留"管理员"/"账户"/"是否/启用禁用"文字标签，用 `title` 属性承载提示文案），例如每个用 `<div className="flex items-center gap-1.5" title="管理员">`包裹图标和 `Toggle`。管理员开关沿用原有 `disabled={isBusy || isCurrentUser}` 及 `title={isCurrentUser ? '不能修改自己的管理员身份，请让其他管理员操作' : '管理员'}` 逻辑；账户开关沿用 `disabled={isBusy}`。两组开关之间、以及和关闭按钮之间用 `gap-3` 或 `gap-4` 隔开，整体 `shrink-0`，避免用户名过长时被挤压（用户名区保持 `min-w-0 flex-1` 不变）。
  - **删除"账户设置"整个分区（第 160-196 行 `<section>...</section>`）：** 该分区连同其标题"账户设置"和内部两个开关卡片一并移除，因为开关已经挪到头部；不要留空的 section 容器。
  - **删除模块权限提示条（第 215-219 行）：** 即 `{isAdmin && (<p className="mb-3 ...">管理员身份只控制后台管理入口，业务模块仍按以下开关授权</p>)}` 整块删除。"模块权限"标题和"重置"按钮那一行（第 200-213 行）不受影响。
  - **"登记表"分类改两列布局：** 在分类渲染循环（第 221-279 行 `CATEGORY_ORDER.map`）中，`category === 'registration'` 时改用不同的内层网格：外层容器改成 `grid grid-cols-1 gap-3 sm:grid-cols-2`（替代第 238 行原本通用的 `grid grid-cols-2 gap-2 sm:grid-cols-3`，仅对 registration 分类生效，其它分类保持原网格不变）；每个父模块（`inquiry`、`purchaseRegistration`）各占一列，列内部结构不变——父开关（`PermissionToggle`）在上，子开关（`advancedFeatures`）紧跟在下（第 255-272 行子开关渲染逻辑不变，含 `mt-1.5 grid grid-cols-1 gap-1.5 border-l-2 pl-3 sm:grid-cols-2`）。删除第 246 行专门给 `hasAdvanced` 模块加的 `col-span-2 sm:col-span-3` 撑满整行逻辑（对 registration 分类而言，因为现在就是要占一列不是整行；其它分类目前没有 `hasAdvanced` 模块，可保留原 `hasAdvanced ? 'col-span-2 sm:col-span-3' : undefined` 逻辑不动，只需确保 registration 分类走独立的渲染分支）。
  - 结果：`inquiry` 一列（父开关"询报价登记表 / 订单状态表" + 子开关"批量编辑/导入导出"、"订单金额/回款/到账金额"两行），`purchaseRegistration` 一列（父开关"采购部登记 / 采购订单表" + 子开关"采购订单表金额"），左右并排，小屏（`sm` 以下）退化为单列纵向堆叠。

**验收标准：**

- 打开任一用户详情弹窗：头部右侧、关闭按钮左侧能看到管理员开关和账户开关，无需滚动即可直接操作；两者点击后行为、禁用状态、tooltip 与改版前一致（管理员开关对当前登录用户禁用并提示原因，账户开关在保存/删除中禁用）。
- 内容区不再出现独立的"账户设置"分区标题或卡片。
- "模块权限"标题下方，无论 isAdmin 是否为 true，都不再出现"管理员身份只控制后台管理入口..."提示条；"重置"按钮出现逻辑（`hasChanges` 时显示）不受影响。
- "登记表"分类框内，桌面宽度下"询报价登记表 / 订单状态表"及其两个子开关在左列，"采购部登记 / 采购订单表"及其子开关在右列，左右并排、各自内部父子开关纵向排列；小屏幕（`sm` 断点以下）退化为单列纵向堆叠，不出现横向溢出或错位。
- "单据"、"管理"、"工具"三个分类的网格布局、"单据历史"下方说明文字、每个开关的可点击性均不受影响。
- 保存（`handleSave`）、重置（`handleReset`）、删除（`handleDelete`）等既有交互和权限判定逻辑不受影响，只是这几处元素的位置/分组变了。

**Non-goals / 红线：**

- 不改 `usePermissions` hook、`togglePermission`/`toggleAdmin`/`toggleActive`/`hasChanges`/`resetPermissions` 的实现逻辑。
- 不改 `PermissionToggle` 组件本身的 props/实现。
- 不改 `Toggle` 组件本身的实现（第 22-40 行），头部只是新增两处调用。
- 不改底部操作栏（第 284-326 行 删除用户/取消/保存）的位置和逻辑。
- 不改"单据""管理""工具"三个分类当前的网格结构（保持第 238 行原逻辑，只对 registration 分类分支处理）。
- 不新增权限模块或修改 `src/constants/permissionModules.ts` 里的模块定义。

**测试与验证：**

- `npx tsc --noEmit`
- `npx eslint src/features/admin/components/UserDetailModal.tsx`
- 手动测试：管理后台打开任一用户详情弹窗，桌面宽度下核对头部开关可操作、提示条消失、登记表两列布局；缩小到 `sm` 断点以下核对登记表退化为单列、头部不横向溢出；分别用当前登录用户和其他用户测试管理员开关的禁用/提示行为。

**Status:** completed（2026-07-17）

**完成说明：** 用户详情弹窗的管理员/账户开关已移至用户信息头右侧，独立“账户设置”分区和管理员业务权限提示条已移除；“登记表”分类在桌面改为两个父模块左右分栏，小屏退化为单列。追加当前用户自锁保护：当前登录用户不能停用自己的账户或取消自己的管理员身份，界面与 Next 管理 API 均有防护；其他管理员仍可管理目标账号。

## TASK-182：客户详情页——单客户询价/已报价/订单趋势图

**背景：** 客户详情页（`src/features/customer/app/CustomerDetailPage.tsx`）目前只在 `CustomerInfoCard`（第 281-291 行）里显示两个裸数字——“询价 X”、“订单 Y”（数据来自服务端 `/api/customers/[id]/stats`，见 `customerService.fetchCustomerStats`，第 359-361 行），没有“已报价”数，也没有随时间变化的趋势。首页（`DashboardPage`）已经有一套成熟的“询价/已报价/订单”三线趋势图（`InquiryOrderTrendChart` 组件 + `useInquiryOrderStats` hook + `inquiryStats.ts` 工具函数），数据来源是 `useInquiryStore` 的本地 `records`（客户端现算，不做服务端聚合——见 TASK-110 非目标注释，`src/features/dashboard/hooks/useInquiryOrderStats.ts` 第 34 行）。客户详情页本身已经 `import { useInquiryStore }` 并读取了 `records`（第 117 行 `inquiryRecords`，目前只用于收货人的 `relatedOrders` 过滤，第 254-261 行）。本任务给“客户”类型详情页（`detailType === 'customer'`）新增一个该客户专属的趋势图，直接复用首页那一套组件/算法，按 `customerId` 过滤后传入，不新增任何后端接口。

**Files in scope：**

- `src/features/customer/app/CustomerDetailPage.tsx` —
  - 新增 import：`InquiryOrderTrendChart`（来自 `@/features/dashboard/components/InquiryOrderTrendChart`）、`buildTrendData`/`Granularity`（来自 `@/features/dashboard/utils/inquiryStats`）。
  - 新增 `const [granularity, setGranularity] = useState<Granularity>('month')` 状态（默认“月”）。
  - 新增 `const customerTrendData = useMemo(...)`：过滤 `inquiryRecords`，条件 `record.status !== 'deleted' && record.customerId === customer?.id`，再调用 `buildTrendData(filtered, granularity)`（用默认的 `quotedStatuses` 字段，客户视角）；`customer` 为空时返回 `[]`。
  - 在 `isCustomerDetail && (<CustomerActivityFeed customer={customer} />)`（第 339-341 行）前面插入 `isCustomerDetail && (<InquiryOrderTrendChart visible granularity={granularity} onGranularityChange={setGranularity} data={customerTrendData} title="该客户询价订单统计图" quotedLineLabel="已报价" />)`。只在 `detailType === 'customer'` 时渲染。

**验收标准：**

- 打开任意客户详情页（`/customer/detail?id=...&type=customer`），`CustomerInfoCard` 下方新增折线图区块，标题“该客户询价订单统计图”，右上角有天/周/月/季/年粒度切换（复用 `InquiryOrderTrendChart` 自带按钮，样式与首页一致）。
- 三条线（询价/已报价/订单）数值口径与首页“总询价订单统计图”一致，范围收窄到当前客户（`customerId` 等于当前客户 `id` 的记录）。
- 供应商/收货人详情页不显示该图表（跟随 `CustomerActivityFeed` 同样的 `isCustomerDetail` 条件）。
- 该客户没有任何询价记录时，图表正常渲染为空数据（三条线都是 0），不报错。
- 不影响 `CustomerInfoCard` 里已有“询价 X / 订单 Y”数字展示的数据来源和口径。

**Non-goals / 红线：**

- 不新增/修改任何后端 API（`worker.ts` 里的 `handleGetCustomerStats` 等一律不动），趋势图数据完全来自客户端已有的 `useInquiryStore` records。
- 不改 `CustomerStats` 类型和 `/api/customers/[id]/stats` 接口。
- 不改供应商详情页“使用情况”区块（第 293-305 行）、收货人详情页“收货订单”区块（第 307-337 行）。
- 不改 `InquiryOrderTrendChart`、`buildTrendData` 等首页共用组件/工具函数本身的实现，只新增一处调用。

**测试与验证：**

- `npx tsc --noEmit`
- `npx eslint src/features/customer/app/CustomerDetailPage.tsx`
- 手动测试：分别打开一个有较多历史询价的客户和一个全新客户（无记录）的详情页，核对图表正常显示、粒度切换正常、供应商/收货人详情页不出现该图表。

**Status:** completed（2026-07-17）

**完成说明：** 客户类型详情页已在资料卡下方接入复用的询价/已报价/订单趋势图，按当前客户 `customerId` 过滤非删除记录，默认按月并支持天/周/月/季/年切换；供应商和收货人详情不渲染该图，未改服务端统计接口。

## TASK-183：客户管理页新增“统计分析”视图——全部客户维度统计图表

**背景：** 客户管理页（`src/features/customer/app/CustomerPage.tsx`）目前只有客户/供应商/收货人三个标签（`tabs` 数组，第 238-247 行），纯列表，没有任何跨客户的汇总统计。用户希望在客户管理权限内（该页面已挂在 `useModulePermissionGuard('customer')` 下，第 63 行）看到“所有客户公司”的询价/已报价/订单汇总图表——这样即使某个只有客户管理权限、没有询价权限的用户，也能看到客户维度统计，不必依赖首页仪表盘（`DashboardPage`）那套按 `inquiry` 权限门控的趋势图。数据源同样直接用 `useInquiryStore` 的本地 `records`（客户端现算，不做服务端聚合，与 TASK-182、TASK-110 保持同一原则），页面本身已在第 79 行读取了 `inquiryRecords`，且第 224-231 行已经现成算好了 `categoryCounts`（按 A/B/C/New/Blacklist 统计的客户数量），可以直接复用。

**Files in scope：**

- `src/features/customer/app/CustomerPage.tsx` —
  - 新增独立状态 `const [showStats, setShowStats] = useState(false)`。**不要**把“统计分析”塞进 `TabType`（`'customers' | 'suppliers' | 'consignees'`，定义在 `../types`）或复用 `activeTab`/`viewMode` 状态——`activeTab` 驱动一大串下游逻辑（`activeProfileType`、`handleEdit`/`handleDelete`/`handleSubmit`/`LABEL[activeTab]`/`tabs` 计数等），塞进去会牵连这些分支。用独立的 `showStats` 布尔值控制“列表视图”与“统计分析视图”二选一。
  - 在标签栏（第 274-301 行 `tabs.map(...)`）旁边新增一个独立按钮“统计分析”（图标用 `lucide-react` 的 `BarChart3`），点击切换 `showStats`；视觉上保持和现有标签同样的 `border-b-2` 高亮风格，但不需要并入 `tabs` 数组（那三个标签的数据结构是 `{id: TabType, label, icon, count}`，没有 `count` 字段硬塞会改类型）。
  - `showStats === true` 时：隐藏“新增{LABEL[activeTab]}”按钮（第 258-268 行）、隐藏搜索栏和分类筛选、隐藏列表/卡片视图切换及第 376 行往后的列表内容区，改为渲染 `<CustomerStatsPanel customers={customers} records={inquiryRecords} />`（见下）。`showStats === false` 时恢复原有内容，行为不变。
  - 点击 `tabs.map` 里任一业务标签时，若当前 `showStats === true`，顺带把它设为 `false`（点客户/供应商/收货人标签自动退出统计视图）。

- 新建 `src/features/customer/components/CustomerStatsPanel.tsx` —
  - Props：`customers: Customer[]`（含 `category` 字段）、`records: InquiryRecord[]`（`useInquiryStore` 全量记录，未过滤 deleted）。内部先 `records.filter(r => r.status !== 'deleted')`。
  - **图表一·总询价订单统计图：** 复用 `InquiryOrderTrendChart`（`@/features/dashboard/components/InquiryOrderTrendChart`）+ `buildTrendData`（`@/features/dashboard/utils/inquiryStats`），内部自维护 `Granularity` 状态（默认 `month`），数据为全部客户记录。标题“全部客户询价订单统计图”。
  - **图表二·客户询价排名 Top 10：** 按 `customerId` 分组统计每个客户的询价数（分组记录数）、已报价数（`isRecordQuoted(record)`，来自 `inquiryStats.ts`）、订单数（`record.orderNo?.trim()` 非空）；用 `customers` 把 `customerId` 解析为客户名（`customer.shortName || customer.name.split('\n')[0]`，解析不到对应客户主档的分组跳过不展示）；按询价数降序取前 10；用 recharts `BarChart`（`layout="vertical"`，`YAxis type="category" dataKey="name"`）画横向条形图，至少包含“询价数”这个指标（是否并列展示订单数自行判断）。
  - **图表三·客户分类占比：** 直接从 `customers` 现算（不依赖 `records`）：按 `category` 分组计数，`New`/无 `category` 归一类，口径与 `CustomerPage.tsx` 第 229 行 `categoryCounts.New` 判定一致（`c.category === 'New' || !c.category`），`Blacklist` 单独一类；用 recharts `PieChart` + `Pie`（设置 `innerRadius` 做环形）画五个分类的占比图，图例显示分类名+数量。
  - 三块图表卡片样式（`rounded-xl border ... bg-white ... shadow-sm`）与页面已有卡片保持一致；客户/记录为空时每块图表要有“暂无数据”占位，不报错。

**验收标准：**

- 客户管理页标签栏旁出现“统计分析”按钮，点击后原有列表/卡片视图、搜索栏、分类筛选、新增按钮全部隐藏，显示三块图表：总趋势折线图、客户排名横向条形图（Top 10）、客户分类环形图。
- 折线图粒度切换（天/周/月/季/年）正常工作，且数值口径与首页“总询价订单统计图”一致（算法完全复用），只是入口不受 `inquiry` 权限门控。
- 排名条形图按询价数降序，最多 10 个客户，客户名优先用简称。
- 分类环形图五个分类（A/B/C/New/黑名单）数量总和等于客户总数，与页面标签栏旁的 `categoryCounts` 逻辑数值一致。
- 点击“客户/供应商/收货人”任一标签能正常退出统计视图、回到对应列表。
- 只有客户管理模块权限（无 `inquiry` 权限）的账号也能正常看到这三块图表——检查代码里这个面板的显示不受 `inquiry` 权限判断影响，只受 `useModulePermissionGuard('customer')` 这一层门控。

**Non-goals / 红线：**

- 不新增后端聚合接口，不改 `worker.ts`。
- 不改 `TabType`（`../types` 定义）、不改 `activeTab` 状态承载的业务含义，“统计分析”是页面级独立视图，不是 `TabType` 第四个值。
- 不改现有 `categoryCounts`（第 224-231 行）、`displayedCustomers` 过滤逻辑，这些仍只服务于列表视图。
- 不改供应商/收货人的数据展示逻辑，本任务只做“客户”维度统计。
- 不引入 recharts 之外的图表库；`FunnelChart` 等更复杂图形本任务不做，只要求折线图+条形图+环形图三种。

**测试与验证：**

- `npx tsc --noEmit`
- `npx eslint src/features/customer/app/CustomerPage.tsx src/features/customer/components/CustomerStatsPanel.tsx`
- 手动测试：客户管理页点“统计分析”核对三块图表渲染正确、粒度切换、Top10 排名、分类占比数字与列表页标签旁计数吻合；用一个只勾了“客户管理”权限、没勾“询报价登记表”权限的测试账号登录，确认这个面板依然可见（这是本任务的核心诉求）。

**Status:** completed（2026-07-17）

**完成说明：** 客户管理页已增加独立“统计分析”视图，进入后隐藏新增、搜索、分类筛选、视图切换和资料列表，展示全部客户趋势、Top 10 客户排名及五类客户环形分布；点击客户/供应商/收货人标签可退出统计视图。统计只沿用客户管理页面守卫，不额外检查询报价权限，并补充聚合 helper 单元测试。

## TASK-184：客户管理“统计分析”排名图——支持按询价数/已报价数/订单数切换排序

**背景：** TASK-183 落地的 `src/features/customer/components/CustomerStatsPanel.tsx` 里“客户询价排名 Top 10”横向条形图（第 62-94 行 `buildCustomerRanking`，第 157-188 行渲染）目前固定按询价数（`inquiryCount`）降序取前 10，图内虽然画了询价数/已报价数/订单数三条 `Bar`，但排序和“进不进前 10”只看询价数。用户现在要求这个排名可以切换依据——按已报价数排名、按订单数排名——而不是只能看询价数视角。

**Files in scope：**

- `src/features/customer/components/CustomerStatsPanel.tsx` —
  - 新增类型 `type RankingMetric = 'inquiry' | 'quoted' | 'order';` 和一份 `RANKING_METRIC_META`（每个 metric 对应 `{ key, label, dataKey }`，`label` 分别是“询价数”“已报价数”“订单数”，`dataKey` 对应 `CustomerRankingItem` 上的 `inquiryCount`/`quotedCount`/`orderCount`）。
  - `buildCustomerRanking`（第 62-94 行）加第三个参数 `metric: RankingMetric = 'inquiry'`：排序主键从固定的 `b.inquiryCount - a.inquiryCount` 改成按 `metric` 对应字段降序，次级 tie-breaker 沿用“另外两个指标依次比较，最后按名称”的思路（具体顺序自行判断，保证结果稳定即可），`.slice(0, 10)` 不变。函数签名改动后，同目录测试文件 `__tests__/CustomerStatsPanel.test.ts` 里现有对 `buildCustomerRanking(customers, records)`（不传 metric）的调用要保持能跑通——默认值 `'inquiry'` 必须保证不传参时行为和现在完全一致，不破坏 TASK-183 已有的两个测试用例。
  - 组件内新增 `const [rankingMetric, setRankingMetric] = useState<RankingMetric>('inquiry')`，`rankingData` 的 `useMemo`（第 131-134 行）依赖里加入 `rankingMetric` 并传给 `buildCustomerRanking`。
  - “客户询价排名 Top 10”卡片（第 159-185 行）标题栏加一个三选一的分段切换控件（样式参考 `InquiryOrderTrendChart.tsx` 里粒度切换按钮组的写法：外层 `rounded-lg bg-gray-100 p-0.5 dark:bg-gray-700/50`，选中态 `bg-white text-blue-600 shadow-sm dark:bg-gray-900 dark:text-blue-400`），三个选项对应“询价数”“已报价数”“订单数”，点击更新 `rankingMetric`。标题文字要跟着当前 metric 变化，例如“客户{当前 metric 的 label}排名 Top 10”（不要用固定死的“客户询价排名 Top 10”）。
  - 图表本身继续保留三条 `Bar`（询价数/已报价数/订单数都画出来，参考已有的 `#ec4899`/`#3b82f6`/`#10b981` 配色），本任务只改“排序依据 + 标题”，不要求隐藏未选中的指标条。

**验收标准：**

- 排名卡片标题旁出现“询价数 / 已报价数 / 订单数”三个可点击选项，默认选中“询价数”，与切换前行为一致。
- 点击“已报价数”：列表重新按 `quotedCount` 降序排列，最多仍是 10 条；标题变成“客户已报价数排名 Top 10”（或等价表述，体现当前依据）。
- 点击“订单数”：同理按 `orderCount` 降序排列，标题相应变化。
- 切回“询价数”，结果和排序与切换前完全一致（即行为可逆，没有状态污染）。
- 三条 `Bar`（询价数/已报价数/订单数）在任何 metric 下都照常显示，只是哪个客户进入 Top 10、以及排列顺序会变。
- TASK-183 已有的两个单元测试（`buildCustomerRanking(customers, records)` 不传 metric 的用法）继续通过，不需要改测试断言。
- 空数据（无客户/无记录）时依旧显示“暂无数据”占位，不报错；切换 metric 不会导致空数据态崩溃。

**Non-goals / 红线：**

- 不改“全部客户询价订单统计图”（图表一，折线图/粒度切换）和“客户分类占比”（图表三，环形图）的逻辑和交互。
- 不改 `CustomerPage.tsx` 里 `showStats` 状态、标签栏切换逻辑，本任务只动 `CustomerStatsPanel.tsx` 内部。
- 不新增后端接口，排名数据继续完全来自客户端 `records`（延续 TASK-182/183/110 的原则）。
- 不删除或替换现有的三色 `Bar` 图例，只加排序切换控件。

**测试与验证：**

- `npx tsc --noEmit`
- `npx eslint src/features/customer/components/CustomerStatsPanel.tsx`
- `npx jest src/features/customer/components/__tests__/CustomerStatsPanel.test.ts`（确认 TASK-183 旧测试仍然通过），并补充至少一个新测试用例：同一组 customers/records 分别用 `metric: 'quoted'` 和 `metric: 'order'` 调用 `buildCustomerRanking`，断言排序结果确实按对应字段降序（而不是仍按 inquiryCount）。
- 手动测试：客户管理页“统计分析”视图里点三个切换选项，核对排序、标题、Top 10 名单随之变化，且能来回切换不出错。

**Status:** completed（2026-07-17）

**完成说明：** 客户统计排名卡片已增加“询价数 / 已报价数 / 订单数”三项切换，标题和 Top 10 排序随当前指标同步变化，三色指标条与图例保持完整；默认询价排序保留原有行为，空数据仍可安全切换并显示占位。新增测试覆盖按已报价数和订单数排序。

## TASK-185：外贸报价页——新增“转为外贸合同”按钮

**背景：** `src/features/quotation/app/QuotationPage.tsx` 用同一个页面组件承载“外贸报价单”（`activeTab === 'quotation'`）和“销售确认/外贸合同”（`activeTab === 'confirmation'`，侧边栏菜单项标“外贸合同”）两种单据，靠 zustand store 里的 `activeTab`（第 97 行 `useQuotationStore(sel.tab)`）区分，不是两个独立页面。已有一个从未被调用的 `handleTabChange`（第 309-312 行，`setTab(tab)`），但目前页面上没有任何按钮触发它。因为 `useInitQuotation` 只在页面首次进入时装载数据、不随 tab 变化重置（该 hook 内有注释说明），单纯调用 `setTab('confirmation')` 就能把正在编辑的报价单（客户信息、货品、金额）原地切成销售确认/外贸合同视图，不需要另存一份或跳转页面——这正是内销那边 `handleDomesticDocTypeChange`（第 195-223 行）已经在用的同一套原理，只是内销侧多了一层“条款默认模板不同，切换前要弹窗确认”的逻辑；导出侧的报价单和销售确认目前共用同一份 `DEFAULT_NOTES_CONFIG`（`src/features/quotation/types/notes.ts` 第 16-24 行，没有为 confirmation 单独定义条款集），所以本任务不需要照搬内销那套条款替换+确认弹窗逻辑，纯粹是切 tab。

**Files in scope：**

- `src/features/quotation/app/QuotationPage.tsx` —
  - 在顶部图标按钮组（第 690-723 行，“历史记录”/“保存”/“导出Excel”/“Settings”那一排）里新增一个“转为外贸合同”按钮，只在 `activeTab === 'quotation' && !isDomesticQuotation` 时渲染（已经是 confirmation 视图时不显示；内销走 TASK-186，不受影响）。点击直接调用现有的 `handleTabChange('confirmation')`（第 309-312 行，已存在但从未被调用，函数本身不用改）。
  - 按钮不要做成和“保存”/“导出Excel”一样的纯图标——那类操作幂等、不改变单据类型，这个按钮会改变文档类型，值得更显眼一点。用图标+文字的小按钮（具体像素细节自行判断，配色可参考内销设置面板里单据类型按钮的选中态 `#007AFF`，第 742-750 行），图标用 `lucide-react` 的 `FileSignature`（如果确认当前项目 lucide-react 版本没有这个图标，换一个语义相近的，如 `FileCheck2`），需要加进第 73 行的 import 列表。
  - 点击后页面标题（第 676-680 行）、面包屑（第 601-611 行 `documentLabel`）、历史记录链接（第 692 行 `historyType`）都会因为 `activeTab` 变了自动更新，不需要额外处理。

**验收标准：**

- 打开外贸报价单（`/quotation?tab=quotation`），顶部图标按钮组里能看到“转为外贸合同”按钮，点击后页面标题变成销售确认/外贸合同对应的文案（沿用现有 `activeTab === 'confirmation'` 分支的展示逻辑），已填好的客户信息、货品明细、金额不丢失、不重置。
- 页面停留在同一个 URL（不跳转、不刷新），“历史记录”链接的 `tab` 参数随之切到 confirmation 对应的 `historyType`。
- 点击“保存”后，生成的历史记录类型是 confirmation（沿用 `saveOrUpdate` 现有逻辑自动生成 `contractNo`，`src/features/quotation/services/quotation.service.ts` 第 36-42 行——本任务不改这个函数）。
- 已经处于销售确认/外贸合同视图（`activeTab === 'confirmation'`）时，这个按钮不显示。
- 内销报价页面（`isDomesticQuotation === true`）不受影响，不出现这个按钮。

**Non-goals / 红线：**

- 不改 `handleTabChange`、`useInitQuotation`、`quotation.service.ts` 里任何函数的实现，本任务只加一个调用入口。
- 不做“转回外贸报价单”的反向按钮（用户只要求单向“转为外贸合同”）。
- 不改内销报价/内销合同（`isDomesticQuotation === true` 分支）任何逻辑。
- 不往 URL 同步 `?tab=confirmation`：内销切换单据类型现在也是纯 store 内状态、不同步 URL，保持同样的简单模式，不引入路由跳转/刷新风险。
- 不给 confirmation 单独造一份条款默认值——导出侧报价单和销售确认本来就共用同一套条款默认值，这是本任务确认过的现状，除非产品明确要求两者条款不同，否则不要顺手加。

**测试与验证：**

- `npx tsc --noEmit`
- `npx eslint src/features/quotation/app/QuotationPage.tsx`
- 手动测试：新建一个外贸报价单，填几行货品和客户信息，点击“转为外贸合同”，核对标题/面包屑变成销售确认对应文案、货品和客户信息都还在；点击“保存”，去历史记录页确认生成的是 confirmation 类型的记录且带 `contractNo`。

**Status:** completed（2026-07-17）

**完成说明：** 外贸报价视图顶部已增加“转为外贸合同”图文按钮，点击复用现有 `handleTabChange('confirmation')` 原地切换为销售确认；标题、面包屑和历史类型随 store 自动更新，表单数据不重置。销售确认和内销视图不显示该按钮。

## TASK-186：内销报价页——新增“转为内销合同”按钮（复用现有单据类型切换逻辑）

**背景：** 内销报价单据类型的切换逻辑已经存在——`QuotationPage.tsx` 里的 `handleDomesticDocTypeChange`（第 195-223 行）已经能把“报价单”（`data.domesticDocType === 'quotation'`）原地切换成“产品购销合同”（`data.domesticDocType === 'contract'`），保留客户/货品/金额数据，只替换条款默认模板（`DOMESTIC_QUOTATION_NOTES_CONFIG` ⇄ `DOMESTIC_NOTES_CONFIG`），条款被手动编辑过时还会先弹窗二次确认（第 208-219 行）。但这个切换目前只能在“设置”面板里操作（点击 Settings 齿轮展开后才能看到，第 731-762 行的单据类型按钮组），不够醒目。用户要求内销报价页面上要有一个直接的“转为内销合同”按钮——本任务是把这个已有能力提升成顶层可见按钮，不是重新实现转换逻辑。

**Files in scope：**

- `src/features/quotation/app/QuotationPage.tsx` —
  - 在顶部图标按钮组（第 690-723 行）里新增“转为内销合同”按钮，只在 `isDomesticQuotation === true && (data.domesticDocType ?? 'contract') === 'quotation'` 时渲染（当前已经是“产品购销合同”时不显示）。点击调用现有 `handleDomesticDocTypeChange('contract')`（第 195-223 行，函数本身不用改，天然带着“条款被编辑过就弹窗确认”的保护）。
  - 按钮视觉与 TASK-185 的“转为外贸合同”按钮保持同一套风格（图标+文字，非纯图标，配色可复用蓝色 `#007AFF` 主题色），图标同样用 `FileSignature`（或 TASK-185 最终选定的替代图标，两处保持一致）。
  - 设置面板里原有的单据类型切换按钮组（第 731-762 行）不删除、不改，继续保留作为“报价单⇄合同”双向切换的入口；新按钮只是新增一个更显眼的单向快捷入口。

**验收标准：**

- 打开内销报价单（`/quotation?tab=domestic&docType=quotation`），顶部图标按钮组里能看到“转为内销合同”按钮，点击后标题变成“产品购销合同”（沿用第 677-679 行现有展示逻辑），条款按 `DOMESTIC_NOTES_CONFIG` 默认模板填充，客户/货品/金额数据不丢失。
- 如果当前条款已经被手动编辑过（不再等于 `DOMESTIC_QUOTATION_NOTES_CONFIG` 默认值），点击按钮会先弹出确认对话框（复用 `handleDomesticDocTypeChange` 已有的 `confirm(...)` 逻辑），确认后才真正切换；取消则保持原状。
- 切换后再打开设置面板，里面的单据类型按钮组会同步显示“产品购销合同”为选中态（两者共享同一个 `data.domesticDocType` 状态）。
- 当前已经是“产品购销合同”（`data.domesticDocType === 'contract'`）时，顶层这个新按钮不显示；设置面板里的切换按钮组照常可用（可以切回报价单）。
- 外贸报价/外贸合同（`isDomesticQuotation === false`）不受影响。

**Non-goals / 红线：**

- 不改 `handleDomesticDocTypeChange` 函数本身的实现（条款替换、确认弹窗逻辑原样复用）。
- 不删除设置面板里原有的单据类型切换按钮组，也不改它的样式/位置。
- 不做“转回内销报价单”的顶层快捷按钮（用户只要求“转为内销合同”这一个方向；报价单⇄合同的双向切换继续留在设置面板里）。
- 不改外贸报价/合同（`isDomesticQuotation === false` 分支）任何逻辑，那部分是 TASK-185 的范围。

**测试与验证：**

- `npx tsc --noEmit`
- `npx eslint src/features/quotation/app/QuotationPage.tsx`
- 手动测试：新建内销报价单，不改条款直接点“转为内销合同”，核对无确认弹窗直接切换、标题和条款都变成合同版；再新建一个内销报价单，手动改一下条款文字再点按钮，核对弹出确认对话框，取消后条款不变，确认后条款按合同默认值替换（编辑内容丢失，这是预期行为，和设置面板里原逻辑一致）。

**Status:** completed（2026-07-17）

**完成说明：** 内销报价视图顶部已增加同款“转为内销合同”图文按钮，点击直接复用 `handleDomesticDocTypeChange('contract')`，因此继续保留默认条款替换与已编辑条款二次确认保护；切换后按钮隐藏，设置面板的双向类型切换入口保持不变。

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
