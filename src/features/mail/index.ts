// 主页面导出
export { default as MailPage } from './app/MailPage';

// 组件导出
export { MailTabs } from './components/MailTabs';
export { ChatInterface } from './components/ChatInterface';
export { MailForm } from './components/MailForm';
export { ReplyForm } from './components/ReplyForm';
export { MailPreview } from './components/MailPreview';
export { CopyButton } from './components/CopyButton';
export { BackButton } from './components/BackButton';
export { ErrorDisplay } from './components/ErrorDisplay';
export { TextAreaField } from './components/TextAreaField';
export { SelectField } from './components/SelectField';
export { GenerateButton } from './components/GenerateButton';

// Hooks导出
export { useMailForm } from './hooks/useMailForm';
export { useMailGeneration } from './hooks/useMailGeneration';
export { useMailCopy } from './hooks/useMailCopy';

// 状态管理导出
export { useMailStore } from './state/mail.store';
export * from './state/mail.selectors';

// 服务导出
export { MailService } from './services/mail.service';

// 类型导出
export * from './types';

// 常量导出
export * from './utils/constants';

// 测试工具导出
export * from './utils/test-utils';
export * from './utils/layout-test';
export * from './utils/chat-test';
