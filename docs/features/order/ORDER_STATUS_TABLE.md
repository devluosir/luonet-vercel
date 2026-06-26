# 订单状态表

> 状态：**已实现 / 维护中**
> 最后更新：2026-06-26

---

## 功能定位

订单状态表是询报价登记的「衍生视图」：自动聚合所有已填写了订单编号的询价记录，并在此基础上补充追踪交货、回款等订单履行信息。

- **数据来源**：共享 `useInquiryStore`（Zustand），不另建 store
- **写入路径**：`updateRecord(id, patch)` → 修改 `InquiryRecord` 中的订单追踪字段
- **无数据库迁移**：新字段均为可选，以 JSON 形式存入 D1 `Document.data` 列

---

## 路由 & 文件结构

```
src/app/order/page.tsx               # 路由入口（re-export）
src/features/order/
├── app/
│   └── OrderPage.tsx                # 主页面（'use client'）
├── components/
│   ├── OrderTable.tsx               # 表格容器
│   └── OrderRow.tsx                 # 行组件（支持单元格行内编辑）
└── index.ts
```

侧边栏新增条目（AppSidebar.tsx）：

```typescript
// 登记表 group（NAV_ITEMS.slice(6, 8) 后扩展为 slice(6, 9)）
{ id: 'order', label: '订单状态表', path: '/order', icon: ClipboardCheck }
```

---

## 数据字段

新增至 `InquiryRecord`（均为可选，不影响现有数据）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `orderDeliveryDate` | `string?` | 交货日期，[m.D] 格式，如 [7.15] |
| `orderConfirmDate` | `string?` | 确认日，[m.D] 格式 |
| `orderCustomerNo` | `string?` | 客户方订单号；为空时界面显示 `customerNo` |
| `orderDeliveryStatus` | `string?` | 交货执行情况，自由文本 |
| `orderAmount` | `string?` | 订单金额（**仅管理员可见**），含币种符号，如 `¥120000` / `$15000` |
| `orderPaymentDate` | `string?` | 回款月份，m 或 m.D 格式（**仅管理员可见**） |
| `orderReceivedAmount` | `string?` | 到账金额（**仅管理员可见**），含币种符号，如 `¥120000` / `$15000` |

---

## 表格列规格

### 移动端（sm 及以下）—— 精简列

| 列 | 内容 | 说明 |
|----|------|------|
| 订单编号 | `orderNo` + C/P/S 标识 | 订单编号为粗体文本；C/P/S 为红色粗体字母，无底框 |
| 客户/简述 | `inquirer` + `description` | 两行显示 |
| 执行情况 | `orderDeliveryStatus` | 单行截断 |

### 桌面端（md 及以上）—— 完整列

| # | 列 | 来源字段 | 可行内编辑 | 权限 |
|---|----|---------|---------|----|
| 1 | 订单编号 | `orderNo` + `orderSubStatus` | ✗ | 全员 |
| 2 | 交货 | `orderDeliveryDate` | ✓ | 全员 |
| 3 | 客户（询价人） | `inquirer` | ✗ | 全员 |
| 4 | 内容简述 | `description` | ✗ | 全员 |
| 5 | 确认日 | `orderConfirmDate` | ✓ | 全员 |
| 6 | 客户订单号 | `orderCustomerNo` ?? `customerNo` | ✓ | 全员 |
| 7 | 交货执行情况 | `orderDeliveryStatus` | ✓ | 全员 |
| 8 | 订单金额 | `orderAmount` | ✓ | **Admin** |
| 9 | 回款(m) | `orderPaymentDate` | ✓ | **Admin** |
| 10 | 到账金额 | `orderReceivedAmount` | ✓ | **Admin** |

---

## 行内编辑（Inline Edit）

交互模式：点击单元格 → 显示 input/textarea → Enter 或失焦保存 → Escape 取消

```
[单元格默认态]  ←── click ──→  [编辑态 <input>]
                                       │
                                  Enter/blur ──→ updateRecord(id, { fieldName: value })
                                  Escape ──────→ 恢复原值
```

- 日期字段（交货/确认日）：接受 `m.D` 格式输入，自动规范化为 `[m.D]`
- 金额字段：数字输入，保存为带币种符号的 `string`
- 文本字段：自由输入
- 客户订单号：空值时 fallback 展示 `customerNo`，保存后覆盖到 `orderCustomerNo`

---

## 订单标记 C/P/S

与询报价登记中保持一致：

| 标记 | `orderSubStatus` | 显示 | 筛选 |
|------|-----------------|------|------|
| 无 | `undefined` | 粗体订单编号文本 | 「正常」 |
| 辙销C | `'cancelled'` | 粗体订单编号文本 + 红色 **C**，整行灰底 | 「已辙销」 |
| 悬挂P | `'suspended'` | 粗体订单编号文本 + 红色 **P**，整行淡绿底 | 包含在「正常」内 |
| 善后S | `'followup'` | 粗体订单编号文本 + 红色 **S**，整行淡红底 | 「善后」 |

订单编号不再使用绿色徽标、绿色底框、ring 或圆角底色；C/P/S 后缀仅保留红色文字。

---

## 筛选面板

### 时间范围（与询报价登记共用同一套逻辑）

```
[近3月]  [全部]  [‹ 选月 ›]
```

- 默认：近3月
- 时间维度取自 `inquiryNo` 中的日期

### 订单状态芯片

```
[正常]  [辙销C]  [悬挂P]  [善后S]
```

