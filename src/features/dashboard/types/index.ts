export type { DocumentType } from '@/utils/dashboardUtils';
export type { PermissionMap } from '@/types/permissions';
import type { DocumentType } from '@/utils/dashboardUtils';

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
  'domestic-quotation': number;
  'domestic-contract': number;
  invoice: number;
  packing: number;
  purchase: number;
}

// 成功消息类型
export interface SuccessMessage {
  show: boolean;
  message: string;
  autoHideDelay?: number;
}

// 文档筛选器类型
export type TimeFilter = 'today' | '3days' | 'week' | 'month';
export type TypeFilter = 'all' | DocumentType;
