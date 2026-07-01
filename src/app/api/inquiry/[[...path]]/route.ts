import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const WORKER_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://udb.luocompany.net';
const FINANCIAL_FIELDS = ['orderAmount', 'orderPaymentDate', 'orderReceivedAmount'] as const;

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

  const isAdmin = session.user.isAdmin === true;
  const permissions = session.user.permissions ?? [];
  const hasInquiryPermission =
    isAdmin ||
    (session.user.permissions ?? []).some(
      (permission) => permission.moduleId === 'inquiry' && permission.canAccess
    );

  if (!hasInquiryPermission) {
    return NextResponse.json({ error: '无询报价权限' }, { status: 403 });
  }

  const hasFinancialsPermission =
    isAdmin ||
    permissions.some(
      (permission) => permission.moduleId === 'order.financials' && permission.canAccess
    );

  const url = new URL(request.url);
  const workerPath = pathSegments.length > 0
    ? `/api/inquiry/${pathSegments.join('/')}`
    : '/api/inquiry';
  const workerUrl = `${WORKER_BASE}${workerPath}${url.search}`;

  let body: string | undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD' && request.method !== 'DELETE') {
    const rawText = await request.text();
    if ((request.method === 'PUT' || request.method === 'POST') && !hasFinancialsPermission) {
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
