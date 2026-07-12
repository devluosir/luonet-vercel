import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const WORKER_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://udb.luocompany.net';
const ORDER_FINANCIAL_FIELDS = ['orderAmount', 'orderPaymentDate', 'orderReceivedAmount'] as const;
const PURCHASE_ORDER_FINANCIAL_FIELDS = ['purchaseOrderAmount'] as const;

// 采购部登记（purchaseRegistration 权限，无 inquiry 权限时）可读写的字段
// 注意：supplierStatuses 本是询报价登记的字段，这里放行仅用于"已报价自动同步飞罗"
// 场景——采购部登记的询报价状态变为已报价时，前端会计算出只调整了"飞罗"这一条的
// supplierStatuses 补丁再写回来，不是让本视图随意改写整份供应商列表。
const PURCHASE_REGISTRATION_WRITE_FIELDS = [
  'description',
  'purchaseSupplierStatuses',
  'purchaseQuotedStatuses',
  'supplierStatuses',
] as const;

// 采购订单表可读写的字段（TASK-111 起，purchaseOrderTable 权限已并入 purchaseRegistration，
// 持有 purchaseRegistration 即同时拥有采购部登记 + 采购订单表两个页面的访问权，两组字段一并放行）
// 注意：orderConfirmDate / orderCustomerNo 不在这里——这两个字段"来自订单状态表"，
// 采购订单表这边只读展示，不允许写入；orderDeliveryDate / orderDeliveryStatus /
// orderDeliveryConsignee 是双向共享字段，订单状态表和采购订单表都能编辑。
const PURCHASE_ORDER_TABLE_WRITE_FIELDS = [
  'purchaseOrderNo',
  'purchaseOrderSupplier',
  'purchaseOrderAmount',
  'orderDeliveryDate',
  'orderDeliveryStatus',
  'orderDeliveryConsignee',
] as const;

function getWorkerHeaders(): HeadersInit {
  const token = process.env.API_TOKEN;
  if (!token) throw new Error('API_TOKEN env var not set');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

interface RestrictedViewFlags {
  allowPurchaseRegistration: boolean;
  allowPurchaseOrderTable: boolean;
}

/** 采购部登记 / 采购订单表这类"受限视图"用户能看到的字段（两者可同时为 true，取并集） */
function sanitizeRestrictedRecord(
  record: Record<string, unknown>,
  flags: RestrictedViewFlags
): Record<string, unknown> {
  const result: Record<string, unknown> = {
    id: record.id,
    inquiryDate: record.inquiryDate,
    inquiryNo: record.inquiryNo,
    orderNo: record.orderNo,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    status: record.status,
  };

  if (flags.allowPurchaseRegistration) {
    result.description = record.description;
    result.purchaseSupplierStatuses = record.purchaseSupplierStatuses;
    result.purchaseQuotedStatuses = record.purchaseQuotedStatuses;
    // 只读展示 + "已报价自动同步飞罗"逻辑需要读到询报价登记原始的供应商列表，
    // 才能判断飞罗当前状态、日期是否已经是最新，避免每次保存都重复写入。
    result.supplierStatuses = record.supplierStatuses;
  }

  if (flags.allowPurchaseOrderTable) {
    result.orderSubStatus = record.orderSubStatus;
    result.purchaseOrderNo = record.purchaseOrderNo;
    result.purchaseOrderSupplier = record.purchaseOrderSupplier;
    result.purchaseOrderAmount = record.purchaseOrderAmount;
    result.orderDeliveryDate = record.orderDeliveryDate;
    result.orderConfirmDate = record.orderConfirmDate;
    result.orderCustomerNo = record.orderCustomerNo;
    result.orderDeliveryStatus = record.orderDeliveryStatus;
    result.orderDeliveryConsignee = record.orderDeliveryConsignee;
  }

  return result;
}

function pickRestrictedPatch(
  body: Record<string, unknown>,
  allowedFields: Set<string>
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  allowedFields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      patch[field] = body[field];
    }
  });
  return patch;
}

