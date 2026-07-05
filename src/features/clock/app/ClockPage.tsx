'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Clock, Plus, RefreshCw, Search, X } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { usePermissionStore } from '@/lib/permissions';
import { clearD1DocumentLocalState } from '@/utils/d1Sync';

interface CityDef {
  id: string;
  nameCN: string;
  nameEN: string;
  country: string;
  flag: string;
  timezone: string;
  keywords: string;
}

interface CurrencyDef {
  code: string;
  name: string;
  flag: string;
}

interface RatePoint {
  date: string;
  rate: number;
}

type TabKey = 'clock' | 'currency';
type WorkStatus = 'work' | 'edge' | 'off';
type RangeKey = '7d' | '1m';

const ALL_CITIES: CityDef[] = [
  { id: 'shenzhen', nameCN: '深圳', nameEN: 'Shenzhen', country: '中国', flag: '🇨🇳', timezone: 'Asia/Shanghai', keywords: 'shenzhen sz china zhongguo' },
  { id: 'shanghai', nameCN: '上海', nameEN: 'Shanghai', country: '中国', flag: '🇨🇳', timezone: 'Asia/Shanghai', keywords: 'shanghai china zhongguo' },
  { id: 'hongkong', nameCN: '香港', nameEN: 'Hong Kong', country: '中国', flag: '🇭🇰', timezone: 'Asia/Hong_Kong', keywords: 'hongkong hong kong hk xianggang' },
  { id: 'newyork', nameCN: '纽约', nameEN: 'New York', country: '美国', flag: '🇺🇸', timezone: 'America/New_York', keywords: 'new york us usa meiguo' },
  { id: 'losangeles', nameCN: '洛杉矶', nameEN: 'Los Angeles', country: '美国', flag: '🇺🇸', timezone: 'America/Los_Angeles', keywords: 'los angeles la us usa meiguo' },
  { id: 'chicago', nameCN: '芝加哥', nameEN: 'Chicago', country: '美国', flag: '🇺🇸', timezone: 'America/Chicago', keywords: 'chicago us usa meiguo' },
  { id: 'toronto', nameCN: '多伦多', nameEN: 'Toronto', country: '加拿大', flag: '🇨🇦', timezone: 'America/Toronto', keywords: 'toronto canada jianada' },
  { id: 'saopaulo', nameCN: '圣保罗', nameEN: 'Sao Paulo', country: '巴西', flag: '🇧🇷', timezone: 'America/Sao_Paulo', keywords: 'sao paulo brazil baxi' },
  { id: 'mexicocity', nameCN: '墨西哥城', nameEN: 'Mexico City', country: '墨西哥', flag: '🇲🇽', timezone: 'America/Mexico_City', keywords: 'mexico city moxige' },
  { id: 'london', nameCN: '伦敦', nameEN: 'London', country: '英国', flag: '🇬🇧', timezone: 'Europe/London', keywords: 'london uk gb england yingguo' },
  { id: 'paris', nameCN: '巴黎', nameEN: 'Paris', country: '法国', flag: '🇫🇷', timezone: 'Europe/Paris', keywords: 'paris france faguo' },
  { id: 'berlin', nameCN: '柏林', nameEN: 'Berlin', country: '德国', flag: '🇩🇪', timezone: 'Europe/Berlin', keywords: 'berlin germany deguo' },
  { id: 'amsterdam', nameCN: '阿姆斯特丹', nameEN: 'Amsterdam', country: '荷兰', flag: '🇳🇱', timezone: 'Europe/Amsterdam', keywords: 'amsterdam netherlands helan' },
  { id: 'rome', nameCN: '罗马', nameEN: 'Rome', country: '意大利', flag: '🇮🇹', timezone: 'Europe/Rome', keywords: 'rome italy yidali' },
  { id: 'madrid', nameCN: '马德里', nameEN: 'Madrid', country: '西班牙', flag: '🇪🇸', timezone: 'Europe/Madrid', keywords: 'madrid spain xibanya' },
  { id: 'moscow', nameCN: '莫斯科', nameEN: 'Moscow', country: '俄罗斯', flag: '🇷🇺', timezone: 'Europe/Moscow', keywords: 'moscow russia eluosi' },
  { id: 'istanbul', nameCN: '伊斯坦布尔', nameEN: 'Istanbul', country: '土耳其', flag: '🇹🇷', timezone: 'Europe/Istanbul', keywords: 'istanbul turkey tuerqi' },
  { id: 'dubai', nameCN: '迪拜', nameEN: 'Dubai', country: '阿联酋', flag: '🇦🇪', timezone: 'Asia/Dubai', keywords: 'dubai uae a lian qiu' },
  { id: 'riyadh', nameCN: '利雅得', nameEN: 'Riyadh', country: '沙特', flag: '🇸🇦', timezone: 'Asia/Riyadh', keywords: 'riyadh saudi shate' },
  { id: 'cairo', nameCN: '开罗', nameEN: 'Cairo', country: '埃及', flag: '🇪🇬', timezone: 'Africa/Cairo', keywords: 'cairo egypt aiji' },
  { id: 'johannesburg', nameCN: '约翰内斯堡', nameEN: 'Johannesburg', country: '南非', flag: '🇿🇦', timezone: 'Africa/Johannesburg', keywords: 'johannesburg south africa nanfei' },
  { id: 'newdelhi', nameCN: '新德里', nameEN: 'New Delhi', country: '印度', flag: '🇮🇳', timezone: 'Asia/Kolkata', keywords: 'new delhi india yindu' },
  { id: 'mumbai', nameCN: '孟买', nameEN: 'Mumbai', country: '印度', flag: '🇮🇳', timezone: 'Asia/Kolkata', keywords: 'mumbai india yindu' },
  { id: 'bangkok', nameCN: '曼谷', nameEN: 'Bangkok', country: '泰国', flag: '🇹🇭', timezone: 'Asia/Bangkok', keywords: 'bangkok thailand taiguo' },
  { id: 'singapore', nameCN: '新加坡', nameEN: 'Singapore', country: '新加坡', flag: '🇸🇬', timezone: 'Asia/Singapore', keywords: 'singapore xinjiapo' },
  { id: 'jakarta', nameCN: '雅加达', nameEN: 'Jakarta', country: '印尼', flag: '🇮🇩', timezone: 'Asia/Jakarta', keywords: 'jakarta indonesia yinni' },
  { id: 'kualalumpur', nameCN: '吉隆坡', nameEN: 'Kuala Lumpur', country: '马来西亚', flag: '🇲🇾', timezone: 'Asia/Kuala_Lumpur', keywords: 'kuala lumpur malaysia malaixiya' },
  { id: 'tokyo', nameCN: '东京', nameEN: 'Tokyo', country: '日本', flag: '🇯🇵', timezone: 'Asia/Tokyo', keywords: 'tokyo japan riben' },
  { id: 'seoul', nameCN: '首尔', nameEN: 'Seoul', country: '韩国', flag: '🇰🇷', timezone: 'Asia/Seoul', keywords: 'seoul korea hanguo' },
  { id: 'sydney', nameCN: '悉尼', nameEN: 'Sydney', country: '澳大利亚', flag: '🇦🇺', timezone: 'Australia/Sydney', keywords: 'sydney australia aodaliya' },
  { id: 'melbourne', nameCN: '墨尔本', nameEN: 'Melbourne', country: '澳大利亚', flag: '🇦🇺', timezone: 'Australia/Melbourne', keywords: 'melbourne australia aodaliya' },
  { id: 'auckland', nameCN: '奥克兰', nameEN: 'Auckland', country: '新西兰', flag: '🇳🇿', timezone: 'Pacific/Auckland', keywords: 'auckland new zealand xinxilan' },
];

