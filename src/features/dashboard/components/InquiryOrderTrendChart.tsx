'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { Granularity, TrendPoint } from '../utils/inquiryStats';

const GRANULARITY_OPTIONS: { value: Granularity; label: string }[] = [
  { value: 'day', label: '天' },
  { value: 'week', label: '周' },
  { value: 'month', label: '月' },
  { value: 'quarter', label: '季' },
  { value: 'year', label: '年度' },
];

interface InquiryOrderTrendChartProps {
  visible: boolean;
  granularity: Granularity;
  onGranularityChange: (granularity: Granularity) => void;
  data: TrendPoint[];
}

/**
 * 首页询价/订单趋势图：可切换 天/周/月/季/年度 粒度，两条线（询价数量、订单数量）。
 * 仅在用户拥有 inquiry 模块权限时渲染（由调用方通过 `visible` 控制）。
 */
export function InquiryOrderTrendChart({
  visible,
  granularity,
  onGranularityChange,
  data,
}: InquiryOrderTrendChartProps) {
  if (!visible) return null;

  return (
    <div className="mb-8 rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">询价 / 订单趋势</h3>
        <div className="flex gap-1 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-700/50">
          {GRANULARITY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onGranularityChange(option.value)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                granularity === option.value
                  ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-900 dark:text-blue-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100 dark:stroke-gray-700" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11 }}
              className="fill-gray-500 dark:fill-gray-400"
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11 }}
              className="fill-gray-500 dark:fill-gray-400"
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
              labelClassName="text-gray-700"
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="inquiryCount"
              name="询价数量"
              stroke="#ec4899"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="orderCount"
              name="订单数量"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
