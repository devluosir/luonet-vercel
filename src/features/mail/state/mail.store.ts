import { create } from 'zustand';
import type { MailFormData, MailTab } from '../types';

// 初始表单数据
const initialFormData: MailFormData = {
  mail: '',
  language: 'both English and Chinese',
  replyTo: '',
  reply: '',
  replyLanguage: 'both English and Chinese',
  replyType: 'formal'
};

// 邮件状态接口
interface MailState {
  // 表单数据
  formData: MailFormData;
  
  // UI状态
  activeTab: MailTab;
  mailType: string;
  isLoading: boolean;
  error: string;
  copySuccess: boolean;
  
  // 生成内容
  generatedContent: string;
  
  // Actions
  setActiveTab: (tab: MailTab) => void;
  updateFormData: (data: Partial<MailFormData>) => void;
  setMailType: (type: string) => void;
  setGeneratedContent: (content: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string) => void;
  setCopySuccess: (success: boolean) => void;
  resetForm: () => void;
  clearError: () => void;
}

// 创建store
export const useMailStore = create<MailState>((set, get) => ({
  // 初始状态
  formData: initialFormData,
  activeTab: 'mail',
  mailType: 'formal',
  isLoading: false,
  error: '',
  copySuccess: false,
  generatedContent: '',
  
  // Actions
  setActiveTab: (tab) => set({ activeTab: tab }),
  
  updateFormData: (data) => set((state) => ({
    formData: { ...state.formData, ...data }
  })),
  
  setMailType: (type) => set({ mailType: type }),
  
  setGeneratedContent: (content) => set({ generatedContent: content }),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  setError: (error) => set({ error }),
  
  setCopySuccess: (success) => set({ copySuccess: success }),
  
  resetForm: () => set({ 
    formData: initialFormData,
    generatedContent: '',
    error: ''
  }),
  
  clearError: () => set({ error: '' })
}));