async function proxyInquiryRequest(
  request: NextRequest,
  pathSegments: string[] = []
): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const permissions = session.user.permissions ?? [];
  const inquiryPermission = permissions.find((permission) => permission.moduleId === 'inquiry');
  const hasInquiryPermission = inquiryPermission?.canAccess === true;
  // TASK-111 起，purchaseRegistration 权限同时覆盖"采购部登记"+"采购订单表"两个页面
  // （原 purchaseOrderTable 权限已合并进来），不再单独判断
  const purchaseRegistrationPermission = permissions.find((permission) => permission.moduleId === 'purchaseRegistration');
  const hasPurchaseRegistrationPermission = purchaseRegistrationPermission?.canAccess === true;

  if (!hasInquiryPermission && !hasPurchaseRegistrationPermission) {
    return NextResponse.json({ error: '无询报价权限' }, { status: 403 });
  }

  // 有 inquiry 权限即为完整访问，不受限；否则按合并后的受限权限，两组受限字段一并放行
  const restrictToPurchaseRegistration = !hasInquiryPermission && hasPurchaseRegistrationPermission;
  const restrictToPurchaseOrderTable = restrictToPurchaseRegistration;
  const isRestrictedView = restrictToPurchaseRegistration;

  if (isRestrictedView && (request.method === 'POST' || request.method === 'DELETE')) {
    return NextResponse.json({ error: '无新增或删除询报价记录权限' }, { status: 403 });
  }

  const orderFinancialsPermission = permissions.find((permission) => permission.moduleId === 'order.financials');
  const hasOrderFinancialsPermission = orderFinancialsPermission?.canAccess === true;
  const purchaseOrderFinancialsPermission = permissions.find(
    (permission) => permission.moduleId === 'purchaseRegistration.financials'
  );
  const hasPurchaseOrderFinancialsPermission =
    hasPurchaseRegistrationPermission && purchaseOrderFinancialsPermission?.canAccess === true;

  const url = new URL(request.url);
  const workerPath = pathSegments.length > 0
    ? `/api/inquiry/${pathSegments.join('/')}`
    : '/api/inquiry';
  const workerUrl = `${WORKER_BASE}${workerPath}${url.search}`;

  let body: string | undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD' && request.method !== 'DELETE') {
    const rawText = await request.text();
    let parsed: Record<string, unknown> | null = null;
    try {
      parsed = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      parsed = null;
    }

    if (parsed && isRestrictedView && request.method === 'PUT') {
      const allowedFields = new Set<string>();
      if (restrictToPurchaseRegistration) PURCHASE_REGISTRATION_WRITE_FIELDS.forEach((f) => allowedFields.add(f));
      if (restrictToPurchaseOrderTable) PURCHASE_ORDER_TABLE_WRITE_FIELDS.forEach((f) => allowedFields.add(f));
      parsed = pickRestrictedPatch(parsed, allowedFields);
    } else if (parsed === null && isRestrictedView && request.method === 'PUT') {
      parsed = {};
    }

    if (parsed && (request.method === 'PUT' || request.method === 'POST') && !hasOrderFinancialsPermission) {
      ORDER_FINANCIAL_FIELDS.forEach((field) => {
        delete parsed![field];
      });
    }
    if (parsed && (request.method === 'PUT' || request.method === 'POST') && !hasPurchaseOrderFinancialsPermission) {
      PURCHASE_ORDER_FINANCIAL_FIELDS.forEach((field) => {
        delete parsed![field];
      });
    }

    body = parsed !== null ? JSON.stringify(parsed) : rawText;
  }

  let workerResp: Response;
  try {
    workerResp = await fetch(workerUrl, {
      method: request.method,
      headers: getWorkerHeaders(),
      body,
    });
  } catch (error) {
    console.error('Inquiry proxy request failed:', error);
    return NextResponse.json({ error: 'Worker 请求失败' }, { status: 502 });
  }

  const data = await workerResp.json();
  if (request.method === 'GET' && isRestrictedView && Array.isArray(data?.records)) {
    data.records = data.records.map((record: Record<string, unknown>) =>
      sanitizeRestrictedRecord(record, {
        allowPurchaseRegistration: restrictToPurchaseRegistration,
        allowPurchaseOrderTable: restrictToPurchaseOrderTable,
      })
    );
  }
  if (request.method === 'GET' && Array.isArray(data?.records)) {
    data.records = data.records.map((record: Record<string, unknown>) => {
      const clean = { ...record };
      if (!hasOrderFinancialsPermission) {
        ORDER_FINANCIAL_FIELDS.forEach((field) => {
          delete clean[field];
        });
      }
      if (!hasPurchaseOrderFinancialsPermission) {
        PURCHASE_ORDER_FINANCIAL_FIELDS.forEach((field) => {
          delete clean[field];
        });
      }
      return clean;
    });
  }

  return NextResponse.json(data, { status: workerResp.status });
}

type RouteParams = { params: { path?: string[] } };

export async function GET(req: NextRequest, { params }: RouteParams) {
  return proxyInquiryRequest(req, params.path || []);
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  return proxyInquiryRequest(req, params.path || []);
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  return proxyInquiryRequest(req, params.path || []);
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  return proxyInquiryRequest(req, params.path || []);
}
