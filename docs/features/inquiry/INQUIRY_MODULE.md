# 询报价登记模块

> 状态：**已实现 / 维护中**
> 最后更新：2026-07-03

---

## 概述

询报价登记是 LC App 的核心业务登记表，用于追踪每一条来自客户的询价请求——从发出供应商询价、收到报价、回复客户，到最终成单的全过程状态。

---

## 路由 & 文件结构

```
src/app/inquiry/page.tsx               # 路由入口（re-export）
src/features/inquiry/
├── app/
│   └── InquiryPage.tsx                # 主页面（'use client'）
├── components/
│   ├── InquiryTable.tsx               # 表格容器（列宽/排序）
│   ├── InquiryRow.tsx                 # 数据行渲染
│   ├── InquiryFilterBar.tsx           # 筛选面板（时间芯片 + 状态芯片 + 搜索）
│   ├── InquiryFormModal.tsx           # 新增/编辑弹窗
│   ├── InquiryQuoteStatus.tsx         # 弹窗内询报价状态区
│   ├── InquiryQuoteStatusDisplay.tsx  # 行内询报价状态展示
│   ├── QuotedStatusList.tsx           # 已报价列表（弹窗子组件）
│   └── SupplierStatusTag.tsx          # 供应商状态标签
├── hooks/
│   ├── useInquiryFilter.ts            # 筛选 + 排序 + 状态计数
│   └── useInquiryActions.ts           # CRUD 动作封装
├── services/
│   └── inquiry.service.ts             # localStorage + D1 双端同步
├── state/
│   └── inquiry.store.ts               # Zustand store
├── types/
│   └── index.ts                       # 全部类型定义
├── utils/
│   ├── inquiryUtils.ts                # 日期/编号/颜色工具函数
│   └── inquirerOptions.ts             # 询价人默认选项
└── index.ts                           # 模块出口
```

---

## 数据模型

### InquiryRecord

```typescript
interface InquiryRecord {
  id: string;
  inquiryDate: string;       // [m.D] 格式，如 [6.20]
  inquiryNo: string;         // C260620F（含 -U 后缀表示紧急）
  inquirer: string;          // 询价人
  customerNo: string;        // 客户编号（询价时的客户方编号）
  description: string;       // 内容简述
  orderNo?: string;          // 订单编号（成单后填写）
  orderSubStatus?: OrderSubStatus; // 辙销C / 悬挂P / 善后S
  orderSubStatusRemark?: string; // C/P/S 情况备注，显示到客户活动列表

  // ── 订单状态表追踪字段（有 orderNo 时使用）──────────────────
  orderDeliveryDate?: string;      // 交货日期 [m.D]
  orderConfirmDate?: string;       // 确认日 [m.D]
  orderCustomerNo?: string;        // 客户方订单号（可覆盖 customerNo）
  orderDeliveryStatus?: string;    // 交货执行情况（自由文本）
  orderDeliveryConsignee?: string; // 订单关联收货人，供收货人详情页收货订单匹配
  orderAmount?: string;            // 订单金额（管理员可见），含币种符号
  orderPaymentDate?: string;       // 回款月份，m 或 m.D 格式（管理员可见）
  orderReceivedAmount?: string;    // 到账金额（管理员可见），含币种符号
  // ─────────────────────────────────────────────────────────────

  supplierStatuses: SupplierQuoteStatus[];
  quotedStatuses: CustomerQuoteStatus[];
  createdAt: string;
  updatedAt: string;
  status?: 'active' | 'deleted';
}

type OrderSubStatus = 'cancelled' | 'suspended' | 'followup';
// cancelled = 辙销C，suspended = 悬挂P，followup = 善后S
```

### SupplierQuoteStatus

```typescript
interface SupplierQuoteStatus {
  id: string;
  supplierShortName: string;
  quoteDate?: string;
  status?: 'pending' | 'quoted' | 'unavailable' | 'need_info';
}
```

### CustomerQuoteStatus

```typescript
interface CustomerQuoteStatus {
  id: string;
  quoteDate: string;
  supplierShortName: string;
  version: string;
  type?: 'quoted' | 'unavailable' | 'supplemented' | 'closed';
}
```

---

## 询价编号规则

格式：`C[YY][MM][DD][SUFFIX]`，例：`C260620F`

- 前缀 `C`，固定
- `YY` = 年份后两位（26→2026）
- `MM` = 月份两位
- `DD` = 日期两位
- `SUFFIX` = 从 `F` 开始，依次 F/G/H/J/K…（跳过 I/O）→ Z → ZA/ZB… → ZZ…
- 紧急单附加 `-U`，如 `C260620F-U`

---

## 筛选逻辑

### 时间范围（TimeRange）

| 选项 | 说明 |
|------|------|
| `3months`（默认） | 当前月 + 前两个月 |
| `all` | 全部 |
| `month:YYYY-MM` | 指定月份 |

### 报价状态（QuoteStatusFilter）

