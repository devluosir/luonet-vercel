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
    bgColor: 'bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 dark:from-blue-900/20 dark:to-blue-800/30 dark:hover:from-blue-800/30 dark:hover:to-blue-700/40',
    iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
    textColor: 'text-blue-700 dark:text-blue-300',
    shortcut: 'Q'
  },
  { 
    id: 'confirmation', 
    name: '销售确认', 
    path: '/quotation?tab=confirmation',
    icon: FileText,
    bgColor: 'bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 dark:from-green-900/20 dark:to-green-800/30 dark:hover:from-green-800/30 dark:hover:to-green-700/40',
    iconBg: 'bg-gradient-to-br from-green-500 to-green-600',
    textColor: 'text-green-700 dark:text-green-300',
    shortcut: 'C'
  },
  { 
    id: 'packing', 
    name: '箱单发票', 
    path: '/packing',
    icon: Package,
    bgColor: 'bg-gradient-to-br from-teal-50 to-teal-100 hover:from-teal-100 hover:to-teal-200 dark:from-teal-900/20 dark:to-teal-800/30 dark:hover:from-teal-800/30 dark:hover:to-teal-700/40',
    iconBg: 'bg-gradient-to-br from-teal-500 to-teal-600',
    textColor: 'text-teal-700 dark:text-teal-300',
    shortcut: 'B'
  },
  { 
    id: 'invoice', 
    name: '财务发票', 
    path: '/invoice',
    icon: Receipt,
    bgColor: 'bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 dark:from-purple-900/20 dark:to-purple-800/30 dark:hover:from-purple-800/30 dark:hover:to-purple-700/40',
    iconBg: 'bg-gradient-to-br from-purple-500 to-purple-600',
    textColor: 'text-purple-700 dark:text-purple-300',
    shortcut: 'I'
  },
  { 
    id: 'purchase', 
    name: '采购订单', 
    path: '/purchase',
    icon: ShoppingCart,
    bgColor: 'bg-gradient-to-br from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 dark:from-orange-900/20 dark:to-orange-800/30 dark:hover:from-orange-800/30 dark:hover:to-orange-700/40',
    iconBg: 'bg-gradient-to-br from-orange-500 to-orange-600',
    textColor: 'text-orange-700 dark:text-orange-300',
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
    bgColor: 'bg-gradient-to-br from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-200 dark:from-indigo-900/20 dark:to-indigo-800/30 dark:hover:from-indigo-800/30 dark:hover:to-indigo-700/40',
    iconBg: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
    textColor: 'text-indigo-700 dark:text-indigo-300'
  }
];

// 管理中心功能模块
export const TOOLS_MODULES = [
  { 
    id: 'history', 
    name: '单据管理', 
    path: '/history',
    icon: Archive,
    bgColor: 'bg-gradient-to-br from-pink-50 to-pink-100 hover:from-pink-100 hover:to-pink-200 dark:from-pink-900/20 dark:to-pink-800/30 dark:hover:from-pink-800/30 dark:hover:to-pink-700/40',
    iconBg: 'bg-gradient-to-br from-pink-500 to-pink-600',
    textColor: 'text-pink-700 dark:text-pink-300'
  },
  { 
    id: 'customer', 
    name: '客户管理', 
    path: '/customer',
    icon: Users,
    bgColor: 'bg-gradient-to-br from-violet-50 to-violet-100 hover:from-violet-100 hover:to-violet-200 dark:from-violet-900/20 dark:to-violet-800/30 dark:hover:from-violet-800/30 dark:hover:to-violet-700/40',
    iconBg: 'bg-gradient-to-br from-violet-500 to-violet-600',
    textColor: 'text-violet-700 dark:text-violet-300'
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