const CURRENCIES: CurrencyDef[] = [
  { code: 'USD', name: '美元', flag: '🇺🇸' },
  { code: 'EUR', name: '欧元', flag: '🇪🇺' },
  { code: 'JPY', name: '日元', flag: '🇯🇵' },
  { code: 'GBP', name: '英镑', flag: '🇬🇧' },
  { code: 'HKD', name: '港币', flag: '🇭🇰' },
  { code: 'KRW', name: '韩元', flag: '🇰🇷' },
  { code: 'AUD', name: '澳元', flag: '🇦🇺' },
  { code: 'CAD', name: '加拿大元', flag: '🇨🇦' },
  { code: 'CHF', name: '瑞士法郎', flag: '🇨🇭' },
  { code: 'SGD', name: '新加坡元', flag: '🇸🇬' },
  { code: 'NZD', name: '新西兰元', flag: '🇳🇿' },
  { code: 'MYR', name: '马来西亚林吉特', flag: '🇲🇾' },
  { code: 'THB', name: '泰铢', flag: '🇹🇭' },
  { code: 'IDR', name: '印尼卢比', flag: '🇮🇩' },
  { code: 'INR', name: '印度卢比', flag: '🇮🇳' },
  { code: 'PHP', name: '菲律宾比索', flag: '🇵🇭' },
  { code: 'BRL', name: '巴西雷亚尔', flag: '🇧🇷' },
  { code: 'MXN', name: '墨西哥比索', flag: '🇲🇽' },
  { code: 'ZAR', name: '南非兰特', flag: '🇿🇦' },
  { code: 'TRY', name: '土耳其里拉', flag: '🇹🇷' },
  { code: 'SEK', name: '瑞典克朗', flag: '🇸🇪' },
  { code: 'NOK', name: '挪威克朗', flag: '🇳🇴' },
  { code: 'DKK', name: '丹麦克朗', flag: '🇩🇰' },
  { code: 'PLN', name: '波兰兹罗提', flag: '🇵🇱' },
  { code: 'ILS', name: '以色列新谢克尔', flag: '🇮🇱' },
  { code: 'CZK', name: '捷克克朗', flag: '🇨🇿' },
  { code: 'HUF', name: '匈牙利福林', flag: '🇭🇺' },
  { code: 'RON', name: '罗马尼亚列伊', flag: '🇷🇴' },
  { code: 'BGN', name: '保加利亚列弗', flag: '🇧🇬' },
  { code: 'ISK', name: '冰岛克朗', flag: '🇮🇸' },
];

