// 类型导出
export type {
  BaseDocument,
  BaseCustomer,
  BaseLineItem,
  BaseSettings,
  DocumentAction,
  DocumentPermission,
  BaseDocumentStore,
} from './types';

// Hooks导出
export { useBaseDocument } from './hooks/useBaseDocument';

// 组件导出
export { DocumentLayout } from './components/DocumentLayout';
export { BaseFormSection, FormField, FormRow } from './components/BaseFormSection';

// 服务导出
export type {
  BaseDocumentService,
  ListParams,
  ListResult,
} from './services/BaseDocumentService';
export { BaseDocumentServiceImpl } from './services/BaseDocumentService';

// 状态管理导出
export type { BaseDocumentState } from './state/useBaseDocumentStore';
export {
  createBaseDocumentStore,
  useBaseDocumentStore,
  createSelectors,
  useAutoSave,
} from './state/useBaseDocumentStore';

// 工具函数导出
export { createDocumentId } from './utils/documentUtils';
export { validateDocument } from './utils/validationUtils';
export { formatCurrency, formatDate } from './utils/formatUtils';
