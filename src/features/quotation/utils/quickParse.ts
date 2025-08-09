import type { LineItem } from '@/types/quotation';

export function quickParseTSV(ts: string): Partial<LineItem>[] {
  let skipped = 0;
  const rows = ts.split('\n').map(s=>s.trim()).filter(Boolean);
  const parsed = rows.map(r=>{
    const cells = r.split('\t').map(s=>s.trim());
    if (!cells[0]) { skipped++; return null; }
    const name = cells[0];
    const qty = Number(cells[1] ?? 0);
    if (Number.isNaN(qty)) { skipped++; return null; }

    if (cells.length >= 4) {
      const unit = cells[2] || 'pc';
      const price = Number(cells[3] ?? 0) || 0;
      return { partName: name, quantity: qty, unit, unitPrice: price };
    } else if (cells.length === 3) {
      const price = Number(cells[2] ?? 0) || 0;
      return { partName: name, quantity: qty, unit: 'pc', unitPrice: price };
    } else {
      return { partName: name, quantity: qty, unit: 'pc', unitPrice: 0 };
    }
  }).filter(Boolean) as Partial<LineItem>[];

  (parsed as any).skipped = skipped;
  return parsed;
}
