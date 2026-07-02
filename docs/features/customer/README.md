# 客户管理模块

最后更新：2026-07-02

## 当前定位

客户管理模块负责维护客户、供应商、收货人及其联络人资料，并为询报价登记、采购订单、装箱单等业务模块提供结构化选择来源。

当前模型已经从“联系人信息塞在公司顶层字段”升级为：

- 公司信息：`Customer`
- 联络人信息：`contacts[]`
- 资料类型：`customer` / `supplier` / `consignee`

## 数据模型

### Customer

核心字段：

- `id`
- `type`
- `name`
- `shortName`
- `code`
- `email`
- `phone`
- `address`
- `contacts`
- `category`
- `categoryNote`
- `data`

客户分类只适用于 `type = customer`：

```text
A
B
C
New
Blacklist
```

分类和分类备注通过 `Customer.data` 透传保存为：

```text
data.category
data.categoryNote
```

未新增 D1 schema 字段。

### Contact

核心字段：

- `id`
- `name`
- `shortName`
- `email`
- `phone`
- `isPrimary`
- `sortOrder`

读取和保存时会保证主联络人规则，选择器展示时优先使用简称。

## 页面能力

### `/customer`

- 客户 / 供应商 / 收货人三 tab。
- 列表视图和卡片视图。
- 搜索。
- 客户分类筛选 chip。
- 新增、编辑、删除。
- 行点击进入详情，编辑/删除通过菜单操作。

### `/customer/detail`

- 公司资料。
- 全部联络人。
- 客户分类与备注。
- 业务统计。
- 统一活动列表。
- 跟进记录。
- 跳转询报价筛选。

客户详情活动列表会显示该客户全部联络人的询价记录，匹配顺序：

1. `customerId` 精确匹配。
2. `contactId` 属于该客户任一联络人。
3. 旧记录按规范化 `inquirer` 文本兜底匹配。

## 与询报价的关系

- 新增询价必须选择客户/联络人。
- 编辑已关联询价时，显示以客户资料里的联络人为准。
- 批量关联会写入 `customerId`、`contactId` 和规范化 `inquirer`。
- `CustomerContactPicker` 展示规则：
  - 公司和联络人都有简称：`公司简称-联络人简称`。
  - 公司有简称、联络人无简称：只显示公司简称。
  - 多个联络人标签退化为同一公司名时，只保留一项，优先主联络人。

## 关键文件

```text
src/features/customer/app/CustomerPage.tsx
src/features/customer/app/CustomerDetailPage.tsx
src/features/customer/components/CustomerForm.tsx
src/features/customer/components/CustomerList.tsx
src/features/customer/components/ProfileCardGrid.tsx
src/features/customer/components/CustomerInfoCard.tsx
src/features/customer/components/CustomerActivityFeed.tsx
src/features/customer/components/CustomerContactPicker.tsx
src/features/customer/components/ProfileListParts.tsx
src/features/customer/hooks/useCustomerData.ts
src/features/customer/hooks/useCustomerActions.ts
src/features/customer/hooks/useCustomerForm.ts
src/features/customer/services/customerService.ts
src/features/customer/services/inquiryTimelineService.ts
src/features/customer/types/index.ts
```

## 注意事项

- 不要重新把联系人姓名、电话、邮箱写回 `Customer.name/email/phone` 顶层当作联系人信息。
- 装箱单 Consignee 的自由文本保存动作已移除，不应再从装箱单反向污染收货人资料库。
- 客户分类不需要 D1 schema 迁移，继续走 `data` JSON 透传。
- 修改客户/联络人选择逻辑时，同时检查询报价新增、编辑、批量关联三个入口。
