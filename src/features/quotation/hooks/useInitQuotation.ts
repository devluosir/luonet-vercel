import { useEffect, useRef } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
import { useQuotationStore } from '../state/useQuotationStore';
import { initDataFromSources, getEditIdFromPathname, getTabFromSearchParams } from '../services/quotation.service';

// 初始化报价页面状态
export function useInitQuotation() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { setTab, setData, setEditId } = useQuotationStore();
  const initialized = useRef(false);

  useEffect(() => {
    // 防止重复初始化
    if (initialized.current) return;
    initialized.current = true;

    // 初始化标签页
    const tab = getTabFromSearchParams(searchParams);
    setTab(tab);

    // 初始化编辑ID
    const editId = getEditIdFromPathname(pathname);
    if (editId) {
      setEditId(editId);
    }

    // 初始化数据
    const initialData = initDataFromSources();
    setData(() => initialData);
  }, []); // 只在组件挂载时执行一次

  // 更新URL参数以持久化tab状态
  useEffect(() => {
    const tab = getTabFromSearchParams(searchParams);
    if (typeof window !== 'undefined' && tab) {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState(null, '', url.toString());
    }
  }, [searchParams]);
}
