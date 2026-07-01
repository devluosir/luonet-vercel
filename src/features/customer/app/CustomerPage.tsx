'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Building2, Package, Plus, Search, Users } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useAppUser } from '@/hooks/useAppUser';
import { useCustomerData, useCustomerActions, useCustomerForm } from '../hooks';
import { CustomerList, SupplierList, ConsigneeList, CustomerModal } from '../components';
import type { Customer, Supplier, Consignee, TabType } from '../types';

type ConfirmState = {
  open: boolean;
  title: string;
  description: string;
  variant: 'danger' | 'default';
  resolve: (ok: boolean) => void;
} | null;

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
  };

  const isEditing = !!(editingCustomer || editingSupplier || editingConsignee);

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
      <div className="w-full max-w-none px-3 py-4 sm:px-5 lg:px-6">

        {/* ── 页头 ── */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-gray-900 dark:text-white">客户管理</h1>
            {!isLoading && (
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {customers.length} 位客户 · {suppliers.length} 家供应商 · {consignees.length} 位收货人
              </p>
            )}
          </div>
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
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`搜索${LABEL[activeTab]}…`}
                className="h-8 w-full max-w-xs rounded-lg border border-gray-200 bg-gray-50 pl-8 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-[#2c2c2e] dark:text-white dark:placeholder-gray-500"
              />
            </div>
          </div>

          {/* 列表内容 */}
          {activeTab === 'customers' ? (
            <CustomerList
              customers={customers}
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
