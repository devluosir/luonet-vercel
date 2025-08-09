import React from 'react';
import { Info } from 'lucide-react';

export interface WarningChip {
  type: 'MISSING_UNIT' | 'PRICE_ZERO' | 'QTY_ZERO' | 'MIXED_FORMAT' | 'large_quantity' | 'tiny_price' | 'suspicious_unit' | 'zero_qty_or_price' | 'name_too_short';
  message: string;
}

export function WarningChips({ warnings }: { warnings: WarningChip[] }) {
  if (!warnings?.length) return null;
  
  return (
    <div className="flex flex-wrap gap-2">
      {warnings.map((w, i) => (
        <span key={i} className="inline-flex items-center gap-1 rounded-full bg-rose-50 text-rose-700 ring-1 ring-rose-200 px-2.5 py-1 text-sm">
          <Info className="h-4 w-4" />
          {w.message}
        </span>
      ))}
    </div>
  );
}
