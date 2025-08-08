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

// 默认Notes配置 - 按照用户要求的排序
export const DEFAULT_NOTES_CONFIG: NoteConfig[] = [
  { id: 'delivery_time', visible: true, order: 0 },      // 1. Delivery time
  { id: 'price_based_on', visible: true, order: 1 },    // 2. Price based on
  { id: 'delivery_terms', visible: true, order: 2 },     // 3. Delivery terms
  { id: 'payment_terms', visible: true, order: 3 },      // 4. Payment term
  { id: 'validity', visible: true, order: 4 },           // 5. Validity
  { id: 'quality_terms', visible: false, order: 5 },     // 6. Quality terms (默认隐藏)
  { id: 'warranty_terms', visible: false, order: 6 },    // 7. Warranty terms (默认隐藏)
  { id: 'custom_note_1', visible: false, order: 7 },     // 8. Custom note 1 (默认隐藏)
  { id: 'custom_note_2', visible: false, order: 8 },     // 9. Custom note 2 (默认隐藏)
];

// Notes内容映射 - 使用双语模板的英文部分
export const NOTES_CONTENT_MAP: Record<string, string> = {
  delivery_time: 'Delivery Time: As stated in Remarks.',
  price_based_on: 'Price Basis: FOB Shanghai, China.',
  delivery_terms: 'Delivery Terms: As stated above, subject to prior sale.',
  payment_terms: 'Payment Term: 30% advance payment, 70% before shipment.',
  validity: 'Validity: This quotation is valid for 30 days from the date of issue.',
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

// 提取英文内容的工具函数
export const extractEnglishContent = (bilingualText: string): string => {
  const parts = bilingualText.split(' / ');
  return parts[0] || bilingualText;
};

// 提取中文内容的工具函数
export const extractChineseContent = (bilingualText: string): string => {
  const parts = bilingualText.split(' / ');
  return parts[1] || bilingualText;
};

// 双语Notes模板库
export const NOTES_TEMPLATES_BILINGUAL = {
  exw: [
    "Delivery Time: As stated in Remarks. / 交货期：见备注。",
    "Price Basis: EXW Shanghai, China. / 价格基础：工厂交货，上海，中国。",
    "Delivery Terms: As stated above, subject to prior sale. / 交货条款：同上，以未售出为条件。",
    "Payment Term: 30 days net. / 付款条件：货到后30天内付款。",
    "Validity: This quotation is valid for 10 days from the date of issue. / 报价有效期：自出具之日起10天内有效。"
  ],
  fob: [
    "Delivery Time: As stated in Remarks. / 交货期：见备注。",
    "Price Basis: FOB Shanghai, China. / 价格基础：离岸价，上海，中国。",
    "Delivery Terms: As stated above, subject to prior sale. / 交货条款：同上，以未售出为条件。",
    "Payment Term: 30% advance payment, 70% before shipment. / 付款条件：预付30%，发货前支付70%。",
    "Validity: This quotation is valid for 30 days from the date of issue. / 报价有效期：自出具之日起30天内有效。"
  ],
  cif: [
    "Delivery Time: As stated in Remarks. / 交货期：见备注。",
    "Price Basis: CIF [Destination Port]. / 价格基础：到岸价，[目的港]。",
    "Delivery Terms: As stated above, subject to prior sale. / 交货条款：同上，以未售出为条件。",
    "Payment Term: 100% T/T in advance. / 付款条件：预付100%电汇。",
    "Validity: This quotation is valid for 15 days from the date of issue. / 报价有效期：自出具之日起15天内有效。"
  ]
};

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
