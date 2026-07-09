# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2026-07-09

### Security

#### P0 安全加固
- **改密哈希**：`d1-client.updatePassword` 写入前使用 `bcrypt.hash`，与创建用户一致，避免明文落库。
- **登录限流**：Worker `/api/auth/d1-users` 按 IP 限流（1 分钟最多 10 次），超限返回 429。
- **NEXTAUTH_SECRET**：生产环境未配置时直接抛错，禁止硬编码回退密钥；开发环境使用临时密钥并告警。
- **AI 邮件权限**：`/api/generate` 除登录外校验 `ai-email` 模块权限（管理员放行）。
- **日志收敛**：登录成功/失败日志不再输出密码明文或 hash 前缀。

### Added

#### P1 权限与配额
- **页面级 moduleId 守卫**：新增 `useModulePermissionGuard`；报价/装箱/发票/采购/历史/客户（含详情）/邮件/时区/假日/RMB 共 11 页接入，无权限显示 `PermissionDenied`（询报价相关 4 页此前已有）。
- **历史写入配额统一入口**：`persistHistoryToStorage`；报价/发票/装箱/采购历史与 `d1Pull.mergeIntoStorage` 主写入路径接入，超限时智能清理/裁剪。
- **PermissionMap 补全**：`inquiry`、`purchaseRegistration`、`purchaseOrderTable`、`clock`、`holidays`、`rmb`；dashboard 类型改为复用 `@/types/permissions`。

### Changed

#### 文档对齐
- 同步 `AGENTS.md` / `README.md` / `PROJECT_SUMMARY.md` / `CURRENT_STATE.md`：权限模块补全、路由补全、Bearer/secret 现状、客户 D1 主存表述；关闭已过时的「紧急安全」待办描述。
- 跨设备策略确认：取消 TASK-14 旧历史批量迁移；保留双写 + 登录拉取 + 本地补推。

#### 权限刷新
- 删除无 listener 的 `silentRefreshPermissions` 事件；改为派发带 `tokenNeedsRefresh` 的 `permissionsUpdated`。完整 session 刷新仍由 `usePermissionRefresh` 负责。

### Tests
- `npx tsc --noEmit`
- 手动建议：无模块权限直链对应路由应见权限不足；历史保存超配额时控制台有裁剪/清理日志

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
- **IMPA 物料模块权限**：左侧 `IMPA物料` 外部工具入口接入模块权限体系，后台用户权限弹窗新增 `IMPA 物料` 开关；非管理员只有拥有 `impa` 权限时才显示该入口，管理员默认可见
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
