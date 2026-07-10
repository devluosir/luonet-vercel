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
- 待用户在浏览器人工核对：Light/Dark 两种模式下侧边栏配色、激活态指示条、收缩/展开切换、260px 宽度是否符合预期

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
