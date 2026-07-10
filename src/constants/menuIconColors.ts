/**
 * 菜单图标专属配色（侧边栏 `AppSidebar.tsx`、移动端底部导航 `MobileBottomTab.tsx`、
 * 用户下拉菜单 `AppUserMenu.tsx` 共用一份，保证同一个功能入口在不同菜单里颜色一致）。
 *
 * 颜色固定常驻在图标上，不随选中态变化——选中态改用背景高亮块区分（见各菜单组件的
 * active/inactive 样式），不再靠"未选中灰、选中变色"来表达状态。
 */

/** 按 `SidebarItem`/`MobileMenuLink` 的 id 索引 */
export const MENU_ICON_COLORS: Record<string, string> = {
  dashboard: 'text-sky-600 dark:text-sky-400',

  // 新单据
  quotation: 'text-blue-600 dark:text-blue-400',
  confirmation: 'text-emerald-600 dark:text-emerald-400',
  'quotation-domestic': 'text-blue-600 dark:text-blue-400',
  'quotation-domestic-contract': 'text-emerald-600 dark:text-emerald-400',
  packing: 'text-cyan-600 dark:text-cyan-400',
  invoice: 'text-violet-600 dark:text-violet-400',
  purchase: 'text-orange-600 dark:text-orange-400',

  // 登记表
  inquiry: 'text-pink-500 dark:text-pink-400',
  order: 'text-teal-600 dark:text-teal-400',
  'purchase-registration': 'text-amber-600 dark:text-amber-400',
  'purchase-order-table': 'text-amber-600 dark:text-amber-400',

  // 管理
  history: 'text-rose-600 dark:text-rose-400',
  customer: 'text-fuchsia-600 dark:text-fuchsia-400',

  // 工具
  impa: 'text-lime-600 dark:text-lime-400',
  clock: 'text-yellow-600 dark:text-yellow-400',
  holidays: 'text-red-500 dark:text-red-400',
  rmb: 'text-green-600 dark:text-green-400',
  mail: 'text-indigo-600 dark:text-indigo-400',
};

/** 移动端底部导航的顶层分类图标（新建/登记/管理/工具/我），跟子菜单项分开一套配色 */
export const MOBILE_CATEGORY_ICON_COLORS: Record<string, string> = {
  dashboard: 'text-sky-600 dark:text-sky-400',
  new: 'text-blue-600 dark:text-blue-400',
  register: 'text-pink-500 dark:text-pink-400',
  manage: 'text-rose-600 dark:text-rose-400',
  tools: 'text-indigo-600 dark:text-indigo-400',
  me: 'text-slate-600 dark:text-slate-400',
};

/** 用户下拉菜单（`AppUserMenu.tsx` + `MobileBottomTab.tsx`"我"子菜单）里几个操作项的图标配色 */
export const USER_MENU_ICON_COLORS = {
  about: 'text-sky-600 dark:text-sky-400',
  profile: 'text-indigo-600 dark:text-indigo-400',
  preload: 'text-blue-600 dark:text-blue-400',
  admin: 'text-slate-600 dark:text-slate-400',
  logout: 'text-red-500 dark:text-red-400',
} as const;

export const DEFAULT_MENU_ICON_COLOR = 'text-gray-500 dark:text-gray-400';
