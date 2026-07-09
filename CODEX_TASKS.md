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