| 值 | 含义 | 筛选条件 |
|----|------|---------|
| `customer_pending` | 未报价 | `quotedStatuses.length === 0` |
| `customer_quoted` | 已报价 | 有 type='quoted' 且无 unavailable/closed |
| `unavailable` | 无法报价 | 有 type='unavailable' 或 'closed' |
| `has_order` | 已成单 | `orderNo` 有值；包含普通、辙销C、悬挂P、善后S 的全部成单记录 |
| `cancelled` | 已辙销 | `orderSubStatus === 'cancelled'` |
| `followup` | 善后 | `orderSubStatus === 'followup'` |

「已辙销」与「善后」是「已成单」的可重叠细分状态，不会再从「已成单」总集合中排除；这样“已成单”数量始终等于当前其它筛选条件下所有具有有效订单编号的记录数。

### activeCount 计算

以下条件成立时各计 1（总计 = 活跃筛选数）：
- `timeRange !== '3months'`
- `keyword` 非空
- `customerNo` 非空
- `inquirer` 非空
- `quoteStatus !== 'all'`

---

## 行颜色状态

| 颜色 | 含义 | 触发条件 |
|------|------|---------|
| `text-pink-500` | 等待中（未报价） | quotedStatuses 为空 |
| `text-blue-600` | 已报价 | 有 quoted/supplemented 类型 |
| `text-gray-400` | 无法报价/已关闭 | 有 unavailable/closed 类型 |

---

## 表格表头样式

询报价登记表表头由 `src/features/inquiry/components/InquiryTable.tsx` 渲染。当前样式目标是提高登记表的扫描效率，保持内部业务工具的克制密度：

- 表头使用浅灰渐变底色，增强与数据行的层级区分
- 列之间使用细分隔线，便于横向扫描
- 表头文字使用 `text-[11px]`、半粗体、灰色业务文本，不使用大写字距样式
- 「询价编号」排序列使用蓝色高亮按钮，显示当前排序方向
- Admin 编辑模式下的全选 checkbox 保持在独立窄列，样式与其他表头列对齐
- 移动/平板/桌面断点继续沿用原列宽与显隐规则，不改变数据列结构

本次表头样式调整已在 2026-06-26 手动验证完成；未改变筛选、排序、导入导出或 D1 同步逻辑。

---

## 订单标记（OrderSubStatus）

在编辑弹窗中，订单编号下方显示三个互斥切换按钮（仅在 `orderNo` 有值时显示）：

| 按钮 | 值 | 表格中显示 | 筛选归属 |
|------|----|-----------|---------|
| 辙销C | `cancelled` | 订单编号后红色粗体 **C**，边框变红 | 「已成单」及「已辙销」筛选 |
| 悬挂P | `suspended` | 订单编号后红色粗体 **P**，边框变红 | 「已成单」筛选 |
| 善后S | `followup` | 订单编号后红色粗体 **S**，边框变红 | 「已成单」及「善后」筛选 |

当选择任意 C/P/S 标记时，编辑弹窗会显示「情况备注」单行输入框，用于记录客户撤销、订单悬挂或善后处理的简短原因。保存规则：

- 只有 `orderNo` 有值且 `orderSubStatus` 已选择时，才保存 `orderSubStatusRemark`。
- 取消 C/P/S 标记或清空订单编号时，备注随保存一并清空。
- 客户详情活动列表会把 C/P/S 显示为「已辙销 / 已悬挂 / 善后」状态，并将备注拼接到活动描述中。
- Excel 导入导出包含 `订单标记` 和 `订单备注` 两列，避免跨文件流转时丢失。

---

## 存储 & 同步

- **主存储**: `localStorage` key = `inquiry_records`
- **D1 同步**: Cloudflare Worker `udb.luocompany.net/api/inquiry`
  - 全量 JSON 存入 `Document.data` 列（无需 schema 迁移即可扩展字段）
  - `orderNo`、`orderSubStatus`、`orderSubStatusRemark`、`customerId`、`contactId` 是可清空字段；完整记录 PUT 时若字段缺失，Worker 会从旧 JSON 中移除，避免远端保留旧值
  - 新增 → `POST /api/inquiry`
  - 更新 → `PUT /api/inquiry/:id`
  - 删除 → `DELETE /api/inquiry/:id`（软删除）
- **冲突解决**: 以 `updatedAt` 时间戳为准（新时间覆盖旧时间）

---

## 顶部导航栏

- `topBarSlot` 插槽：同步完成后显示 `同步 HH:MM:SS` 于顶部面包屑右侧
- 桌面端：面包屑 → `首页 / 询报价登记 · 同步 HH:MM:SS`
- 移动端：页面标题 + 同步时间小字

---

## 权限

- 普通用户：可查看/新增/编辑/导出自己可见的记录
- 管理员额外：批量选择、导入 Excel/JSON、删除、编辑模式开关
- 询报价权限由 `Permission.moduleId = 'inquiry'` 控制
