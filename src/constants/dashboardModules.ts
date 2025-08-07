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
    bgColor: 'bg-gradient-to-br from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 dark:from-blue-800/30 dark:to-blue-700/40 dark:hover:from-blue-700/40 dark:hover:to-blue-600/50',
    iconBg: 'bg-gradient-to-br from-blue-600 to-blue-700',
    textColor: 'text-blue-800 dark:text-blue-200',
    shortcut: 'Q'
  },
  { 
    id: 'confirmation', 
    name: '销售确认', 
    path: '/quotation?tab=confirmation',
    icon: FileText,
    bgColor: 'bg-gradient-to-br from-green-100 to-green-200 hover:from-green-200 hover:to-green-300 dark:from-green-800/30 dark:to-green-700/40 dark:hover:from-green-700/40 dark:hover:to-green-600/50',
    iconBg: 'bg-gradient-to-br from-green-600 to-green-700',
    textColor: 'text-green-800 dark:text-green-200',
    shortcut: 'C'
  },
  { 
    id: 'packing', 
    name: '箱单发票', 
    path: '/packing',
    icon: Package,
    bgColor: 'bg-gradient-to-br from-teal-100 to-teal-200 hover:from-teal-200 hover:to-teal-300 dark:from-teal-800/30 dark:to-teal-700/40 dark:hover:from-teal-700/40 dark:hover:to-teal-600/50',
    iconBg: 'bg-gradient-to-br from-teal-600 to-teal-700',
    textColor: 'text-teal-800 dark:text-teal-200',
    shortcut: 'B'
  },
  { 
    id: 'invoice', 
    name: '财务发票', 
    path: '/invoice',
    icon: Receipt,
    bgColor: 'bg-gradient-to-br from-purple-100 to-purple-200 hover:from-purple-200 hover:to-purple-300 dark:from-purple-800/30 dark:to-purple-700/40 dark:hover:from-purple-700/40 dark:hover:to-purple-600/50',
    iconBg: 'bg-gradient-to-br from-purple-600 to-purple-700',
    textColor: 'text-purple-800 dark:text-purple-200',
    shortcut: 'I'
  },
  { 
    id: 'purchase', 
    name: '采购订单', 
    path: '/purchase',
    icon: ShoppingCart,
    bgColor: 'bg-gradient-to-br from-orange-100 to-orange-200 hover:from-orange-200 hover:to-orange-300 dark:from-orange-800/30 dark:to-orange-700/40 dark:hover:from-orange-700/40 dark:hover:to-orange-600/50',
    iconBg: 'bg-gradient-to-br from-orange-600 to-orange-700',
    textColor: 'text-orange-800 dark:text-orange-200',
    shortcut: 'P'
  }
];

// 工具模块
export const TOOL_MODULES = [
  { 
    id: 'ai-email', 
    name: 'AI邮件助手', 
    path: '/mail',
    icon: Mail,
    bgColor: 'bg-gradient-to-br from-indigo-100 to-indigo-200 hover:from-indigo-200 hover:to-indigo-300 dark:from-indigo-800/30 dark:to-indigo-700/40 dark:hover:from-indigo-700/40 dark:hover:to-indigo-600/50',
    iconBg: 'bg-gradient-to-br from-indigo-600 to-indigo-700',
    textColor: 'text-indigo-800 dark:text-indigo-200'
  }
];

// 管理中心功能模块
export const TOOLS_MODULES = [
  { 
    id: 'history', 
    name: '单据管理', 
    path: '/history',
    icon: Archive,
    bgColor: 'bg-gradient-to-br from-pink-100 to-pink-200 hover:from-pink-200 hover:to-pink-300 dark:from-pink-800/30 dark:to-pink-700/40 dark:hover:from-pink-700/40 dark:hover:to-pink-600/50',
    iconBg: 'bg-gradient-to-br from-pink-600 to-pink-700',
    textColor: 'text-pink-800 dark:text-pink-200'
  },
  { 
    id: 'customer', 
    name: '客户管理', 
    path: '/customer',
    icon: Users,
    bgColor: 'bg-gradient-to-br from-violet-100 to-violet-200 hover:from-violet-200 hover:to-violet-300 dark:from-violet-800/30 dark:to-violet-700/40 dark:hover:from-violet-700/40 dark:hover:to-violet-600/50',
    iconBg: 'bg-gradient-to-br from-violet-600 to-violet-700',
    textColor: 'text-violet-800 dark:text-violet-200'
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