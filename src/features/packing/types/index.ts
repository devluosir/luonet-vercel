// 箱单项目接口
export interface PackingItem {
  id: number;
  serialNo: string;
  description: string;
  hsCode: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  netWeight: number;
  grossWeight: number;
  packageQty: number;
  dimensions: string;
  unit: string;
  groupId?: string;
}

// 其他费用接口
export interface OtherFee {
  id: number;
  description: string;
  amount: number;
  highlight?: {
    description?: boolean;
    amount?: boolean;
  };
}

// 备注选项接口
export interface RemarkOptions {
  shipsSpares: boolean;
  customsPurpose: boolean;
}

// 模板配置接口
export interface TemplateConfig {
  headerType: 'none' | 'bilingual' | 'english';
}

// 主数据接口
export interface PackingData {
  orderNo: string;
  invoiceNo: string;
  date: string;
  consignee: {
    name: string;
  };
  markingNo: string;
  items: PackingItem[];
  otherFees?: OtherFee[];
  currency: string;
  remarks: string;
  remarkOptions: RemarkOptions;
  showHsCode: boolean;
  showDimensions: boolean;
  showWeightAndPackage: boolean;
  showPrice: boolean;
  dimensionUnit: string;
  documentType: 'proforma' | 'packing' | 'both';
  templateConfig: TemplateConfig;
  customUnits?: string[];
  isInGroupMode: boolean;
  currentGroupId?: string;
}

// 总计数据接口
export interface PackingTotals {
  totalPrice: number;
  netWeight: number;
  grossWeight: number;
  packageQty: number;
}

// 历史记录接口
export interface PackingHistory {
  id: string;
  createdAt: string;
  updatedAt: string;
  consigneeName: string;
  invoiceNo: string;
  orderNo: string;
  totalAmount: number;
  currency: string;
  documentType: 'proforma' | 'packing' | 'both';
  data: PackingData;
}

// 组件Props接口
export interface PackingFormProps {
  data: PackingData;
  onDataChange: (data: PackingData) => void;
  isEditMode?: boolean;
  editId?: string;
  isGenerating?: boolean;
  isSaving?: boolean;
  saveMessage?: string;
  onGenerate?: () => void;
  onPreview?: () => void;
  onSave?: () => void;
  onExportExcel?: () => void;
}

export interface BasicInfoSectionProps {
  data: PackingData;
  onDataChange: (data: PackingData) => void;
}

export interface ItemsTableSectionProps {
  data: PackingData;
  onDataChange: (data: PackingData) => void;
  totals: PackingTotals;
}

export interface RemarksSectionProps {
  data: PackingData;
  onDataChange: (data: PackingData) => void;
}

export interface ActionButtonsProps {
  data: PackingData;
  isGenerating: boolean;
  isSaving: boolean;
  saveMessage: string;
  onGenerate: () => void;
  onPreview: () => void;
  onSave: () => void;
  onExportExcel: () => void;
}

// 操作回调接口
export interface PackingCallbacks {
  onItemChange: (index: number, field: keyof PackingItem, value: string | number) => void;
  onAddLine: () => void;
  onDeleteLine: (index: number) => void;
  onOtherFeeChange: (index: number, field: keyof OtherFee, value: string | number) => void;
  onOtherFeeDoubleClick: (index: number, field: 'description' | 'amount') => void;
  onDeleteOtherFee: (index: number) => void;
  onAddOtherFee: () => void;
  onEnterGroupMode: () => void;
  onExitGroupMode: () => void;
}
