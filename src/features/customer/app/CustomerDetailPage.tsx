'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Calendar, Clock } from 'lucide-react';
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
import type { Customer } from '../types';

type DetailTab = 'timeline' | 'followup';
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

function findCustomerFromUrl(customerId: string, customerName?: string | null) {
  const byId = customerService.getCustomerById(customerId);
  if (byId) return byId;

  const allCustomers = customerService.getAllCustomers();
  const displayName = customerName || customerId;
  return allCustomers.find((customer) => {
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

  const [activeTab, setActiveTab] = useState<DetailTab>('timeline');
  const [customer, setCustomer] = useState<Customer | null>(null);
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

  const { saveCustomer } = useCustomerActions(showConfirm);
  const { formData, resetForm, setFormDataForEdit, handleInputChange, validateForm } = useCustomerForm();

  const reloadCustomer = useCallback(() => {
    if (!customerId) {
      setCustomer(null);
      setIsLoadingCustomer(false);
      return;
    }

    setCustomer(findCustomerFromUrl(customerId, customerName));
    setIsLoadingCustomer(false);
  }, [customerId, customerName]);

  useEffect(() => {
    reloadCustomer();
  }, [reloadCustomer]);

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

    if (!validateForm()) return;

    const success = await saveCustomer(formData, customer);
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
          <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">客户信息不完整</h2>
          <p className="text-gray-600 dark:text-gray-400">无法显示客户详情，请返回客户列表重新选择</p>
        </div>
      </div>
    );
  }

  const displayName = customer ? getCustomerTitle(customer) : customerName || '客户详情';

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
            <span className="ml-3 text-gray-600 dark:text-gray-400">加载客户信息...</span>
          </div>
        ) : customer ? (
          <>
            <CustomerInfoCard customer={customer} onEdit={handleOpenEdit} />

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
        ) : (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">未找到客户</h2>
            <p className="text-gray-600 dark:text-gray-400">该客户可能已被删除，请返回客户列表重新选择。</p>
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
          activeTab="customers"
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
