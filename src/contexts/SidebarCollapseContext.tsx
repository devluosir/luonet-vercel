'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import {
  applySidebarCollapseToDom,
  getSidebarCollapsedSnapshot,
  readCollapsed,
  setSidebarCollapsed,
  subscribeSidebarCollapse,
  toggleSidebarCollapsed,
} from '@/utils/sidebarCollapse';

interface SidebarCollapseContextValue {
  collapsed: boolean;
  toggleCollapse: () => void;
}

const SidebarCollapseContext = createContext<SidebarCollapseContextValue | null>(null);

export function SidebarCollapseProvider({ children }: { children: ReactNode }) {
  const collapsed = useSyncExternalStore(
    subscribeSidebarCollapse,
    getSidebarCollapsedSnapshot,
    () => false,
  );

  // hydration 后与 DOM 对齐（预置脚本可能已写入 CSS 变量）
  useEffect(() => {
    applySidebarCollapseToDom(readCollapsed());
  }, []);

  const toggleCollapse = useCallback(() => {
    toggleSidebarCollapsed();
  }, []);

  return (
    <SidebarCollapseContext.Provider value={{ collapsed, toggleCollapse }}>
      {children}
    </SidebarCollapseContext.Provider>
  );
}

export function useSidebarCollapse() {
  const ctx = useContext(SidebarCollapseContext);
  if (!ctx) {
    throw new Error('useSidebarCollapse must be used within SidebarCollapseProvider');
  }
  return ctx;
}

export { setSidebarCollapsed };