- 「正常」= `orderSubStatus` 为 undefined 或 'suspended'（含悬挂）
- 各芯片显示当前时间、关键词、客户筛选后对应条目数角标

### 搜索与客户选择器

右侧筛选控件：

```
[搜索订单/客户/内容...]  [客户]  [重置]
```

- 搜索字段匹配：`orderNo`、`inquiryNo`、`inquirer`、`description`、`orderCustomerNo`、`customerNo`、`orderDeliveryStatus`
- 客户选择器绑定订单表当前「客户」列，也就是 `InquiryRecord.inquirer`
- 客户选项来自所有有效订单记录：`status !== 'deleted'` 且 `orderNo` 有值，再按 `inquirer` 去重排序
- 筛选流程：
  1. `allOrderRecords`：未删除 + 有 `orderNo`
  2. `timeFiltered`：应用时间范围
  3. `baseFiltered`：应用关键词 + 客户
  4. `countByStatus`：基于 `baseFiltered` 计算芯片数量
  5. `filteredRecords`：基于 `baseFiltered` 再应用订单状态筛选并排序
- 当时间范围、关键词、客户或订单状态任一项非默认时显示「重置」，重置为近3月、全部状态、空关键词、空客户

---

## 行样式

订单行底色只跟随订单附加标记：

| 标记 | 整行底色 |
|------|----------|
| 辙销C | 灰底 |
| 悬挂P | 淡绿底 |
| 善后S | 淡红底 |
| 无标记 | 中性 hover 效果 |

执行情况不再控制整行底色，只控制真实文本颜色。

真实文本颜色跟随 `orderDeliveryStatus.trim()` 的开头：

| 执行情况 | 行内真实文本颜色 |
|----------|------------------|
| 空值 / `备货...` | 粉红色文字 |
| `交货...` | 蓝色文字 |
| `发票...` | 正常深色文字，使用 `startsWith('发票')` 兼容 `发票6.23` 等数据 |
| 其他 | 默认业务文本色 |

颜色应用到订单号、交货日期、客户、内容简述、确认日、客户订单号、执行情况，以及管理员可见的金额、回款、到账金额。订单号下方的 `inquiryNo` 仍固定为灰色；空值占位（如 `m.D`、`执行情况`、`¥/$`、`—`）继续使用淡灰色，避免误认为已有数据。

---

## 顶部导航

- 面包屑：`首页 / 订单状态表`
- `topBarSlot`：可预留（如显示最新同步时间，与询报价登记共享同步机制）

---

## 权限控制

| 功能 | 普通用户 | 管理员 |
|------|---------|-------|
| 查看所有订单 | ✓ | ✓ |
| 行内编辑（交货/确认日/执行情况/客户订单号） | ✓ | ✓ |
| 订单金额 / 回款 / 到账金额 列 | ✗（隐藏） | ✓（可编辑） |

权限由 `useAppUser().isAdmin` 判断，与询报价登记一致。

---

## 实现检查清单

### Phase 1：数据模型扩展

- [x] `types/index.ts`：添加 7 个可选追踪字段到 `InquiryRecord`
- [x] TypeScript 验证通过（历史实现阶段）

### Phase 2：UI 骨架

- [x] `src/features/order/app/OrderPage.tsx`：主页面
- [x] `src/features/order/components/OrderTable.tsx`：表格容器
- [x] `src/features/order/components/OrderRow.tsx`：行 + 行内编辑单元格
- [x] `src/features/order/index.ts`：模块出口
- [x] `src/app/order/page.tsx`：路由入口

### Phase 3：侧边栏 & 权限

- [x] `AppSidebar.tsx`：NAV_ITEMS 新增订单状态表
- [x] `NAV_GROUPS` 登记表 group 范围更新
- [x] 当前复用现有询报价数据与权限边界，未新增 D1 schema

### Phase 4：功能细节

- [x] 行内编辑：点击/Enter/Escape 交互
- [x] 客户订单号：为空时 fallback 显示 `customerNo`
- [x] Admin 列：非管理员时完全隐藏列头和列数据
- [x] C/P/S 以红色文字后缀显示，无绿色徽标底框
- [x] 筛选面板：时间范围 + 订单状态芯片 + 搜索 + 客户选择器
- [x] 同步时间插槽（`topBarSlot`）

### Phase 5：验证

- [ ] 修改订单追踪字段后，D1 同步正常
- [ ] 询报价登记中对同一条记录的修改，订单状态表实时反映
- [ ] 管理员/非管理员列显隐正确
- [ ] TypeScript 全量通过，ESLint 无新错误

---

## 设计决策记录

### 为什么不另建独立 Store？

订单状态表是询报价登记的派生视图，底层数据是同一批 `InquiryRecord`。分离 store 会造成：
- 数据重复（双份 localStorage）
- 同步复杂度上升（修改一处要同步另一处）

直接复用 `useInquiryStore` + `updateRecord` 最简洁，新字段透明地存入现有 JSON 结构。

### 为什么在 InquiryRecord 上扩展而非新表？

D1 的 `Document.data TEXT` 是 JSON 全量存储，不依赖列结构。新增可选字段无需 SQL 迁移，旧记录读取时字段为 `undefined`，行为符合预期。

### 客户订单号的处理

`customerNo`（询价时的客户编号，如合同编号/项目号）≠ 客户方下给我们的订单编号。  
`orderCustomerNo` 单独存储，不覆盖 `customerNo`，确保询报价登记视图不受影响。
