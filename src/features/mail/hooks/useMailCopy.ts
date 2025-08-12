import { useCallback } from 'react';
import { useMailStore } from '../state/mail.store';
import { useGeneratedContent } from '../state/mail.selectors';
import { MailService } from '../services/mail.service';

export function useMailCopy() {
  const generatedContent = useGeneratedContent();
  const { setCopySuccess } = useMailStore();

  // 复制内容到剪贴板
  const copyContent = useCallback(async (content?: string) => {
    const textToCopy = content || generatedContent;
    
    if (!textToCopy.trim()) {
      return false;
    }

    try {
      const success = await MailService.copyToClipboard(textToCopy);
      
      if (success) {
        setCopySuccess(true);
        // 2秒后自动隐藏成功提示
        setTimeout(() => setCopySuccess(false), 2000);
      }
      
      return success;
    } catch (error) {
      console.error('Copy failed:', error);
      return false;
    }
  }, [generatedContent, setCopySuccess]);

  return {
    copyContent,
    copySuccess: useMailStore(state => state.copySuccess),
    hasContent: generatedContent.trim().length > 0
  };
}
