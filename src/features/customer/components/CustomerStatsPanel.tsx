'use client';

import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { InquiryOrderTrendChart } from '@/features/dashboard/components/InquiryOrderTrendChart';
import {
  buildTrendData,
  isRecordQuoted,
  type Granularity,
} from '@/features/dashboard/utils/inquiryStats';
import type { InquiryRecord } from '@/features/inquiry';
import type { Customer, CustomerCategory } from '../types';

interface CustomerStatsPanelProps {
  customers: Customer[];
  records: InquiryRecord[];
}

export interface CustomerRankingItem {
  customerId: string;
  name: string;
  inquiryCount: number;
  quotedCount: number;
  orderCount: number;
}

type RankingMetric = 'inquiry' | 'quoted' | 'order';
type RankingDataKey = 'inquiryCount' | 'quotedCount' | 'orderCount';

const RANKING_METRIC_META: Record<RankingMetric, { key: RankingMetric; label: string; dataKey: RankingDataKey }> = {
  inquiry: { key: 'inquiry', label: '询价数', dataKey: 'inquiryCount' },
  quoted: { key: 'quoted', label: '已报价数', dataKey: 'quotedCount' },
  order: { key: 'order', label: '订单数', dataKey: 'orderCount' },
};

const RANKING_METRICS: RankingMetric[] = ['inquiry', 'quoted', 'order'];

type CategoryKey = CustomerCategory;

export interface CustomerCategoryDatum {
  key: CategoryKey;
  name: string;
  count: number;
  color: string;
}

const CHART_CARD_CLASS = 'rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800';
const TOOLTIP_STYLE = { fontSize: 12, borderRadius: 8 };

const CATEGORY_META: Array<Omit<CustomerCategoryDatum, 'count'>> = [
  { key: 'A', name: 'A类', color: '#3b82f6' },
  { key: 'B', name: 'B类', color: '#10b981' },
  { key: 'C', name: 'C类', color: '#8b5cf6' },
  { key: 'New', name: 'New', color: '#f59e0b' },
  { key: 'Blacklist', name: '黑名单', color: '#ef4444' },
];

function getCustomerDisplayName(customer: Customer) {
  return customer.shortName?.trim() || customer.name.split('\n')[0] || customer.name;
}

export function buildCustomerRanking(
  customers: Customer[],
  records: InquiryRecord[],
  metric: RankingMetric = 'inquiry'
): CustomerRankingItem[] {
  const customerById = new Map(customers.map((customer) => [customer.id, customer]));
  const totals = new Map<string, CustomerRankingItem>();

  records.forEach((record) => {
    if (record.status === 'deleted' || !record.customerId) return;
    const customer = customerById.get(record.customerId);
    if (!customer) return;

    const current = totals.get(customer.id) ?? {
      customerId: customer.id,
      name: getCustomerDisplayName(customer),
      inquiryCount: 0,
      quotedCount: 0,
      orderCount: 0,
    };
    current.inquiryCount += 1;
    if (isRecordQuoted(record)) current.quotedCount += 1;
    if (record.orderNo?.trim()) current.orderCount += 1;
    totals.set(customer.id, current);
  });

  const primaryKey = RANKING_METRIC_META[metric].dataKey;
  const tieBreakerKeys: RankingDataKey[] = metric === 'inquiry'
    ? ['orderCount']
    : metric === 'quoted'
      ? ['inquiryCount', 'orderCount']
      : ['inquiryCount', 'quotedCount'];
  const comparisonKeys = [primaryKey, ...tieBreakerKeys];

  return Array.from(totals.values())
    .sort((a, b) => {
      for (const key of comparisonKeys) {
        const difference = b[key] - a[key];
        if (difference !== 0) return difference;
      }
      return a.name.localeCompare(b.name, 'zh-CN');
    })
    .slice(0, 10);
}