const HOME_CITY_ID = 'shanghai';
const DEFAULT_CITY_IDS = ['shanghai', 'newyork', 'losangeles', 'london', 'berlin', 'dubai', 'newdelhi', 'sydney'];
const DEFAULT_CURRENCIES = ['USD', 'EUR', 'GBP'];
const CURRENCY_STORAGE_KEY = 'clock-board-currencies';
const CURRENCY_SYMBOLS = CURRENCIES.map((currency) => currency.code).join(',');

const STATUS_CLASS: Record<WorkStatus, string> = {
  work: 'bg-emerald-400',
  edge: 'bg-amber-300',
  off: 'bg-gray-100 dark:bg-gray-700',
};

const STATUS_LABEL: Record<WorkStatus, string> = {
  work: '工作时间 (09:00-17:00)',
  edge: '边缘时间 (08:00-09:00 / 17:00-19:00)',
  off: '休息时间',
};

function getCity(id: string) {
  return ALL_CITIES.find((city) => city.id === id) ?? null;
}

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function todayDateInput(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function getTimeParts(utcMs: number, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date(utcMs));

  const map: Record<string, string> = {};
  parts.forEach((part) => { map[part.type] = part.value; });
  if (map.hour === '24') map.hour = '00';

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second ?? '0'),
  };
}

function getWeekday(utcMs: number, timezone: string) {
  const value = new Intl.DateTimeFormat('zh-CN', { timeZone: timezone, weekday: 'short' }).format(new Date(utcMs));
  return value.replace('星期', '周');
}

function getDateLabel(utcMs: number, timezone: string) {
  const parts = getTimeParts(utcMs, timezone);
  return `${pad2(parts.month)}月${pad2(parts.day)}日 ${getWeekday(utcMs, timezone)}`;
}

