export type PurchaseOrderTableBreakpoint = 'sm' | 'md' | 'lg' | 'xl';

/**
 * 采购订单表响应式列宽/可见性规则（2026-07-10 用户要求，参考 order/utils/orderTableLayout.ts 同款模式）：
 * - lg/xl：全部列都显示
 * - md：隐藏「客户订单号」
 * - sm：在 md 的基础上再隐藏「采购单号」「确认日期」
 * 「内容描述」「供应商」「交货日期」「执行情况」任何断点都显示；「金额」列只受采购订单表金额权限控制，
 * 跟断点无关（沿用改动前的既有行为）。
 */

/** 当前断点实际渲染的列宽（仅可见列，合计约 100%） */
export function getVisibleColWidths(bp: PurchaseOrderTableBreakpoint, canViewFinancials: boolean): string[] {
  if (bp === 'sm') {
    // 订单编号 / 内容描述 / 供应商 / (金额) / 交货日期 / 执行情况
    return canViewFinancials
      ? ['14%', '30%', '16%', '12%', '12%', '16%']
      : ['16%', '34%', '20%', '14%', '16%'];
  }
  if (bp === 'md') {
    // 订单编号 / 内容描述 / 采购单号 / 供应商 / (金额) / 交货日期 / 确认日期 / 执行情况
    return canViewFinancials
      ? ['12%', '22%', '12%', '14%', '10%', '10%', '9%', '11%']
      : ['13%', '25%', '13%', '16%', '11%', '10%', '12%'];
  }
  // lg / xl：订单编号 / 内容描述 / 采购单号 / 供应商 / (金额) / 交货日期 / 确认日期 / 客户订单号 / 执行情况
  return canViewFinancials
    ? ['10%', '18%', '10%', '12%', '9%', '8%', '8%', '12%', '13%']
    : ['11%', '20%', '11%', '13%', '9%', '9%', '13%', '14%'];
}

/** 采购单号列：sm 断点隐藏 */
export function showPurchaseOrderNoCol(bp: PurchaseOrderTableBreakpoint) {
  return bp !== 'sm';
}

/** 确认日期列：sm 断点隐藏 */
export function showConfirmDateCol(bp: PurchaseOrderTableBreakpoint) {
  return bp !== 'sm';
}

/** 客户订单号列：只在 lg/xl 显示 */
export function showCustomerNoCol(bp: PurchaseOrderTableBreakpoint) {
  return bp === 'lg' || bp === 'xl';
}
