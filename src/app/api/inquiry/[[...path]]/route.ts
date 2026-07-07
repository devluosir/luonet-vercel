import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const WORKER_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://udb.luocompany.net';
const FINANCIAL_FIELDS = ['orderAmount', 'orderPaymentDate', 'orderReceivedAmount'] as const;
const PURCHASE_REGISTRATION_WRITE_FIELDS = [
  'purchaseContentDesc',
  'purchaseInquiryStatus',
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

function sanitizePurchaseRegistrationRecord(record: Record<string, unknown>): Record<string, unknown> {
  return {
    id: record.id,
    inquiryDate: record.inquiryDate,
    inquiryNo: record.inquiryNo,
    purchaseContentDesc: record.purchaseContentDesc,
    purchaseInquiryStatus: record.purchaseInquiryStatus,
    orderNo: record.orderNo,
    orderDeliveryStatus: record.orderDeliveryStatus,
    orderDeliveryConsignee: record.orderDeliveryConsignee,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    status: record.status,
  };
}

function pickPurchaseRegistrationPatch(body: Record<string, unknown>): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  PURCHASE_REGISTRATION_WRITE_FIELDS.forEach((field) => {
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

  const isAdmin = session.user.isAdmin === true;
  const permissions = session.user.permissions ?? [];
  const inquiryPermission = permissions.find((permission) => permission.moduleId === 'inquiry');
  const hasInquiryPermission = inquiryPermission?.canAccess ?? isAdmin;
  const purchaseRegistrationPermission = permissions.find((permission) => permission.moduleId === 'purchaseRegistration');
  const hasPurchaseRegistrationPermission = purchaseRegistrationPermission?.canAccess ?? isAdmin;

  if (!hasInquiryPermission && !hasPurchaseRegistrationPermission) {
    return NextResponse.json({ error: '无询报价权限' }, { status: 403 });
  }

  const purchaseRegistrationOnly = !hasInquiryPermission && hasPurchaseRegistrationPermission;
  if (purchaseRegistrationOnly && (request.method === 'POST' || request.method === 'DELETE')) {
    return NextResponse.json({ error: '采购部登记无新增或删除询报价记录权限' }, { status: 403 });
  }

  const financialsPermission = permissions.find((permission) => permission.moduleId === 'order.financials');
  const hasFinancialsPermission = financialsPermission?.canAccess ?? isAdmin;

  const url = new URL(request.url);
  const workerPath = pathSegments.length > 0
    ? `/api/inquiry/${pathSegments.join('/')}`
    : '/api/inquiry';
  const workerUrl = `${WORKER_BASE}${workerPath}${url.search}`;

  let body: string | undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD' && request.method !== 'DELETE') {
    const rawText = await request.text();
    if (purchaseRegistrationOnly && request.method === 'PUT') {
      try {
        const parsed = JSON.parse(rawText) as Record<string, unknown>;
        body = JSON.stringify(pickPurchaseRegistrationPatch(parsed));
      } catch {
        body = '{}';
      }
    } else if ((request.method === 'PUT' || request.method === 'POST') && !hasFinancialsPermission) {
      try {
        const parsed = JSON.parse(rawText) as Record<string, unknown>;
        FINANCIAL_FIELDS.forEach((field) => {
          delete parsed[field];
        });
        body = JSON.stringify(parsed);
      } catch {
        body = rawText;
      }
    } else {
      body = rawText;
    }
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
  if (request.method === 'GET' && purchaseRegistrationOnly && Array.isArray(data?.records)) {
    data.records = data.records.map((record: Record<string, unknown>) =>
      sanitizePurchaseRegistrationRecord(record)
    );
  }
  if (request.method === 'GET' && !hasFinancialsPermission && Array.isArray(data?.records)) {
    data.records = data.records.map((record: Record<string, unknown>) => {
      const clean = { ...record };
      FINANCIAL_FIELDS.forEach((field) => {
        delete clean[field];
      });
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
