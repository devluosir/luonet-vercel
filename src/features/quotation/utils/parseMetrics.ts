// 解析指标埋点系统
export interface ParseMetrics {
  // 推断相关指标
  qi_infer_confidence: {
    confidence: number;
    rows: number;
    cols: number;
    mixed: boolean;
    mapping: Record<string, number>; // field -> column index
  };

  // 预览打开原因
  qi_preview_open_reason: {
    reason: 'low_confidence' | 'mixed_format' | 'manual' | 'too_many_columns' | 'large_dataset';
    confidence?: number;
    rowCount?: number;
    colCount?: number;
  };

  // 插入结果
  qi_insert_result: {
    inserted: number;
    skipped: number;
    duration_ms: number;
    method: 'enhanced' | 'legacy' | 'manual';
  };

  // 列映射分布
  qi_mapping_dist: {
    name?: number;
    desc?: number;
    qty?: number;
    unit?: number;
    price?: number;
    ignore: number;
  };

  // 警告统计
  qi_warning_stats: {
    type: string;
    count: number;
    severity: 'error' | 'warning' | 'info';
  }[];

  // Day 4 新增：自动修复统计
  qi_autofix_stats: {
    originalWarnings: number;
    fixedWarnings: number;
    droppedRows: number;
    mergedRows: number;
    fixedUnits: number;
    fixedNumbers: number;
    fixSuccessRate: number;
  };
}

// 特性开关配置
export interface ParseFeatureFlags {
  // 增强列推断
  enhancedInferenceEnabled: boolean;

  // 自动插入阈值 (0-100)
  autoInsertThreshold: number;

  // 显示警告
  showWarnings: boolean;

  // 匈牙利算法
  useHungarianMatching: boolean;

  // 性能优化
  enableCaching: boolean;

  // 采样大小
  maxSampleSize: number;

  // 大数据集阈值
  largeDatasetThreshold: number;

  // Day 4 新增：数据质量校验
  tinyPrice?: number;       // 最小价格阈值，默认 0.01
  largeQty?: number;        // 大数量阈值，默认 1e6
  minNameLen?: number;      // 最小名称长度，默认 2
  defaultUnit?: string;     // 默认单位，默认 'pc'
  roundPriceTo?: number;    // 价格小数位，默认 2
  mergeDuplicates?: boolean;// 是否合并重复项，默认 true
  autoFixEnabled?: boolean; // 是否启用自动修复，默认 true
  cleanNumbers?: boolean;   // 是否清洗数字格式，默认 true
}

export const DEFAULT_FEATURE_FLAGS: ParseFeatureFlags = {
  enhancedInferenceEnabled: true,
  autoInsertThreshold: 50, // 降低阈值，让表头识别更容易触发
  showWarnings: true,
  useHungarianMatching: true,
  enableCaching: true,
  maxSampleSize: 50,
  largeDatasetThreshold: 1000,
  // Day 4 默认值
  tinyPrice: 0.01,
  largeQty: 1_000_000,
  minNameLen: 2,
  defaultUnit: 'pc',
  roundPriceTo: 2,
  mergeDuplicates: true,
  autoFixEnabled: true,
  cleanNumbers: true,
};

// 指标收集器
class MetricsCollector {
  private metrics: Partial<ParseMetrics> = {};
  private startTime: number = 0;

  startTiming(): void {
    this.startTime = performance.now();
  }

  endTiming(): number {
    return Math.round(performance.now() - this.startTime);
  }

  recordInference(confidence: number, rows: number, cols: number, mixed: boolean, mapping: Record<string, number>): void {
    this.metrics.qi_infer_confidence = {
      confidence,
      rows,
      cols,
      mixed,
      mapping
    };
  }

  recordPreviewReason(reason: ParseMetrics['qi_preview_open_reason']['reason'], context?: Partial<Omit<ParseMetrics['qi_preview_open_reason'], 'reason'>>): void {
    this.metrics.qi_preview_open_reason = {
      reason,
      ...context
    };
  }

