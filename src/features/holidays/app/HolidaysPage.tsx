'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Globe, ChevronDown, Info } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { usePermissionStore } from '@/lib/permissions';
import { clearD1DocumentLocalState } from '@/utils/d1Sync';
import {
  HOLIDAYS_2026, CATEGORY_LABEL, RELIGION_LABEL,
  type Holiday, type HolidayCategory, type HolidayReligion,
} from '../data/holidays2026';

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

function monthKey(dateStr: string): string { return dateStr.slice(0, 7); }

function getShortMonthName(key: string): string {
  const m = parseInt(key.split('-')[1]) - 1;
  return ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'][m];
}

function getFullMonthYear(key: string): string {
  const [y, m] = key.split('-');
  return `${y}年${parseInt(m)}月`;
}

function formatDateMD(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

function formatWeekday(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
}

// 根据 holiday.id 前缀推断地区
function getRegion(id: string): string {
  if (id.startsWith('us-')) return 'us';
  if (id.startsWith('gb-')) return 'gb';
  if (['de-','fr-','it-','es-','nl-','ru-'].some(p => id.startsWith(p))) return 'europe';
  if (id.startsWith('jp-')) return 'jp';
  if (id.startsWith('kr-')) return 'kr';
  if (id.startsWith('in-')) return 'in';
  if (['sg-','my-','th-','vn-','id-','ph-'].some(p => id.startsWith(p))) return 'sea';
  if (['tr-','ae-','sa-','eg-','ir-'].some(p => id.startsWith(p))) return 'mideast';
  if (['ca-','br-','mx-','ar-','cl-','uy-','pe-','co-','cr-','sv-','gt-','pa-','pr-','do-','tt-','ec-'].some(p => id.startsWith(p))) return 'americas';
  return 'other';
}

// ── 样式常量 ──────────────────────────────────────────────────────────────────

const CAT_DOT: Record<HolidayCategory, string> = {
  china:         'bg-red-500',
  international: 'bg-emerald-500',
  religious:     'bg-amber-400',
};

const CAT_BADGE: Record<HolidayCategory, string> = {
  china:         'border-red-200 text-red-600 bg-red-50 dark:border-red-800 dark:text-red-400 dark:bg-red-900/20',
  international: 'border-emerald-200 text-emerald-600 bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:bg-emerald-900/20',
  religious:     'border-amber-200 text-amber-600 bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:bg-amber-900/20',
};

// ── 子筛选器定义 ──────────────────────────────────────────────────────────────

const REGION_CHIPS = [
  { key: 'all',       label: '全部',      emoji: undefined },
  { key: 'us',        label: '美国',      emoji: '🇺🇸' },
  { key: 'gb',        label: '英国',      emoji: '🇬🇧' },
  { key: 'europe',    label: '欧洲',      emoji: '🌍' },
  { key: 'jp',        label: '日本',      emoji: '🇯🇵' },
  { key: 'kr',        label: '韩国',      emoji: '🇰🇷' },
  { key: 'in',        label: '印度',      emoji: '🇮🇳' },
  { key: 'sea',       label: '东南亚',    emoji: '🌏' },
  { key: 'mideast',   label: '中东土耳其', emoji: '🌍' },
  { key: 'americas',  label: '美洲',      emoji: '🌎' },
  { key: 'other',     label: '其他',      emoji: '🌐' },
];

const RELIGION_CHIPS = [
  { key: 'all',      label: '全部',    emoji: undefined },
  { key: 'islam',    label: '伊斯兰教', emoji: '☪️' },
  { key: 'jewish',   label: '犹太教',   emoji: '✡️' },
  { key: 'buddhism', label: '佛教',     emoji: '☸️' },
  { key: 'hinduism', label: '印度教',   emoji: '🕉️' },
];

// ── DaysBadge ─────────────────────────────────────────────────────────────────

function DaysBadge({ diff, days }: { diff: number; days: number }) {
  const isOngoing = diff <= 0 && diff > -days;
  if (diff === 0) return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500 text-white">今天</span>;
  if (isOngoing) return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500 text-white">进行中</span>;
  if (diff > 0 && diff <= 7) return <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">{diff}天后</span>;
  if (diff > 7 && diff <= 30) return <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">{diff}天后</span>;
  if (diff > 30) return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500">{diff}天后</span>;
  return null;
}

// ── HolidayRow ────────────────────────────────────────────────────────────────

function HolidayRow({ holiday, diff }: { holiday: Holiday; diff: number }) {
  const days = holiday.days ?? 1;
  const isOngoing = diff <= 0 && diff > -days;
  const isPast = diff < 0 && !isOngoing;
  const startMD = formatDateMD(holiday.dateStart);
  const endMD = holiday.dateEnd ? formatDateMD(holiday.dateEnd) : null;
  const weekday = formatWeekday(holiday.dateStart);
  const dot = CAT_DOT[holiday.category];
  const badge = CAT_BADGE[holiday.category];

  return (
    <div className={`flex items-start gap-3 py-3.5 px-4 border-b border-gray-50 dark:border-gray-700/40 last:border-0 transition-colors ${
      isPast ? 'opacity-35' :
      isOngoing ? 'bg-emerald-50/50 dark:bg-emerald-900/10' :
      diff >= 0 && diff <= 7 ? 'bg-amber-50/40 dark:bg-amber-900/10' : ''
    }`}>

      {/* 日期列 */}
      <div className="shrink-0 w-14 pt-0.5">
        {endMD ? (
          <>
            <div className={`text-sm font-bold font-mono leading-none ${isPast ? 'text-gray-300 dark:text-gray-600' : 'text-gray-900 dark:text-white'}`}>{startMD}–</div>
            <div className={`text-sm font-bold font-mono leading-none mt-0.5 ${isPast ? 'text-gray-300 dark:text-gray-600' : 'text-gray-900 dark:text-white'}`}>{endMD}</div>
            <div className="text-[10px] text-gray-400 mt-1">{weekday}</div>
            <div className="text-[10px] text-gray-400">共 {days} 天</div>
          </>
        ) : (
          <>
            <div className={`text-sm font-bold font-mono leading-none ${isPast ? 'text-gray-300 dark:text-gray-600' : 'text-gray-900 dark:text-white'}`}>{startMD}</div>
            <div className="text-[10px] text-gray-400 mt-1">{weekday}</div>
          </>
        )}
      </div>

      {/* 分类彩点 */}
      <div className={`shrink-0 w-2 h-2 rounded-full mt-1.5 ${dot} ${isPast ? 'opacity-30' : ''}`} />

      {/* 名称区域 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {holiday.emoji && <span className="text-base leading-none">{holiday.emoji}</span>}
          <span className={`text-sm font-semibold leading-snug ${isPast ? 'text-gray-300 dark:text-gray-600' : 'text-gray-900 dark:text-white'}`}>
            {holiday.nameCN}
          </span>
        </div>
        <div className={`text-xs mt-0.5 ${isPast ? 'text-gray-300 dark:text-gray-600' : 'text-gray-400'}`}>
          {holiday.nameEN}
        </div>
      </div>

      {/* 右侧：分类徽章 + 倒计时 + 箭头 */}
      <div className="shrink-0 flex items-center gap-1.5 pt-0.5">
        <DaysBadge diff={diff} days={days} />
        <span className={`hidden sm:inline text-[10px] px-2 py-0.5 rounded-full border font-medium ${badge}`}>
          {CATEGORY_LABEL[holiday.category]}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 shrink-0" />
      </div>
    </div>
  );
}

// ── SubChips ──────────────────────────────────────────────────────────────────

interface SubChipsProps {
  chips: { key: string; label: string; emoji?: string }[];
  active: string;
  onChange: (key: string) => void;
  activeColor: string;
}

function SubChips({ chips, active, onChange, activeColor }: SubChipsProps) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {chips.map(chip => {
        const isActive = chip.key === active;
        return (
          <button
            key={chip.key}
            onClick={() => onChange(chip.key)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
              isActive
                ? `${activeColor} border-transparent text-white`
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
            }`}
          >
            {chip.emoji && <span className="text-sm leading-none">{chip.emoji}</span>}
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}

// ── 主页面 ────────────────────────────────────────────────────────────────────

type CategoryFilter = 'all' | HolidayCategory;

const CAT_TABS: { key: CategoryFilter; label: string; dot?: string }[] = [
  { key: 'all',           label: '全部' },
  { key: 'china',         label: '中国假日',  dot: 'bg-violet-500' },
  { key: 'international', label: '国际假日',  dot: 'bg-emerald-500' },
  { key: 'religious',     label: '宗教节日',  dot: 'bg-amber-400' },
];

export function HolidaysPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);

  const [catFilter, setCatFilter] = useState<CategoryFilter>('all');
  const [subFilter, setSubFilter] = useState<string>('all');

  const today = useMemo(() => todayStr(), []);

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

  const handleCatChange = useCallback((cat: CategoryFilter) => {
    setCatFilter(cat);
    setSubFilter('all');
  }, []);

  const subChipsConfig = useMemo(() => {
    if (catFilter === 'religious') {
      return { chips: RELIGION_CHIPS, activeColor: 'bg-amber-400', show: true };
    }
    if (catFilter === 'international' || catFilter === 'all') {
      return { chips: REGION_CHIPS, activeColor: 'bg-emerald-500', show: true };
    }
    return { chips: [], activeColor: '', show: false };
  }, [catFilter]);

  // 过滤 + 分组（全年，不限日期范围）
  const grouped = useMemo(() => {
    const filtered = HOLIDAYS_2026.filter(h => {
      if (catFilter === 'china' && h.category !== 'china') return false;
      if (catFilter === 'international' && h.category !== 'international') return false;
      if (catFilter === 'religious' && h.category !== 'religious') return false;

      if (subFilter !== 'all') {
        if (catFilter === 'religious') {
          if (h.religion !== subFilter) return false;
        } else {
          if (h.category === 'international' && getRegion(h.id) !== subFilter) return false;
        }
      }

      return true;
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
  }, [catFilter, subFilter]);

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
      <div className="w-full px-3 sm:px-6 py-6">

        {/* 页头：标题左 + 分类 Tab 右 */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Globe className="h-5 w-5 text-blue-600 shrink-0" />
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">全球节假日</h1>
            </div>
            <p className="text-sm text-gray-400">
              全球假日一览，共 {totalHolidays} 个假日
            </p>
          </div>

          {/* 一级分类 Tabs */}
          <div className="flex items-center gap-0.5 shrink-0 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
            {CAT_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => handleCatChange(tab.key)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  catFilter === tab.key
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                }`}
              >
                {tab.dot && <span className={`w-1.5 h-1.5 rounded-full ${tab.dot}`} />}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 二级筛选芯片 */}
        {subChipsConfig.show && (
          <div className="mb-4 overflow-x-auto pb-1">
            <SubChips
              chips={subChipsConfig.chips}
              active={subFilter}
              onChange={setSubFilter}
              activeColor={subChipsConfig.activeColor}
            />
          </div>
        )}

        {/* 假日列表 */}
        {grouped.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Globe className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">没有符合条件的假日</p>
          </div>
        ) : (
          <div className="space-y-5">
            {grouped.map(({ key, items }) => (
              <div key={key} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                {/* 月份标题 */}
                <div className="flex items-center px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-base font-bold text-gray-800 dark:text-gray-200">
                    {getShortMonthName(key)}
                  </span>
                  <span className="ml-2 text-sm text-gray-400">
                    {getFullMonthYear(key)}
                  </span>
                  <div className="ml-auto flex items-center gap-1 text-xs text-emerald-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                    {items.length} 个假日
                  </div>
                </div>

                {/* 假日行 */}
                <div>
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
            开斋节、犹太新年等宗教节日按伊斯兰历或希伯来历推算，实际日期可能有 ±1~2 天误差。
          </span>
        </div>
      </div>
    </AppLayout>
  );
}
