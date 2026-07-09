import { useEffect, useRef } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
import { useQuotationStore } from '../state/useQuotationStore';
import { initDataFromSources, initNotesConfigFromSources, getEditIdFromPathname, getTabFromSearchParams, getDomesticDocTypeFromSearchParams } from '../services/quotation.service';
import { DOMESTIC_NOTES_CONFIG, DOMESTIC_QUOTATION_NOTES_CONFIG } from '../types/notes';

// 初始化报价页面状态
export function useInitQuotation() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { setTab, setData, setEditId, setNotesConfig, updateData } = useQuotationStore();
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
    const domesticDocType = getDomesticDocTypeFromSearchParams(searchParams || undefined);
    const initialData = initDataFromSources(tab, domesticDocType);
    setData(() => initialData);

    // 初始化Notes配置
    const initialNotesConfig = initNotesConfigFromSources(tab, initialData.domesticDocType);
    setNotesConfig(initialNotesConfig);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- 初始单据数据只应在页面首次进入时装载，tab 切换不应重置用户正在编辑的数据。
  }, []);

  // 监听 searchParams 变化（侧边栏/移动端底部导航切换 tab 时触发，页面未重新挂载）并同步到 store
  useEffect(() => {
    const tab = getTabFromSearchParams(searchParams || undefined);
    // 同步到 store（处理侧边栏 /quotation?tab=confirmation、移动端 /quotation?tab=domestic&docType=... 导航）
    setTab(tab);
    // docType 仅在切到内销 tab 时生效；setTab 进入内销分支时只会用"已有值或默认报价单"，
    // 不知道 URL 上的 docType（该逻辑只在页面首次挂载的初始化 effect 里读取过一次）。
    // 这里补一次显式覆盖 + 同步对应的默认条款配置，确保同一页面内切换
    // （如"新建"浮动菜单里 内销报价 ⇄ 内销合同，页面本身不重新挂载）也能正确生效。
    const domesticDocType = getDomesticDocTypeFromSearchParams(searchParams || undefined);
    if (tab === 'domestic' && domesticDocType) {
      updateData({ domesticDocType });
      setNotesConfig(domesticDocType === 'contract' ? DOMESTIC_NOTES_CONFIG : DOMESTIC_QUOTATION_NOTES_CONFIG);
    }
    // 更新URL参数以持久化tab状态；docType 只是一次性指令（用于指定初始单据类型），
    // 应用后从 URL 移除，避免用户后续在页面内手动切换类型后，浏览器前进/后退等场景
    // 又把已经消费过的旧 docType 重新触发一次、覆盖用户的手动选择
    if (typeof window !== 'undefined' && tab) {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      if (domesticDocType) {
        url.searchParams.delete('docType');
      }
      window.history.replaceState(null, '', url.toString());
    }
  }, [searchParams, setTab, updateData, setNotesConfig]);
}
