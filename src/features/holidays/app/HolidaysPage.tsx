'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Globe, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { usePermissionStore } from '@/lib/permissions';
import { clearD1DocumentLocalState } from '@/utils/d1Sync';
import { HOLIDAYS, COUNTRIES, type HolidayDef, type CountryDef } from '../data/holidays';

// ── 工具函数 ──────────────────────────────────────────────────────────────────

/** 今天的 YYYY-MM-DD（本地时间） */
function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 相差天数：target - today（今天=0，未来>0，过去<0） */
function daysFromToday(dateStr: string): number {
  const today = new Date(todayStr() + 'T00:00:00');
  const target = new Date(dateStr + 'T00:00:00');
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/** 日期字符串所在的 YYYY-MM 月份 */
function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

/** 格式化月份 key 为中文 */
function formatMonth(key: string): string {
  const [y, m] = key.split('-');
  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月',
                      '七月', '八月', '九月', '十月', '十一月', '十二月'];
  return `${y}年 ${monthNames[parseInt(m) - 1]}`;
}

/** 格式化日期为 MM/DD 周X */
function formatDate(dateStr: string): { md: string; wd: string } {
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['日', '一', '二', '三', '四', '五', '六'];
  return {
    md: `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`,
    wd: `周${days[d.getDay()]}`,
  };
}

// ── 假日行组件 ────────────────────────────────────────────────────────────────

interface HolidayRowProps {
  holiday: HolidayDef;
  country: CountryDef;
  diff: number;
}

function DaysBadge({ diff, duration }: { diff: number; duration: number }) {
  // 正在进行中（今天在假期范围内）
  const isOngoing = diff <= 0 && diff > -(duration);
  // 今天开始
  const isToday = diff === 0;

  if (isToday)
    return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-500 text-white">今天</span>;
  if (isOngoing)
    return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-500 text-white">进行中</span>;
  if (diff > 0 && diff <= 7)
    return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">{diff}天后</span>;
  if (diff > 7 && diff <= 30)
    return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">{diff}天后</span>;
  if (diff > 30)
    return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">{diff}天后</span>;
  // 已过
  return <span className="text-xs px-2 py-0.5 rounded-full text-gray-300 dark:text-gray-600">已过</span>;
}

function HolidayRow({ holiday, country, diff }: HolidayRowProps) {
  const { md, wd } = formatDate(holiday.date);
  const duration = holiday.duration ?? 1;
  const isOngoing = diff <= 0 && diff > -duration;
  const isPast = diff < 0 && !isOngoing;

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
      <div className="shrink-0 w-16 text-center">
        <div className={`text-base font-mono font-bold leading-tight ${
          isPast ? 'text-gray-400' : 'text-gray-900 dark:text-white'
        }`}>{md}</div>
        <div className="text-[10px] text-gray-400">{wd}</div>
      </div>

      {/* 国旗 + 名称 */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-xl leading-none shrink-0">{country.flag}</span>
        <div className="min-w-0">
          <div className={`text-sm font-medium truncate ${isPast ? 'text-gray-400' : 'text-gray-900 dark:text-white'}`}>
            {holiday.name}
            {holiday.isApprox && (
              <span className="ml-1 text-[10px] text-gray-400 font-normal">（约）</span>
            )}
          </div>
          <div className="text-xs text-gray-400">{country.name}</div>
        </div>
      </div>

      {/* 徽章区域 */}
      <div className="shrink-0 flex items-center gap-1.5">
        {duration > 1 && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-medium">
            {duration}天
          </span>
        )}
        {holiday.tag === 'golden-week' && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 font-medium">
            黄金周
          </span>
        )}
        <DaysBadge diff={diff} duration={duration} />
      </div>
    </div>
  );
}

// ── 主页面 ────────────────────────────────────────────────────────────────────

const COUNTRY_IDS_DEFAULT = COUNTRIES.map(c => c.id);

/** 视图范围：未来30天 / 3个月 / 全年 */
type ViewRange = '30' | '90' | 'year';

