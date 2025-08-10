import type { LineItem } from '@/types/quotation';

export function buildMergeKey(items: LineItem[], column: 'remarks' | 'description'): string {
  // 最快的稳定签名：取目标列 + 行数
  // 使用 \u0001 作为分隔符，避免与内容冲突
  return items.map(it => (column === 'remarks' ? (it.remarks ?? '') : (it.description ?? ''))).join('\u0001');
}
