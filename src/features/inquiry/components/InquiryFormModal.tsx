'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Search, UserRound, X } from 'lucide-react';
import type { Contact, Customer } from '@/features/customer/types';
import { customerService, getPrimaryContact } from '@/features/customer/services/customerService';
import type {
  CustomerQuoteStatus,
  InquiryBasicInput,
  InquiryRecord,
  OrderSubStatus,
  SupplierQuoteStatus,
} from '../types';
import {
  createId,
  dateInputToDate,
  formatShortDate,
  generateNextInquiryNo,
  getDateInputValueFromInquiryNo,
  getTodayDateInputValue,
} from '../utils/inquiryUtils';
import { InquiryQuoteStatus } from './InquiryQuoteStatus';

/** YYYY-MM-DD → m.D（如 6.21） */
function ymdToDisplay(ymd: string): string {
  const parts = ymd.split('-');
  if (parts.length !== 3) return ymd;
  return `${Number(parts[1])}.${Number(parts[2])}`;
}

/** m.D 或 m/D → YYYY-MM-DD（年份默认当年） */
function displayToYmd(display: string): string {
  const match = /^(\d{1,2})[./](\d{1,2})$/.exec(display.trim());
  if (!match) return getTodayDateInputValue();
  const year = new Date().getFullYear();
  return `${year}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
}

const FIELD_CLS =
  'h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none ' +
  'focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 ' +
  'dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-blue-400';

const LABEL_CLS = 'block text-xs font-medium text-gray-400 dark:text-gray-500';

function getCustomerDisplay(customer: Customer): string {
  return customer.shortName ? `${customer.shortName} · ${customer.name}` : customer.name;
}

function buildCustomerNo(customer: Customer): string {
  return customer.code || customer.shortName || customer.name;
}

function buildInquirer(customer: Customer, contact?: Contact): string {
  const customerPart = customer.shortName || customer.code || customer.name;
  if (!contact) return customerPart;
  return `${customerPart}-${contact.shortName || contact.name}`;
}

interface InquiryFormModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  record: InquiryRecord | null;
  existingRecords: InquiryRecord[];
  onClose: () => void;
  onSubmit: (values: InquiryBasicInput, suppliers: SupplierQuoteStatus[], quoted: CustomerQuoteStatus[]) => void;
}

export function InquiryFormModal({
  isOpen,
  mode,
  record,
  existingRecords,
  onClose,
  onSubmit,
}: InquiryFormModalProps) {
  // ── 基本信息字段 ──────────────────────────────────────
  const [dateInput, setDateInput] = useState(getTodayDateInputValue());
  const [dateDisplayText, setDateDisplayText] = useState(ymdToDisplay(getTodayDateInputValue()));
  const [inquiryNo, setInquiryNo] = useState('');
  const [inquirer, setInquirer] = useState('');
  const [customerNo, setCustomerNo] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [contactId, setContactId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showCustomerOptions, setShowCustomerOptions] = useState(false);
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [description, setDescription] = useState('');
  const [orderNo, setOrderNo] = useState('');
  const [orderSubStatus, setOrderSubStatus] = useState<OrderSubStatus | undefined>(undefined);
  const [isInquiryNoManual, setIsInquiryNoManual] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);

  // ── 状态缓冲（随"保存修改"/"新增询价"一并提交） ──────
  const [localSuppliers, setLocalSuppliers] = useState<SupplierQuoteStatus[]>([]);
  const [localQuoted, setLocalQuoted] = useState<CustomerQuoteStatus[]>([]);

  const existingNos = useMemo(
    () =>
      existingRecords
        .filter((item) => item.id !== record?.id)
        .map((item) => item.inquiryNo),
    [existingRecords, record?.id]
  );

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === customerId) ?? null,
    [customerId, customers]
  );
  const selectedContact = useMemo(
    () => selectedCustomer?.contacts.find((contact) => contact.id === contactId) ?? null,
    [contactId, selectedCustomer]
  );
  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers.slice(0, 20);
    return customers
      .filter((customer) => {
        return (
          customer.name.toLowerCase().includes(q) ||
          (customer.shortName || '').toLowerCase().includes(q) ||
          (customer.code || '').toLowerCase().includes(q)
        );
      })
      .slice(0, 20);
  }, [customerSearch, customers]);
  const canCreateCustomer = Boolean(customerSearch.trim()) &&
    !customers.some((customer) => {
      const q = customerSearch.trim().toLowerCase();
      return customer.name.toLowerCase() === q ||
        (customer.shortName || '').toLowerCase() === q ||
        (customer.code || '').toLowerCase() === q;
    });

  useEffect(() => {
    if (!isOpen) return;

    const nextDateInput = record
      ? getDateInputValueFromInquiryNo(record.inquiryNo)
      : getTodayDateInputValue();
    const urgent = record ? record.inquiryNo.endsWith('-U') : false;
    const nextInquiryNo = record
      ? record.inquiryNo
      : generateNextInquiryNo(dateInputToDate(nextDateInput), existingNos);

    setDateInput(nextDateInput);
    setDateDisplayText(ymdToDisplay(nextDateInput));
    setInquiryNo(nextInquiryNo);
    setInquirer(record?.inquirer ?? '');
    setCustomerNo(record?.customerNo ?? '');
    setCustomerId(record?.customerId ?? '');
    setContactId(record?.contactId ?? '');
    setCustomerSearch(record?.customerNo ?? '');
    setDescription(record?.description ?? '');
    setOrderNo(record?.orderNo ?? '');
    setOrderSubStatus(record?.orderSubStatus);
    setIsInquiryNoManual(mode === 'edit');
    setIsUrgent(urgent);
    // 新增模式：初始化两个默认供应商；编辑模式：从记录读取
    setLocalSuppliers(
      record?.supplierStatuses ?? [
        { id: createId(), supplierShortName: '飞罗', status: 'pending' },
        { id: createId(), supplierShortName: '昆同', status: 'pending' },
      ]
    );
    setLocalQuoted(record?.quotedStatuses ?? []);
  }, [existingNos, isOpen, mode, record]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    void customerService.fetchAllCustomers('customer')
      .then(({ items }) => {
        if (cancelled) return;
        setCustomers(items);
        const currentCustomer = items.find((customer) => customer.id === (record?.customerId ?? ''));
        if (currentCustomer) {
          const contact = currentCustomer.contacts.find((item) => item.id === record?.contactId) ??
            getPrimaryContact(currentCustomer);
          setCustomerSearch(getCustomerDisplay(currentCustomer));
          setCustomerNo(record?.customerNo || buildCustomerNo(currentCustomer));
          if (contact) {
            setContactId(contact.id);
            setInquirer(record?.inquirer || buildInquirer(currentCustomer, contact));
          }
        }
      })
      .catch((error) => {
        console.warn('加载客户库失败:', error);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, record?.contactId, record?.customerId, record?.customerNo, record?.inquirer]);

  useEffect(() => {
    if (!isOpen || isInquiryNoManual || mode === 'edit') return;
    const base = generateNextInquiryNo(dateInputToDate(dateInput), existingNos);
    setInquiryNo(isUrgent ? `${base}-U` : base);
  }, [dateInput, existingNos, isInquiryNoManual, isOpen, isUrgent, mode]);

  // 无论新增还是编辑，都构造 localRecord 用于状态编辑区
  const localRecord = useMemo((): InquiryRecord => {
    const base: InquiryRecord = record ?? {
      id: '__draft__',
      inquiryDate: '',
      inquiryNo: '',
      inquirer: '',
      customerNo: '',
      description: '',
      supplierStatuses: [],
      quotedStatuses: [],
      createdAt: '',
      updatedAt: '',
    };
    return { ...base, supplierStatuses: localSuppliers, quotedStatuses: localQuoted };
  }, [record, localSuppliers, localQuoted]);

  const adjustDate = (delta: number) => {
    const date = dateInputToDate(dateInput);
    date.setDate(date.getDate() + delta);
    const newYmd = getTodayDateInputValue(date);
    setDateInput(newYmd);
    setDateDisplayText(ymdToDisplay(newYmd));
  };

  const commitDateText = () => {
    const ymd = displayToYmd(dateDisplayText);
    setDateInput(ymd);
    setDateDisplayText(ymdToDisplay(ymd));
  };

  const toggleUrgent = (checked: boolean) => {
    setIsUrgent(checked);
    setInquiryNo((prev) => {
      const base = prev.endsWith('-U') ? prev.slice(0, -2) : prev;
      return checked ? `${base}-U` : base;
    });
  };

  const selectCustomer = (customer: Customer) => {
    const contact = getPrimaryContact(customer);
    setCustomerId(customer.id);
    setContactId(contact?.id ?? '');
    setCustomerSearch(getCustomerDisplay(customer));
    setCustomerNo(buildCustomerNo(customer));
    setInquirer(buildInquirer(customer, contact));
    setShowCustomerOptions(false);
  };

  const selectContact = (nextContactId: string) => {
    if (!selectedCustomer) return;
    const contact = selectedCustomer.contacts.find((item) => item.id === nextContactId);
    setContactId(nextContactId);
    setInquirer(buildInquirer(selectedCustomer, contact));
  };

  const createInlineCustomer = async () => {
    const name = customerSearch.trim();
    if (!name) return;

    setIsCreatingCustomer(true);
    try {
      const fallbackContactName = inquirer.trim().split('-').pop()?.trim() || '主联络人';
      const created = await customerService.saveCustomerProfile({
        type: 'customer',
        name,
        shortName: name,
        contacts: [{
          id: `contact-${Date.now()}`,
          name: fallbackContactName,
          shortName: fallbackContactName,
          isPrimary: true,
        }],
      });
      setCustomers((prev) => [created, ...prev.filter((customer) => customer.id !== created.id)]);
      selectCustomer(created);
    } catch (error) {
      console.error('内联新建客户失败:', error);
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const inquiryDate = formatShortDate(dateInputToDate(dateInput));
    const payload: InquiryBasicInput = {
      inquiryDate,
      inquiryNo: inquiryNo.trim(),
      inquirer: inquirer.trim(),
      customerNo: customerNo.trim(),
      customerId: customerId || undefined,
      contactId: contactId || undefined,
      description: description.trim(),
      orderNo: orderNo.trim() || undefined,
      orderSubStatus: orderNo.trim() ? orderSubStatus : undefined,
    };
    if (!payload.inquiryNo || !payload.inquirer || !payload.customerNo) return;

    onSubmit(payload, localSuppliers, localQuoted);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl dark:bg-[#2C2C2E]">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 pb-4 pt-5">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {mode === 'edit' ? '编辑询价' : '新增询价'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
            aria-label="关闭弹窗"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="h-px bg-gray-100 dark:bg-gray-700" />

        <form onSubmit={handleSubmit} className="px-6 py-5">

          {/* ── 身份信息条 ── */}
          <div className="mb-4 rounded-[1.35rem] border border-gray-200/70 bg-[#f5f5f7] p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="space-y-3">
              <div className="rounded-2xl bg-white/95 px-3.5 py-3 ring-1 ring-gray-200/70 dark:bg-gray-900/70 dark:ring-gray-700">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-gray-100 px-1.5 py-1 dark:bg-gray-800">
                    {mode === 'create' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => adjustDate(-1)}
                          tabIndex={-1}
                          className="rounded-full p-0.5 text-gray-400 transition-colors hover:bg-white hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                          aria-label="前一天"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <input
                          type="text"
                          value={dateDisplayText}
                          onChange={(e) => setDateDisplayText(e.target.value)}
                          onBlur={commitDateText}
                          onKeyDown={(e) => {
                            if (e.key === 'ArrowUp') { e.preventDefault(); adjustDate(1); }
                            if (e.key === 'ArrowDown') { e.preventDefault(); adjustDate(-1); }
                            if (e.key === 'Enter') { e.preventDefault(); commitDateText(); }
                          }}
                          className="w-12 bg-transparent text-center text-lg font-semibold leading-7 text-gray-800 outline-none dark:text-gray-100"
                          placeholder="6.21"
                        />
                        <button
                          type="button"
                          onClick={() => adjustDate(1)}
                          tabIndex={-1}
                          className="rounded-full p-0.5 text-gray-400 transition-colors hover:bg-white hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                          aria-label="后一天"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <span className="w-20 text-center text-lg font-semibold leading-8 text-gray-800 dark:text-gray-100">
                        {dateDisplayText}
                      </span>
                    )}
                  </div>

                  <input
                    value={inquiryNo}
                    onChange={(e) => { setInquiryNo(e.target.value); setIsInquiryNoManual(true); }}
                    className="min-w-[9rem] flex-1 bg-transparent font-mono text-lg font-semibold leading-8 text-gray-900 outline-none placeholder:text-gray-300 dark:text-gray-50 dark:placeholder:text-gray-600"
                    placeholder="C260621F"
                    required
                  />

                  <label className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${
                    isUrgent
                      ? 'border-red-200 bg-red-50 text-red-600 dark:border-red-500/40 dark:bg-red-500/15 dark:text-red-300'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-red-200 hover:text-red-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-red-500/40 dark:hover:text-red-300'
                  }`}>
                    <input
                      type="checkbox"
                      checked={isUrgent}
                      onChange={(e) => toggleUrgent(e.target.checked)}
                      className="h-3.5 w-3.5 cursor-pointer rounded accent-red-500"
                    />
                    <span>紧急</span>
                  </label>
                </div>
              </div>

              <div className="rounded-2xl border border-blue-200 bg-white px-3.5 py-2.5 shadow-sm ring-1 ring-blue-100/70 dark:border-blue-500/30 dark:bg-blue-950/20 dark:ring-blue-500/10">
                <span className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-300">
                  <UserRound className="h-3.5 w-3.5" />
                  客户与询价人
                </span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                  <input
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setCustomerId('');
                      setContactId('');
                      setCustomerNo(e.target.value);
                      setInquirer('');
                      setShowCustomerOptions(true);
                    }}
                    onFocus={() => setShowCustomerOptions(true)}
                    className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-8 pr-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                    placeholder="搜索客户全称/简称/编号"
                    autoComplete="off"
                    required
                  />
                  {showCustomerOptions && (
                    <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
                      {filteredCustomers.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => selectCustomer(customer)}
                          className="block w-full border-b border-gray-100 px-3 py-2 text-left last:border-b-0 hover:bg-blue-50 dark:border-gray-800 dark:hover:bg-blue-950/30"
                        >
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {customer.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {[customer.shortName, customer.code].filter(Boolean).join(' · ') || '未设置简称/编号'}
                          </div>
                        </button>
                      ))}
                      {canCreateCustomer && (
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={createInlineCustomer}
                          disabled={isCreatingCustomer}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:text-gray-400 dark:text-blue-300 dark:hover:bg-blue-950/30"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          {isCreatingCustomer ? '新建中...' : `新建客户：${customerSearch.trim()}`}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <select
                    value={contactId}
                    onChange={(e) => selectContact(e.target.value)}
                    disabled={!selectedCustomer}
                    className="h-9 rounded-lg border border-gray-200 bg-white px-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 disabled:bg-gray-50 disabled:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:disabled:bg-gray-800"
                    required
                  >
                    <option value="">选择联络人</option>
                    {selectedCustomer?.contacts.map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {contact.name}{contact.shortName ? ` (${contact.shortName})` : ''}{contact.isPrimary ? ' · 主' : ''}
                      </option>
                    ))}
                  </select>
                  <input
                    value={inquirer}
                    readOnly
                    className="h-9 rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-sm font-medium text-gray-700 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                    placeholder="选择联络人后自动生成"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── 基本信息字段 ── */}
          <div className="mb-4 space-y-3">
            <div className="space-y-1">
              <label className={LABEL_CLS}>客户显示编号</label>
              <input
                value={customerNo}
                readOnly
                className={FIELD_CLS}
                placeholder="选择客户后自动生成"
                required
              />
            </div>
            <div className="space-y-1">
              <label className={LABEL_CLS}>内容简述</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={FIELD_CLS}
                placeholder="产品名称、规格、数量…（选填）"
              />
            </div>
          </div>

          {/* ── 询报价状态区域（新增和编辑模式均显示） ── */}
          <div className="mb-4 rounded-xl bg-gray-50 p-4 ring-1 ring-gray-100 dark:bg-gray-800/50 dark:ring-gray-700">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              询报价状态
            </p>
            <InquiryQuoteStatus
              record={localRecord}
              onSuppliersChange={setLocalSuppliers}
              onQuotedChange={setLocalQuoted}
            />

            {/* 订单编号 + 标记：仅编辑模式显示 */}
            {mode === 'edit' && (
              <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-xs font-medium text-gray-400 dark:text-gray-500">
                    订单编号
                  </span>
                  <input
                    value={orderNo}
                    onChange={(e) => setOrderNo(e.target.value)}
                    className={
                      'min-w-0 flex-1 rounded-lg border border-transparent bg-white px-2.5 py-1.5 font-mono text-sm ' +
                      'text-green-700 outline-none placeholder:text-gray-300 ' +
                      'focus:border-green-300 focus:ring-1 focus:ring-green-200 ' +
                      'dark:bg-gray-900 dark:text-green-400 dark:placeholder:text-gray-600 dark:focus:border-green-700'
                    }
                    placeholder="FL2601（询价确认为订单后填写）"
                  />
                </div>
                {/* 辙销C / 悬挂P / 善后S — 仅在有订单编号时显示，互斥单选，再次点击取消 */}
                {orderNo.trim() && <div className="mt-2 flex items-center gap-1.5">
                  {(
                    [
                      { val: 'cancelled', label: '辙销C' },
                      { val: 'suspended', label: '悬挂P' },
                      { val: 'followup',  label: '善后S' },
                    ] as const
                  ).map(({ val, label }) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setOrderSubStatus((prev) => (prev === val ? undefined : val))}
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${
                        orderSubStatus === val
                          ? 'bg-red-500 text-white'
                          : 'border border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-500 dark:border-gray-700 dark:hover:border-red-700 dark:hover:text-red-400'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>}
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              取消
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 active:bg-blue-800"
            >
              {mode === 'edit' ? '保存修改' : '新增询价'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
