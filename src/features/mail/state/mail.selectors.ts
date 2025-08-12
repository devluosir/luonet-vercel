import { useMailStore } from './mail.store';

// 表单数据选择器
export const useFormData = () => useMailStore(state => state.formData);

// 单个表单字段选择器
export const useFormField = (field: keyof ReturnType<typeof useFormData>) => 
  useMailStore(state => state.formData[field]);

// UI状态选择器
export const useActiveTab = () => useMailStore(state => state.activeTab);
export const useMailType = () => useMailStore(state => state.mailType);
export const useIsLoading = () => useMailStore(state => state.isLoading);
export const useError = () => useMailStore(state => state.error);
export const useCopySuccess = () => useMailStore(state => state.copySuccess);
export const useGeneratedContent = () => useMailStore(state => state.generatedContent);

// 计算属性选择器
export const useCanGenerateMail = () => {
  return useMailStore(state => {
    if (state.activeTab === 'mail') {
      return state.formData.mail.trim().length > 0;
    } else {
      return state.formData.replyTo.trim().length > 0 && 
             state.formData.reply.trim().length > 0;
    }
  });
};

// 当前表单是否有效
export const useIsFormValid = () => {
  return useMailStore(state => {
    const canGenerate = state.activeTab === 'mail' 
      ? state.formData.mail.trim().length > 0
      : state.formData.replyTo.trim().length > 0 && state.formData.reply.trim().length > 0;
    
    return canGenerate && !state.isLoading;
  });
};

// 是否有生成的内容
export const useHasGeneratedContent = () => {
  return useMailStore(state => state.generatedContent.trim().length > 0);
};

// 设置活动标签页
export const useSetActiveTab = () => {
  return useMailStore(state => state.setActiveTab);
};
