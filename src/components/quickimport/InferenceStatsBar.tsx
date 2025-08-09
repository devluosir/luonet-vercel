import React from 'react';

export function InferenceStatsBar({
  rowCount, colCount, mixedFormat, ignoreCount,
}: { rowCount: number; colCount: number; mixedFormat: boolean; ignoreCount: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
      <Stat label="参与推断行" value={rowCount} />
      <Stat label="检测列数" value={colCount} />
      <Stat label="忽略列" value={ignoreCount} />
      <Stat label="格式混杂" value={mixedFormat ? '是' : '否'} tone={mixedFormat ? 'bad' : 'good'} />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: 'good' | 'bad' }) {
  const cls =
    tone === 'good' ? 'bg-green-50 text-green-700 ring-green-200'
    : tone === 'bad' ? 'bg-amber-50 text-amber-700 ring-amber-200'
    : 'bg-slate-50 text-slate-700 ring-slate-200';
  return (
    <div className={`rounded-lg px-3 py-2 ring-1 ${cls}`}>
      <div className="text-xs opacity-70">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
