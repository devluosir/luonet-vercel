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

// 特殊Notes类型（支持动态选择）
export interface SpecialNoteConfig extends NoteConfig {
  type: 'payment_terms' | 'delivery_terms';
  selectedOption?: string; // 存储选中的选项ID
}

// 付款方式选项（用于Notes中的payment_terms）
export const PAYMENT_TERMS_OPTIONS = [
  { id: 'tt_100_advance', chinese: '全额预付', english: '100% T/T in advance', remark: '风险最低，常用于小额或首次交易' },
  { id: 'tt_100_before_shipment', chinese: '装船前全额付款', english: '100% before shipment', remark: '与全额预付类似，但在出货前结清' },
  { id: 'tt_30_70', chinese: '30%定金，70%装船前付清', english: '30% deposit, 70% before shipment', remark: '常见比例 30/70' },
  { id: 'tt_50_50', chinese: '50%定金，50%装船前付清', english: '50% deposit, 50% before shipment', remark: '大额或定制单常用' },
  { id: 'progress_payment', chinese: '分阶段付款', english: 'Progress payment', remark: '按合同阶段付款' },
  { id: 'd_p', chinese: '付款交单', english: 'D/P (Documents against Payment)', remark: '银行见单付款' },
  { id: 'd_a', chinese: '承兑交单', english: 'D/A (Documents against Acceptance)', remark: '风险较高' },
  { id: 'lc_at_sight', chinese: '即期信用证', english: 'Irrevocable L/C at sight', remark: '见单即付' },
  { id: 'lc_usance', chinese: '远期信用证', english: 'Usance L/C (e.g. 60 days)', remark: '到期付款' },
  { id: 'cod', chinese: '货到付款', english: 'COD (Cash on Delivery)', remark: '国内或小额交易' },
  { id: 'open_account', chinese: '赊账结算', english: 'Open Account / Net 30-90 days', remark: '完全基于信用' },
  { id: 'escrow', chinese: '第三方托管', english: 'Escrow / Third-party payment', remark: 'PayPal、支付宝担保交易等' }
];

// 交货期选项（用于Notes中的delivery_terms）
export const DELIVERY_TERMS_OPTIONS = [
  { id: 'on_or_before_date', chinese: '在某日期或之前交货', english: 'On or before [Date]', remark: '固定日期交货' },
  { id: 'on_date', chinese: '固定日期交货', english: 'On [Date]', remark: '' },
  { id: 'not_later_than_date', chinese: '不迟于某日交货', english: 'Not later than [Date]', remark: '' },
  { id: 'days_after_order', chinese: '订单确认后XX天交货', english: 'XX days after order confirmation (AOC)', remark: '常见 30/45/60天' },
  { id: 'days_after_deposit', chinese: '收到定金后XX天交货', english: 'XX days after receipt of deposit', remark: '' },
  { id: 'days_after_lc', chinese: '信用证开立后XX天交货', english: 'XX days after L/C issuance', remark: '' },
  { id: 'days_after_sample', chinese: '最终样品确认后XX天交货', english: 'XX days after final sample approval', remark: '适用于定制品' },
  { id: 'production_lead_time', chinese: '生产周期XX天/周', english: 'Production lead time: XX days/weeks', remark: '' },
  { id: 'vessel_schedule', chinese: '按船期交货', english: 'Delivery in line with vessel schedule', remark: '海运常用' },
  { id: 'partial_shipments', chinese: '分批发货', english: 'Partial shipments allowed/prohibited', remark: '' },
  { id: 'flexible_range', chinese: '弹性区间交货', english: 'Delivery within XX–XX days after order', remark: '' },
  { id: 'immediate_delivery', chinese: '现货交付', english: 'Immediate delivery / Ex-stock', remark: '随时可发' },
  { id: 'subject_to_availability', chinese: '视库存情况交货', english: 'Subject to availability', remark: '' },
  { id: 'subject_to_prior_sales', chinese: '库存先售出则顺延', english: 'Delivery subject to prior sales', remark: '' },
  { id: 'upon_full_payment', chinese: '全额付款后交货', english: 'Delivery upon full payment', remark: '' },
  { id: 'sample_confirmation', chinese: '来样订制，收到样品后确认交货期', english: 'Delivery time to be confirmed upon receipt of sample', remark: '样品评估后确认' }
];
