'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Banknote, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { useAppUser } from '@/hooks/useAppUser';

// ── 中文大写核心算法 ───────────────────────────────────────────────────────────

const CN_DIGITS = '零壹贰叁肆伍陆柒捌玖';

function convertSection(numStr: string): string {
  const n = numStr.padStart(4, '0');
  const units = ['仟', '佰', '拾', ''];
  let result = '';
  for (let i = 0; i < 4; i++) {
    const d = parseInt(n[i]);
    if (d !== 0) {
      result += CN_DIGITS[d] + units[i];
    } else if (result && !result.endsWith('零')) {
      result += '零';
    }
  }
  return result.replace(/零$/, '');
}

function rmbToUppercase(input: string): string {
  const cleaned = input.replace(/,/g, '').replace(/\s/g, '');
  if (!cleaned) return '';
  // 支持以小数点开头（如 .99 → 0.99）
  const normalized = cleaned.startsWith('.') ? '0' + cleaned : cleaned;
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return '';

  const [intStr, decStr = ''] = normalized.split('.');
  const jiao = parseInt(decStr[0] || '0');
  const fen = parseInt(decStr[1] || '0');
  const intNum = Number(intStr);

  if (intNum > 999_999_999_999) return '金额超出范围（最大9999亿）';
  if (intNum === 0 && jiao === 0 && fen === 0) return '人民币零元整';

  let intResult = '';
  if (intNum > 0) {
    const yi  = Math.floor(intNum / 1e8);
    const wan = Math.floor((intNum % 1e8) / 1e4);
    const ge  = intNum % 1e4;

    if (yi > 0) {
      intResult += convertSection(String(yi)) + '亿';
    }
    if (wan > 0) {
      if (yi > 0 && wan < 1000) intResult += '零';
      intResult += convertSection(String(wan)) + '万';
    }
    if (ge > 0) {
      const prevNonZero = yi > 0 || wan > 0;
      // 需要补零：千位为零（ge<1000）或亿后跳过万段（wan===0）
      if (prevNonZero && (ge < 1000 || (yi > 0 && wan === 0))) intResult += '零';
      intResult += convertSection(String(ge));
    }
  }

  let result = '人民币';
  if (intResult) result += intResult + '元';

  if (jiao === 0 && fen === 0) {
    result += '整';
  } else if (jiao === 0) {
    // 角为零但分不为零：元后补零
    result += (intResult ? '零' : '') + CN_DIGITS[fen] + '分';
  } else {
    result += CN_DIGITS[jiao] + '角' + (fen > 0 ? CN_DIGITS[fen] + '分' : '整');
  }

  return result;
}

// ── 英文金额算法 ──────────────────────────────────────────────────────────────

const EN_ONES = [
  '', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE',
  'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN',
  'SEVENTEEN', 'EIGHTEEN', 'NINETEEN',
];
const EN_TENS = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];

function convertHundreds(n: number): string {
  if (n === 0) return '';
  let result = '';
  if (n >= 100) {
    result += EN_ONES[Math.floor(n / 100)] + ' HUNDRED';
    n %= 100;
    if (n > 0) result += ' ';
  }
  if (n >= 20) {
    result += EN_TENS[Math.floor(n / 10)];
    if (n % 10 > 0) result += '-' + EN_ONES[n % 10];
  } else if (n > 0) {
    result += EN_ONES[n];
  }
  return result;
}

