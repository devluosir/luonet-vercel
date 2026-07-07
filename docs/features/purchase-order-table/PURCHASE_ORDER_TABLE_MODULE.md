# 采购订单表模块

> 状态：**已实现 / 维护中**
> 最后更新：2026-07-08（TASK-101 重构：由独立数据表改为询报价登记的过滤视图）

## 概述

采购订单表是**询报价登记的过滤视图**，与"订单状态表 (`/order`) 之于询报价登记"的关系完全一致：不新建独立数据表，只展示 `InquiryRecord` 中 `orderNo` 有值（已成单）的记录，不能手动新增或删除——记录随询价成单自动出现。

采购订单表和采购部登记（`/purchase-registration`）也是同一份底层数据，互为兄弟视图：采购部登记管理供应商询价/报价状态，采购订单表管理成单后的采购单号/供应商/金额和执行进度。

## 路由 & 文件结构

```text
src/app/purchase-order-table/page.tsx
src/features/purchase-order-registration/
├── app/PurchaseOrderRegistrationPage.tsx
├── components/PurchaseOrderFilterBar.tsx
├── components/PurchaseOrderRow.tsx
├── components/PurchaseOrderTable.tsx
└── index.ts
```

不再有独立的 `services/purchase-order.service.ts`、`state/purchase-order.store.ts`、`types/index.ts`、`components/PurchaseOrderFormModal.tsx`，也不再有独立的 `src/app/api/purchase-order/[[...path]]/route.ts` 和 `src/worker.ts` 的 `handlePurchaseOrderRequest`——这些在 TASK-101 里全部删除。数据读写复用 `/api/inquiry` 代理和 `useInquiryStore`/`useInquirySync`。

## 数据模型

新增字段位于 `src/features/inquiry/types/index.ts`（`InquiryRecord`）：

```ts
purchaseOrderNo?: string;        // 采购单号，采购部自行编排
purchaseOrderSupplier?: string;  // 供应商（与询报价的 supplierStatuses 无关）
purchaseOrderAmount?: string;    // 采购金额，含币种符号 ¥/$/€，需要 order.financials 权限
```

以下字段与订单状态表（`/order`）**共用同一份数据**，不是各自独立存储：

| 字段 | 采购订单表这边的行为 |
|---|---|
| `orderDeliveryDate`（交货日期） | 双向：可编辑，和订单状态表编辑的是同一个字段 |
| `orderDeliveryStatus` / `orderDeliveryConsignee`（执行情况：备货/交货/发票 + 收货人） | 双向：可编辑，和订单状态表编辑的是同一个字段 |
| `orderConfirmDate`（确认日期） | 只读：来自订单状态表，采购订单表这边不能编辑 |
| `orderCustomerNo`（客户订单号） | 只读：来自订单状态表，采购订单表这边不能编辑，展示时沿用订单状态表的 RFQ→PO 兜底逻辑 |

## 权限

- moduleId：`purchaseOrderTable`
- 分类：`registration`
- API：复用 `/api/inquiry` 代理。当用户只有 `purchaseOrderTable`、没有 `inquiry` 权限时：
  - GET 只返回本表需要的字段（详见 `route.ts` 的 `sanitizeRestrictedRecord`）。
  - PUT 只允许写 `purchaseOrderNo`/`purchaseOrderSupplier`/`purchaseOrderAmount`/`orderDeliveryDate`/`orderDeliveryStatus`/`orderDeliveryConsignee`，不能写 `orderConfirmDate`/`orderCustomerNo`（在 API 层强制"只读来自订单状态表"）。
  - 不允许 POST/DELETE（不能新增或删除询报价记录）。
  - `purchaseOrderAmount` 额外受 `order.financials` 权限门槛控制，逻辑与 `orderAmount` 一致（`FINANCIAL_FIELDS` 统一处理）。
  - 若用户同时持有 `purchaseRegistration` 和 `purchaseOrderTable`（都没有 `inquiry`），两者可读写字段取并集。

## 同步

页面复用 `useInquiryStore` 和 `useInquirySync`，和采购部登记一样关闭本地旧询报价缓存合并与本地全量回推（`pushLocal: false, mergeLocal: false`），避免这个受限视图覆盖完整询报价数据。写入用 `patchRecordForView`（只发送本次改动的字段，配合 API 层的受限字段白名单）。

## 历史数据

TASK-101 重构前，`purchase-order-table` 使用独立的 D1 `Document.type='purchase'` 记录（`user_id='_shared_purchase_'`）。该功能 2026-07-07 才上线，重构时评估历史数据量极少，未做数据迁移——旧记录仍留在 D1 里但不再被任何代码读取，如需要可手动查询清理。
