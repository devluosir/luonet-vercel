'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Calendar, Clock, FileText } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useAppUser } from '@/hooks/useAppUser';
import {
  CustomerInfoCard,
  CustomerModal,
  CustomerTimeline,
  FollowUpManager,
} from '../components';
import { useCustomerActions, useCustomerForm } from '../hooks';
import { customerService } from '../services/customerService';
import { consigneeService } from '../services/consigneeService';
import { supplierService } from '../services/supplierService';
import type { CustomerProfileType, CustomerStats } from '../services/customerService';
import type { Customer, TabType } from '../types';

type DetailTab = 'timeline' | 'followup';
type DetailType = CustomerProfileType;
type ConfirmState = {
  open: boolean;
  title: string;
  description: string;
  variant: 'danger' | 'default';
  resolve: (ok: boolean) => void;
} | null;

function getCustomerTitle(customer: Customer) {
  return customer.name.split('\n')[0] || customer.name;
}

function parseDetailType(value: string | null | undefined): DetailType {
  return value === 'supplier' || value === 'consignee' ? value : 'customer';
}

function toTabType(type: DetailType): TabType {
  if (type === 'supplier') return 'suppliers';
  if (type === 'consignee') return 'consignees';
  return 'customers';
}

function getTypeLabel(type: DetailType) {
  if (type === 'supplier') return '供应商';
  if (type === 'consignee') return '收货人';
  return '客户';
}

function getUsageText(type: DetailType, customer: Customer) {
  if (type === 'supplier') {
    return `在 ${supplierService.checkSupplierUsage(customer.name)} 张采购单中被使用过`;
  }
  if (type === 'consignee') {
    return `在 ${consigneeService.checkConsigneeUsage(customer.name)} 张箱单中被用作收货人`;
  }
  return '';
}

async function findCustomerFromUrl(customerId: string, type: DetailType, customerName?: string | null) {
  const byId = await customerService.getCustomerById(customerId, type);
  if (byId) return byId;

  const result = await customerService.fetchAllCustomers(type);
  const displayName = customerName || customerId;
  return result.items.find((customer) => {
    const title = getCustomerTitle(customer);
    return customer.name === customerId || title === customerId || title === displayName;
  }) ?? null;
}

