'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Building2, LayoutGrid, List as ListIcon, Package, Plus, Search, Users } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useAppUser } from '@/hooks/useAppUser';
import { useCustomerData, useCustomerActions, useCustomerForm } from '../hooks';
import { CustomerList, SupplierList, ConsigneeList, CustomerModal, ProfileCardGrid } from '../components';
import type { Customer, CustomerCategory, Supplier, Consignee, TabType } from '../types';

type CategoryFilter = CustomerCategory | 'all';

const CATEGORY_FILTERS: Array<{ key: CategoryFilter; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'A', label: 'A类' },
  { key: 'B', label: 'B类' },
  { key: 'C', label: 'C类' },
  { key: 'New', label: 'New' },
  { key: 'Blacklist', label: '黑名单' },
];

type ConfirmState = {
  open: boolean;
  title: string;
  description: string;
  variant: 'danger' | 'default';
  resolve: (ok: boolean) => void;
} | null;

type ViewMode = 'list' | 'card';

export default function CustomerPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { user, handleLogout } = useAppUser();

  const [activeTab, setActiveTab] = useState<TabType>('customers');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editingConsignee, setEditingConsignee] = useState<Consignee | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);

  const { customers, suppliers, consignees, isLoading, refreshData } = useCustomerData();

  const showConfirm = useCallback((opts: {
    title: string;
    description: string;
    variant?: 'danger' | 'default';
  }): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        open: true,
        title: opts.title,
        description: opts.description,
        variant: opts.variant ?? 'default',
        resolve,
      });
    });
  }, []);

  const { saveCustomer, saveSupplier, saveConsignee, deleteCustomer, deleteSupplier, deleteConsignee } =
    useCustomerActions(showConfirm);
  const { formData, resetForm, setFormDataForEdit, handleInputChange, validateForm } = useCustomerForm();

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') router.push('/');
  }, [status, router]);

  // ── Early returns ───────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
      </div>
    );
  }

  if (!session) return null;

  // ── Helpers ─────────────────────────────────────────────────────
  const LABEL: Record<TabType, string> = { customers: '客户', suppliers: '供应商', consignees: '收货人' };

  const clearEditing = () => {
    setEditingCustomer(null);
    setEditingSupplier(null);
    setEditingConsignee(null);
  };

  const handleAddNew = () => {
    resetForm();
    clearEditing();
    setShowModal(true);
  };

  const handleEdit = (item: Customer | Supplier | Consignee) => {
    setFormDataForEdit(item);
    clearEditing();
    if (activeTab === 'customers') setEditingCustomer(item as Customer);
    else if (activeTab === 'suppliers') setEditingSupplier(item as Supplier);
    else setEditingConsignee(item as Consignee);
    setShowModal(true);
  };

  const handleDelete = async (item: Customer | Supplier | Consignee) => {
    let success = false;
    if (activeTab === 'customers') success = await deleteCustomer(item as Customer);
    else if (activeTab === 'suppliers') success = await deleteSupplier(item as Supplier);
    else success = await deleteConsignee(item as Consignee);
    if (success) void refreshData();
  };

  const handleViewDetail = (item: Customer | Supplier | Consignee, type: TabType) => {
    const name = item.name.split('\n')[0] || item.name;
    const detailType = type === 'customers' ? 'customer' : type === 'suppliers' ? 'supplier' : 'consignee';
    const params = new URLSearchParams({
      id: item.id,
      name,
      type: detailType,
    });
    router.push(`/customer/detail?${params.toString()}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm(activeTab)) return;
    let success = false;
    if (activeTab === 'customers') success = await saveCustomer(formData, editingCustomer);
    else if (activeTab === 'suppliers') success = await saveSupplier(formData, editingSupplier);
    else success = await saveConsignee(formData, editingConsignee);
    if (success) {
      setShowModal(false);
      resetForm();
      clearEditing();
      void refreshData();
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
    clearEditing();
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearch('');
    setCategoryFilter('all');
  };

  const isEditing = !!(editingCustomer || editingSupplier || editingConsignee);

  const categoryCounts: Record<CategoryFilter, number> = {
    all: customers.length,
    A: customers.filter((c) => c.category === 'A').length,
    B: customers.filter((c) => c.category === 'B').length,
    C: customers.filter((c) => c.category === 'C').length,
    New: customers.filter((c) => c.category === 'New' || !c.category).length,
    Blacklist: customers.filter((c) => c.category === 'Blacklist').length,
  };

  const displayedCustomers = categoryFilter === 'all'
    ? customers
    : customers.filter((c) => (categoryFilter === 'New' ? (c.category === 'New' || !c.category) : c.category === categoryFilter));

  // ── Tab config ──────────────────────────────────────────────────
  const tabs: Array<{
    id: TabType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count: number;
  }> = [
    { id: 'customers', label: '客户', icon: Users, count: customers.length },
    { id: 'suppliers', label: '供应商', icon: Building2, count: suppliers.length },
    { id: 'consignees', label: '收货人', icon: Package, count: consignees.length },
  ];

  return (
    <AppLayout
      breadcrumbs={[{ label: '首页', path: '/dashboard' }, { label: '客户管理' }]}
      user={user}
      onLogout={handleLogout}
    >
      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-5 lg:px-6">

        {/* ── 页头 ── */}
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-base font-semibold text-gray-900 dark:text-white">客户管理</h1>
          <button
            onClick={handleAddNew}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            新增{LABEL[activeTab]}
          </button>
        </div>

        {/* ── 主内容卡片 ── */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-[#1c1c1e]">

          {/* 标签页 */}
          <div className="flex border-b border-gray-100 px-4 pt-1 dark:border-gray-800">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={`mr-1 inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    active
                      ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 搜索栏 */}
          <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`搜索${LABEL[activeTab]}…`}
                  className="h-8 w-full rounded-lg border border-gray-200 bg-gray-50 pl-8 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-[#2c2c2e] dark:text-white dark:placeholder-gray-500"
                />
              </div>
              <div className="inline-flex w-fit rounded-lg border border-gray-200 bg-gray-50 p-0.5 dark:border-gray-700 dark:bg-[#2c2c2e]">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  aria-pressed={viewMode === 'list'}
                  title="列表视图"
                  className={`inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                      : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  <ListIcon className="h-3.5 w-3.5" />
                  列表
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('card')}
                  aria-pressed={viewMode === 'card'}
                  title="卡片视图"
                  className={`inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors ${
                    viewMode === 'card'
                      ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                      : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  卡片
                </button>
              </div>
            </div>

            {/* 客户分类筛选 */}
            {activeTab === 'customers' && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {CATEGORY_FILTERS.map((filter) => {
                  const active = categoryFilter === filter.key;
                  return (
                    <button
                      key={filter.key}
                      type="button"
                      onClick={() => setCategoryFilter(filter.key)}
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                        active
                          ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                          : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                      }`}
                    >
                      {filter.label}
                      <span className={active ? 'text-blue-500' : 'text-gray-400'}>{categoryCounts[filter.key]}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 列表内容 */}
          {viewMode === 'card' ? (
            <ProfileCardGrid
              items={activeTab === 'customers' ? displayedCustomers : activeTab === 'suppliers' ? suppliers : consignees}
              loading={isLoading}
              searchQuery={search}
              type={activeTab}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onViewDetail={(item) => handleViewDetail(item, activeTab)}
            />
          ) : activeTab === 'customers' ? (
            <CustomerList
              customers={displayedCustomers}
              loading={isLoading}
              searchQuery={search}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onViewDetail={(customer) => handleViewDetail(customer, 'customers')}
            />
          ) : activeTab === 'suppliers' ? (
            <SupplierList
              suppliers={suppliers}
              loading={isLoading}
              searchQuery={search}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onViewDetail={(supplier) => handleViewDetail(supplier, 'suppliers')}
            />
          ) : (
            <ConsigneeList
              consignees={consignees}
              loading={isLoading}
              searchQuery={search}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onViewDetail={(consignee) => handleViewDetail(consignee, 'consignees')}
            />
          )}
        </div>
      </div>

      {/* ── 弹窗 ── */}
      <CustomerModal
        isOpen={showModal}
        onClose={handleCloseModal}
        formData={formData}
        onInputChange={handleInputChange}
        onSubmit={handleSubmit}
        isEditing={isEditing}
        activeTab={activeTab}
      />

      <ConfirmDialog
        open={Boolean(confirmState?.open)}
        title={confirmState?.title ?? ''}
        description={confirmState?.description ?? ''}
        variant={confirmState?.variant ?? 'default'}
        confirmLabel={confirmState?.variant === 'danger' ? '删除' : '确认'}
        onConfirm={() => setConfirmState((s) => { s?.resolve(true); return null; })}
        onCancel={() => setConfirmState((s) => { s?.resolve(false); return null; })}
      />
    </AppLayout>
  );
}
