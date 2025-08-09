import { useState, useEffect } from 'react';
import { quickParseTSV } from '@/features/quotation/utils/quickParse';
import { quickSmartParse, type ParseResult } from '@/features/quotation/utils/quickSmartParse';
import { getFeatureFlags } from '@/features/quotation/utils/parseMetrics';
import { ConfidenceBadge } from '@/components/quickimport/ConfidenceBadge';
import { WarningChips, type WarningChip } from '@/components/quickimport/WarningChips';
import { InferenceStatsBar } from '@/components/quickimport/InferenceStatsBar';
import { CheckCircle2, Eye, AlertCircle, Upload, Wrench } from 'lucide-react';
import { validateRows, DEFAULT_VALIDATOR_CONFIG, type ValidationWarning } from '@/components/quickimport/validators';
import { generateAutoFixes, applyFixes, DEFAULT_AUTOFIX, type FixReport as FixReportType } from '@/components/quickimport/autofix';
import { FixReport } from '@/components/quickimport/FixReport';

export function QuickImport({ 
  onInsert,
  presetRaw,
  presetParsed,
  onClosePreset,
}: { 
  onInsert: (items: any[], replaceMode?: boolean) => void;
  presetRaw?: string;
  presetParsed?: ParseResult;
  onClosePreset?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState('');
  const [preview, setPreview] = useState<any[]|null>(null);
  const [skipped, setSkipped] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [detectedFormat, setDetectedFormat] = useState('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [replaceMode, setReplaceMode] = useState(false);
  const [customWarnings, setCustomWarnings] = useState<ValidationWarning[]>([]);
  const [fixReport, setFixReport] = useState<FixReportType | null>(null);
  const [showFixReport, setShowFixReport] = useState(false);
  
  // 获取特性开关
  const featureFlags = getFeatureFlags();

  // 处理预设数据（从全局粘贴回退而来）
  useEffect(() => {
    if (presetRaw || presetParsed) {
      setRaw(presetRaw || '');
      setPreview(presetParsed?.rows || null);
      setSkipped(presetParsed?.skipped || 0);
      setConfidence(presetParsed?.confidence || 0);
      setDetectedFormat(presetParsed?.detectedFormat || '');
      setParseResult(presetParsed || null);
      setOpen(true);
    }
  }, [presetRaw, presetParsed]);

  const handlePreview = () => {
    // 优先使用新的智能解析器
    const smartResult = quickSmartParse(raw);
    if (smartResult.rows.length > 0) {
      setPreview(smartResult.rows);
      setSkipped(smartResult.skipped);
      setConfidence(smartResult.confidence);
      setDetectedFormat(smartResult.detectedFormat || '');
      setParseResult(smartResult);
      
      // Day 4 新增：额外的数据质量校验
      if (featureFlags.showWarnings) {
        const warnings = validateRows(smartResult.rows, {
          ...DEFAULT_VALIDATOR_CONFIG,
          tinyPrice: featureFlags.tinyPrice ?? 0.01,
          largeQty: featureFlags.largeQty ?? 1_000_000,
          minNameLen: featureFlags.minNameLen ?? 2,
          requireUnit: true,
        });
        setCustomWarnings(warnings);
      }
      
      // 重置修复状态
      setFixReport(null);
      setShowFixReport(false);
    } else {
      // 回退到原解析器
      const res = quickParseTSV(raw);
      setPreview(res);
      // @ts-ignore
      setSkipped(res.skipped || 0);
      setConfidence(0.5); // 中等置信度
      setDetectedFormat('legacy');
      setParseResult(null);
      setCustomWarnings([]);
      setFixReport(null);
      setShowFixReport(false);
    }
  };

  const closeAll = () => {
    setOpen(false); 
    setRaw(''); 
    setPreview(null); 
    setSkipped(0);
    setConfidence(0);
    setDetectedFormat('');
    setParseResult(null);
    setReplaceMode(false);
    setCustomWarnings([]);
    setFixReport(null);
    setShowFixReport(false);
    onClosePreset?.();
  };

  const handleInsert = () => {
    if (preview?.length) {
      // 通知父组件插入，包含替换模式信息
      onInsert(preview, replaceMode);
    }
    closeAll();
  };
  
  const handleAutoInsert = () => {
    if (preview?.length) {
      onInsert(preview, replaceMode);
    }
    closeAll();
  };
  
  const openPreviewOnly = () => {
    // 保持弹窗打开，让用户查看详细预览
    // 这里可以扩展为打开更详细的预览表格
  };
  
  // Day 4 新增：一键修复功能
  const handleAutoFix = () => {
    if (!preview || !featureFlags.autoFixEnabled) return;
    
    const originalWarningCount = customWarnings.length;
    
    // 生成修复补丁
    const { patches, report } = generateAutoFixes(preview, {
      ...DEFAULT_AUTOFIX,
      defaultUnit: featureFlags.defaultUnit ?? 'pc',
      roundPriceTo: featureFlags.roundPriceTo ?? 2,
      mergeDuplicates: featureFlags.mergeDuplicates ?? true,
      cleanNumbers: featureFlags.cleanNumbers ?? true,
    });
    
    // 应用修复
    const fixed = applyFixes(preview, patches);
    setPreview(fixed);
    setFixReport(report);
    setShowFixReport(true);
    
    // 重新校验修复后的数据
    if (featureFlags.showWarnings) {
      const newWarnings = validateRows(fixed, {
        ...DEFAULT_VALIDATOR_CONFIG,
        tinyPrice: featureFlags.tinyPrice ?? 0.01,
        largeQty: featureFlags.largeQty ?? 1_000_000,
        minNameLen: featureFlags.minNameLen ?? 2,
        requireUnit: true,
      });
      setCustomWarnings(newWarnings);
      
      // 记录修复指标
      if (typeof window !== 'undefined' && (window as any).parseMetrics) {
        (window as any).parseMetrics.recordAutoFix?.(
          originalWarningCount,
          newWarnings.length,
          report.droppedRows,
          report.mergedRows,
          report.fixedUnits,
          report.fixedNumbers
        );
      }
    }
  };

  // 判断是否显示红点：置信度过低或格式混杂或有未修复警告
  const showWarningDot = parseResult && (
    Math.round(confidence * 100) < featureFlags.autoInsertThreshold || 
    parseResult.inference.mixedFormat ||
    parseResult.stats.warnings.length > 0 ||
    customWarnings.length > 0
  );

  return (
    <div className="relative">
      <button 
        type="button"
        className="relative px-3 py-1.5 rounded-lg border border-[#E5E5EA] dark:border-[#2C2C2E] 
                   bg-white/90 dark:bg-[#1C1C1E]/90 text-sm text-[#1D1D1F] dark:text-[#F5F5F7]
                   hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50 transition-colors"
        onClick={()=>setOpen(true)}
      >
        <Upload className="h-4 w-4 inline mr-1" />
        导入
        {showWarningDot && (
          <span 
            className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-[#1C1C1E]"
            title="检测到需要注意的数据质量问题"
          />
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-[28rem] rounded-xl border border-[#E5E5EA] dark:border-[#2C2C2E] 
                        bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl shadow-lg p-4 z-20">
          <div className="mb-3">
            <h3 className="text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7] mb-2">快速导入数据</h3>
            <textarea
              value={raw}
              onChange={e=>setRaw(e.target.value)}
              placeholder={'支持多种格式:\n名称\t数量\t单价\n名称\t数量\t单位\t单价\n名称\t描述\t数量\t单位\t单价\n\n也支持逗号、分号分隔'}
              className="quick-import-textarea w-full h-32 p-3 border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg
                         bg-white dark:bg-[#1C1C1E] text-[#1D1D1F] dark:text-[#F5F5F7]
                         text-sm placeholder:text-[#86868B] dark:placeholder:text-[#86868B]
                         focus:outline-none focus:ring-2 focus:ring-[#007AFF] dark:focus:ring-[#0A84FF] 
                         focus:border-transparent resize-none"
            />
          </div>
          {/* Day 3 新UI集成区域 */}
          {preview && parseResult && (
            <div className="space-y-3 mt-4">
              {/* 顶部资讯条 */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <ConfidenceBadge 
                  value={Math.round(confidence * 100)} 
                  threshold={featureFlags.autoInsertThreshold} 
                />
                <div className="md:text-right">
                  <InferenceStatsBar
                    rowCount={parseResult.stats.toInsert}
                    colCount={parseResult.inference.mapping.length}
                    ignoreCount={parseResult.inference.mapping.filter(m => m === 'ignore').length}
                    mixedFormat={parseResult.inference.mixedFormat}
                  />
                </div>
              </div>
              
              {/* 修复报告 */}
              {showFixReport && fixReport && (
                <FixReport report={fixReport} />
              )}
              
              {/* 警告列举 */}
              {(parseResult.stats.warnings.length > 0 || customWarnings.length > 0) && (
                <WarningChips 
                  warnings={[
                    ...parseResult.stats.warnings.map(w => ({
                      type: w.type as WarningChip['type'],
                      message: w.message
                    })),
                    ...customWarnings.map(w => ({
                      type: w.type as WarningChip['type'],
                      message: w.message
                    }))
                  ]} 
                />
              )}
              
              {/* 替换模式开关 */}
              <label className="inline-flex items-center gap-2 select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-[#E5E5EA] dark:border-[#2C2C2E]"
                  checked={replaceMode}
                  onChange={(e) => setReplaceMode(e.target.checked)}
                />
                <span className="text-sm text-[#1D1D1F] dark:text-[#F5F5F7]">替换已有行</span>
              </label>
              
              {/* 动作按钮区 */}
              <div className="flex items-center justify-between pt-2">
                {/* 左侧：修复按钮 */}
                <div className="flex items-center gap-2">
                  {featureFlags.autoFixEnabled && (parseResult.stats.warnings.length > 0 || customWarnings.length > 0) && (
                    <button
                      type="button"
                      onClick={handleAutoFix}
                      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 ring-1 ring-blue-200 bg-blue-600 text-white hover:bg-blue-700"
                      title="规范单位/数量/价格，合并重复项"
                    >
                      <Wrench className="h-4 w-4" />
                      一键修复
                    </button>
                  )}
                </div>
                
                {/* 右侧：主要操作按钮 */}
                <div className="flex items-center gap-2">
                  {Math.round(confidence * 100) >= featureFlags.autoInsertThreshold && !parseResult.inference.mixedFormat && customWarnings.length === 0 ? (
                    <>
                      <button
                        type="button"
                        onClick={handleAutoInsert}
                        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 ring-1 ring-green-200 bg-green-600 text-white hover:bg-green-700"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        一键插入
                      </button>
                      <button
                        type="button"
                        onClick={openPreviewOnly}
                        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 ring-1 ring-slate-200 bg-white hover:bg-slate-50 text-[#1D1D1F] dark:bg-[#2C2C2E] dark:text-[#F5F5F7] dark:hover:bg-[#3C3C3E]"
                      >
                        <Eye className="h-4 w-4" />
                        预览后再插
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 ring-1 ring-amber-200 bg-amber-50 text-amber-700">
                        <AlertCircle className="h-4 w-4" />
                        {customWarnings.length > 0 ? '数据质量问题' : '置信度不足，建议预览'}
                      </span>
                      <button
                        type="button"
                        onClick={handleInsert}
                        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 ring-1 ring-slate-200 bg-white hover:bg-slate-50 text-[#1D1D1F] dark:bg-[#2C2C2E] dark:text-[#F5F5F7] dark:hover:bg-[#3C3C3E]"
                      >
                        <Eye className="h-4 w-4" />
                        插入数据
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* 传统预览按钮（无解析结果时） */}
          {!preview && (
            <div className="flex items-center gap-3">
              <button 
                type="button"
                className="px-3 py-1.5 border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg text-sm
                           text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50"
                onClick={handlePreview}
              >
                预览
              </button>
            </div>
          )}
        </div>
      )}
      {/* 点击外部关闭 */}
      {open && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={closeAll}
        />
      )}
    </div>
  );
}
