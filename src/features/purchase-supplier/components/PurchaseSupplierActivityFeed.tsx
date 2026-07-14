'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowUpRight, ClipboardList } from 'lucide-react';
import { useInquiryStore } from '@/features/inquiry/state/inquiry.store';
import type { SupplierStatus } from '@/features/inquiry/types';
import { derivePurchaseSupplierActivities } from '../services/purchaseSupplierActivity';
import type { PurchaseSupplier } from '../types';

const STATUS_LABELS: Record<SupplierStatus, string> = {
  pending: '待报价',
  quoted: '已报价',
  unavailable: '无法报价',
  need_info: '需补资料',
};

const STATUS_CLASSES: Record<SupplierStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  quoted: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  unavailable: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  need_info: 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300',
};

function formatDate(value: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function PurchaseSupplierActivityFeed({ supplier }: { supplier: PurchaseSupplier }) {
  const records = useInquiryStore((state) => state.records);
  const activities = useMemo(
    () => derivePurchaseSupplierActivities(records, supplier.id),
    [records, supplier.id]
  );

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">采购活动</h2>
          <p className="mt-1 text-xs text-gray-500">按主数据 ID 自动关联采购部登记记录</p>
        </div>
        <Link
          href="/purchase-registration"
          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          打开采购部登记<ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      {activities.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <ClipboardList className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" />
          <p className="mt-2 text-sm text-gray-500">暂无已关联的采购询价活动</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {activities.map((activity) => {
            const status = activity.quoteStatus.status || 'pending';
            const orderNo = activity.orderNo?.trim();
            return (
              <article key={activity.id} className="px-5 py-3">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-2 md:flex-nowrap md:gap-x-3">
                  <span className="shrink-0 font-mono text-sm font-semibold text-blue-700 dark:text-blue-300">
                    {activity.inquiryNo || '未设询价编号'}
                  </span>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CLASSES[status]}`}>
                    {STATUS_LABELS[status]}
                  </span>
                  {orderNo && (
                    <span className="shrink-0 rounded-full bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white">
                      已转订单
                    </span>
                  )}
                  <span aria-hidden="true" className="hidden shrink-0 text-gray-300 md:inline dark:text-gray-600">·</span>
                  <span
                    className="min-w-0 text-sm text-gray-600 md:max-w-56 md:truncate dark:text-gray-300"
                    title={`客户询价编号：${activity.customerNo || '—'}`}
                  >
                    客户询价编号：{activity.customerNo || '—'}
                  </span>
                  <span aria-hidden="true" className="hidden shrink-0 text-gray-300 md:inline dark:text-gray-600">·</span>
                  <span className="shrink-0 text-xs text-gray-500">
                    报价日期：{activity.quoteStatus.quoteDate || '—'}
                  </span>
                  {orderNo && (
                    <>
                      <span aria-hidden="true" className="hidden shrink-0 text-gray-300 md:inline dark:text-gray-600">·</span>
                      <span className="min-w-0 text-xs text-gray-500 md:max-w-48 md:truncate" title={`订单号：${orderNo}`}>
                        订单号：{orderNo}
                      </span>
                    </>
                  )}
                  <span aria-hidden="true" className="hidden shrink-0 text-gray-300 md:ml-auto md:inline dark:text-gray-600">·</span>
                  <time className="shrink-0 text-xs text-gray-400" dateTime={activity.inquiryDate || activity.updatedAt}>
                    时间：{formatDate(activity.inquiryDate || activity.updatedAt)}
                  </time>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
