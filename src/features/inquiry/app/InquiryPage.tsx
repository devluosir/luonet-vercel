'use client';

import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Download, Link2, Pencil, Plus, Trash2, Upload, X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppLayout, type ActionButton } from '@/components/layout';
import { useAppUser } from '@/hooks/useAppUser';
import { usePermissionStore } from '@/lib/permissions';
import type { CustomerQuoteStatus, InquiryBasicInput, InquiryRecord, SupplierQuoteStatus } from '../types';
import { useInquiryActions } from '../hooks/useInquiryActions';
import { useInquiryFilter } from '../hooks/useInquiryFilter';
import { useInquiryStore } from '../state/inquiry.store';
import { inquiryService } from '../services/inquiry.service';
import { InquiryFilterBar } from '../components/InquiryFilterBar';
import { InquiryFormModal } from '../components/InquiryFormModal';
import { InquiryTable } from '../components/InquiryTable';
import { BatchLinkCustomerModal } from '../components/BatchLinkCustomerModal';

// ── Excel 辅助 ────────────────────────────────────────
const SUPPLIER_STATUS_LABEL: Record<string, string> = {
  pending: '待报价',
  quoted: '已报价',
  need_info: '需补资料',
  unavailable: '无法报价',
};

function recordToRow(r: InquiryRecord) {
  const supplierText = r.supplierStatuses
    .map((s) => `${s.supplierShortName}${s.quoteDate ? `(${s.quoteDate})` : ''}:${SUPPLIER_STATUS_LABEL[s.status ?? 'pending'] ?? s.status}`)
    .join('; ');
  const quotedText = r.quotedStatuses
    .filter((s) => !s.type || s.type === 'quoted')
    .map((s) => `${s.quoteDate} ${s.supplierShortName} ${s.version}`.trim())
    .join('; ');
  const unavailable = r.quotedStatuses.some((s) => s.type === 'unavailable') ? '是' : '';
  return {
    'ID': r.id,
    '询价编号': r.inquiryNo,
    '询价日期': r.inquiryDate,
    '询价人': r.inquirer,
    '客户编号': r.customerNo,
    '内容简述': r.description ?? '',
    '订单编号': r.orderNo ?? '',
    '供应商报价': supplierText,
    '已报客户': quotedText,
    '无法报价': unavailable,
    '创建时间': r.createdAt,
    '更新时间': r.updatedAt,
    // 结构化数据列（导入时解析，可在 Excel 中隐藏）
    '_供应商JSON': JSON.stringify(r.supplierStatuses),
    '_报价JSON': JSON.stringify(r.quotedStatuses),
  };
}

function rowToRecord(row: Record<string, unknown>): InquiryRecord | null {
  const id = String(row['ID'] ?? '').trim();
  const inquiryNo = String(row['询价编号'] ?? '').trim();
  if (!id || !inquiryNo) return null;

  let supplierStatuses: SupplierQuoteStatus[] = [];
  let quotedStatuses: CustomerQuoteStatus[] = [];
  try { supplierStatuses = JSON.parse(String(row['_供应商JSON'] ?? '[]')); } catch { /* keep empty */ }
  try { quotedStatuses = JSON.parse(String(row['_报价JSON'] ?? '[]')); } catch { /* keep empty */ }

  return {
    id,
    inquiryNo,
    inquiryDate: String(row['询价日期'] ?? ''),
    inquirer: String(row['询价人'] ?? ''),
    customerNo: String(row['客户编号'] ?? ''),
    description: String(row['内容简述'] ?? ''),
    orderNo: String(row['订单编号'] ?? '') || undefined,
    supplierStatuses,
    quotedStatuses,
    createdAt: String(row['创建时间'] ?? new Date().toISOString()),
    updatedAt: String(row['更新时间'] ?? new Date().toISOString()),
  };
}

