import { 
  FileText, 
  Receipt, 
  Package, 
  ShoppingCart, 
  Mail, 
  Archive, 
  Users, 
} from 'lucide-react';
import { moduleColorMap } from './colorMap';

// 快速创建单据的模块
export const QUICK_CREATE_MODULES = [
  { 
    id: 'quotation', 
    name: '新报价单', 
    path: '/quotation?tab=quotation',
    icon: FileText,
    ...moduleColorMap.quotation
  },
  { 
    id: 'confirmation', 
    name: '销售确认', 
    path: '/quotation?tab=confirmation',
    icon: FileText,
    ...moduleColorMap.confirmation
  },
  { 
    id: 'packing', 
    name: '箱单发票', 
    path: '/packing',
    icon: Package,
    ...moduleColorMap.packing
  },
  { 
    id: 'invoice', 
    name: '财务发票', 
    path: '/invoice',
    icon: Receipt,
    ...moduleColorMap.invoice
  },
  { 
    id: 'purchase', 
    name: '采购订单', 
    path: '/purchase',
    icon: ShoppingCart,
    ...moduleColorMap.purchase
  }
];

// 工具模块
export const TOOL_MODULES = [
  { 
    id: 'ai-email', 
    name: 'AI邮件助手', 
    path: '/mail',
    icon: Mail,
    ...moduleColorMap['ai-email']
  }
];

// 管理中心功能模块
export const TOOLS_MODULES = [
  { 
    id: 'history', 
    name: '单据管理', 
    path: '/history',
    icon: Archive,
    ...moduleColorMap.history
  },
  { 
    id: 'customer', 
    name: '客户管理', 
    path: '/customer',
    icon: Users,
    ...moduleColorMap.customer
  }
];

// 文档类型配置
export const DOCUMENT_TYPES = {
  quotation: { label: 'QTN', color: 'blue', name: '报价单' },
  confirmation: { label: 'SC', color: 'green', name: '销售确认' },
  packing: { label: 'PL', color: 'teal', name: '装箱单' },
  invoice: { label: 'INV', color: 'purple', name: '财务发票' },
  purchase: { label: 'PO', color: 'orange', name: '采购订单' }
} as const;

// 时间筛选器配置
export const TIME_FILTERS = [
  { value: 'today', label: '1D', name: '今天' },
  { value: '3days', label: '3D', name: '最近三天' },
  { value: 'week', label: '1W', name: '最近一周' },
  { value: 'month', label: '1M', name: '最近一个月' }
] as const; 