export function buildCustomerCategoryData(customers: Customer[]): CustomerCategoryDatum[] {
  const counts = new Map<CategoryKey, number>(CATEGORY_META.map(({ key }) => [key, 0]));
  customers.forEach((customer) => {
    const category = customer.category ?? 'New';
    counts.set(category, (counts.get(category) ?? 0) + 1);
  });

  return CATEGORY_META.map((item) => ({
    ...item,
    count: counts.get(item.key) ?? 0,
  }));
}

function EmptyChartCard({ title }: { title: string }) {
  return (
    <div className={CHART_CARD_CLASS}>
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">{title}</h3>
      <div className="flex h-64 items-center justify-center text-sm text-gray-400 dark:text-gray-500">
        暂无数据
      </div>
    </div>
  );
}

export function CustomerStatsPanel({ customers, records }: CustomerStatsPanelProps) {
  const [granularity, setGranularity] = useState<Granularity>('month');
  const [rankingMetric, setRankingMetric] = useState<RankingMetric>('inquiry');

  const activeRecords = useMemo(
    () => records.filter((record) => record.status !== 'deleted'),
    [records]
  );
  const trendData = useMemo(
    () => buildTrendData(activeRecords, granularity),
    [activeRecords, granularity]
  );
  const rankingData = useMemo(
    () => buildCustomerRanking(customers, activeRecords, rankingMetric),
    [activeRecords, customers, rankingMetric]
  );
  const categoryData = useMemo(
    () => buildCustomerCategoryData(customers),
    [customers]
  );

  return (
    <div className="bg-gray-50/60 p-4 dark:bg-black/10">
      {activeRecords.length > 0 ? (
        <InquiryOrderTrendChart
          visible
          granularity={granularity}
          onGranularityChange={setGranularity}
          data={trendData}
          title="全部客户询价订单统计图"
          quotedLineLabel="已报价"
        />
      ) : (
        <div className="mb-8">
          <EmptyChartCard title="全部客户询价订单统计图" />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={CHART_CARD_CLASS}>
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              客户{RANKING_METRIC_META[rankingMetric].label}排名 Top 10
            </h3>
            <div className="inline-flex w-fit rounded-lg bg-gray-100 p-0.5 dark:bg-gray-700/50">
              {RANKING_METRICS.map((metric) => {
                const active = rankingMetric === metric;
                return (
                  <button
                    key={metric}
                    type="button"
                    onClick={() => setRankingMetric(metric)}
                    aria-pressed={active}
                    className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                      active
                        ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-900 dark:text-blue-400'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                  >
                    {RANKING_METRIC_META[metric].label}
                  </button>
                );
              })}
            </div>
          </div>

          {rankingData.length > 0 ? (
            <>
              <div className="h-[360px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={rankingData}
                    layout="vertical"
                    margin={{ top: 4, right: 8, left: 16, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-gray-100 dark:stroke-gray-700" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={88} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="inquiryCount" name="询价数" fill="#ec4899" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="quotedCount" name="已报价数" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="orderCount" name="订单数" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex flex-wrap justify-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-pink-500" />询价数</span>
                <span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-blue-500" />已报价数</span>
                <span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-emerald-500" />订单数</span>
              </div>
            </>
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-gray-400 dark:text-gray-500">
              暂无数据
            </div>
          )}
        </div>

        {customers.length > 0 ? (
          <div className={CHART_CARD_CLASS}>
            <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">客户分类占比</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={96}
                    paddingAngle={2}
                  >
                    {categoryData.map((entry) => (
                      <Cell key={entry.key} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
              {categoryData.map((entry) => (
                <div key={entry.key} className="flex items-center justify-between gap-2 rounded-md bg-gray-50 px-2.5 py-1.5 dark:bg-gray-900/50">
                  <span className="flex min-w-0 items-center gap-1.5 text-gray-500 dark:text-gray-400">
                    <i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="truncate">{entry.name}</span>
                  </span>
                  <strong className="text-gray-700 dark:text-gray-200">{entry.count}</strong>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <EmptyChartCard title="客户分类占比" />
        )}
      </div>
    </div>
  );
}
