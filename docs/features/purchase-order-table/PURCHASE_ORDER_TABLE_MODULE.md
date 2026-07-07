# 采购订单表模块

> 状态：**已实现 / 维护中**
> 最后更新：2026-07-07

## 概述

采购订单表是团队共享登记表，用于追踪采购订单的供应商、金额和备货 / 交货 / 发票状态。它与旧 `/purchase` 采购订单创建功能并行，不读取或迁移 `purchase_history`。

## 路由 & 文件结构

```text
src/app/purchase-order-table/page.tsx
src/app/api/purchase-order/[[...path]]/route.ts
src/features/purchase-order-registration/
├── app/PurchaseOrderRegistrationPage.tsx
├── components/PurchaseOrderFilterBar.tsx
├── components/PurchaseOrderFormModal.tsx
├── components/PurchaseOrderRow.tsx
├── components/PurchaseOrderTable.tsx
├── services/purchase-order.service.ts
├── state/purchase-order.store.ts
├── types/index.ts
└── index.ts
```

Worker 入口：`src/worker.ts` 的 `handlePurchaseOrderRequest`。

## 数据模型

采购订单表使用 D1 `Document`：

```text
type = 'purchase'
user_id = '_shared_purchase_'
data = PurchaseOrderRecord JSON
```

核心字段：

```ts
purchaseNo: string;
supplier: string;
amount: string;
currency: 'CNY' | 'USD' | 'EUR';
orderDeliveryStatus?: string;
orderDeliveryConsignee?: string;
```

## 权限

- moduleId：`purchaseOrderTable`
- 分类：`registration`
- Next API 代理 `/api/purchase-order` 会校验该权限后再转发到 Worker。

## 明确边界

- 不自动导入旧 `localStorage.purchase_history`。
- 不改变旧 `/purchase` 单据创建、PDF、Excel、草稿或历史记录逻辑。
- 新表的 D1 记录只服务团队共享登记和状态追踪。