function convertToEnglishWords(n: number): string {
  if (n === 0) return 'ZERO';
  const parts: string[] = [];
  const billions  = Math.floor(n / 1_000_000_000);
  const millions  = Math.floor((n % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1_000);
  const remainder = n % 1_000;
  if (billions  > 0) parts.push(convertHundreds(billions)  + ' BILLION');
  if (millions  > 0) parts.push(convertHundreds(millions)  + ' MILLION');
  if (thousands > 0) parts.push(convertHundreds(thousands) + ' THOUSAND');
  if (remainder > 0) parts.push(convertHundreds(remainder));
  return parts.join(' ');
}

function rmbToEnglish(input: string): string {
  const cleaned = input.replace(/,/g, '').replace(/\s/g, '');
  if (!cleaned) return '';
  const normalized = cleaned.startsWith('.') ? '0' + cleaned : cleaned;
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return '';

  const [intStr, decStr = ''] = normalized.split('.');
  const cents   = parseInt((decStr + '00').slice(0, 2));
  const dollars = parseInt(intStr) || 0;

  if (dollars === 0 && cents === 0) return 'SAY USD ZERO DOLLARS ONLY';

  let result = 'SAY USD ' + convertToEnglishWords(dollars) + (dollars === 1 ? ' DOLLAR' : ' DOLLARS');
  if (cents > 0) {
    result += ' AND ' + convertToEnglishWords(cents) + (cents === 1 ? ' CENT' : ' CENTS');
  }
  return result + ' ONLY';
}

// ── 示例数据 ──────────────────────────────────────────────────────────────────

const PRESETS = ['100', '1000', '10000', '100000', '1000000'];

const EXAMPLES = [
  { num: '1688.99',    desc: '壹仟陆佰捌拾捌元玖角玖分' },
  { num: '16409.02',   desc: '壹万陆仟肆佰零玖元零贰分' },
  { num: '107000.53',  desc: '壹拾万柒仟元伍角叁分' },
  { num: '1000000',    desc: '壹佰万元整' },
];

// ── 主页面 ────────────────────────────────────────────────────────────────────

export function RmbPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { user, handleLogout } = useAppUser();

  const [input, setInput]       = useState('');
  const [copiedCN, setCopiedCN] = useState(false);
  const [copiedEN, setCopiedEN] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/');
  }, [status, router]);

  const cnResult = rmbToUppercase(input);
  const enResult = rmbToEnglish(input);

  const isError  = (input !== '' && cnResult === '') || cnResult.startsWith('金额超出');
  const isValid  = input !== '' && cnResult !== '' && !isError;

  const copyText = useCallback(async (text: string, setCopied: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }, []);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
      </div>
    );
  }

  return (
    <AppLayout
      breadcrumbs={[
        { label: '首页', path: '/dashboard' },
        { label: '人民币大写' },
      ]}
      user={user}
      onLogout={handleLogout}
    >
      <div className="w-full px-3 sm:px-6 py-6">

        {/* ── 页头 ── */}
        <div className="mb-6 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
            <Banknote className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">人民币大写转换</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">小写金额转规范中文大写，适用于票据、合同、发票填写</p>
          </div>
        </div>

        {/* ── 输入卡片 ── */}
        <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-[#2C2C2E]">
          <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
            小写金额（支持小数，如 1,688.99）
          </label>
          <div className="flex items-center gap-2">
            <span className="text-xl font-medium text-gray-300 dark:text-gray-600 select-none">¥</span>
            <input
              type="text"
              inputMode="decimal"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="请输入金额，例如 1688.99"
              className={`h-12 min-w-0 flex-1 rounded-lg border bg-gray-50 px-3 text-lg outline-none transition-colors dark:bg-gray-800/50 ${
                isError
                  ? 'border-red-300 text-red-600 focus:border-red-400 focus:ring-1 focus:ring-red-200 dark:border-red-700 dark:text-red-400'
                  : 'border-gray-200 text-gray-900 focus:border-blue-400 focus:ring-1 focus:ring-blue-200 dark:border-gray-700 dark:text-white dark:focus:border-blue-500'
              }`}
              autoComplete="off"
            />
            {input && (
              <button
                type="button"
                onClick={() => setInput('')}
                className="shrink-0 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-400 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-500 dark:hover:bg-gray-700"
              >
                清除
              </button>
            )}
          </div>

          {/* 快速预设 */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-gray-400 dark:text-gray-500">快速输入：</span>
            {PRESETS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setInput(v)}
                className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                  input === v
                    ? 'border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-400'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700'
                }`}
              >
                {Number(v).toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        {/* ── 中文大写结果 ── */}
        <div className={`mb-3 rounded-xl border p-4 shadow-sm transition-all ${
          isValid
            ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20'
            : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-[#2C2C2E]'
        }`}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">中文大写</span>
            {isValid && (
              <button
                type="button"
                onClick={() => copyText(cnResult, setCopiedCN)}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                {copiedCN
                  ? <Check className="h-3.5 w-3.5 text-green-500" />
                  : <Copy className="h-3.5 w-3.5" />
                }
                {copiedCN ? '已复制' : '复制'}
              </button>
            )}
          </div>
          <p className={`min-h-8 select-all break-all text-base font-medium leading-relaxed tracking-wide ${
            isValid
              ? 'text-gray-900 dark:text-white'
              : isError
              ? 'text-red-500 dark:text-red-400'
              : 'text-gray-300 dark:text-gray-600'
          }`}>
            {cnResult || '人民币（金额大写将在此显示）'}
          </p>
        </div>

        {/* ── 英文金额结果 ── */}
        <div className={`mb-4 rounded-xl border p-4 shadow-sm transition-all ${
          isValid && enResult
            ? 'border-blue-100 bg-blue-50/30 dark:border-blue-900/30 dark:bg-blue-950/10'
            : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-[#2C2C2E]'
        }`}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">英文金额（发票用）</span>
            {isValid && enResult && (
              <button
                type="button"
                onClick={() => copyText(enResult, setCopiedEN)}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                {copiedEN
                  ? <Check className="h-3.5 w-3.5 text-green-500" />
                  : <Copy className="h-3.5 w-3.5" />
                }
                {copiedEN ? '已复制' : '复制'}
              </button>
            )}
          </div>
          <p className={`min-h-8 select-all break-all font-mono text-sm leading-relaxed ${
            isValid && enResult
              ? 'text-gray-700 dark:text-gray-300'
              : 'text-gray-300 dark:text-gray-600'
          }`}>
            {(isValid && enResult) ? enResult : 'SAY USD（英文金额将在此显示）'}
          </p>
        </div>

        {/* ── 示例 ── */}
        <div className="mb-4 rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-[#2C2C2E]">
          <div className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">典型示例（点击填入）</div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {EXAMPLES.map(({ num, desc }) => (
              <button
                key={num}
                type="button"
                onClick={() => setInput(num)}
                className="flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/40"
              >
                <span className="text-sm font-mono text-blue-600 dark:text-blue-400">
                  ¥{Number(num).toLocaleString()}
                </span>
                <span className="ml-3 min-w-0 truncate text-right text-xs text-gray-500 dark:text-gray-400">
                  {desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── 规范说明（可折叠） ── */}
        <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-[#2C2C2E]">
          <button
            type="button"
            onClick={() => setRulesOpen((o) => !o)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">人民币大写规范说明</span>
            {rulesOpen
              ? <ChevronUp className="h-4 w-4 text-gray-400" />
              : <ChevronDown className="h-4 w-4 text-gray-400" />
            }
          </button>
          {rulesOpen && (
            <div className="border-t border-gray-100 px-4 py-3 dark:border-gray-700/50">
              <p className="mb-2.5 text-xs font-medium text-gray-700 dark:text-gray-300">
                常用大写数字：零、壹、贰、叁、肆、伍、陆、柒、捌、玖、拾、佰、仟、万、亿
              </p>
              <div className="space-y-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                <p>
                  <span className="font-medium text-gray-600 dark:text-gray-300">一、</span>
                  金额到"元"为止的，元后写"整"字；有角或分时，角分后不写整。
                </p>
                <p>
                  <span className="font-medium text-gray-600 dark:text-gray-300">二、</span>
                  中文大写前应标明"人民币"字样，大写金额应紧接"人民币"填写，不得留有空白。
                </p>
                <p>
                  <span className="font-medium text-gray-600 dark:text-gray-300">三、</span>
                  数字中间有"0"时大写写"零"字；连续多个"0"，中文大写中间只写一个"零"。
                </p>
                <p>
                  <span className="font-medium text-gray-600 dark:text-gray-300">四、</span>
                  角位是"0"而分位不是"0"时，元后面要写"零"字。
                  例如：￥325.04 → 人民币叁佰贰拾伍元零肆分。
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </AppLayout>
  );
}
