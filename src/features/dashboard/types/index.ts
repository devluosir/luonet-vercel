// Dashboard模块类型定义
export interface DashboardModule {
  id: string;
  name: string;
  path: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  bgColor?: string;
  iconBg?: string;
  textColor?: string;
  titleColor?: string;
  shortcut?: string;
  shortcutBg?: string;
}

// 文档计数类型
export interface DocumentCounts {
  quotation: number;
  confirmation: number;
  invoice: number;
  packing: number;
  purchase: number;
}

// 权限映射类型
export interface PermissionMap {
  permissions: {
    quotation: boolean;
    confirmation: boolean;
    packing: boolean;
    invoice: boolean;
    purchase: boolean;
    'ai-email': boolean;
    history: boolean;
    customer: boolean;
  };
  documentTypePermissions: {
    quotation: boolean;
    confirmation: boolean;
    packing: boolean;
    invoice: boolean;
    purchase: boolean;
  };
  accessibleDocumentTypes: DocumentType[];
}

// 成功消息类型
export interface SuccessMessage {
  show: boolean;
  message: string;
  autoHideDelay?: number;
}

// 文档筛选器类型
export type TimeFilter = 'today' | '3days' | 'week' | 'month';
export type DocumentType = 'quotation' | 'confirmation' | 'invoice' | 'packing' | 'purchase';
export type TypeFilter = 'all' | DocumentType;
