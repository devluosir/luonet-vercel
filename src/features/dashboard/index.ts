// Dashboard模块入口文件

// 导出主页面
export { default as DashboardPage } from './app/DashboardPage';

// 导出组件
export { DashboardModules } from './components/DashboardModules';
export { DashboardDocuments } from './components/DashboardDocuments';
export { DashboardSuccessMessage } from './components/DashboardSuccessMessage';

// 导出hooks
export { useDashboardState } from './hooks/useDashboardState';
export { useDashboardPermissions } from './hooks/useDashboardPermissions';
export { useDashboardDocuments } from './hooks/useDashboardDocuments';

// 导出工具函数
export { 
  filterQuickCreateModules, 
  filterToolModules, 
  filterToolsModules 
} from './utils/moduleFilters';

// 导出类型
export type {
  DashboardModule,
  DocumentCounts,
  PermissionMap,
  SuccessMessage,
  TimeFilter,
  DocumentType,
  TypeFilter
} from './types';
