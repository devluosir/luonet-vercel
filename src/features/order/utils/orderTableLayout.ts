export type OrderTableBreakpoint = 'sm' | 'md' | 'lg' | 'xl';

/** 当前断点实际渲染的列宽（仅可见列，合计约 100%）。
 *  确认日期列固定出现在「内容简述」之后（sm/md 两个断点，2026-07-10 起也包含），
 *  客户订单号仍然只在 lg/xl 出现——两者不再绑在一起，见 showConfirmDateCol/showLgCols。 */
export function getVisibleColWidths(
  bp: OrderTableBreakpoint,
  canViewFinancials: boolean,
  canBatchEdit = false
): string[] {
  const base = (() => {
    if (bp === 'sm') {
      // 订单编号 / 交货 / 内容简述 / 确认日 / 执行情况
      return ['22%', '10%', '30%', '10%', '28%'];
    }
    if (bp === 'md') {
      // 订单编号 / 交货 / 客户 / 内容简述 / 确认日 / 执行情况
      return ['13%', '7%', '11%', '24%', '8%', '27%'];
    }
    if (bp === 'lg' || (bp === 'xl' && !canViewFinancials)) {
      return ['10%', '5%', '9%', '24%', '5%', '24%', '20%'];
    }
    return ['10%', '4%', '8%', '16%', '4%', '18%', '12%', '10%', '5%', '11%'];
  })();

  if (!canBatchEdit) return base;

  // checkbox 列从第一列（订单编号）借宽度，其余列不变
  const CHECK_WIDTH = 4;
  const widths = base.map((w) => parseFloat(w));
  const [first, ...rest] = widths;
  const adjustedFirst = Math.max(first - CHECK_WIDTH, 4);
  return [`${CHECK_WIDTH}%`, `${adjustedFirst}%`, ...rest.map((w) => `${w}%`)];
}

export function showCustomerCol(bp: OrderTableBreakpoint) {
  return bp !== 'sm';
}

/** 确认日期列：所有断点都显示（2026-07-10 用户反馈中屏/小屏也要看确认日期，
 *  不再跟客户订单号绑在同一个 lg-only 开关下） */
export function showConfirmDateCol(_bp: OrderTableBreakpoint) {
  return true;
}

/** 客户订单号列：仍然只在 lg/xl 显示 */
export function showLgCols(bp: OrderTableBreakpoint) {
  return bp === 'lg' || bp === 'xl';
}

export function showAdminCols(bp: OrderTableBreakpoint, canViewFinancials: boolean) {
  return bp === 'xl' && canViewFinancials;
}
