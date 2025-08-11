// Notes配置相关类型定义
export interface NoteConfig {
  id: string;         // note 唯一ID
  visible: boolean;   // 是否显示
  order: number;      // 排序顺序
  content?: string;   // 条款内容
}

export interface NoteItem {
  id: string;
  content: string;
  type: 'default' | 'custom';
}

// 默认Notes配置 - 使用EXW条款
export const DEFAULT_NOTES_CONFIG: NoteConfig[] = [
  { id: 'delivery_time', visible: true, order: 0, content: 'Delivery Time: 30 days.' },      // 1. Delivery time
  { id: 'price_based_on', visible: true, order: 1, content: 'Price Basis: EXW Shanghai, China.' },    // 2. Price based on
  { id: 'delivery_terms', visible: true, order: 2, content: 'Delivery Terms: As stated above, subject to prior sale.' },     // 3. Delivery terms
  { id: 'payment_terms', visible: true, order: 3, content: 'Payment Term: 100% T/T in advance.' },      // 4. Payment term
  { id: 'validity', visible: true, order: 4, content: 'Validity: 10 days.' },           // 5. Validity
];

// 条款模板预设（用于Notes中的快速模板选择时的预设条款）
export const NOTES_TEMPLATES_BILINGUAL = {
  exw: [
    "Delivery Time: 30 days. / 交货期：30天。",
    "Price Basis: EXW Shanghai, China. / 价格基础：工厂交货，上海，中国。",
    "Delivery Terms: As stated above, subject to prior sale. / 交货条款：同上，以未售出为条件。",
    "Payment Term: 30 days. / 付款条件：货到后30天内付款。",
    "Validity: 10 days. / 报价有效期：10天。"
  ],
  fob: [
    "Delivery Time: 30 days. / 交货期：30 days。",
    "Price Basis: FOB Shanghai, China. / 价格基础：离岸价，上海，中国。",
    "Delivery Terms: As stated above, subject to prior sale. / 交货条款：同上，以未售出为条件。",
    "Payment Term: 50% advance payment, 50% before shipment. / 付款条件：预付50%，发货前支付50%。",
    "Validity: 30 days. / 报价有效期：30天。"
  ],
  cif: [
    "Delivery Time: As stated in Remarks. / 交货期：见备注。",
    "Price Basis: CIF [Destination Port]. / 价格基础：到岸价，[目的港]。",
    "Delivery Terms: As stated above, subject to prior sale. / 交货条款：同上，以未售出为条件。",
    "Payment Term: 100% T/T in advance. / 付款条件：预付100%电汇。",
    "Validity: 15 days. / 报价有效期：15天。"
  ]
};

// 交货期选项（用于Notes中的delivery_time）
export const DELIVERY_TERMS_OPTIONS = [
  { id: 'days_after_order', chinese: '30天', english: 'Delivery Time: 30 days.', remark: '常见30/45/60天' },
  { id: 'days_after_order', chinese: '交货期：见备注。', english: 'Delivery Time: As stated in Remarks. ', remark: '交货期：见备注。' },
  { id: 'days_after_order', chinese: '订单确认后30天交货', english: 'Delivery Time: 30 days after order confirmation (AOC).', remark: '常见30/45/60天' },
  { id: 'days_after_deposit', chinese: '收到定金后30天交货', english: 'Delivery Time: 30 days after receipt of deposit.', remark: '与30/70搭配常用' },
  { id: 'immediate_delivery', chinese: '现货', english: 'Delivery Time: Ex-stock.', remark: '库存可随时发' },
  { id: 'days_after_sample', chinese: '最终样品确认后XX天交货', english: 'Delivery Time: XX days after final sample approval.', remark: '定制/来样业务常用' },
  { id: 'production_lead_time', chinese: '生产周期XX天/周', english: 'Delivery Time: Production lead time: XX days/weeks.', remark: '标准产期表述' },
  { id: 'flexible_range', chinese: '弹性区间交货', english: 'Delivery Time: Delivery within 45–60 days after order.', remark: '给产线/船期留余量' },    
  { id: 'days_after_lc', chinese: '信用证开立后XX天交货', english: 'Delivery Time: XX days after L/C issuance.', remark: '与L/C条款联动' },
  { id: 'vessel_schedule', chinese: '按船期交货', english: 'Delivery Time: Delivery in line with vessel schedule.', remark: '海运常用' },
  { id: 'not_later_than_date', chinese: '不迟于某日交货', english: 'Delivery Time: Not later than [Date].', remark: '对接客户硬截止' },
  { id: 'partial_shipments', chinese: '分批发货', english: 'Delivery Time: Partial shipments allowed/prohibited.', remark: '与信用证/订舱配合' },
  { id: 'subject_to_availability', chinese: '视库存情况交货', english: 'Delivery Time: Subject to availability.', remark: '补充说明库存优先级' }
];

// 付款方式选项（用于Notes中的payment_terms）
export const PAYMENT_TERMS_OPTIONS = [
    { id: 'tt_50_50', chinese: '50%定金，50%装船前付清', english: 'Payment Term: 50% deposit, 50% before shipment.', remark: '我司常见比例，风险与现金流平衡' },
    { id: 'tt_30_70', chinese: '30%定金，70%装船前付清', english: 'Payment Term: 30% deposit, 70% before shipment.', remark: '最常见比例，风险与现金流平衡' },
    { id: 'tt_100_before_shipment', chinese: '装船前全额付款', english: 'Payment Term: 100% before shipment.', remark: '与全额预付类似，发货前结清' },
    { id: 'tt_100_advance', chinese: '全额预付', english: 'Payment Term: 100% T/T in advance.', remark: '小额/样品/首次交易' },
    { id: 'open_account', chinese: '30天', english: 'Payment Term: 30 days.', remark: '老客户/长期合作' },
    { id: 'lc_at_sight', chinese: '即期信用证', english: 'Payment Term: Irrevocable L/C at sight.', remark: '银行信用，见单即付' },
    { id: 'lc_usance', chinese: '远期信用证', english: 'Payment Term: Usance L/C (e.g. 60 days).', remark: '账期由信用证承担' },
    { id: 'd_p', chinese: '付款交单', english: 'Payment Term: D/P (Documents against Payment).', remark: '风险中等，可替代部分L/C' },
    { id: 'progress_payment', chinese: '分阶段付款', english: 'Payment Term: Progress payment.', remark: '按里程碑/节点付款' }
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
