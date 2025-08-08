// Notes配置相关类型定义
export interface NoteConfig {
  id: string;         // note 唯一ID
  visible: boolean;   // 是否显示
  order: number;      // 排序顺序
}

export interface NoteItem {
  id: string;
  content: string;
  type: 'default' | 'custom';
}

// 默认Notes配置
export const DEFAULT_NOTES_CONFIG: NoteConfig[] = [
  { id: 'payment_terms', visible: true, order: 0 },
  { id: 'delivery_terms', visible: true, order: 1 },
  { id: 'quality_terms', visible: true, order: 2 },
  { id: 'warranty_terms', visible: true, order: 3 },
  { id: 'custom_note_1', visible: true, order: 4 },
  { id: 'custom_note_2', visible: true, order: 5 },
];

// Notes内容映射
export const NOTES_CONTENT_MAP: Record<string, string> = {
  payment_terms: 'Payment Terms: 30% advance payment, 70% before shipment',
  delivery_terms: 'Delivery Terms: FOB Shanghai, China',
  quality_terms: 'Quality Terms: According to customer requirements',
  warranty_terms: 'Warranty: 12 months from delivery date',
  custom_note_1: '',
  custom_note_2: '',
};
