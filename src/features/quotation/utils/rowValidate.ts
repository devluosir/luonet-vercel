import type { LineItem } from '@/types/quotation';

export function validateRow(r: LineItem) {
  if (!r.partName || !r.partName.trim()) return { field: 'partName', msg: 'Name required' };
  if (r.quantity < 0) return { field: 'quantity', msg: 'Qty ≥ 0' };
  if (r.unitPrice < 0) return { field: 'unitPrice', msg: 'Price ≥ 0' };
  return null;
}
