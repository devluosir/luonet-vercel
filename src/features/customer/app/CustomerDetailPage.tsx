'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { FileText } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useAppUser } from '@/hooks/useAppUser';
import {
  CustomerActivityFeed,
  CustomerInfoCard,
  CustomerModal,
} from '../components';
import { useCustomerActions, useCustomerForm } from '../hooks';
import { customerService } from '../services/customerService';
import { consigneeService } from '../services/consigneeService';
import { supplierService } from '../services/supplierService';
import type { CustomerProfileType, CustomerStats } from '../services/customerService';
import type { Customer, TabType } from '../types';

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

function buildInquiryFilterHref(
  customer: Customer,
  contact?: { contactId: string; name: string; shortName?: string | null },
  quoteStatus?: 'has_order'
) {
  const params = new URLSearchParams({
    customerId: customer.id,
    customerName: customer.shortName || getCustomerTitle(customer),
  });

  if (contact) {
    params.set('contactId', contact.contactId);
    params.set('contactName', contact.shortName || contact.name);
  }
  if (quoteStatus) {
    params.set('quoteStatus', quoteStatus);
  }

  return `/inquiry?${params.toString()}`;
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
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-5 lg:px-6">
        {isLoadingCustomer ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
            <span className="ml-3 text-gray-600 dark:text-gray-400">加载{getTypeLabel(detailType)}信息...</span>
          </div>
        ) : customer ? (
          <>
            <CustomerInfoCard
              customer={customer}
              onEdit={handleOpenEdit}
              isCustomerDetail={isCustomerDetail}
              stats={stats}
              isLoadingStats={isLoadingStats}
              buildInquiryHref={() => buildInquiryFilterHref(customer)}
              buildOrderHref={() => buildInquiryFilterHref(customer, undefined, 'has_order')}
              buildContactHref={(contact) => buildInquiryFilterHref(customer, contact)}
            />

            {!isCustomerDetail && (
              <div className="mb-4 rounded-lg border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-gray-900 dark:text-gray-300">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-white">使用情况</h2>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{usageText}</p>
                  </div>
                </div>
              </div>
            )}

            {isCustomerDetail && (
              <CustomerActivityFeed customerId={customer.id} customerName={displayName} />
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
