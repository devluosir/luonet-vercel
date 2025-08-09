import React from 'react';
import { ShieldCheck, AlertTriangle } from 'lucide-react';

export function ConfidenceBadge({ value, threshold }: { value: number; threshold: number }) {
  const pct = Math.round(value);
  const high = pct >= threshold;
  const Icon = high ? ShieldCheck : AlertTriangle;
  const tone = high ? 'bg-green-50 text-green-700 ring-green-200' : 'bg-amber-50 text-amber-700 ring-amber-200';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm ring-1 ${tone}`}>
      <Icon className="h-4 w-4" />
      <span>置信度 {pct}%</span>
      <span className="mx-1 h-3 w-px bg-current/20" />
      <span className="opacity-70">{high ? '可自动插入' : '建议预览'}</span>
    </span>
  );
}
