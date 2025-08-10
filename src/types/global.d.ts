import { ThemeManager } from '@/utils/themeUtils';

declare global {
  interface Window {
    themeManager?: ThemeManager;
  }
}

export {};
