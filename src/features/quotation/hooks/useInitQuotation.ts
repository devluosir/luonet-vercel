import { useEffect } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
import { useQuotationStore } from '../state/useQuotationStore';
import { initDataFromSources, getEditIdFromPathname, getTabFromSearchParams } from '../services/quotation.service';

// 初始化报价页面状态
export function useInitQuotation() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { setTab, setData, setEditId } = useQuotationStore();
  const activeTab = useQuotationStore((state) => state.tab);

  useEffect(() => {
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
  }, [searchParams, pathname, setTab, setData, setEditId]);

  // 更新URL参数以持久化tab状态
  useEffect(() => {
    if (typeof window !== 'undefined' && activeTab) {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', activeTab);
      window.history.replaceState(null, '', url.toString());
    }
  }, [activeTab]);

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
