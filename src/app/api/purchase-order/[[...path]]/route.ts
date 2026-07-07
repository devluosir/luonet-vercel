import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const WORKER_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://udb.luocompany.net';

function getWorkerHeaders(): HeadersInit {
  const token = process.env.API_TOKEN;
  if (!token) throw new Error('API_TOKEN env var not set');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function proxyPurchaseOrderRequest(
  request: NextRequest,
  pathSegments: string[] = []
): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const isAdmin = session.user.isAdmin === true;
  const permissions = session.user.permissions ?? [];
  const permission = permissions.find((item) => item.moduleId === 'purchaseOrderTable');
  const hasAccess = permission?.canAccess ?? isAdmin;

  if (!hasAccess) {
    return NextResponse.json({ error: '无采购订单表权限' }, { status: 403 });
  }

  const url = new URL(request.url);
  const workerPath = pathSegments.length > 0
    ? `/api/purchase-order/${pathSegments.join('/')}`
    : '/api/purchase-order';
  const workerUrl = `${WORKER_BASE}${workerPath}${url.search}`;

  let body: string | undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD' && request.method !== 'DELETE') {
    body = await request.text();
  }

  let workerResp: Response;
  try {
    workerResp = await fetch(workerUrl, {
      method: request.method,
      headers: getWorkerHeaders(),
      body,
    });
  } catch (error) {
    console.error('Purchase order proxy request failed:', error);
    return NextResponse.json({ error: 'Worker 请求失败' }, { status: 502 });
  }

  const data = await workerResp.json();
  return NextResponse.json(data, { status: workerResp.status });
}

type RouteParams = { params: { path?: string[] } };

export async function GET(req: NextRequest, { params }: RouteParams) {
  return proxyPurchaseOrderRequest(req, params.path || []);
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  return proxyPurchaseOrderRequest(req, params.path || []);
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  return proxyPurchaseOrderRequest(req, params.path || []);
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  return proxyPurchaseOrderRequest(req, params.path || []);
}