export default function CustomerDetailPage() {
  const { data: session } = useSession();
  const { user, handleLogout } = useAppUser();
  const searchParams = useSearchParams();
  const customerId = searchParams?.get('id');
  const customerName = searchParams?.get('name');
  const detailType = parseDetailType(searchParams?.get('type'));
  const detailTabType = toTabType(detailType);
  const isCustomerDetail = detailType === 'customer';

  const [activeTab, setActiveTab] = useState<DetailTab>('timeline');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);

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

  const { saveCustomer, saveSupplier, saveConsignee } = useCustomerActions(showConfirm);
  const { formData, resetForm, setFormDataForEdit, handleInputChange, validateForm } = useCustomerForm();

  const reloadCustomer = useCallback(() => {
    if (!customerId) {
      setCustomer(null);
      setIsLoadingCustomer(false);
      return;
    }

    setIsLoadingCustomer(true);
    void findCustomerFromUrl(customerId, detailType, customerName)
      .then(setCustomer)
      .catch((error) => {
        console.error('加载客户详情失败:', error);
        setCustomer(null);
      })
      .finally(() => setIsLoadingCustomer(false));
  }, [customerId, customerName, detailType]);

  useEffect(() => {
    reloadCustomer();
  }, [reloadCustomer]);

  useEffect(() => {
    if (!customer?.id || !isCustomerDetail) {
      setStats(null);
      return;
    }

    let cancelled = false;
    setIsLoadingStats(true);
    void customerService.fetchCustomerStats(customer.id)
      .then((nextStats) => {
        if (!cancelled) setStats(nextStats);
      })
      .catch((error) => {
        console.warn('加载客户统计失败:', error);
        if (!cancelled) setStats(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingStats(false);
      });

    return () => {
      cancelled = true;
    };
  }, [customer?.id, isCustomerDetail]);

  const handleOpenEdit = () => {
    if (!customer) return;
    setFormDataForEdit(customer);
    setShowEditModal(true);
  };

  const handleCloseEdit = () => {
    setShowEditModal(false);
    resetForm();
  };

  const handleSubmitEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!customer) return;

    if (!validateForm(detailTabType)) return;

    let success = false;
    if (detailType === 'supplier') success = await saveSupplier(formData, customer);
    else if (detailType === 'consignee') success = await saveConsignee(formData, customer);
    else success = await saveCustomer(formData, customer);
    if (!success) return;

    setShowEditModal(false);
    resetForm();
    reloadCustomer();
  };

  const handleConfirmCancel = useCallback(() => {
    setConfirmState((state) => {
      state?.resolve(false);
      return null;
    });
  }, []);

  const handleConfirmAccept = useCallback(() => {
    setConfirmState((state) => {
      state?.resolve(true);
      return null;
    });
  }, []);

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">请先登录</h2>
          <p className="text-gray-600 dark:text-gray-400">您需要登录后才能访问客户详情页面</p>
        </div>
      </div>
    );
  }

  if (!customerId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">{getTypeLabel(detailType)}信息不完整</h2>
          <p className="text-gray-600 dark:text-gray-400">无法显示详情，请返回客户列表重新选择</p>
        </div>
      </div>
    );
  }

  const displayName = customer ? getCustomerTitle(customer) : customerName || `${getTypeLabel(detailType)}详情`;
  const usageText = customer ? getUsageText(detailType, customer) : '';

  return (
    <AppLayout
      breadcrumbs={[
        { label: '首页', path: '/dashboard' },
        { label: '客户管理', path: '/customer' },
        { label: displayName },
      ]}
      user={user}
      onLogout={handleLogout}
    >
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {isLoadingCustomer ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
            <span className="ml-3 text-gray-600 dark:text-gray-400">加载{getTypeLabel(detailType)}信息...</span>
          </div>
        ) : customer ? (
          <>
            <CustomerInfoCard customer={customer} onEdit={handleOpenEdit} />

            {isCustomerDetail ? (
            <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">业务统计</h2>
                {isLoadingStats && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">加载中...</span>
                )}
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950/30">
                  <p className="text-xs text-blue-500 dark:text-blue-300">公司询价</p>
                  <p className="mt-1 text-2xl font-semibold text-blue-700 dark:text-blue-200">
                    {stats?.totals.inquiries ?? 0}
                  </p>
                </div>
                <div className="rounded-lg bg-green-50 p-3 dark:bg-green-950/30">
                  <p className="text-xs text-green-500 dark:text-green-300">公司订单</p>
                  <p className="mt-1 text-2xl font-semibold text-green-700 dark:text-green-200">
                    {stats?.totals.orders ?? 0}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900/60">
                  <p className="text-xs text-gray-500 dark:text-gray-400">未分配联络人</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-800 dark:text-gray-100">
                    {stats?.unassigned.inquiries ?? 0}
                  </p>
                </div>
              </div>
              {!isLoadingStats && stats && stats.totals.inquiries === 0 && stats.totals.orders === 0 && (
                <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  暂无关联的询价/订单记录，可能是历史数据尚未关联客户，可到
                  <Link href="/inquiry" className="mx-1 text-blue-600 hover:underline dark:text-blue-400">
                    询报价登记表
                  </Link>
                  使用「待关联客户」筛选手动补充
                </p>
              )}
              {stats?.contacts.length ? (
                <div className="mt-4 overflow-hidden rounded-lg border border-gray-100 dark:border-gray-700">
                  {stats.contacts.map((contact) => (
                    <div
                      key={contact.contactId}
                      className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-gray-100 px-3 py-2 text-sm last:border-b-0 dark:border-gray-700"
                    >
                      <div className="min-w-0">
                        <span className="font-medium text-gray-800 dark:text-gray-100">{contact.name}</span>
                        {contact.shortName && (
                          <span className="ml-1 text-xs text-gray-400">({contact.shortName})</span>
                        )}
                        {contact.isPrimary && (
                          <span className="ml-2 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                            主
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">询价 {contact.inquiries}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">订单 {contact.orders}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            ) : (
              <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-gray-900 dark:text-gray-300">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-white">使用情况</h2>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{usageText}</p>
                  </div>
                </div>
              </div>
            )}

            {isCustomerDetail && (
              <>
              <div className="mb-6">
                <div className="border-b border-gray-200 dark:border-gray-700">
                  <nav className="-mb-px flex space-x-8">
                    <button
                      type="button"
                      onClick={() => setActiveTab('timeline')}
                      className={`border-b-2 px-1 py-2 text-sm font-medium ${
                        activeTab === 'timeline'
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                      }`}
                    >
                      <Calendar className="mr-2 inline h-4 w-4" />
                      时间轴
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('followup')}
                      className={`border-b-2 px-1 py-2 text-sm font-medium ${
                        activeTab === 'followup'
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                      }`}
                    >
                      <Clock className="mr-2 inline h-4 w-4" />
                      跟进记录
                    </button>
                  </nav>
                </div>
              </div>

              {activeTab === 'timeline' ? (
                <CustomerTimeline customerId={customer.id} customerName={displayName} />
              ) : (
                <FollowUpManager customerId={customer.id} customerName={displayName} />
              )}
              </>
            )}
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">未找到{getTypeLabel(detailType)}</h2>
            <p className="text-gray-600 dark:text-gray-400">该{getTypeLabel(detailType)}可能已被删除，请返回客户列表重新选择。</p>
          </div>
        )}
      </div>

      {customer && (
        <CustomerModal
          isOpen={showEditModal}
          onClose={handleCloseEdit}
          formData={formData}
          onInputChange={handleInputChange}
          onSubmit={handleSubmitEdit}
          isEditing
          activeTab={detailTabType}
        />
      )}

      <ConfirmDialog
        open={Boolean(confirmState?.open)}
        title={confirmState?.title ?? ''}
        description={confirmState?.description ?? ''}
        variant={confirmState?.variant ?? 'default'}
        confirmLabel={confirmState?.variant === 'danger' ? '删除' : '确认'}
        onConfirm={handleConfirmAccept}
        onCancel={handleConfirmCancel}
      />
    </AppLayout>
  );
}
