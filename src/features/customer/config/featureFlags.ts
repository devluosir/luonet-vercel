/**
 * 客户管理模块功能开关配置
 * 用于控制新功能的启用/禁用，确保系统稳定性
 */

export interface FeatureFlag {
  name: string;
  description: string;
  enabled: boolean;
  defaultValue: boolean;
  category: 'performance' | 'ui' | 'data' | 'experimental';
  dependencies?: string[];
  metrics?: string[];
}

export interface FeatureFlags {
  timelineAggregation: FeatureFlag;
  savedSegments: FeatureFlag;
  dedupeSuggestions: FeatureFlag;
  indexedDB: FeatureFlag;
  broadcastChannel: FeatureFlag;
  dataVersioning: FeatureFlag;
  performanceMonitoring: FeatureFlag;
  accessibility: FeatureFlag;
  importExport: FeatureFlag;
  auditTrail: FeatureFlag;
}

// 功能开关配置
export const FEATURE_FLAGS: FeatureFlags = {
  timelineAggregation: {
    name: 'timelineAggregation',
    description: '时间轴事件聚合功能，减少噪声提升可读性',
    enabled: true,
    defaultValue: true,
    category: 'ui',
    metrics: ['timeline_events_count', 'timeline_aggregation_rate']
  },
  
  savedSegments: {
    name: 'savedSegments',
    description: '保存搜索筛选片段，提升重复查询效率',
    enabled: true,
    defaultValue: true,
    category: 'ui',
    metrics: ['search_saved_segments_count', 'search_reuse_rate']
  },
  
  dedupeSuggestions: {
    name: 'dedupeSuggestions',
    description: '客户去重建议功能，提升数据质量',
    enabled: false,
    defaultValue: false,
    category: 'data',
    dependencies: ['broadcastChannel'],
    metrics: ['duplicate_detection_rate', 'merge_success_rate']
  },
  
  indexedDB: {
    name: 'indexedDB',
    description: '使用IndexedDB替代localStorage，支持更大数据量',
    enabled: false,
    defaultValue: false,
    category: 'performance',
    dependencies: ['dataVersioning'],
    metrics: ['storage_performance', 'data_capacity']
  },
  
  broadcastChannel: {
    name: 'broadcastChannel',
    description: '多标签页/窗口数据同步',
    enabled: false,
    defaultValue: false,
    category: 'data',
    metrics: ['sync_latency', 'sync_success_rate']
  },
  
  dataVersioning: {
    name: 'dataVersioning',
    description: '数据版本管理和迁移',
    enabled: false,
    defaultValue: false,
    category: 'data',
    metrics: ['migration_success_rate', 'data_integrity']
  },
  
  performanceMonitoring: {
    name: 'performanceMonitoring',
    description: '性能监控和预算控制',
    enabled: true,
    defaultValue: true,
    category: 'performance',
    metrics: ['inp', 'lcp', 'cls', 'error_rate']
  },
  
  accessibility: {
    name: 'accessibility',
    description: '可访问性增强功能',
    enabled: true,
    defaultValue: true,
    category: 'ui',
    metrics: ['lighthouse_a11y_score', 'screen_reader_compatibility']
  },
  
  importExport: {
    name: 'importExport',
    description: '数据导入导出功能',
    enabled: false,
    defaultValue: false,
    category: 'data',
    metrics: ['import_success_rate', 'export_usage_count']
  },
  
  auditTrail: {
    name: 'auditTrail',
    description: '操作审计和权限控制',
    enabled: false,
    defaultValue: false,
    category: 'experimental',
    dependencies: ['broadcastChannel'],
    metrics: ['audit_log_count', 'permission_checks']
  }
};

// 功能开关管理器
export class FeatureFlagManager {
  private static instance: FeatureFlagManager;
  private flags: FeatureFlags;
  private listeners: Map<string, Set<(enabled: boolean) => void>> = new Map();

  private constructor() {
    this.flags = this.loadFlags();
  }

  static getInstance(): FeatureFlagManager {
    if (!FeatureFlagManager.instance) {
      FeatureFlagManager.instance = new FeatureFlagManager();
    }
    return FeatureFlagManager.instance;
  }

  // 加载功能开关配置
  private loadFlags(): FeatureFlags {
    try {
      const stored = localStorage.getItem('customer_feature_flags');
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...FEATURE_FLAGS, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load feature flags from localStorage:', error);
    }
    return FEATURE_FLAGS;
  }

  // 保存功能开关配置
  private saveFlags(): void {
    try {
      localStorage.setItem('customer_feature_flags', JSON.stringify(this.flags));
    } catch (error) {
      console.warn('Failed to save feature flags to localStorage:', error);
    }
  }