  recordInsertResult(inserted: number, skipped: number, method: ParseMetrics['qi_insert_result']['method']): void {
    this.metrics.qi_insert_result = {
      inserted,
      skipped,
      duration_ms: this.endTiming(),
      method
    };
  }

  recordMappingDistribution(mapping: string[]): void {
    const dist: ParseMetrics['qi_mapping_dist'] = { ignore: 0 };

    mapping.forEach((field, index) => {
      if (field === 'ignore') {
        dist.ignore++;
      } else if (field === 'name' || field === 'desc' || field === 'qty' || field === 'unit' || field === 'price') {
        dist[field] = index;
      }
    });

    this.metrics.qi_mapping_dist = dist;
  }

  recordWarnings(warnings: Array<{type: string, severity: 'error' | 'warning' | 'info'}>): void {
    const warningStats = new Map<string, {count: number, severity: 'error' | 'warning' | 'info'}>();

    warnings.forEach(w => {
      const existing = warningStats.get(w.type);
      if (existing) {
        existing.count++;
      } else {
        warningStats.set(w.type, { count: 1, severity: w.severity });
      }
    });

    this.metrics.qi_warning_stats = Array.from(warningStats.entries()).map(([type, data]) => ({
      type,
      count: data.count,
      severity: data.severity
    }));
  }

  recordAutoFix(
    originalWarnings: number,
    fixedWarnings: number,
    droppedRows: number,
    mergedRows: number,
    fixedUnits: number,
    fixedNumbers: number
  ): void {
    const fixSuccessRate = originalWarnings > 0 ? (originalWarnings - fixedWarnings) / originalWarnings : 1;

    this.metrics.qi_autofix_stats = {
      originalWarnings,
      fixedWarnings,
      droppedRows,
      mergedRows,
      fixedUnits,
      fixedNumbers,
      fixSuccessRate: Math.round(fixSuccessRate * 100) / 100
    };
  }

  flush(): Partial<ParseMetrics> {
    const result = { ...this.metrics };
    this.metrics = {};
    return result;
  }

  // 发送到分析服务（开发环境仅打印）
  send(): void {
    const metrics = this.flush();

    if (process.env.NODE_ENV === 'development') {
      console.groupCollapsed('[Parse Metrics]');
      console.table(metrics);
      console.groupEnd();
    }

    // 生产环境可以发送到分析服务
    // analytics.track('parse_metrics', metrics);
  }
}

// 全局指标收集器实例
export const parseMetrics = new MetricsCollector();

// 获取特性开关（从localStorage或默认值）
export function getFeatureFlags(): ParseFeatureFlags {
  if (typeof window === 'undefined') {
    return DEFAULT_FEATURE_FLAGS;
  }

  try {
    const stored = localStorage.getItem('qi.featureFlags');
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_FEATURE_FLAGS, ...parsed };
    }
  } catch (e) {
    console.warn('Failed to parse feature flags:', e);
  }

  return DEFAULT_FEATURE_FLAGS;
}

// 设置特性开关
export function setFeatureFlags(flags: Partial<ParseFeatureFlags>): void {
  if (typeof window === 'undefined') return;

  try {
    const current = getFeatureFlags();
    const updated = { ...current, ...flags };
    localStorage.setItem('qi.featureFlags', JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save feature flags:', e);
  }
}

// 开发调试工具
export function debugParseFlags(): void {
  if (process.env.NODE_ENV === 'development') {
    const flags = getFeatureFlags();
    console.table(flags);

    // 全局暴露调试函数
    const debugWindow = window as Window & {
      setQuickImportFlags?: typeof setFeatureFlags;
      getQuickImportFlags?: typeof getFeatureFlags;
    };
    debugWindow.setQuickImportFlags = setFeatureFlags;
    debugWindow.getQuickImportFlags = getFeatureFlags;
    console.log('💡 Use window.setQuickImportFlags({autoInsertThreshold: 80}) to adjust settings');
  }
}
