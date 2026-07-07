# 采购部登记模块

> 状态：**已实现 / 维护中**
> 最后更新：2026-07-07

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
purchaseContentDesc?: string;
purchaseInquiryStatus?: 'internal_supplier' | 'reported_to_sales';
```

这两个字段独立于 `description`、`supplierStatuses`、`quotedStatuses`，只服务采购部登记。

## 权限

- moduleId：`purchaseRegistration`
- 分类：`registration`
- API：复用 `/api/inquiry` 代理，但当用户只有 `purchaseRegistration`、没有 `inquiry` 权限时，只返回采购部登记需要的字段，并且只允许更新采购部描述、采购询报价状态和执行情况。

## 同步

页面复用 `useInquiryStore` 和 `useInquirySync`，但采购部登记关闭本地旧询报价缓存合并与本地全量回推，避免采购部视图覆盖完整询报价数据。
