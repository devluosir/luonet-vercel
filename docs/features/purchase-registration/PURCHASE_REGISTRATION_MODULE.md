# 采购部登记模块

> 状态：**已实现 / 维护中**
> 最后更新：2026-07-13（TASK-156）

## 概述

采购部登记是询报价登记的采购视图。它复用 `InquiryRecord` 和 D1 `Document.type='inquiry'` 的 JSON blob，不新建 D1 表，也不复用询报价登记已有的供应商报价状态。

## 路由 & 文件结构

```text
src/app/purchase-registration/page.tsx
src/features/purchase-registration/
├── app/PurchaseRegistrationPage.tsx
├── components/PurchaseRegistrationFilterBar.tsx
├── components/PurchaseRegistrationRow.tsx
├── components/PurchaseRegistrationTable.tsx
└── index.ts
```

## 数据模型

新增字段位于 `src/features/inquiry/types/index.ts`：

```ts
purchaseSupplierStatuses?: SupplierQuoteStatus[];
purchaseQuotedStatuses?: CustomerQuoteStatus[];
```

内容描述直接读写 `description`，与询报价登记共享同一份数据；`purchaseSupplierStatuses` / `purchaseQuotedStatuses` 结构与询报价登记的 `supplierStatuses` / `quotedStatuses` 相同，但数据独立存储，互不影响，通过"编辑询价"弹窗（点击整行触发）编辑。表格不再展示"备货 / 交货 / 发票"，该状态只在"采购订单表"（`/purchase-order-table`）里维护，采购部登记不读写 `orderDeliveryStatus` / `orderDeliveryConsignee`。

### 询报价状态 → 询报价登记「飞罗」自动同步（TASK-156 起：三级优先级）

采购部登记保存时，按以下优先级把状态同步到**询报价登记原始** `supplierStatuses` 里"飞罗"（`上海飞罗贸易有限公司`，代表自供应商身份）这一条，取第一条满足的：

1. `purchaseQuotedStatuses` 里勾了"我司无法报价" → 飞罗 `status: 'unavailable'`，`quoteDate` 取该状态的日期
2. 任一 `purchaseSupplierStatuses` 为 `need_info`（需补资料） → 飞罗 `status: 'need_info'`，`quoteDate` 取最新一条需补资料日期
3. `purchaseQuotedStatuses` 中存在普通报价（非"无法报价/已补充/已关闭"的常规条目） → 飞罗 `status: 'quoted'`，`quoteDate` 取最新报价日期
4. 以上均不满足 → 不产生补丁，不主动清空/回退飞罗现状（沿用此前已上线的兼容策略）

只在目标状态/日期与飞罗当前值不同时才写 `supplierStatuses` 补丁，且只替换飞罗这一条，其余供应商原样保留；记录里还没有飞罗条目时自动补一条。

实现位置：`src/features/purchase-registration/utils/purchaseInquiryStatus.ts` 的 `computeSelfSupplierTarget` / `applySelfSupplierSync` / `computeSelfSupplierPatch`，`PurchaseInquiryEditModal.tsx` 的 `handleSave` 只负责调用组合函数并写入补丁，不再堆叠零散判断。这是单向同步：撤销采购部登记的状态不会反向清空询报价登记里飞罗已经同步过去的状态。

反向地，销售侧把飞罗手动设为 `need_info` 时，采购部弹窗和表格状态列都能读到并提示"需补充信息"（见下），但不会代替用户创建/修改某一条具体的 `purchaseSupplierStatuses`——销售侧信息无法确定具体是哪一家采购供应商需要资料。

这种情况下，采购部要能标记"已补充信息"（`purchaseQuotedStatuses.type === 'supplemented'`）：`InquiryQuoteStatus` 的"已补充信息" checkbox 默认只在组件收到的 `supplierStatuses` 本身有 `need_info` 才显示，但采购部弹窗里这个 prop 传的是本地 `purchaseSupplierStatuses` 影子记录，读不到销售侧飞罗的只读信号。为此新增第 4 个窄配置 prop `extraNeedInfo?: boolean`（默认 `false`），`PurchaseInquiryEditModal.tsx` 传入 `extraNeedInfo={selfSupplierNeedInfo}`，让"飞罗 need_info 只读提示"和"已补充信息"勾选入口保持一致可见。

