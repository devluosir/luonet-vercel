/**
 * Theme mode manager.
 *
 * Button/card styling is now static Tailwind classes; this manager only owns
 * light/dark mode and the small set of global theme variables.
 */

export type ThemeMode = 'light' | 'dark';

export interface ThemeConfig {
  mode: ThemeMode;
  primaryColor?: string;
  accentColor?: string;
}

export const DEFAULT_THEME: ThemeConfig = {
  mode: 'light',
  primaryColor: '#2563eb',
  accentColor: '#059669',
};

export class ThemeManager {
  private static instance: ThemeManager;
  private config: ThemeConfig = DEFAULT_THEME;
  private listeners: Set<(config: ThemeConfig) => void> = new Set();
  private isInitialized = false;
  private applyThemeDebounceTimer: NodeJS.Timeout | null = null;
  private lastAppliedConfig = '';

  private constructor() {
    if (typeof window !== 'undefined') {
      this.loadFromStorage();
      this.initializeTheme();
    }
  }

  static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager();
    }
    return ThemeManager.instance;
  }

  private initializeTheme(): void {
    if (this.isInitialized) return;

    this.applyTheme();
    this.isInitialized = true;

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.applyTheme());
    } else {
      setTimeout(() => this.applyTheme(), 0);
    }
  }

  getConfig(): ThemeConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<ThemeConfig>): void {
    this.config = { ...this.config, ...updates };

    const newConfigString = JSON.stringify(this.config);
    if (newConfigString === this.lastAppliedConfig) return;

    this.saveToStorage();
    this.debouncedApplyTheme();
    this.notifyListeners();
  }

  private debouncedApplyTheme(): void {
    if (this.applyThemeDebounceTimer) {
      clearTimeout(this.applyThemeDebounceTimer);
    }

    this.applyThemeDebounceTimer = setTimeout(() => {
      this.applyTheme();
      this.applyThemeDebounceTimer = null;
    }, 50);
  }

  toggleMode(): void {
    this.updateConfig({ mode: this.config.mode === 'light' ? 'dark' : 'light' });
  }

  setMode(mode: ThemeMode): void {
    this.updateConfig({ mode });
  }

  private applyTheme(): void {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    const configString = JSON.stringify(this.config);
    if (configString === this.lastAppliedConfig) return;

    root.classList.toggle('dark', this.config.mode === 'dark');
    this.setCSSVariables();
    this.lastAppliedConfig = configString;
  }

  private setCSSVariables(): void {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    if (this.config.primaryColor) {
      root.style.setProperty('--primary-color', this.config.primaryColor);
    }
    if (this.config.accentColor) {
      root.style.setProperty('--accent-color', this.config.accentColor);
    }
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem('theme-config') ?? localStorage.getItem('themeConfig');
      if (!stored) return;

      const parsed = JSON.parse(stored) as Partial<ThemeConfig>;
      this.config = {
        ...DEFAULT_THEME,
        mode: parsed.mode === 'dark' ? 'dark' : 'light',
        primaryColor: parsed.primaryColor,
        accentColor: parsed.accentColor,
      };
    } catch (error) {
      console.error('加载主题配置失败:', error);
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem('theme-config', JSON.stringify(this.config));
      localStorage.setItem('themeConfig', JSON.stringify(this.config));
    } catch (error) {
      console.error('保存主题配置失败:', error);
    }
  }

  addListener(listener: (config: ThemeConfig) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.config);
      } catch (error) {
        console.error('主题监听器通知失败:', error);
      }
    });
  }
}

export const themeManager = ThemeManager.getInstance();
