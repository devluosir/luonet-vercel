/**
 * 采购部登记 / 采购订单表"受限视图"的字段级读写规则，拆成不依赖 next/server 的纯函数，
 * 方便单元测试直接 import（route.ts 顶层 import next/server 后，jsdom 测试环境里
 * 全局 Request/Response 未定义会导致模块加载失败，这里独立成模块规避该问题）。
 */

// 采购部登记（purchaseRegistration 权限，无 inquiry 权限时）可读写的字段
// 注意：supplierStatuses 本是询报价登记的字段，这里放行仅用于"已报价自动同步飞罗"
// 场景——采购部登记的询报价状态变为已报价时，前端会计算出只调整了"飞罗"这一条的
// supplierStatuses 补丁再写回来，不是让本视图随意改写整份供应商列表。
// 注意：quotedStatuses 有意不出现在这个列表里——它现在只读开放给受限视图（见
// sanitizeRestrictedRecord），采购权限不允许写入销售侧的询报价关闭等状态。
export const PURCHASE_REGISTRATION_WRITE_FIELDS = [
  'description',
  'purchaseSupplierStatuses',
  'purchaseQuotedStatuses',
  'supplierStatuses',
] as const;

// 采购订单表可读写的字段（TASK-111 起，purchaseOrderTable 权限已并入 purchaseRegistration，
// 持有 purchaseRegistration 即同时拥有采购部登记 + 采购订单表两个页面的访问权，两组字段一并放行）
// 注意：orderConfirmDate / orderCustomerNo 不在这里——这两个字段"来自订单状态表"，
// 采购订单表这边只读展示，不允许写入；orderDeliveryDate / orderDeliveryStatus /
// orderDeliveryConsignee 是双向共享字段，订单状态表和采购订单表都能编辑。
export const PURCHASE_ORDER_TABLE_WRITE_FIELDS = [
  'purchaseOrderNo',
  'purchaseOrderSupplier',
  'purchaseOrderAmount',
  'orderDeliveryDate',
  'orderDeliveryStatus',
  'orderDeliveryConsignee',
] as const;

export interface RestrictedViewFlags {
  allowPurchaseRegistration: boolean;
  allowPurchaseOrderTable: boolean;
}

/** 采购部登记 / 采购订单表这类"受限视图"用户能看到的字段（两者可同时为 true，取并集） */
export function sanitizeRestrictedRecord(
  record: Record<string, unknown>,
  flags: RestrictedViewFlags
): Record<string, unknown> {
  const result: Record<string, unknown> = {
    id: record.id,
    inquiryDate: record.inquiryDate,
    inquiryNo: record.inquiryNo,
    orderNo: record.orderNo,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    status: record.status,
  };

  if (flags.allowPurchaseRegistration) {
    result.description = record.description;
    result.purchaseSupplierStatuses = record.purchaseSupplierStatuses;
    result.purchaseQuotedStatuses = record.purchaseQuotedStatuses;
    // 只读展示 + "已报价自动同步飞罗"逻辑需要读到询报价登记原始的供应商列表，
    // 才能判断飞罗当前状态、日期是否已经是最新，避免每次保存都重复写入。
    result.supplierStatuses = record.supplierStatuses;
    // 只读开放完整 quotedStatuses（不裁剪成部分数组），让采购部登记能读到销售侧真实的
    // "询价已关闭"状态（type === 'closed'）。注意：quotedStatuses 不在
    // PURCHASE_REGISTRATION_WRITE_FIELDS 里，采购权限发起的 PUT 即使带了这个字段也会被
    // pickRestrictedPatch 丢弃——这里只放行读，不放行写。返回完整数组而非裁剪后的部分数组，
    // 前端 mergeFieldsOnly 走字段级合并即可安全使用，不会把完整销售状态覆盖成残缺数组。
    result.quotedStatuses = record.quotedStatuses;
  }

  if (flags.allowPurchaseOrderTable) {
    result.orderSubStatus = record.orderSubStatus;
    result.purchaseOrderNo = record.purchaseOrderNo;
    result.purchaseOrderSupplier = record.purchaseOrderSupplier;
    result.purchaseOrderAmount = record.purchaseOrderAmount;
    result.orderDeliveryDate = record.orderDeliveryDate;
    result.orderConfirmDate = record.orderConfirmDate;
    result.orderCustomerNo = record.orderCustomerNo;
    result.orderDeliveryStatus = record.orderDeliveryStatus;
    result.orderDeliveryConsignee = record.orderDeliveryConsignee;
  }

  return result;
}

export function pickRestrictedPatch(
  body: Record<string, unknown>,
  allowedFields: Set<string>
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  allowedFields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      patch[field] = body[field];
    }
  });
  return patch;
}
