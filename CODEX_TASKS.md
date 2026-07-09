# CODEX_TASKS.md — 任务索引（精简）

最后更新：2026-07-09

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
- "登记""管理""工具"的子项与 `src/components/layout/AppSidebar.tsx` 里 `NAV_ITEMS` 的对应条目（含 `permissionKey`）完全一致，权限判断逻辑也要照抄 `AppSidebar.tsx` 的 `PERMISSION_MODULE_MAP` + `isVisible`（`permission?.canAccess ?? permissionUser.isAdmin`），保持两端权限口径一致。
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

## 已关闭 / 不做

| 项 | 说明 |
|----|------|
| TASK-14 旧历史批量迁 D1 | 业务确认取消；旧单可随登录补推（选 B） |
| TASK-15 D1 primary 读路径 | 不做；保持 localStorage 主读 + 登录拉取 |
| X-User-* / 明文 API_TOKEN / validatePassword bug | 已在代码侧修复，见 CURRENT_STATE |

## 可选后续（非紧急）

1. E2E：补无模块权限账号的 `PermissionDenied` 断言（需专用测试账号）。
2. 权限刷新链路：`fetchPermissions` 与 `usePermissionRefresh` 仍有重叠，可继续收敛。
3. `purchase-registration` 既有 `react-hooks/exhaustive-deps` warning，可择机修。
4. 删除 `components/admin/CreateUserModal` 兼容 re-export（确认无外部引用后）。

## 新任务怎么写

- 只在本文件追加**短规格**（背景 / 文件 / 验收），完成后把结论写入 `CHANGELOG` + `CURRENT_STATE`，不要把整段执行日志永久堆在这里。
- 大段运维记录可放临时分支或 PR 描述，不必进仓库长文。
