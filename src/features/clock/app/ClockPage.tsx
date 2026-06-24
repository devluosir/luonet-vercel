'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Clock, Plus, X } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { usePermissionStore } from '@/lib/permissions';
import { clearD1DocumentLocalState } from '@/utils/d1Sync';

// ── 城市定义 ──────────────────────────────────────────────────────────────────

interface CityDef {
  id: string;
  name: string;
  country: string;
  flag: string;
  timezone: string;
}

const ALL_CITIES: CityDef[] = [
  { id: 'shenzhen',      name: '深圳',      country: '中国',     flag: '🇨🇳', timezone: 'Asia/Shanghai' },
  { id: 'shanghai',      name: '上海',      country: '中国',     flag: '🇨🇳', timezone: 'Asia/Shanghai' },
  { id: 'beijing',       name: '北京',      country: '中国',     flag: '🇨🇳', timezone: 'Asia/Shanghai' },
  { id: 'hongkong',      name: '香港',      country: '中国',     flag: '🇭🇰', timezone: 'Asia/Hong_Kong' },
  { id: 'losangeles',    name: '洛杉矶',    country: '美国',     flag: '🇺🇸', timezone: 'America/Los_Angeles' },
  { id: 'newyork',       name: '纽约',      country: '美国',     flag: '🇺🇸', timezone: 'America/New_York' },
  { id: 'chicago',       name: '芝加哥',    country: '美国',     flag: '🇺🇸', timezone: 'America/Chicago' },
  { id: 'toronto',       name: '多伦多',    country: '加拿大',   flag: '🇨🇦', timezone: 'America/Toronto' },
  { id: 'saopaulo',      name: '圣保罗',    country: '巴西',     flag: '🇧🇷', timezone: 'America/Sao_Paulo' },
  { id: 'mexicocity',    name: '墨西哥城',  country: '墨西哥',   flag: '🇲🇽', timezone: 'America/Mexico_City' },
  { id: 'london',        name: '伦敦',      country: '英国',     flag: '🇬🇧', timezone: 'Europe/London' },
  { id: 'manchester',    name: '曼彻斯特',  country: '英国',     flag: '🇬🇧', timezone: 'Europe/London' },
  { id: 'paris',         name: '巴黎',      country: '法国',     flag: '🇫🇷', timezone: 'Europe/Paris' },
  { id: 'berlin',        name: '柏林',      country: '德国',     flag: '🇩🇪', timezone: 'Europe/Berlin' },
  { id: 'amsterdam',     name: '阿姆斯特丹',country: '荷兰',     flag: '🇳🇱', timezone: 'Europe/Amsterdam' },
  { id: 'rome',          name: '罗马',      country: '意大利',   flag: '🇮🇹', timezone: 'Europe/Rome' },
  { id: 'madrid',        name: '马德里',    country: '西班牙',   flag: '🇪🇸', timezone: 'Europe/Madrid' },
  { id: 'moscow',        name: '莫斯科',    country: '俄罗斯',   flag: '🇷🇺', timezone: 'Europe/Moscow' },
  { id: 'istanbul',      name: '伊斯坦布尔',country: '土耳其',   flag: '🇹🇷', timezone: 'Europe/Istanbul' },
  { id: 'dubai',         name: '迪拜',      country: '阿联酋',   flag: '🇦🇪', timezone: 'Asia/Dubai' },
  { id: 'riyadh',        name: '利雅得',    country: '沙特',     flag: '🇸🇦', timezone: 'Asia/Riyadh' },
  { id: 'cairo',         name: '开罗',      country: '埃及',     flag: '🇪🇬', timezone: 'Africa/Cairo' },
  { id: 'johannesburg',  name: '约翰内斯堡',country: '南非',     flag: '🇿🇦', timezone: 'Africa/Johannesburg' },
  { id: 'newdelhi',      name: '新德里',    country: '印度',     flag: '🇮🇳', timezone: 'Asia/Kolkata' },
  { id: 'mumbai',        name: '孟买',      country: '印度',     flag: '🇮🇳', timezone: 'Asia/Kolkata' },
  { id: 'bangkok',       name: '曼谷',      country: '泰国',     flag: '🇹🇭', timezone: 'Asia/Bangkok' },
  { id: 'singapore',     name: '新加坡',    country: '新加坡',   flag: '🇸🇬', timezone: 'Asia/Singapore' },
  { id: 'jakarta',       name: '雅加达',    country: '印尼',     flag: '🇮🇩', timezone: 'Asia/Jakarta' },
  { id: 'kualalumpur',   name: '吉隆坡',    country: '马来西亚', flag: '🇲🇾', timezone: 'Asia/Kuala_Lumpur' },
  { id: 'tokyo',         name: '东京',      country: '日本',     flag: '🇯🇵', timezone: 'Asia/Tokyo' },
  { id: 'seoul',         name: '首尔',      country: '韩国',     flag: '🇰🇷', timezone: 'Asia/Seoul' },
  { id: 'sydney',        name: '悉尼',      country: '澳大利亚', flag: '🇦🇺', timezone: 'Australia/Sydney' },
  { id: 'melbourne',     name: '墨尔本',    country: '澳大利亚', flag: '🇦🇺', timezone: 'Australia/Melbourne' },
  { id: 'auckland',      name: '奥克兰',    country: '新西兰',   flag: '🇳🇿', timezone: 'Pacific/Auckland' },
];

