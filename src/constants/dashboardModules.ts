import { 
  FileText, 
  Receipt, 
  Package, 
  ShoppingCart, 
  Mail, 
  Archive, 
  Users, 
} from 'lucide-react';

// 快速创建单据的模块
export const QUICK_CREATE_MODULES = [
  { 
    id: 'quotation', 
    name: '新报价单', 
    path: '/quotation?tab=quotation',
    icon: FileText,
    bgColor: 'bg-gradient-to-br from-blue-50 to-blue-100',
    iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
    textColor: 'text-gray-800 dark:text-gray-200'
  },
  { 
    id: 'confirmation', 
    name: '销售确认', 
    path: '/quotation?tab=confirmation',
    icon: FileText,
    bgColor: 'bg-gradient-to-br from-emerald-50 to-emerald-100',
    iconBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
    textColor: 'text-gray-800 dark:text-gray-200'
  },
  { 
    id: 'packing', 
    name: '箱单发票', 
    path: '/packing',
    icon: Package,
    bgColor: 'bg-gradient-to-br from-cyan-50 to-cyan-100',
    iconBg: 'bg-gradient-to-br from-cyan-500 to-cyan-600',
    textColor: 'text-gray-800 dark:text-gray-200'
  },
  { 
    id: 'invoice', 
    name: '财务发票', 
    path: '/invoice',
    icon: Receipt,
    bgColor: 'bg-gradient-to-br from-violet-50 to-violet-100',
    iconBg: 'bg-gradient-to-br from-violet-500 to-violet-600',
    textColor: 'text-gray-800 dark:text-gray-200'
  },
  { 
    id: 'purchase', 
    name: '采购订单', 
    path: '/purchase',
    icon: ShoppingCart,
    bgColor: 'bg-gradient-to-br from-orange-50 to-orange-100',
    iconBg: 'bg-gradient-to-br from-orange-500 to-orange-600',
    textColor: 'text-gray-800 dark:text-gray-200'
  }
];

// 工具模块
export const TOOL_MODULES = [
  { 
    id: 'ai-email', 
    name: 'AI邮件助手', 
    path: '/mail',
    icon: Mail,
    bgColor: 'bg-gradient-to-br from-indigo-50 to-indigo-100',
    iconBg: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
    textColor: 'text-gray-800 dark:text-gray-200'
  }
];

// 管理中心功能模块
export const TOOLS_MODULES = [
  { 
    id: 'history', 
    name: '单据管理', 
    path: '/history',
    icon: Archive,
    bgColor: 'bg-gradient-to-br from-rose-50 to-rose-100',
    iconBg: 'bg-gradient-to-br from-rose-500 to-rose-600',
    textColor: 'text-gray-800 dark:text-gray-200'
  },
  { 
    id: 'customer', 
    name: '客户管理', 
    path: '/customer',
    icon: Users,
    bgColor: 'bg-gradient-to-br from-fuchsia-50 to-fuchsia-100',
    iconBg: 'bg-gradient-to-br from-fuchsia-500 to-fuchsia-600',
    textColor: 'text-gray-800 dark:text-gray-200'
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