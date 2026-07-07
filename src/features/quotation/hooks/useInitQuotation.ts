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

    // 初始化编辑ID - 确保新创建时editId为undefined
    const editId = getEditIdFromPathname(pathname || undefined);
    setEditId(editId); // 总是设置editId，即使是undefined
  // eslint-disable-next-line react-hooks/exhaustive-deps -- 首次挂载时读取初始 URL 状态；后续 pathname/searchParams 分别由下面的监听 effect 同步。
  }, []);

  // 监听路径变化，确保editId正确更新
  useEffect(() => {
    if (!initialized.current) return;

    const editId = getEditIdFromPathname(pathname || undefined);
    console.log(`[useInitQuotation] 路径变化: ${pathname}, editId: ${editId || 'undefined'}`);
    setEditId(editId); // 总是设置editId，即使是undefined
  }, [pathname, setEditId]);

  // 初始化数据 - 只在首个effect之后执行
  useEffect(() => {
    if (!initialized.current) return;

    const tab = getTabFromSearchParams(searchParams || undefined);
    const initialData = initDataFromSources(tab);
    setData(() => initialData);

    // 初始化Notes配置
    const initialNotesConfig = initNotesConfigFromSources(tab);
    setNotesConfig(initialNotesConfig);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- 初始单据数据只应在页面首次进入时装载，tab 切换不应重置用户正在编辑的数据。
  }, []);

  // 监听 searchParams 变化（侧边栏导航切换 tab 时触发）并同步到 store
  useEffect(() => {
    const tab = getTabFromSearchParams(searchParams || undefined);
    // 同步到 store（处理侧边栏 /quotation?tab=confirmation 导航）
    setTab(tab);
    // 更新URL参数以持久化tab状态
    if (typeof window !== 'undefined' && tab) {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState(null, '', url.toString());
    }
  }, [searchParams, setTab]);
}