// ① 本地城市改为上海
const HOME_CITY_ID = 'shanghai';
const HOME_TIMEZONE = 'Asia/Shanghai';

// ② 默认城市列表
const DEFAULT_CITY_IDS = [
  'shanghai', 'newyork', 'losangeles', 'london',
  'berlin', 'sydney', 'dubai', 'newdelhi',
];

// ── 色带渐变（休息灰/边缘琥珀/工作蓝） ───────────────────────────────────────

const pct = (h: number) => `${((h / 24) * 100).toFixed(4)}%`;
const TIMELINE_GRADIENT = `linear-gradient(to right,
  #e5e7eb 0%,         #e5e7eb ${pct(8)},
  #fde68a ${pct(8)},  #fde68a ${pct(9)},
  #bfdbfe ${pct(9)},  #bfdbfe ${pct(17)},
  #fde68a ${pct(17)}, #fde68a ${pct(19)},
  #e5e7eb ${pct(19)}, #e5e7eb 100%
)`;

// ── 时区工具函数 ───────────────────────────────────────────────────────────────

function getTimeParts(utcMs: number, timezone: string) {
  const date = new Date(utcMs);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const p: Record<string, string> = {};
  parts.forEach(x => { p[x.type] = x.value; });
  if (p.hour === '24') p.hour = '00';
  return {
    year: parseInt(p.year), month: parseInt(p.month), day: parseInt(p.day),
    hour: parseInt(p.hour), minute: parseInt(p.minute), second: parseInt(p.second || '0'),
  };
}

function getTimezoneOffsetMin(utcMs: number, timezone: string): number {
  const tp = getTimeParts(utcMs, timezone);
  const localMs = Date.UTC(tp.year, tp.month - 1, tp.day, tp.hour, tp.minute, tp.second);
  return (localMs - utcMs) / 60000;
}

function isDSTActive(utcMs: number, timezone: string): boolean {
  const year = new Date(utcMs).getUTCFullYear();
  const janOff = getTimezoneOffsetMin(Date.UTC(year, 0, 15, 12), timezone);
  const julOff = getTimezoneOffsetMin(Date.UTC(year, 6, 15, 12), timezone);
  if (janOff === julOff) return false;
  return getTimezoneOffsetMin(utcMs, timezone) === Math.max(janOff, julOff);
}