**"已补充信息"存在两个独立来源，互不覆盖**：采购部自己标记的 `purchaseQuotedStatuses.type === 'supplemented'`（采购部已经把资料转给了具体的采购供应商），与销售从客户那边拿到资料后登记在**询报价登记原始** `record.quotedStatuses.type === 'supplemented'`（销售侧沿用默认 `InquiryQuoteStatus` 的"已补充信息" checkbox，在 `hasNeedInfoSupplier` 为真——含飞罗被标记 `need_info` 的情况——时可见并勾选）。两者存储位置不同，互不写入对方；采购部（状态列的"已补充信息" badge、编辑弹窗）需要能只读看到销售侧这一条，通过 `findSalesSupplemented` / `isSalesSupplemented`（`purchaseInquiryStatus.ts`）读取，`PurchaseInquiryEditModal.tsx` 据此展示独立的蓝色只读提示"销售侧提示：已补充信息（日期）"。

### 采购部登记表状态列（TASK-156 起）

`PurchaseRegistrationTable` 的"状态"列（原"成单状态"）只显示一个优先级最高的主 badge，取第一条满足的：

1. 销售侧 `record.quotedStatuses` 含 `type === 'closed'` → "已关闭"（灰）
2. `orderNo` 非空 → "已成单"（绿）
3. `purchaseQuotedStatuses` 含 `type === 'supplemented'`，**或**销售侧 `record.quotedStatuses` 含 `type === 'supplemented'` → "已补充信息"（蓝）
4. 任一 `purchaseSupplierStatuses` 为 `need_info`，或销售侧飞罗为 `need_info` → "需补充信息"（黄）
5. 销售侧 `supplierStatuses` 里排除飞罗、按 `supplierShortName.trim()` 去重后 `status === 'quoted'` 的数量 > 0 → "其他 n 家已报价"（蓝）
6. 均不满足 → 空态"—"（灰）

计算逻辑（`computePurchaseMainStatus` / `formatPurchaseMainStatus` / `countOtherQuotedSuppliers`）与编辑弹窗里的"其他 n 家已报价"只读提示共用同一份 `purchaseInquiryStatus.ts`，不重复实现。

### 询价已关闭：完全只读化（TASK-156 起）

采购部不能再创建、取消或修改"询价已关闭"，该状态完全由销售侧 `record.quotedStatuses` 中 `type === 'closed'` 决定：
- 销售侧已关闭：`PurchaseInquiryEditModal` 显示灰色只读提示"询价已关闭（日期）"，不提供任何 checkbox
- 销售侧未关闭：完全隐藏该提示
- 历史 `purchaseQuotedStatuses` 里可能已有的 `type === 'closed'` 数据：不再用于判断、不主动删除、也不会覆盖销售侧真实关闭状态，纯粹是遗留死数据

询报价登记页面（`InquiryQuoteStatus` 默认 props）里原有的可编辑"询价已关闭" checkbox 和"已回复客户无法报价"文案保持不变，采购部场景通过 `showClosedControl={false}` / `unavailableLabel="我司无法报价"` 两个窄配置 props 单独定制，不复制整个组件。

## 权限

- moduleId：`purchaseRegistration`
- 分类：`registration`
- API：复用 `/api/inquiry` 代理，逻辑拆在 `src/app/api/inquiry/[[...path]]/restrictedView.ts`。用户只有 `purchaseRegistration`、没有 `inquiry` 权限时：
  - GET 只返回采购部登记需要的字段，额外只读透传 `supplierStatuses`（供飞罗同步判断）和**完整** `quotedStatuses`（供只读展示销售侧关闭/需补资料状态，未裁剪成部分数组）
  - PUT 只允许更新 `description`、`purchaseSupplierStatuses`、`purchaseQuotedStatuses`、`supplierStatuses`（仅用于飞罗自动同步补丁）；`quotedStatuses` **不**在允许写入的字段列表里，即使请求体带了也会被 `pickRestrictedPatch` 丢弃

## 同步

页面复用 `useInquiryStore` 和 `useInquirySync`，但采购部登记关闭本地旧询报价缓存合并与本地全量回推，避免采购部视图覆盖完整询报价数据。

`PurchaseInquiryEditModal` 弹窗打开期间，优先按 `record.id` 从 `useInquiryStore` 最新状态解析记录（而非只用打开弹窗那一刻的 props 快照），避免后台同步刷新用旧快照覆盖飞罗同步判断；本地编辑态的重置只在切换到不同 `record.id` 时触发，同一条记录的后台刷新不会清空用户尚未保存的输入。
