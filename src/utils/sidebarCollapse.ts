export const COLLAPSED_KEY = 'sidebar_collapsed';

export const SIDEBAR_WIDTH_EXPANDED = '260px';
export const SIDEBAR_WIDTH_COLLAPSED = '3.5rem';

export function readCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
}

/** 同步 DOM/CSS 变量，供预置脚本与 React 共用 */
export function applySidebarCollapseToDom(collapsed: boolean): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.style.setProperty(
    '--sidebar-width',
    collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED,
  );
  root.style.setProperty(
    '--sidebar-margin',
    collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED,
  );

  if (collapsed) {
    root.dataset.sidebarCollapsed = 'true';
  } else {
    delete root.dataset.sidebarCollapsed;
  }
}

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeSidebarCollapse(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifySidebarCollapseChange(): void {
  listeners.forEach((listener) => listener());
}

export function getSidebarCollapsedSnapshot(): boolean {
  return readCollapsed();
}

export function setSidebarCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(COLLAPSED_KEY, String(collapsed));
  } catch {
    /* ignore */
  }
  applySidebarCollapseToDom(collapsed);
  notifySidebarCollapseChange();
}

export function toggleSidebarCollapsed(): boolean {
  const next = !readCollapsed();
  setSidebarCollapsed(next);
  return next;
}

/** 首屏预置脚本（内联于 layout.tsx，保持与此逻辑一致） */
export const SIDEBAR_COLLAPSE_BOOTSTRAP_SCRIPT = `
try {
  if (localStorage.getItem('${COLLAPSED_KEY}') === 'true') {
    var root = document.documentElement;
    root.style.setProperty('--sidebar-width', '${SIDEBAR_WIDTH_COLLAPSED}');
    root.style.setProperty('--sidebar-margin', '${SIDEBAR_WIDTH_COLLAPSED}');
    root.dataset.sidebarCollapsed = 'true';
  }
} catch (e) {
  console.error('侧边栏预置脚本错误:', e);
}
`.trim();
