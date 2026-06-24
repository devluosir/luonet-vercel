export type OrderTableBreakpoint = 'sm' | 'md' | 'lg' | 'xl';

/** 当前断点实际渲染的列宽（仅可见列，合计 100%） */
export function getVisibleColWidths(bp: OrderTableBreakpoint, isAdmin: boolean): string[] {
  if (bp === 'sm') {
    return ['26%', '12%', '36%', '26%'];
  }
  if (bp === 'md') {
    return ['14%', '7%', '12%', '28%', '29%'];
  }
  if (bp === 'lg' || (bp === 'xl' && !isAdmin)) {
    return ['10%', '5%', '9%', '24%', '5%', '24%', '20%'];
  }
  return ['10%', '4%', '8%', '16%', '4%', '18%', '12%', '10%', '5%', '11%'];
}

export function showCustomerCol(bp: OrderTableBreakpoint) {
  return bp !== 'sm';
}

export function showLgCols(bp: OrderTableBreakpoint) {
  return bp === 'lg' || bp === 'xl';
}

export function showAdminCols(bp: OrderTableBreakpoint, isAdmin: boolean) {
  return bp === 'xl' && isAdmin;
}
