import {
  COLLAPSED_KEY,
  applySidebarCollapseToDom,
  readCollapsed,
  setSidebarCollapsed,
  toggleSidebarCollapsed,
} from '@/utils/sidebarCollapse';

describe('sidebarCollapse', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.style.removeProperty('--sidebar-width');
    document.documentElement.style.removeProperty('--sidebar-margin');
    delete document.documentElement.dataset.sidebarCollapsed;
  });

  it('readCollapsed returns false by default', () => {
    expect(readCollapsed()).toBe(false);
  });

  it('setSidebarCollapsed persists and updates CSS variables', () => {
    setSidebarCollapsed(true);

    expect(localStorage.getItem(COLLAPSED_KEY)).toBe('true');
    expect(readCollapsed()).toBe(true);
    expect(document.documentElement.style.getPropertyValue('--sidebar-width')).toBe('3.5rem');
    expect(document.documentElement.dataset.sidebarCollapsed).toBe('true');

    setSidebarCollapsed(false);

    expect(localStorage.getItem(COLLAPSED_KEY)).toBe('false');
    expect(document.documentElement.style.getPropertyValue('--sidebar-width')).toBe('240px');
    expect(document.documentElement.dataset.sidebarCollapsed).toBeUndefined();
  });

  it('toggleSidebarCollapsed flips state', () => {
    expect(toggleSidebarCollapsed()).toBe(true);
    expect(toggleSidebarCollapsed()).toBe(false);
  });

  it('applySidebarCollapseToDom syncs expanded layout', () => {
    applySidebarCollapseToDom(false);
    expect(document.documentElement.style.getPropertyValue('--sidebar-margin')).toBe('240px');
  });
});