  // 检查功能是否启用
  isEnabled(flagName: keyof FeatureFlags): boolean {
    const flag = this.flags[flagName];
    if (!flag) {
      console.warn(`Feature flag '${flagName}' not found`);
      return false;
    }

    // 检查依赖
    if (flag.dependencies) {
      for (const dep of flag.dependencies) {
        if (!this.isEnabled(dep as keyof FeatureFlags)) {
          return false;
        }
      }
    }

    return flag.enabled;
  }

  // 启用/禁用功能
  setEnabled(flagName: keyof FeatureFlags, enabled: boolean): void {
    const flag = this.flags[flagName];
    if (!flag) {
      console.warn(`Feature flag '${flagName}' not found`);
      return;
    }

    const oldValue = flag.enabled;
    flag.enabled = enabled;
    this.saveFlags();

    // 触发监听器
    if (oldValue !== enabled) {
      this.notifyListeners(flagName, enabled);
    }
  }

  // 重置功能开关到默认值
  resetToDefault(flagName?: keyof FeatureFlags): void {
    if (flagName) {
      const flag = this.flags[flagName];
      if (flag) {
        flag.enabled = flag.defaultValue;
        this.notifyListeners(flagName, flag.defaultValue);
      }
    } else {
      // 重置所有功能开关
      Object.keys(this.flags).forEach(key => {
        const flag = this.flags[key as keyof FeatureFlags];
        flag.enabled = flag.defaultValue;
        this.notifyListeners(key as keyof FeatureFlags, flag.defaultValue);
      });
    }
    this.saveFlags();
  }

  // 获取所有功能开关状态
  getAllFlags(): FeatureFlags {
    return { ...this.flags };
  }

  // 添加监听器
  addListener(flagName: keyof FeatureFlags, callback: (enabled: boolean) => void): () => void {
    if (!this.listeners.has(flagName)) {
      this.listeners.set(flagName, new Set());
    }
    this.listeners.get(flagName)!.add(callback);

    // 返回取消监听的函数
    return () => {
      this.listeners.get(flagName)?.delete(callback);
    };
  }

  // 通知监听器
  private notifyListeners(flagName: keyof FeatureFlags, enabled: boolean): void {
    this.listeners.get(flagName)?.forEach(callback => {
      try {
        callback(enabled);
      } catch (error) {
        console.error(`Error in feature flag listener for '${flagName}':`, error);
      }
    });
  }

  // 获取功能开关统计信息
  getStats(): {
    total: number;
    enabled: number;
    disabled: number;
    byCategory: Record<string, { total: number; enabled: number }>;
  } {
    const stats = {
      total: 0,
      enabled: 0,
      disabled: 0,
      byCategory: {} as Record<string, { total: number; enabled: number }>
    };

    Object.entries(this.flags).forEach(([flagName, flag]) => {
      stats.total++;
      // 使用 isEnabled 方法，它会考虑依赖关系
      const isActuallyEnabled = this.isEnabled(flagName as keyof FeatureFlags);
      if (isActuallyEnabled) {
        stats.enabled++;
      } else {
        stats.disabled++;
      }

      if (!stats.byCategory[flag.category]) {
        stats.byCategory[flag.category] = { total: 0, enabled: 0 };
      }
      stats.byCategory[flag.category].total++;
      if (isActuallyEnabled) {
        stats.byCategory[flag.category].enabled++;
      }
    });

    return stats;
  }
}

// 便捷函数
export const isFeatureEnabled = (flagName: keyof FeatureFlags): boolean => {
  return FeatureFlagManager.getInstance().isEnabled(flagName);
};

export const setFeatureEnabled = (flagName: keyof FeatureFlags, enabled: boolean): void => {
  FeatureFlagManager.getInstance().setEnabled(flagName, enabled);
};

export const getFeatureManager = (): FeatureFlagManager => {
  return FeatureFlagManager.getInstance();
};

// 开发环境调试工具
if (process.env.NODE_ENV === 'development') {
  (window as any).__FEATURE_FLAGS__ = {
    manager: FeatureFlagManager.getInstance(),
    isFeatureEnabled,
    setFeatureEnabled,
    getAllFlags: () => FeatureFlagManager.getInstance().getAllFlags(),
    getStats: () => FeatureFlagManager.getInstance().getStats(),
    resetToDefault: (flagName?: keyof FeatureFlags) => 
      FeatureFlagManager.getInstance().resetToDefault(flagName)
  };
}
