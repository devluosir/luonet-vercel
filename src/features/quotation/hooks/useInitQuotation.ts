import { useEffect, useRef } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
import { useQuotationStore } from '../state/useQuotationStore';
import { initDataFromSources, initNotesConfigFromSources, getEditIdFromPathname, getTabFromSearchParams } from '../services/quotation.service';

// 初始化报价页面状态
export function useInitQuotation() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { setTab, setData, setEditId, setNotesConfig } = useQuotationStore();
  const initialized = useRef(false);

  // 初始化标签页和编辑ID
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // 初始化标签页
    const tab = getTabFromSearchParams(searchParams || undefined);
    setTab(tab);

    // 初始化编辑ID
    const editId = getEditIdFromPathname(pathname || undefined);
    if (editId) {
      setEditId(editId);
    }
  }, []); // 只在组件挂载时执行一次

  // 初始化数据 - 只在首个effect之后执行
  useEffect(() => {
    if (!initialized.current) return;
    
    const initialData = initDataFromSources();
    setData(() => initialData);
    
    // 初始化Notes配置
    const initialNotesConfig = initNotesConfigFromSources();
    setNotesConfig(initialNotesConfig);
  }, []); // 只在组件挂载时执行一次

  // 更新URL参数以持久化tab状态
  useEffect(() => {
    const tab = getTabFromSearchParams(searchParams || undefined);
    if (typeof window !== 'undefined' && tab) {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState(null, '', url.toString());
    }
  }, [searchParams]);
}
