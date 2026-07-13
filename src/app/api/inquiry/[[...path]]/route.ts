import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  PURCHASE_ORDER_TABLE_WRITE_FIELDS,
  PURCHASE_REGISTRATION_WRITE_FIELDS,
  pickRestrictedPatch,
  sanitizeRestrictedRecord,
} from './restrictedView';

const WORKER_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://udb.luocompany.net';
const ORDER_FINANCIAL_FIELDS = ['orderAmount', 'orderPaymentDate', 'orderReceivedAmount'] as const;
const PURCHASE_ORDER_FINANCIAL_FIELDS = ['purchaseOrderAmount'] as const;

// 注意：Next App Router 对 route.ts 允许导出的符号有严格限制（只能是 HTTP 方法 + 少数配置项），
// 单元测试需要的 pickRestrictedPatch / sanitizeRestrictedRecord / PURCHASE_REGISTRATION_WRITE_FIELDS
// 因此不从这里 re-export，测试直接从 ./restrictedView 导入。

function getWorkerHeaders(): HeadersInit {
  const token = process.env.API_TOKEN;
  if (!token) throw new Error('API_TOKEN env var not set');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
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