function getIsoDate(utcMs: number, timezone: string) {
  const parts = getTimeParts(utcMs, timezone);
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

function getTimezoneOffsetMin(utcMs: number, timezone: string): number {
  const parts = getTimeParts(utcMs, timezone);
  const localMs = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return (localMs - utcMs) / 60000;
}

function isDSTActive(utcMs: number, timezone: string) {
  const year = new Date(utcMs).getUTCFullYear();
  const janOffset = getTimezoneOffsetMin(Date.UTC(year, 0, 15, 12), timezone);
  const julOffset = getTimezoneOffsetMin(Date.UTC(year, 6, 15, 12), timezone);
  if (janOffset === julOffset) return false;
  return getTimezoneOffsetMin(utcMs, timezone) === Math.max(janOffset, julOffset);
}

function getWorkStatus(hour: number): WorkStatus {
  if (hour >= 9 && hour < 17) return 'work';
  if ((hour >= 8 && hour < 9) || (hour >= 17 && hour < 19)) return 'edge';
  return 'off';
}

function getDayDiff(utcMs: number, timezone: string, homeTimezone: string) {
  const cityDate = getIsoDate(utcMs, timezone);
  const homeDate = getIsoDate(utcMs, homeTimezone);
  if (cityDate === homeDate) return 0;
  return cityDate > homeDate ? 1 : -1;
}

function formatMoney(value: number) {
  return value.toLocaleString('zh-CN', { maximumFractionDigits: 2 });
}

function formatRate(value: number) {
  if (value >= 100) return value.toFixed(2);
  if (value >= 10) return value.toFixed(3);
  return value.toFixed(4);
}

function CurrencySelect({
  value,
  onChange,
  rates,
}: {
  value: string;
  onChange: (value: string) => void;
  rates: Record<string, number>;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="shrink-0 rounded-xl border border-gray-200 bg-white px-2.5 py-2 text-xs font-medium text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
    >
      {CURRENCIES.map((currency) => (
        <option key={currency.code} value={currency.code}>
          {currency.flag} {currency.code} {currency.name}{rates[currency.code] ? ` ¥${formatRate(rates[currency.code])}` : ''}
        </option>
      ))}
    </select>
  );
}

function RateChart({ points, currency }: { points: RatePoint[]; currency: string }) {
  if (points.length === 0) {
    return <div className="flex h-40 items-center justify-center text-sm text-gray-300">暂无数据</div>;
  }

  const width = 640;
  const height = 160;
  const padding = { top: 10, right: 10, bottom: 24, left: 46 };
  const values = points.map((point) => point.rate);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const toX = (index: number) => padding.left + (points.length === 1 ? 0 : (index / (points.length - 1)) * innerWidth);
  const toY = (rate: number) => padding.top + (1 - (rate - min) / span) * innerHeight;
  const polyline = points.map((point, index) => `${toX(index)},${toY(point.rate)}`).join(' ');
  const first = points[0];
  const last = points[points.length - 1];

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-gray-50/60 dark:border-gray-700 dark:bg-gray-900/30">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-40 w-full" role="img" aria-label={`${currency} 兑人民币汇率走势`}>
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke="#e5e7eb" />
        <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="#e5e7eb" />
        {[0, 0.5, 1].map((ratio) => {
          const rate = max - ratio * span;
          const y = padding.top + ratio * innerHeight;
          return (
            <g key={ratio}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#eef2f7" strokeDasharray="4 4" />
              <text x={padding.left - 8} y={y + 4} textAnchor="end" className="fill-gray-400 text-[10px]">
                {formatRate(rate)}
              </text>
            </g>
          );
        })}
        <polyline fill="none" stroke="#3b82f6" strokeWidth="3" points={polyline} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => (
          <circle key={point.date} cx={toX(index)} cy={toY(point.rate)} r={index === points.length - 1 ? 4 : 2.5} fill="#3b82f6" opacity={index === points.length - 1 ? 1 : 0.45} />
        ))}
        {first && (
          <text x={padding.left} y={height - 6} className="fill-gray-400 text-[10px]">
            {first.date.slice(5)}
          </text>
        )}
        {last && (
          <text x={width - padding.right} y={height - 6} textAnchor="end" className="fill-gray-400 text-[10px]">
            {last.date.slice(5)}
          </text>
        )}
      </svg>
    </div>
  );
}