export function InquiryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, handleLogout } = useAppUser();
  const records = useInquiryStore((state) => state.records);
  const { createRecord, removeRecord } = useInquiryActions();
  const updateRecord = useInquiryStore((state) => state.updateRecord);
  const { filter, setFilter, filteredAndSorted, baseFiltered, inquirers, activeCount, reset } =
    useInquiryFilter(records);
  const [permissionChecked, setPermissionChecked] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<InquiryRecord | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const [isBatchLinkOpen, setIsBatchLinkOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const isModalOpenRef = useRef(false);
  const appliedAssociationFilterRef = useRef('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasBatchEditPermission = usePermissionStore((state) => state.hasPermission('inquiry.batchEdit'));

  const hasInquiryAccess = useMemo(() => {
    if (!session?.user) return false;
    if (session.user.isAdmin) return true;
    return (session.user.permissions ?? []).some(
      (permission) => permission.moduleId === 'inquiry' && permission.canAccess
    );
  }, [session]);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }
    setPermissionChecked(true);
  }, [status, router]);

  useEffect(() => {
    useInquiryStore.getState().init();
  }, []);

  const associationFilterKey = useMemo(() => {
    const customerId = searchParams?.get('customerId') ?? '';
    const contactId = searchParams?.get('contactId') ?? '';
    const customerName = searchParams?.get('customerName') ?? '';
    const contactName = searchParams?.get('contactName') ?? '';
    const keyword = searchParams?.get('keyword') ?? '';
    const quoteStatus = searchParams?.get('quoteStatus') === 'has_order' ? 'has_order' : '';
    return JSON.stringify({ customerId, contactId, customerName, contactName, keyword, quoteStatus });
  }, [searchParams]);

  useEffect(() => {
    const parsed = JSON.parse(associationFilterKey) as {
      customerId: string;
      contactId: string;
      customerName: string;
      contactName: string;
      keyword: string;
      quoteStatus: 'has_order' | '';
    };
    if ((!parsed.customerId && !parsed.keyword) || appliedAssociationFilterRef.current === associationFilterKey) return;

    const associationLabel = [parsed.customerName, parsed.contactName].filter(Boolean).join(' / ');
    appliedAssociationFilterRef.current = associationFilterKey;
    setFilter({
      ...filter,
      timeRange: 'all',
      customerId: parsed.customerId,
      contactId: parsed.contactId,
      associationLabel: associationLabel || '客户记录',
      keyword: parsed.keyword || filter.keyword,
      quoteStatus: parsed.quoteStatus || filter.quoteStatus,
      linkStatus: 'all',
    });
  }, [associationFilterKey, filter, setFilter]);

  useEffect(() => {
    isModalOpenRef.current = isModalOpen;
  }, [isModalOpen]);

  useEffect(() => {
    if (!permissionChecked || !hasInquiryAccess || isModalOpen) return;

    const POLL_INTERVAL_MS = 30_000;
    let cancelled = false;

    async function syncFromD1() {
      if (isModalOpenRef.current) return;
      const d1Records = await inquiryService.pullFromD1();
      if (cancelled || isModalOpenRef.current) return;
      inquiryService.pushLocalToD1(d1Records);
      const merged = inquiryService.mergeFromD1(d1Records);
      useInquiryStore.setState({ records: merged });
      setLastSyncedAt(new Date());
    }

    void syncFromD1();

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void syncFromD1();
      }
    }, POLL_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void syncFromD1();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [hasInquiryAccess, isModalOpen, permissionChecked]);

  const openCreateModal = () => {
    setEditingRecord(null);
    setIsModalOpen(true);
  };

  const openEditModal = (record: InquiryRecord) => {
    setEditingRecord(record);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRecord(null);
  };

  const handleSubmit = (
    values: InquiryBasicInput,
    suppliers: SupplierQuoteStatus[],
    quoted: CustomerQuoteStatus[]
  ) => {
    if (editingRecord) {
      updateRecord(editingRecord.id, {
        ...values,
        supplierStatuses: suppliers,
        quotedStatuses: quoted,
      });
    } else {
      createRecord(values, suppliers, quoted);
    }
    closeModal();
  };

  // 筛选条件变化时清空选中
  useEffect(() => {
    setSelectedIds(new Set());
  }, [filter]);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleToggleSelectAll = useCallback((allIds: string[]) => {
    setSelectedIds((prev) => {
      const allSelected = allIds.every((id) => prev.has(id));
      return allSelected ? new Set() : new Set(allIds);
    });
  }, []);

  const handleBatchDelete = useCallback(() => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`确定删除选中的 ${selectedIds.size} 条记录吗？此操作不可撤销。`)) return;
    Array.from(selectedIds).forEach((id) => removeRecord(id));
    setSelectedIds(new Set());
  }, [selectedIds, removeRecord]);

  const handleBatchLinkCustomer = useCallback((customerId: string, contactId: string, inquirer: string) => {
    const ids = Array.from(selectedIds);
    ids.forEach((id) => updateRecord(id, { customerId, contactId, inquirer }));
    setIsBatchLinkOpen(false);
    setIsAdminMenuOpen(false);
    setSelectedIds(new Set());
  }, [selectedIds, updateRecord]);

  const handleClearAssociationFilter = useCallback(() => {
    appliedAssociationFilterRef.current = '';
    setFilter({
      ...filter,
      customerId: '',
      contactId: '',
      associationLabel: '',
    });
    router.replace('/inquiry');
  }, [filter, router, setFilter]);

  const handleDeleteRecord = (recordId: string) => {
    if (window.confirm('确定删除这条询报价记录吗？')) {
      removeRecord(recordId);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(recordId);
        return next;
      });
    }
  };

  // ── 导出（Excel） ────────────────────────────────────
  const handleExport = useCallback(() => {
    const all = inquiryService.getAll();
    const rows = all.map(recordToRow);
    const ws = XLSX.utils.json_to_sheet(rows);

    // 列宽
    ws['!cols'] = [
      { wch: 14 }, // ID
      { wch: 14 }, // 询价编号
      { wch: 10 }, // 询价日期
      { wch: 12 }, // 询价人
      { wch: 12 }, // 客户编号
      { wch: 24 }, // 内容简述
      { wch: 12 }, // 订单编号
      { wch: 28 }, // 供应商报价
      { wch: 28 }, // 已报客户
      { wch: 8  }, // 无法报价
      { wch: 22 }, // 创建时间
      { wch: 22 }, // 更新时间
      { wch: 6  }, // _供应商JSON（窄，可隐藏）
      { wch: 6  }, // _报价JSON（窄，可隐藏）
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '询报价登记');
    XLSX.writeFile(wb, `inquiry_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }, []);

  // ── 导入（Excel / JSON） ──────────────────────────────
  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const mergeRecords = useCallback(
    (incoming: InquiryRecord[]) => {
      const existing = inquiryService.getAll();
      const map = new Map(existing.map((r) => [r.id, r]));
      let added = 0;
      let updated = 0;

      for (const rec of incoming) {
        const local = map.get(rec.id);
        if (!local) {
          map.set(rec.id, rec);
          inquiryService.syncToD1(rec);
          added++;
        } else {
          const localTime = new Date(local.updatedAt).getTime();
          const importedTime = new Date(rec.updatedAt).getTime();
          if (Number.isFinite(importedTime) && importedTime > localTime) {
            map.set(rec.id, rec);
            inquiryService.updateInD1(rec);
            updated++;
          }
        }
      }

      const merged = Array.from(map.values()).sort((a, b) =>
        b.inquiryNo.localeCompare(a.inquiryNo)
      );
      inquiryService.save(merged);
      useInquiryStore.setState({ records: merged });
      alert(`导入完成：新增 ${added} 条，更新 ${updated} 条`);
    },
    []
  );

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsImporting(true);
      try {
        const ext = file.name.split('.').pop()?.toLowerCase();

        if (ext === 'xlsx' || ext === 'xls') {
          // Excel 导入
          const buf = await file.arrayBuffer();
          const wb = XLSX.read(buf, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
          const records = rows.map(rowToRecord).filter((r): r is InquiryRecord => r !== null);
          mergeRecords(records);
        } else {
          // JSON 导入
          const text = await file.text();
          const imported = JSON.parse(text) as unknown;
          if (!Array.isArray(imported)) {
            alert('格式错误：JSON 文件应为记录数组');
            return;
          }
          const records = (imported as Partial<InquiryRecord>[])
            .filter((r) => r?.id && r?.inquiryNo)
            .map((r) => r as InquiryRecord);
          mergeRecords(records);
        }
      } catch {
        alert('导入失败：请检查文件格式（支持 .xlsx / .json）');
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [mergeRecords]
  );

  const toggleEditMode = useCallback(() => {
    setIsEditMode((prev) => {
      if (prev) setSelectedIds(new Set());
      return !prev;
    });
  }, []);

  const bottomActions = useMemo<ActionButton[]>(() => {
    if (!hasBatchEditPermission) return [];
    return [
      {
        key: 'admin-menu',
        label: '批量编辑',
        onClick: () => setIsAdminMenuOpen((prev) => !prev),
        variant: isAdminMenuOpen || isEditMode ? 'primary' : 'secondary',
        icon: Pencil,
      },
    ];
  }, [hasBatchEditPermission, isAdminMenuOpen, isEditMode]);


  if (!permissionChecked || status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
      </div>
    );
  }

  if (!hasInquiryAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-black">
        <div className="rounded-xl bg-white p-8 text-center shadow-lg dark:bg-gray-900">
          <div className="mb-4 text-6xl text-red-600 dark:text-red-400">🚫</div>
          <h1 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">权限不足</h1>
          <p className="mb-6 text-gray-600 dark:text-gray-400">您没有询报价登记的访问权限</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <AppLayout
      breadcrumbs={[
        { label: '首页', path: '/dashboard' },
        { label: '询报价登记' },
      ]}
      user={user}
      onLogout={handleLogout}
      bottomActions={bottomActions}
      topBarSlot={lastSyncedAt ? (
        <span>
          同步 {lastSyncedAt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      ) : undefined}
    >
      {/* 隐藏的文件选择框（批量编辑权限导入用） */}
      {hasBatchEditPermission && (
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.json"
          className="hidden"
          onChange={handleFileChange}
        />
      )}

      <div className="w-full max-w-none px-3 py-3 sm:px-5 lg:px-6">
        <div className="mb-3 rounded-xl border border-gray-200 bg-white px-4 py-2 shadow-sm dark:border-gray-800 dark:bg-[#2C2C2E]">
          <div className="flex items-start gap-3 xl:items-center">
            <div className="min-w-0 flex-1">
              <InquiryFilterBar
                id="inquiry-filter-panel"
                filter={filter}
                setFilter={setFilter}
                inquirers={inquirers}
                activeCount={activeCount}
                onReset={reset}
                onClearAssociation={handleClearAssociationFilter}
                records={baseFiltered}
                filteredCount={filteredAndSorted.length}
              />
            </div>
            <button
              type="button"
              onClick={openCreateModal}
              className="mt-1 inline-flex shrink-0 items-center justify-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-sm font-medium text-white hover:bg-blue-700 xl:mt-0"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">新增询价</span>
              <span className="sm:hidden">新增</span>
            </button>
          </div>
        </div>

        <InquiryTable
          records={filteredAndSorted}
          sortDir={filter.sortDir}
          onSortToggle={() =>
            setFilter({ ...filter, sortDir: filter.sortDir === 'desc' ? 'asc' : 'desc' })
          }
          onEditRecord={openEditModal}
          onDeleteRecord={handleDeleteRecord}
          emptyMessage={activeCount > 0 ? '没有符合条件的记录' : '暂无询报价记录'}
          emptySubMessage={
            activeCount > 0
              ? '尝试调整筛选条件，或点击"重置筛选"查看全部。'
              : '点击"新增询价"后，会在这里登记供应商询价和客户报价状态。'
          }
          canBatchEdit={hasBatchEditPermission && isEditMode}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onToggleSelectAll={handleToggleSelectAll}
        />
      </div>

      {/* ── 批量编辑菜单 ── */}
      {hasBatchEditPermission && isAdminMenuOpen && (
        <>
          {/* 点击遮罩关闭 */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsAdminMenuOpen(false)}
          />
          {/* 菜单面板，悬浮在底部 bar 上方 */}
          <div className="fixed bottom-20 right-4 z-50 min-w-[10rem] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-[#2C2C2E]">

            {/* 导入 */}
            <button
              type="button"
              onClick={() => { handleImportClick(); setIsAdminMenuOpen(false); }}
              disabled={isImporting}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700/50 disabled:opacity-50"
            >
              <Upload className="h-4 w-4 shrink-0 text-gray-400" />
              {isImporting ? '导入中…' : '导入'}
            </button>

            {/* 导出 */}
            <button
              type="button"
              onClick={() => { handleExport(); setIsAdminMenuOpen(false); }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700/50"
            >
              <Download className="h-4 w-4 shrink-0 text-gray-400" />
              导出
            </button>

            <div className="border-t border-gray-100 dark:border-gray-700" />

            {/* 批量选择 开关 */}
            <button
              type="button"
              onClick={toggleEditMode}
              className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                isEditMode
                  ? 'font-medium text-blue-600 dark:text-blue-400'
                  : 'text-gray-700 dark:text-gray-200'
              }`}
            >
              <Pencil className="h-4 w-4 shrink-0 text-gray-400" />
              {isEditMode ? '退出批量选择' : '批量选择'}
            </button>

            {/* 删除选中（有选中时才显示） */}
            {isEditMode && selectedIds.size > 0 && (
              <button
                type="button"
                onClick={() => { setIsBatchLinkOpen(true); setIsAdminMenuOpen(false); }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
              >
                <Link2 className="h-4 w-4 shrink-0" />
                关联客户（{selectedIds.size}）
              </button>
            )}

            {isEditMode && selectedIds.size > 0 && (
              <button
                type="button"
                onClick={() => { handleBatchDelete(); setIsAdminMenuOpen(false); }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                <Trash2 className="h-4 w-4 shrink-0" />
                删除选中（{selectedIds.size}）
              </button>
            )}

            {/* 取消选择（编辑模式且有选中时显示） */}
            {isEditMode && selectedIds.size > 0 && (
              <button
                type="button"
                onClick={() => { setSelectedIds(new Set()); setIsAdminMenuOpen(false); }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700/50"
              >
                <X className="h-4 w-4 shrink-0 text-gray-400" />
                取消选择
              </button>
            )}
          </div>
        </>
      )}

      <InquiryFormModal
        isOpen={isModalOpen}
        mode={editingRecord ? 'edit' : 'create'}
        record={editingRecord}
        existingRecords={records}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />

      <BatchLinkCustomerModal
        isOpen={isBatchLinkOpen}
        count={selectedIds.size}
        onClose={() => setIsBatchLinkOpen(false)}
        onConfirm={handleBatchLinkCustomer}
      />
    </AppLayout>
  );
}
