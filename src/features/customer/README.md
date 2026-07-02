# Customer Feature

最后更新：2026-07-02

本模块是客户、供应商、收货人资料库的实现代码。面向业务维护的说明见 `docs/features/customer/README.md`，当前系统事实见 `docs/core/CURRENT_STATE.md`。

## 当前模型

- `Customer` 表示公司/供应商/收货人主体。
- `Contact` 表示联络人。
- `Customer.type` 区分 `customer`、`supplier`、`consignee`。
- 客户分类通过 `Customer.data.category` 和 `Customer.data.categoryNote` 透传保存。

不要再把联系人姓名、电话、邮箱塞回 `Customer.name/email/phone` 顶层字段。

## 主要文件

```text
app/
  CustomerPage.tsx
  CustomerDetailPage.tsx
components/
  CustomerForm.tsx
  CustomerList.tsx
  ProfileCardGrid.tsx
  CustomerInfoCard.tsx
  CustomerActivityFeed.tsx
  CustomerContactPicker.tsx
  ProfileListParts.tsx
hooks/
  useCustomerData.ts
  useCustomerActions.ts
  useCustomerForm.ts
services/
  customerService.ts
  supplierService.ts
  consigneeService.ts
  inquiryTimelineService.ts
types/
  index.ts
```

## 关键行为

- 客户页支持客户/供应商/收货人 tab，列表/卡片视图，搜索和客户分类筛选。
- 客户详情页显示资料、联络人、统计、活动列表和跟进。
- 活动列表按 `customerId`、`contactId`、旧 `inquirer` 文本兜底匹配该客户全部联络人的询价。
- `CustomerContactPicker` 是询报价新增、编辑、批量关联共用的客户/联络人选择器。
- 同一客户多个联络人标签退化为相同公司简称时，选择器只保留一项，优先主联络人。

## 验证建议

修改本模块后至少运行：

```bash
npx tsc --noEmit
npx eslint src/features/customer
```

涉及询报价联动时，同时检查：

```text
src/features/inquiry/components/InquiryFormModal.tsx
src/features/inquiry/components/BatchLinkCustomerModal.tsx
src/features/inquiry/app/InquiryPage.tsx
```