function CurrencyPanel() {
  const [rates, setRates] = useState<Record<string, number>>({});
  const [ratesLoading, setRatesLoading] = useState(true);
  const [ratesError, setRatesError] = useState(false);
  const [refreshSeq, setRefreshSeq] = useState(0);
  const [amount, setAmount] = useState('100');
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [watchedCurrencies, setWatchedCurrencies] = useState<string[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_CURRENCIES;
    try {
      const saved = localStorage.getItem(CURRENCY_STORAGE_KEY);
      if (!saved) return DEFAULT_CURRENCIES;
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return DEFAULT_CURRENCIES;
      const valid = parsed.filter((code) => CURRENCIES.some((currency) => currency.code === code));
      return valid.length > 0 ? valid : DEFAULT_CURRENCIES;
    } catch {
      return DEFAULT_CURRENCIES;
    }
  });
  const [range, setRange] = useState<RangeKey>('7d');
  const [history, setHistory] = useState<RatePoint[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(false);

  useEffect(() => {
    localStorage.setItem(CURRENCY_STORAGE_KEY, JSON.stringify(watchedCurrencies));
  }, [watchedCurrencies]);

  useEffect(() => {
    const controller = new AbortController();
    setRatesLoading(true);
    setRatesError(false);

    fetch(`https://api.frankfurter.dev/v1/latest?base=CNY&symbols=${CURRENCY_SYMBOLS}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Failed to fetch rates');
        return response.json();
      })
      .then((payload: { rates?: Record<string, number> }) => {
        const nextRates: Record<string, number> = {};
        for (const [code, value] of Object.entries(payload.rates ?? {})) {
          nextRates[code] = 1 / value;
        }
        setRates(nextRates);
        setRatesLoading(false);
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        setRatesError(true);
        setRatesLoading(false);
      });

    return () => controller.abort();
  }, [refreshSeq]);

  const fetchHistory = useCallback((currency: string, nextRange: RangeKey) => {
    const controller = new AbortController();
    setHistoryLoading(true);
    setHistoryError(false);

    const days = nextRange === '7d' ? 7 : 30;
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - days);

    fetch(`https://api.frankfurter.dev/v1/${todayDateInput(start)}..${todayDateInput(end)}?base=CNY&symbols=${currency}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Failed to fetch history');
        return response.json();
      })
      .then((payload: { rates?: Record<string, Record<string, number>> }) => {
        const nextHistory = Object.entries(payload.rates ?? {})
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, value]) => ({
            date,
            rate: Number((1 / value[currency]).toFixed(4)),
          }))
          .filter((point) => Number.isFinite(point.rate));
        setHistory(nextHistory);
        setHistoryLoading(false);
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        setHistoryError(true);
        setHistoryLoading(false);
      });

    return () => controller.abort();
  }, []);

  useEffect(() => fetchHistory(selectedCurrency, range), [fetchHistory, selectedCurrency, range]);

  const addCurrency = (code: string) => {
    setWatchedCurrencies((current) => current.includes(code) ? current : [...current, code]);
  };

  const removeCurrency = (code: string) => {
    setWatchedCurrencies((current) => {
      const next = current.filter((item) => item !== code);
      if (selectedCurrency === code && next.length > 0) setSelectedCurrency(next[0]);
      return next;
    });
  };

  const selectedDef = CURRENCIES.find((currency) => currency.code === selectedCurrency);
  const converted = rates[selectedCurrency] ? formatMoney((Number(amount) || 0) * rates[selectedCurrency]) : '—';
  const availableToAdd = CURRENCIES.filter((currency) => !watchedCurrencies.includes(currency.code));

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
      <div className="space-y-5">
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <p className="mb-3 text-xs font-medium text-gray-500 dark:text-gray-400">快速换算</p>
          <div className="mb-2 flex items-center gap-2">
            <input
              type="number"
              min="0"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              placeholder="金额"
            />
            <CurrencySelect value={selectedCurrency} onChange={setSelectedCurrency} rates={rates} />
          </div>
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-sm text-gray-400">=</span>
            <div className="flex min-w-0 flex-1 items-center justify-between rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 dark:border-blue-900/60 dark:bg-blue-950/30">
              <span className="truncate text-sm font-semibold text-blue-700 dark:text-blue-300">¥ {converted}</span>
              <span className="ml-2 shrink-0 text-xs text-blue-400">人民币</span>
            </div>
          </div>
          {rates[selectedCurrency] && selectedDef && (
            <p className="mt-2 text-xs text-gray-400">
              1 {selectedDef.name}（{selectedCurrency}）= ¥{formatRate(rates[selectedCurrency])} 人民币
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">今日汇率（兑人民币）</p>
              {availableToAdd.length > 0 && (
                <select
                  value=""
                  onChange={(event) => {
                    if (event.target.value) addCurrency(event.target.value);
                  }}
                  title="添加货币"
                  className="h-7 rounded-full border border-blue-100 bg-blue-50 px-2 text-xs text-blue-600 focus:outline-none dark:border-blue-900/60 dark:bg-blue-950/30"
                >
                  <option value="">+ 添加</option>
                  {availableToAdd.map((currency) => (
                    <option key={currency.code} value={currency.code}>{currency.flag} {currency.code} {currency.name}</option>
                  ))}
                </select>
              )}
            </div>
            <button
              type="button"
              onClick={() => setRefreshSeq((value) => value + 1)}
              className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2 py-1 text-[10px] text-gray-500 hover:border-blue-200 hover:text-blue-600 dark:border-gray-700 dark:text-gray-400"
            >
              <RefreshCw className="h-3 w-3" />
              刷新
            </button>
          </div>

          {ratesLoading ? (
            <div className="flex justify-center py-6 text-sm text-gray-300">加载中...</div>
          ) : ratesError ? (
            <div className="flex flex-col items-center gap-2 py-6">
              <p className="text-sm text-red-400">获取汇率失败，请检查网络</p>
              <button onClick={() => setRefreshSeq((value) => value + 1)} className="text-xs text-blue-500 underline underline-offset-2">重试</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              {watchedCurrencies.map((code) => {
                const currency = CURRENCIES.find((item) => item.code === code);
                const active = selectedCurrency === code;
                return (
                  <div key={code} className="group relative">
                    <button
                      type="button"
                      onClick={() => setSelectedCurrency(code)}
                      className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-colors ${
                        active
                          ? 'border-blue-300 bg-blue-50 ring-1 ring-blue-200 dark:border-blue-700 dark:bg-blue-950/40 dark:ring-blue-900'
                          : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="text-base leading-none">{currency?.flag}</span>
                        <span className="min-w-0">
                          <span className={`text-xs font-semibold ${active ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-200'}`}>{code}</span>
                          <span className="ml-1 text-[10px] text-gray-400">{currency?.name}</span>
                        </span>
                      </span>
                      <span className={`shrink-0 text-sm font-medium tabular-nums ${active ? 'text-blue-600 dark:text-blue-300' : 'text-gray-800 dark:text-gray-100'}`}>
                        {rates[code] ? `¥${formatRate(rates[code])}` : '—'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeCurrency(code)}
                      title="移除"
                      className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-gray-200 text-[10px] text-gray-400 transition-colors hover:bg-red-100 hover:text-red-500"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-1.5">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">汇率走势</p>
            <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-xs font-semibold text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
              {selectedCurrency} / CNY
            </span>
          </div>
          <div className="flex gap-1">
            {(['7d', '1m'] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setRange(item)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  range === item
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                }`}
              >
                {item === '7d' ? '7天' : '1个月'}
              </button>
            ))}
          </div>
        </div>

        {historyLoading ? (
          <div className="flex h-40 items-center justify-center text-sm text-gray-300">加载中...</div>
        ) : historyError ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2">
            <p className="text-sm text-red-400">走势加载失败</p>
            <button onClick={() => fetchHistory(selectedCurrency, range)} className="text-xs text-blue-500 underline underline-offset-2">重试</button>
          </div>
        ) : (
          <RateChart points={history} currency={selectedCurrency} />
        )}

        <p className="mt-3 text-center text-[11px] text-gray-300">仅供参考，以中行为准</p>
      </section>
    </div>
  );
}

function AddCityModal({
  cityIds,
  onAdd,
  onClose,
}: {
  cityIds: string[];
  onAdd: (id: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filteredCities = useMemo(() => {
    const value = query.trim().toLowerCase();
    return ALL_CITIES.filter((city) => {
      if (!value) return true;
      return city.nameCN.includes(value)
        || city.nameEN.toLowerCase().includes(value)
        || city.country.includes(value)
        || city.keywords.includes(value);
    }).slice(0, 24);
  }, [query]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 px-4 pt-24 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-gray-800" onClick={(event) => event.stopPropagation()}>
        <div className="border-b border-gray-100 p-4 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Search className="h-4 w-4 shrink-0 text-gray-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索城市或国家（中文 / 英文 / 拼音）"
              className="flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-gray-100"
            />
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {filteredCities.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">未找到城市</div>
          ) : (
            filteredCities.map((city) => {
              const selected = cityIds.includes(city.id);
              return (
                <button
                  key={city.id}
                  disabled={selected}
                  onClick={() => {
                    onAdd(city.id);
                    onClose();
                  }}
                  className={`flex w-full items-center justify-between border-b border-gray-50 px-4 py-3 text-left text-sm transition-colors last:border-0 dark:border-gray-700 ${
                    selected ? 'cursor-not-allowed opacity-40' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="text-lg">{city.flag}</span>
                    <span className="min-w-0">
                      <span className="font-medium text-gray-900 dark:text-gray-100">{city.country !== '中国' && city.country !== city.nameCN ? `${city.country} · ${city.nameCN}` : city.nameCN}</span>
                      <span className="ml-1.5 text-gray-400">{city.nameEN}</span>
                    </span>
                  </span>
                  {selected && <span className="text-xs text-blue-500">已添加</span>}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function TimeGrid({
  cityIds,
  homeCityId,
  currentUtcMs,
  realtime,
  onHomeCityChange,
  onCurrentUtcMsChange,
  onRealtimeChange,
  onRemoveCity,
  onAddCityClick,
}: {
  cityIds: string[];
  homeCityId: string;
  currentUtcMs: number;
  realtime: boolean;
  onHomeCityChange: (id: string) => void;
  onCurrentUtcMsChange: (value: number | ((current: number) => number)) => void;
  onRealtimeChange: (value: boolean) => void;
  onRemoveCity: (id: string) => void;
  onAddCityClick: () => void;
}) {
  const [isMobile, setIsMobile] = useState(false);
  const [showHomeSelect, setShowHomeSelect] = useState(false);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const homeCity = getCity(homeCityId) ?? getCity(HOME_CITY_ID) ?? ALL_CITIES[0];
  const homeTime = getTimeParts(currentUtcMs, homeCity.timezone);
  const currentMinuteOfDay = homeTime.hour * 60 + homeTime.minute;
  const span = isMobile ? 3 : 6;
  const columns = useMemo(() => {
    const currentHomeHourStartUtc = currentUtcMs - homeTime.minute * 60_000 - homeTime.second * 1000;
    return Array.from({ length: span * 2 + 1 }, (_, index) => currentHomeHourStartUtc + (index - span) * 3_600_000);
  }, [currentUtcMs, homeTime.minute, homeTime.second, span]);

  const orderedCityIds = useMemo(() => [
    homeCityId,
    ...cityIds.filter((id) => id !== homeCityId),
  ], [cityIds, homeCityId]);

  const setHomeMinute = (minuteOfDay: number) => {
    onRealtimeChange(false);
    onCurrentUtcMsChange((current) => current + (minuteOfDay - currentMinuteOfDay) * 60_000);
  };

  const shiftDay = (days: number) => {
    onRealtimeChange(false);
    onCurrentUtcMsChange((current) => current + days * 86_400_000);
  };

  const resetNow = () => {
    onRealtimeChange(true);
    onCurrentUtcMsChange(Date.now());
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowHomeSelect((value) => !value)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300"
            >
              <span>📍</span>
              <span>{homeCity.flag} {homeCity.nameCN}</span>
              <span className="text-xs text-blue-400">· 我的城市</span>
              <ChevronDown className="h-3 w-3" />
            </button>
            {showHomeSelect && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowHomeSelect(false)} />
                <div className="absolute left-0 top-full z-20 mt-1 min-w-36 rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                  {cityIds.map((id) => {
                    const city = getCity(id);
                    if (!city) return null;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          onHomeCityChange(id);
                          setShowHomeSelect(false);
                        }}
                        className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                          id === homeCityId ? 'font-medium text-blue-600 dark:text-blue-300' : 'text-gray-700 dark:text-gray-200'
                        }`}
                      >
                        <span>{city.flag}</span>
                        <span>{city.nameCN}</span>
                        {id === homeCityId && <span className="ml-auto text-xs text-blue-400">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button type="button" onClick={() => shiftDay(-1)} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">‹</button>
            <span className="w-32 text-center text-sm font-medium text-gray-700 dark:text-gray-200">{getDateLabel(currentUtcMs, homeCity.timezone)}</span>
            <button type="button" onClick={() => shiftDay(1)} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">›</button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-3 rounded-xl border border-gray-100 bg-white px-3 py-2 text-xs text-gray-500 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:flex">
            <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-6 rounded-sm bg-emerald-400" />工作时间</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-6 rounded-sm bg-amber-300" />边缘时间</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-6 rounded-sm bg-gray-200" />休息时间</span>
          </div>
          {realtime ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              实时
            </span>
          ) : (
            <button type="button" onClick={resetNow} className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-600 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300">
              回到现在
            </button>
          )}
          <button type="button" onClick={onAddCityClick} className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 px-3 py-1.5 text-sm text-blue-600 transition-colors hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-950/40">
            <Plus className="h-4 w-4" />
            添加城市
          </button>
        </div>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-3 flex items-center gap-3">
          <span className="w-10 text-right text-xs tabular-nums text-gray-400">00:00</span>
          <div className="relative flex-1">
            <input
              type="range"
              min={0}
              max={1439}
              step={1}
              value={currentMinuteOfDay}
              onChange={(event) => setHomeMinute(Number(event.target.value))}
              className="w-full cursor-pointer accent-blue-600"
            />
            <div className="pointer-events-none absolute -top-5 left-0 w-full">
              <span
                className="absolute -translate-x-1/2 rounded bg-white px-1 font-mono text-[11px] font-semibold tabular-nums text-blue-600 dark:bg-gray-800"
                style={{ left: `${(currentMinuteOfDay / 1439) * 100}%` }}
              >
                {pad2(homeTime.hour)}:{pad2(homeTime.minute)}
              </span>
            </div>
          </div>
          <span className="w-10 text-xs text-gray-400">23:59</span>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="overflow-x-auto">
          <div
            className="grid min-w-[760px] border-b border-gray-100 dark:border-gray-700"
            style={{ gridTemplateColumns: `150px repeat(${columns.length}, minmax(52px, 1fr))` }}
          >
            <div className="border-r border-dashed border-gray-200 px-4 py-2 text-center text-xs font-medium text-gray-500 dark:border-gray-700">城市</div>
            {columns.map((utcMs, index) => (
              <div
                key={utcMs}
                className={`border-r border-dashed px-2 py-2 text-center font-mono text-xs transition-colors last:border-r-0 dark:border-gray-700 ${
                  index === span ? 'border-blue-200 bg-blue-50 font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                {pad2(getTimeParts(utcMs, homeCity.timezone).hour)}
              </div>
            ))}
          </div>

          {orderedCityIds.map((id) => {
            const city = getCity(id);
            if (!city) return null;
            const cityTime = getTimeParts(currentUtcMs, city.timezone);
            const isHome = id === homeCityId;
            const dayDiff = getDayDiff(currentUtcMs, city.timezone, homeCity.timezone);
            const dst = isDSTActive(currentUtcMs, city.timezone);

            return (
              <div
                key={id}
                className={`grid min-w-[760px] border-b border-gray-50 last:border-0 hover:bg-gray-50/60 dark:border-gray-700 dark:hover:bg-gray-700/30 ${isHome ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''}`}
                style={{ gridTemplateColumns: `150px repeat(${columns.length}, minmax(52px, 1fr))` }}
              >
                <div className="flex items-center gap-2 border-r border-dashed border-gray-200 px-3 py-3 dark:border-gray-700">
                  <span className="text-base">{city.flag}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-gray-900 dark:text-white">{city.nameCN}</div>
                    <div className="mt-0.5 flex items-center gap-1">
                      {isHome ? <span className="text-[10px] text-gray-400">今天</span> : null}
                      {!isHome && dayDiff !== 0 ? (
                        <span className={`rounded px-1 py-0.5 text-[10px] font-semibold leading-none ${dayDiff > 0 ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40' : 'bg-orange-50 text-orange-500 dark:bg-orange-950/40'}`}>
                          {dayDiff > 0 ? `+${dayDiff}天` : `${dayDiff}天`}
                        </span>
                      ) : null}
                      {dst ? <span className="text-[10px] font-medium text-amber-500">夏</span> : null}
                    </div>
                  </div>
                  {!isHome && (
                    <button type="button" onClick={() => onRemoveCity(id)} className="text-gray-300 hover:text-red-400" title="移除">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {columns.map((utcMs, index) => {
                  const parts = getTimeParts(utcMs, city.timezone);
                  const status = getWorkStatus(parts.hour);
                  const isReference = index === span;
                  return (
                    <div
                      key={utcMs}
                      title={`${city.nameCN} - ${pad2(parts.hour)}:${pad2(parts.minute)} - ${STATUS_LABEL[status]}`}
                      className={`flex flex-col items-center justify-center border-r border-dashed px-2 py-3 last:border-r-0 dark:border-gray-700 ${
                        isReference ? 'border-blue-200 bg-blue-50/80 ring-2 ring-inset ring-blue-400 dark:bg-blue-950/40' : ''
                      }`}
                    >
                      <div className={`h-3.5 w-5/6 rounded-sm ${STATUS_CLASS[status]} ${isReference ? '' : 'opacity-70'}`} />
                      {isReference && (
                        <div className="mt-1 font-mono text-xs font-bold tabular-nums text-blue-700 dark:text-blue-300">
                          {pad2(cityTime.hour)}:{pad2(cityTime.minute)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export function ClockPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<TabKey>('clock');
  const [cityIds, setCityIds] = useState<string[]>(DEFAULT_CITY_IDS);
  const [homeCityId, setHomeCityId] = useState(HOME_CITY_ID);
  const [currentUtcMs, setCurrentUtcMs] = useState(0);
  const [realtime, setRealtime] = useState(true);
  const [showAddCity, setShowAddCity] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCurrentUtcMs(Date.now());
  }, []);

  useEffect(() => {
    if (!mounted || !realtime) return;
    const timer = setInterval(() => setCurrentUtcMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [mounted, realtime]);

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

  const addCity = useCallback((id: string) => {
    setCityIds((current) => current.includes(id) ? current : [...current, id]);
  }, []);

  const removeCity = useCallback((id: string) => {
    if (id === homeCityId) return;
    setCityIds((current) => current.filter((cityId) => cityId !== id));
  }, [homeCityId]);

  if (!mounted || status === 'unauthenticated') return null;

  return (
    <AppLayout
      breadcrumbs={[{ label: '首页', path: '/dashboard' }, { label: '时区汇率' }]}
      user={{
        name: session?.user?.username || session?.user?.name || '用户',
        isAdmin: session?.user?.isAdmin ?? false,
        email: session?.user?.email ?? null,
      }}
      onLogout={handleLogout}
    >
      <div className="w-full px-3 py-6 sm:px-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-end gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">时区汇率</h1>
              </div>
              <p className="mt-0.5 text-xs text-gray-400">
                {tab === 'clock' ? '拖动时间轴，各城市同步联动' : '实时汇率，快速换算'}
              </p>
            </div>
            <div className="mb-0.5 flex items-center gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
              {(['clock', 'currency'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setTab(item)}
                  className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                    tab === item
                      ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-700 dark:text-blue-300'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  {item === 'clock' ? '时间' : '汇率'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {tab === 'clock' ? (
          <TimeGrid
            cityIds={cityIds}
            homeCityId={homeCityId}
            currentUtcMs={currentUtcMs}
            realtime={realtime}
            onHomeCityChange={setHomeCityId}
            onCurrentUtcMsChange={setCurrentUtcMs}
            onRealtimeChange={setRealtime}
            onRemoveCity={removeCity}
            onAddCityClick={() => setShowAddCity(true)}
          />
        ) : (
          <CurrencyPanel />
        )}
      </div>

      {showAddCity && (
        <AddCityModal
          cityIds={cityIds}
          onAdd={addCity}
          onClose={() => setShowAddCity(false)}
        />
      )}
    </AppLayout>
  );
}