function getWeekdayCN(utcMs: number, timezone: string): string {
  const map: Record<string, string> = {
    Sunday: '日', Monday: '一', Tuesday: '二', Wednesday: '三',
    Thursday: '四', Friday: '五', Saturday: '六',
  };
  const day = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'long' })
    .format(new Date(utcMs));
  return `周${map[day] ?? '?'}`;
}

function getHomeDayStartUtcMs(referenceUtcMs: number): number {
  const tp = getTimeParts(referenceUtcMs, HOME_TIMEZONE);
  const iso = `${tp.year}-${String(tp.month).padStart(2, '0')}-${String(tp.day).padStart(2, '0')}T00:00:00+08:00`;
  return new Date(iso).getTime();
}

function getUtcMsForHomeHour(sliderHour: number, referenceUtcMs: number): number {
  return getHomeDayStartUtcMs(referenceUtcMs) + sliderHour * 3_600_000;
}

function getHomeCurrentHour(utcMs: number): number {
  const tp = getTimeParts(utcMs, HOME_TIMEZONE);
  return tp.hour + tp.minute / 60 + tp.second / 3600;
}

// ── 工作状态 ───────────────────────────────────────────────────────────────────

type WorkStatus = { label: string; dot: string; badge: string };

function getWorkStatus(hour: number, minute: number): WorkStatus {
  const h = hour + minute / 60;
  if (h >= 9 && h < 17) return {
    label: '工作中',
    dot: 'bg-blue-500',
    badge: 'text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300',
  };
  if ((h >= 8 && h < 9) || (h >= 17 && h < 19)) return {
    label: '边缘时段',
    dot: 'bg-amber-400',
    badge: 'text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-300',
  };
  return {
    label: '休息',
    dot: 'bg-gray-300',
    badge: 'text-gray-500 bg-gray-100 dark:bg-gray-700/80 dark:text-gray-400',
  };
}

// ── ③ 可拖动迷你时间线 ────────────────────────────────────────────────────────

interface MiniTimelineProps {
  hour: number;
  minute: number;
  /** 拖动时回调 fraction ∈ [0,1]，对应当地 0–24h */
  onDrag: (fraction: number) => void;
}

function CityMiniTimeline({ hour, minute, onDrag }: MiniTimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const markerPct = `${((hour + minute / 60) / 24 * 100).toFixed(3)}%`;

  const getFrac = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = trackRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  };

  return (
    <div className="mt-2.5 select-none">
      {/* 小时刻度 */}
      <div className="flex justify-between text-[9px] text-gray-300 dark:text-gray-600 mb-1 px-px leading-none">
        <span>0</span><span>6</span><span>12</span><span>18</span><span></span>
      </div>

      {/* 可交互轨道 */}
      <div
        ref={trackRef}
        className="relative h-3 rounded-full cursor-pointer touch-none"
        style={{ background: TIMELINE_GRADIENT }}
        onPointerDown={e => {
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          const f = getFrac(e);
          if (f !== null) onDrag(f);
        }}
        onPointerMove={e => {
          if (!dragging.current) return;
          const f = getFrac(e);
          if (f !== null) onDrag(f);
        }}
        onPointerUp={() => { dragging.current = false; }}
        onPointerCancel={() => { dragging.current = false; }}
      >
        {/* 竖线 */}
        <div
          className="absolute top-1/2 w-0.5 h-5 -translate-x-1/2 -translate-y-1/2 bg-gray-700 dark:bg-white opacity-60 rounded-full pointer-events-none"
          style={{ left: markerPct }}
        />
        {/* 圆形拖柄 */}
        <div
          className="absolute top-1/2 w-3.5 h-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white dark:bg-gray-800 border-2 border-blue-500 shadow-sm pointer-events-none"
          style={{ left: markerPct }}
        />
      </div>
    </div>
  );
}

// ── 城市行 ────────────────────────────────────────────────────────────────────

interface CityRowData extends CityDef {
  timeStr: string;
  dateStr: string;
  hour: number;
  minute: number;
  dayDiff: number;
  isDST: boolean;
  isHome: boolean;
}