export function HolidaysPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);

  // 国家筛选（默认全选）
  const [selectedCountries, setSelectedCountries] = useState<Set<string>>(
    new Set(COUNTRY_IDS_DEFAULT)
  );

  // 视图范围
  const [viewRange, setViewRange] = useState<ViewRange>('90');

  // 月份导航（当 viewRange==='year' 时按月翻页）
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

  // 切换单个国家
  const toggleCountry = useCallback((id: string) => {
    setSelectedCountries(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size <= 1) return prev; // 至少保留一个
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // 全选 / 全清
  const selectAll = useCallback(() => setSelectedCountries(new Set(COUNTRY_IDS_DEFAULT)), []);
  const clearAll = useCallback(() => {
    // 清空后只保留中国
    setSelectedCountries(new Set(['CN']));
  }, []);

  // 按范围过滤 + 构建分组数据
  const grouped = useMemo(() => {
    const countryMap = new Map(COUNTRIES.map(c => [c.id, c]));

    // 计算日期范围
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
      // 全年视图：显示当前导航月份的整月
      minDate = navMonthKey + '-01';
      const [y, m] = navMonthKey.split('-').map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      maxDate = `${navMonthKey}-${String(lastDay).padStart(2, '0')}`;
    }

    // 过滤
    const filtered = HOLIDAYS.filter(h => {
      if (!selectedCountries.has(h.countryId)) return false;
      // 假期的最后一天
      const endDate = (() => {
        if (!h.duration || h.duration <= 1) return h.date;
        const d = new Date(h.date + 'T00:00:00');
        d.setDate(d.getDate() + h.duration - 1);
        return d.toISOString().slice(0, 10);
      })();
      // 如果假期结束日期 >= minDate 且开始日期 <= maxDate，则显示
      return endDate >= minDate && h.date <= maxDate;
    });

    // 按日期排序
    filtered.sort((a, b) => a.date.localeCompare(b.date));

    // 分组
    const groups = new Map<string, { holiday: HolidayDef; country: CountryDef; diff: number }[]>();
    for (const h of filtered) {
      const key = monthKey(h.date);
      const country = countryMap.get(h.countryId);
      if (!country) continue;
      const diff = daysFromToday(h.date);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push({ holiday: h, country, diff });
    }

    return Array.from(groups.entries()).map(([key, items]) => ({ key, items }));
  }, [selectedCountries, viewRange, navMonthKey, today]);

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

  const allSelected = selectedCountries.size === COUNTRY_IDS_DEFAULT.length;
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
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">全球假日</h1>
          </div>
          <p className="text-sm text-gray-400">主要贸易国家法定节假日，合理安排沟通时间</p>
        </div>

        {/* 国家筛选 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 sm:p-4 mb-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              国家/地区筛选
            </span>
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                  allSelected
                    ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/20 dark:border-blue-700'
                    : 'border-gray-200 text-gray-500 hover:border-blue-200 hover:text-blue-600 dark:border-gray-600'
                }`}
              >
                全选
              </button>
              <button
                onClick={clearAll}
                className="text-xs px-2 py-0.5 rounded border border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-500 dark:border-gray-600 transition-colors"
              >
                仅中国
              </button>
            </div>
          </div>

          {/* 国家芯片 */}
          <div className="flex flex-wrap gap-1.5">
            {COUNTRIES.map(country => {
              const active = selectedCountries.has(country.id);
              return (
                <button
                  key={country.id}
                  onClick={() => toggleCountry(country.id)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border transition-colors ${
                    active
                      ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-400'
                      : 'bg-gray-50 border-gray-200 text-gray-400 dark:bg-gray-700/50 dark:border-gray-600 dark:text-gray-500'
                  }`}
                >
                  <span>{country.flag}</span>
                  <span>{country.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 视图控制 */}
        <div className="flex items-center justify-between mb-4">
          {/* 范围 tabs */}
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 gap-0.5">
            {([
              { key: '30', label: '30天' },
              { key: '90', label: '3个月' },
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
          {viewRange === 'year' && (
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
          )}

          {/* 结果数 */}
          {viewRange !== 'year' && (
            <span className="text-xs text-gray-400">{totalHolidays} 个假日</span>
          )}
        </div>

        {/* 假日列表 */}
        {grouped.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Globe className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">该时间段内没有所选国家的假日</p>
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map(({ key, items }) => (
              <div key={key} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                {/* 月份标题 */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/80">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {formatMonth(key)}
                  </span>
                  <span className="text-xs text-gray-400">{items.length} 个</span>
                </div>

                {/* 假日行 */}
                <div className="divide-y divide-gray-50 dark:divide-gray-700/50 px-1">
                  {items.map(({ holiday, country, diff }) => (
                    <HolidayRow key={holiday.id} holiday={holiday} country={country} diff={diff} />
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
            标注「约」的假日按伊斯兰历或农历推算，实际日期可能有 ±1~2 天误差。
            黄金周等多天假期显示开始日期。
          </span>
        </div>
      </div>
    </AppLayout>
  );
}
