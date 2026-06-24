'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Globe, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { usePermissionStore } from '@/lib/permissions';
import { clearD1DocumentLocalState } from '@/utils/d1Sync';
import { HOLIDAYS_2026, CATEGORY_LABEL, type Holiday, type HolidayCategory } from '../data/holidays2026';

// ── 工具函数 ──────────────────────────────────────────────────────────────────

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysFromToday(dateStr: string): number {
  const today = new Date(todayStr() + 'T00:00:00');
  const target = new Date(dateStr + 'T00:00:00');
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

function formatMonth(key: string): string {
  const [y, m] = key.split('-');
  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月',
                      '七月', '八月', '九月', '十月', '十一月', '十二月'];
  return `${y}年 ${monthNames[parseInt(m) - 1]}`;
}

function formatDateMD(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

function formatWeekday(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[d.getDay()];
}

// ── 分类样式 ──────────────────────────────────────────────────────────────────

const CATEGORY_STYLES: Record<HolidayCategory, { bg: string; text: string; dot: string }> = {
  china:         { bg: 'bg-red-50 dark:bg-red-900/20',       text: 'text-red-600 dark:text-red-400',       dot: 'bg-red-500' },
  international: { bg: 'bg-blue-50 dark:bg-blue-900/20',     text: 'text-blue-600 dark:text-blue-400',     dot: 'bg-blue-500' },
  religious:     { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400', dot: 'bg-purple-500' },
};

// ── DaysBadge 组件 ────────────────────────────────────────────────────────────

function DaysBadge({ diff, days }: { diff: number; days: number }) {
  const isOngoing = diff <= 0 && diff > -days;
  if (diff === 0)
    return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-500 text-white">今天</span>;
  if (isOngoing)
    return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-500 text-white">进行中</span>;
  if (diff > 0 && diff <= 7)
    return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">{diff}天后</span>;
  if (diff > 7 && diff <= 30)
    return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">{diff}天后</span>;
  if (diff > 30)
    return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">{diff}天后</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full text-gray-300 dark:text-gray-600">已过</span>;
}

// ── HolidayRow 组件 ───────────────────────────────────────────────────────────

function HolidayRow({ holiday, diff }: { holiday: Holiday; diff: number }) {
  const days = holiday.days ?? 1;
  const isOngoing = diff <= 0 && diff > -days;
  const isPast = diff < 0 && !isOngoing;
  const catStyle = CATEGORY_STYLES[holiday.category];
  const startMD = formatDateMD(holiday.dateStart);
  const endMD = holiday.dateEnd ? formatDateMD(holiday.dateEnd) : null;
  const weekday = formatWeekday(holiday.dateStart);

  return (
    <div className={`flex items-center gap-3 py-2.5 px-3 rounded-lg transition-colors ${
      isPast
        ? 'opacity-40'
        : isOngoing
          ? 'bg-green-50/70 dark:bg-green-900/10'
          : diff <= 7 && diff >= 0
            ? 'bg-amber-50/60 dark:bg-amber-900/10'
            : ''
    }`}>
      {/* 日期 */}
      <div className="shrink-0 w-[96px]">
        <div className={`text-sm font-mono font-bold leading-tight ${isPast ? 'text-gray-400' : 'text-gray-900 dark:text-white'}`}>
          {endMD ? `${startMD}–${endMD}` : startMD}
        </div>
        <div className="text-[10px] text-gray-400 flex items-center gap-1">
          <span>{weekday}</span>
          {days > 1 && <span className="text-gray-300 dark:text-gray-600">·</span>}
          {days > 1 && <span>共 {days} 天</span>}
        </div>
      </div>

      {/* emoji + 名称 */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {holiday.emoji ? (
          <span className="text-xl leading-none shrink-0">{holiday.emoji}</span>
        ) : (
          <span className="w-6 shrink-0" />
        )}
        <div className="min-w-0">
          <div className={`text-sm font-medium truncate ${isPast ? 'text-gray-400' : 'text-gray-900 dark:text-white'}`}>
            {holiday.nameCN}
          </div>
          <div className="text-xs text-gray-400 truncate">{holiday.nameEN}</div>
        </div>
      </div>

      {/* 分类标签 + 倒计时 */}
      <div className="shrink-0 flex items-center gap-1.5">
        <span className={`hidden sm:inline text-xs px-1.5 py-0.5 rounded font-medium ${catStyle.bg} ${catStyle.text}`}>
          {CATEGORY_LABEL[holiday.category]}
        </span>
        <DaysBadge diff={diff} days={days} />
      </div>
    </div>
  );
}

// ── 主页面 ────────────────────────────────────────────────────────────────────

type ViewRange = '30' | '90' | 'year';
type CategoryFilter = 'all' | HolidayCategory;

const CATEGORY_TABS: { key: CategoryFilter; label: string; dot?: string }[] = [
  { key: 'all',           label: '全部' },
  { key: 'china',         label: '中国假日',  dot: 'bg-red-500' },
  { key: 'international', label: '国际假日',  dot: 'bg-blue-500' },
  { key: 'religious',     label: '宗教节日',  dot: 'bg-purple-500' },
];

export function HolidaysPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);

  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [viewRange, setViewRange] = useState<ViewRange>('90');

  const today = useMemo(() => todayStr(), []);
  const [navMonthKey, setNavMonthKey] = useState<string>(() => today.slice(0, 7));

  useEffect(() => { setMounted(true); }, []);

  const handleLogout = useCallback(async () => {
    usePermissionStore.getState().clearUser();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('userCache');
      clearD1DocumentLocalState();
    }
    await signOut();
  }, []);

  useEffect(() => {
    if (mounted && status === 'unauthenticated') router.push('/');
  }, [status, mounted, router]);

  // 过滤 + 分组
  const grouped = useMemo(() => {
    let minDate: string;
    let maxDate: string;

    if (viewRange === '30') {
      minDate = today;
      const d = new Date(today + 'T00:00:00');
      d.setDate(d.getDate() + 30);
      maxDate = d.toISOString().slice(0, 10);
    } else if (viewRange === '90') {
      minDate = today;
      const d = new Date(today + 'T00:00:00');
      d.setDate(d.getDate() + 90);
      maxDate = d.toISOString().slice(0, 10);
    } else {
      minDate = navMonthKey + '-01';
      const [y, m] = navMonthKey.split('-').map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      maxDate = `${navMonthKey}-${String(lastDay).padStart(2, '0')}`;
    }

    const filtered = HOLIDAYS_2026.filter(h => {
      if (categoryFilter !== 'all' && h.category !== categoryFilter) return false;
      const endDate = h.dateEnd ?? h.dateStart;
      return endDate >= minDate && h.dateStart <= maxDate;
    });

    filtered.sort((a, b) => a.dateStart.localeCompare(b.dateStart));

    const groups = new Map<string, { holiday: Holiday; diff: number }[]>();
    for (const h of filtered) {
      const key = monthKey(h.dateStart);
      const diff = daysFromToday(h.dateStart);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push({ holiday: h, diff });
    }

    return Array.from(groups.entries()).map(([key, items]) => ({ key, items }));
  }, [categoryFilter, viewRange, navMonthKey, today]);

  // 月份导航
  const prevMonth = useCallback(() => {
    const [y, m] = navMonthKey.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    setNavMonthKey(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }, [navMonthKey]);

  const nextMonth = useCallback(() => {
    const [y, m] = navMonthKey.split('-').map(Number);
    const d = new Date(y, m, 1);
    setNavMonthKey(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }, [navMonthKey]);

  const goToCurrentMonth = useCallback(() => {
    setNavMonthKey(today.slice(0, 7));
  }, [today]);

  if (!mounted || status === 'unauthenticated') return null;

  const totalHolidays = grouped.reduce((s, g) => s + g.items.length, 0);

  return (
    <AppLayout
      breadcrumbs={[{ label: '首页', path: '/dashboard' }, { label: '全球假日' }]}
      user={{
        name: session?.user?.username || session?.user?.name || '用户',
        isAdmin: session?.user?.isAdmin ?? false,
        email: session?.user?.email ?? null,
      }}
      onLogout={handleLogout}
    >
      <div className="w-full max-w-3xl mx-auto px-3 sm:px-4 py-6">

        {/* 页头 */}
        <div className="mb-5">
          <div className="flex items-center gap-2.5 mb-1">
            <Globe className="h-5 w-5 text-blue-600" />
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">全球节假日</h1>
          </div>
          <p className="text-sm text-gray-400">全球假日一览，懂客户的节，暖客户的心</p>
        </div>

        {/* 分类 Tabs */}
        <div className="flex gap-1 mb-4 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          {CATEGORY_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setCategoryFilter(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-colors ${
                categoryFilter === tab.key
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              {tab.dot && (
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${tab.dot}`} />
              )}
              <span className="truncate">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* 视图控制 */}
        <div className="flex items-center justify-between mb-4">
          {/* 范围 tabs */}
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 gap-0.5">
            {([
              { key: '30',   label: '30天' },
              { key: '90',   label: '3个月' },
              { key: 'year', label: '按月浏览' },
            ] as { key: ViewRange; label: string }[]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setViewRange(key)}
                className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                  viewRange === key
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* 月份导航（仅 year 模式） */}
          {viewRange === 'year' ? (
            <div className="flex items-center gap-1">
              <button
                onClick={prevMonth}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={goToCurrentMonth}
                className="text-xs font-semibold text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors px-1 min-w-[80px] text-center"
              >
                {formatMonth(navMonthKey)}
              </button>
              <button
                onClick={nextMonth}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <span className="text-xs text-gray-400">{totalHolidays} 个假日</span>
          )}
        </div>

        {/* 假日列表 */}
        {grouped.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Globe className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">该时间段内没有假日</p>
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map(({ key, items }) => (
              <div
                key={key}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
              >
                {/* 月份标题 */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/80">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {formatMonth(key)}
                  </span>
                  <span className="text-xs text-gray-400">{items.length} 个假日</span>
                </div>

                {/* 假日行 */}
                <div className="divide-y divide-gray-50 dark:divide-gray-700/50 px-1">
                  {items.map(({ holiday, diff }) => (
                    <HolidayRow key={holiday.id} holiday={holiday} diff={diff} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 底部说明 */}
        <div className="mt-6 flex items-start gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-400">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            宗教节日（开斋节、犹太新年等）按伊斯兰历或希伯来历推算，实际日期可能有 ±1~2 天误差。
          </span>
        </div>
      </div>
    </AppLayout>
  );
}