function CityRow({
  city,
  onRemove,
  onSliderDrag,
}: {
  city: CityRowData;
  onRemove: (id: string) => void;
  onSliderDrag: (fraction: number) => void;
}) {
  const status = getWorkStatus(city.hour, city.minute);

  return (
    <div className="px-4 pt-3.5 pb-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">

      {/* 主信息行 */}
      <div className="flex items-center gap-3">

        {/* 国旗 + 城市名 */}
        <div className="flex items-center gap-2.5 w-32 sm:w-40 shrink-0">
          <span className="text-2xl leading-none shrink-0">{city.flag}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm text-gray-900 dark:text-white truncate leading-snug">
                {city.name}
              </span>
              {city.isHome && (
                <span className="text-[9px] text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded-full shrink-0 font-medium">
                  本地
                </span>
              )}
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5 leading-none">{city.country}</div>
          </div>
        </div>

        {/* 日期 + 徽章（桌面） */}
        <div className="hidden sm:flex flex-col flex-1 gap-1 min-w-0">
          <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{city.dateStr}</span>
          <div className="flex items-center gap-1">
            {city.dayDiff !== 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${
                city.dayDiff > 0
                  ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
                  : 'text-orange-500 bg-orange-50 dark:bg-orange-900/20'
              }`}>
                {city.dayDiff > 0 ? `+${city.dayDiff}天` : `${city.dayDiff}天`}
              </span>
            )}
            {city.isDST && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold text-violet-600 bg-violet-50 dark:bg-violet-900/20 shrink-0">
                夏令
              </span>
            )}
          </div>
        </div>

        {/* 弹性间距（移动端） */}
        <div className="flex-1 sm:hidden" />

        {/* 工作状态 */}
        <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${status.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          <span className="hidden xs:inline">{status.label}</span>
        </span>

        {/* 时间大字 */}
        <div className="shrink-0 text-right min-w-[72px] sm:min-w-[88px]">
          <span className="text-2xl sm:text-[28px] font-mono font-bold tabular-nums tracking-tight text-gray-900 dark:text-white leading-none">
            {city.timeStr}
          </span>
        </div>

        {/* 删除按钮 */}
        {city.isHome ? (
          <div className="w-7 shrink-0" />
        ) : (
          <button
            onClick={() => onRemove(city.id)}
            className="w-7 h-7 shrink-0 flex items-center justify-center rounded-full text-gray-300 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            aria-label={`删除 ${city.name}`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ③ 每行都有可拖动的迷你时间线 */}
      <CityMiniTimeline
        hour={city.hour}
        minute={city.minute}
        onDrag={onSliderDrag}
      />
    </div>
  );
}

// ── 主页面 ────────────────────────────────────────────────────────────────────

export function ClockPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);

  const [cityIds, setCityIds] = useState<string[]>(DEFAULT_CITY_IDS);
  const [showAddCity, setShowAddCity] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [isRealtime, setIsRealtime] = useState(true);
  const [currentUtcMs, setCurrentUtcMs] = useState<number>(0);
  const [sliderHour, setSliderHour] = useState<number>(0);
  const nowRefMs = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setMounted(true);
    const now = Date.now();
    nowRefMs.current = now;
    setCurrentUtcMs(now);
    setSliderHour(getHomeCurrentHour(now));
  }, []);

  useEffect(() => {
    if (!mounted) return;
    timerRef.current = setInterval(() => {
      const now = Date.now();
      nowRefMs.current = now;
      if (isRealtime) {
        setCurrentUtcMs(now);
        setSliderHour(getHomeCurrentHour(now));
      }
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [mounted, isRealtime]);

  // 顶部主滑块拖动（基于上海时区）
  const handleSliderChange = useCallback((hour: number) => {
    setIsRealtime(false);
    setSliderHour(hour);
    setCurrentUtcMs(getUtcMsForHomeHour(hour, nowRefMs.current));
  }, []);

  // ③ 任意城市行拖动 — 根据该城市当地时间反推 UTC
  const handleCitySliderDrag = useCallback((cityId: string, fraction: number, cityHour: number, cityMinute: number) => {
    setIsRealtime(false);
    const desiredHour = fraction * 24;
    const currentHour = cityHour + cityMinute / 60;
    const deltaMs = (desiredHour - currentHour) * 3_600_000;
    const newUtcMs = currentUtcMs + deltaMs;
    setCurrentUtcMs(newUtcMs);
    // 同步更新顶部滑块位置（上海时间）
    const homeTp = getTimeParts(newUtcMs, HOME_TIMEZONE);
    setSliderHour(homeTp.hour + homeTp.minute / 60);
  }, [currentUtcMs]);

  const handleResetRealtime = useCallback(() => {
    setIsRealtime(true);
    const now = nowRefMs.current;
    setCurrentUtcMs(now);
    setSliderHour(getHomeCurrentHour(now));
  }, []);

  const removeCity = useCallback((id: string) => {
    if (id === HOME_CITY_ID) return;
    setCityIds(prev => prev.filter(c => c !== id));
  }, []);

  const addCity = useCallback((id: string) => {
    if (cityIds.includes(id)) return;
    setCityIds(prev => [...prev, id]);
    setShowAddCity(false);
    setSearchQuery('');
  }, [cityIds]);

  const cityData = useMemo((): CityRowData[] => {
    if (!currentUtcMs) return [];
    const homeTp = getTimeParts(currentUtcMs, HOME_TIMEZONE);
    const homeDayMs = Date.UTC(homeTp.year, homeTp.month - 1, homeTp.day);

    return cityIds.flatMap(id => {
      const def = ALL_CITIES.find(c => c.id === id);
      if (!def) return [];
      const tp = getTimeParts(currentUtcMs, def.timezone);
      const localDayMs = Date.UTC(tp.year, tp.month - 1, tp.day);
      const dayDiff = Math.round((localDayMs - homeDayMs) / 86_400_000);
      const weekday = getWeekdayCN(currentUtcMs, def.timezone);
      const dateStr = `${String(tp.month).padStart(2, '0')}月${String(tp.day).padStart(2, '0')}日 ${weekday}`;
      const timeStr = `${String(tp.hour).padStart(2, '0')}:${String(tp.minute).padStart(2, '0')}`;
      return [{
        ...def, timeStr, dateStr,
        hour: tp.hour, minute: tp.minute,
        dayDiff,
        isDST: isDSTActive(currentUtcMs, def.timezone),
        isHome: id === HOME_CITY_ID,
      }];
    });
  }, [cityIds, currentUtcMs]);

  const availableCities = useMemo(() => {
    const q = searchQuery.trim();
    return ALL_CITIES.filter(c => {
      if (cityIds.includes(c.id)) return false;
      if (!q) return true;
      return c.name.includes(q) || c.country.includes(q);
    });
  }, [cityIds, searchQuery]);

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

  if (!mounted || status === 'unauthenticated') return null;

  const thumbPct = (sliderHour / 24) * 100;

  return (
    <AppLayout
      breadcrumbs={[{ label: '首页', path: '/dashboard' }, { label: '世界时钟' }]}
      user={{
        name: session?.user?.username || session?.user?.name || '用户',
        isAdmin: session?.user?.isAdmin ?? false,
        email: session?.user?.email ?? null,
      }}
      onLogout={handleLogout}
    >
      <div className="w-full px-3 sm:px-6 py-6">

        {/* ── ② 页头：标题 + 实时按钮同行 ── */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Clock className="h-5 w-5 text-blue-600 shrink-0" />
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">世界时钟</h1>
            </div>
            <p className="text-sm text-gray-400">拖动任意城市时间条，全局同步联动</p>
          </div>

          {/* ② 实时按钮 */}
          <button
            onClick={handleResetRealtime}
            className={`shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
              isRealtime
                ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-400'
                : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400'
            }`}
          >
            {isRealtime
              ? <><span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />实时</>
              : <>↺ 回到实时</>
            }
          </button>
        </div>

        {/* ── 主时间轴卡片 ── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-4 pt-4 pb-5 mb-4 shadow-sm">

          {/* 图例 */}
          <div className="flex items-center gap-3 text-[11px] text-gray-400 mb-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-2 rounded-sm bg-blue-200 dark:bg-blue-700/80" />
              <span>工作 09–17</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-2 rounded-sm bg-amber-200 dark:bg-amber-600/80" />
              <span>边缘 08–09 / 17–19</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-2 rounded-sm bg-gray-200 dark:bg-gray-600" />
              <span>休息</span>
            </div>
          </div>

          {/* 顶部主滑块 */}
          <div className="relative select-none">
            {/* 刻度 */}
            <div className="flex justify-between text-[10px] text-gray-400 mb-1.5 px-0.5">
              {[0, 3, 6, 9, 12, 15, 18, 21, 24].map(h => (
                <span key={h}>{h < 24 ? h : ''}</span>
              ))}
            </div>

            {/* 轨道 + 拇指 */}
            <div className="relative h-10 flex items-center">
              <div
                className="absolute left-0 right-0 h-4 rounded-full"
                style={{ background: TIMELINE_GRADIENT, top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="range"
                min={0} max={24} step={0.25}
                value={sliderHour}
                onChange={e => handleSliderChange(parseFloat(e.target.value))}
                className="absolute inset-0 w-full h-full cursor-pointer"
                style={{ opacity: 0, zIndex: 10, WebkitAppearance: 'none', appearance: 'none' }}
              />
              {/* 自定义拇指 */}
              <div
                className="absolute pointer-events-none"
                style={{
                  left: `clamp(0px, calc(${thumbPct.toFixed(3)}% - 14px), calc(100% - 28px))`,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 5,
                }}
              >
                {/* 时间气泡 */}
                <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-gray-600 text-white text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md whitespace-nowrap shadow">
                  {String(Math.floor(sliderHour)).padStart(2, '0')}:{String(Math.round((sliderHour % 1) * 60)).padStart(2, '0')}
                  <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-600" />
                </div>
                {/* 圆形拇指 */}
                <div className="w-7 h-7 bg-white dark:bg-gray-800 border-2 border-blue-500 rounded-full shadow-md flex items-center justify-center">
                  <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 城市列表 ── */}
        <div className="space-y-2.5">
          {cityData.map(city => (
            <CityRow
              key={city.id}
              city={city}
              onRemove={removeCity}
              onSliderDrag={(fraction) =>
                handleCitySliderDrag(city.id, fraction, city.hour, city.minute)
              }
            />
          ))}

          {/* 添加城市 */}
          <button
            onClick={() => setShowAddCity(true)}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-400 hover:border-blue-300 hover:text-blue-500 dark:hover:border-blue-700 dark:hover:text-blue-400 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm">添加城市</span>
          </button>
        </div>
      </div>

      {/* ── 添加城市弹窗 ── */}
      {showAddCity && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => { setShowAddCity(false); setSearchQuery(''); }}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-sm max-h-[80vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <h3 className="font-semibold text-gray-900 dark:text-white">添加城市</h3>
              <button
                onClick={() => { setShowAddCity(false); setSearchQuery(''); }}
                className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-4 py-3 shrink-0">
              <input
                type="text"
                placeholder="搜索城市或国家…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>

            <div className="overflow-y-auto flex-1 px-4 pb-4">
              {availableCities.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">未找到匹配城市</p>
              ) : (
                <div className="space-y-0.5">
                  {availableCities.map(city => (
                    <button
                      key={city.id}
                      onClick={() => addCity(city.id)}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <span className="text-lg leading-none">{city.flag}</span>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{city.name}</div>
                        <div className="text-xs text-gray-400">{city.country}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
