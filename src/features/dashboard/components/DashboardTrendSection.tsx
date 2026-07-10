'use client';

import { InquiryOrderTrendChart } from './InquiryOrderTrendChart';
import type { Granularity, TrendPoint } from '../utils/inquiryStats';
import type { TrendSource } from '../hooks/useInquiryOrderStats';

interface DashboardTrendSectionProps {
  /** 是否有 inquiry 权限（询报价登记表 / 订单状态表） */
  inquiryVisible: boolean;
  /** 是否有 purchaseRegistration 权限（采购部登记 / 采购订单表，TASK-111 合并后） */
  purchaseVisible: boolean;
  granularity: Granularity;
  onGranularityChange: (granularity: Granularity) => void;
  inquiryData: TrendPoint[];
  purchaseData: TrendPoint[];
  /** 当前激活的 tab（只在两个权限都有时才有 tab 可切换，由父级 DashboardPage 统一管理，
   *  这样首页"本周/本月"统计区域才能跟趋势图 tab 保持同一个数据来源） */
  activeSource: TrendSource;
  onActiveSourceChange: (source: TrendSource) => void;
}

const TAB_LABELS: Record<TrendSource, string> = {
  inquiry: '总询价订单统计图',
  purchase: '采购部询价订单统计图',
};

const QUOTED_LINE_LABELS: Record<TrendSource, string> = {
  inquiry: '已报价(总)',
  purchase: '已报价(采购部)',
};

/**
 * 首页趋势图区域（TASK-113，命名/图例细化见后续调整记录）：
 * - 只有 inquiry 权限 → 只显示"总询价订单统计图"，无 tab
 * - 只有 purchaseRegistration 权限 → 只显示"采购部询价订单统计图"，无 tab
 * - 两个权限都有 → 显示 tab 切换，默认"总询价订单统计图"
 * - 两个都没有 → 整块不渲染，不留空白占位
 *
 * 粒度切换（天/周/月/季/年度）两个 tab 共用同一份状态（由父级 DashboardPage 管理），
 * 不是每个 tab 各自独立记忆——切换 tab 后沿用当前选中的粒度。
 */
export function DashboardTrendSection({
  inquiryVisible,
  purchaseVisible,
  granularity,
  onGranularityChange,
  inquiryData,
  purchaseData,
  activeSource,
  onActiveSourceChange,
}: DashboardTrendSectionProps) {
  if (!inquiryVisible && !purchaseVisible) return null;

  // 只有一个权限：直接展示对应图表，无 tab
  if (inquiryVisible && !purchaseVisible) {
    return (
      <InquiryOrderTrendChart
        visible
        granularity={granularity}
        onGranularityChange={onGranularityChange}
        data={inquiryData}
        title={TAB_LABELS.inquiry}
        quotedLineLabel={QUOTED_LINE_LABELS.inquiry}
      />
    );
  }

  if (!inquiryVisible && purchaseVisible) {
    return (
      <InquiryOrderTrendChart
        visible
        granularity={granularity}
        onGranularityChange={onGranularityChange}
        data={purchaseData}
        title={TAB_LABELS.purchase}
        quotedLineLabel={QUOTED_LINE_LABELS.purchase}
      />
    );
  }

  // 两个权限都有：显示 tab 切换
  const tabSlot = (
    <div className="flex gap-1 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-700/50">
      {(Object.keys(TAB_LABELS) as TrendSource[]).map((source) => (
        <button
          key={source}
          type="button"
          onClick={() => onActiveSourceChange(source)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            activeSource === source
              ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-900 dark:text-blue-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          {TAB_LABELS[source]}
        </button>
      ))}
    </div>
  );

  return (
    <InquiryOrderTrendChart
      visible
      granularity={granularity}
      onGranularityChange={onGranularityChange}
      data={activeSource === 'inquiry' ? inquiryData : purchaseData}
      titleSlot={tabSlot}
      quotedLineLabel={QUOTED_LINE_LABELS[activeSource]}
    />
  );
}
