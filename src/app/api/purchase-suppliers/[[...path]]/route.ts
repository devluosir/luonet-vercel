import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPurchaseSupplierAccess } from '../access';

const WORKER_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://udb.luocompany.net';

function getWorkerHeaders(): HeadersInit {
  const token = process.env.API_TOKEN;
  if (!token) throw new Error('API_TOKEN env var not set');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function proxyPurchaseSupplierRequest(
  request: NextRequest,
  pathSegments: string[] = []
): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const access = getPurchaseSupplierAccess(session.user.permissions ?? []);
  const isRead = request.method === 'GET' || request.method === 'HEAD';
  if ((isRead && !access.canRead) || (!isRead && !access.canWrite)) {
    return NextResponse.json({ error: isRead ? '无采购供应商读取权限' : '无采购供应商维护权限' }, { status: 403 });
  }

  const userId = session.user.id || session.user.username;
  if (!userId) {
    return NextResponse.json({ error: '无法识别当前用户' }, { status: 401 });
  }

  const url = new URL(request.url);
  if (request.method === 'DELETE') url.searchParams.set('updated_by', userId);
  const workerPath = pathSegments.length > 0
    ? `/api/purchase-suppliers/${pathSegments.join('/')}`
    : '/api/purchase-suppliers';
  const workerUrl = `${WORKER_BASE}${workerPath}${url.search}`;

  let body: string | undefined;
  if (!isRead && request.method !== 'DELETE') {
    try {
      const raw = await request.text();
      const parsed = raw ? JSON.parse(raw) as Record<string, unknown> : {};
      body = JSON.stringify({
        ...parsed,
        ...(request.method === 'POST' ? { created_by: userId } : {}),
        updated_by: userId,
      });
    } catch {
      return NextResponse.json({ error: '请求体格式错误，请检查JSON格式' }, { status: 400 });
    }
  }

  let workerResponse: Response;
  try {
    workerResponse = await fetch(workerUrl, {
      method: request.method,
      headers: getWorkerHeaders(),
      body,
    });
  } catch (error) {
    console.error('[purchase-suppliers proxy] request failed:', error);
    return NextResponse.json({ error: 'Worker 请求失败' }, { status: 502 });
  }

  let data: unknown;
  try {
    data = await workerResponse.json();
  } catch {
    return NextResponse.json({ error: 'Worker响应格式错误' }, { status: 502 });
  }
  return NextResponse.json(data, { status: workerResponse.status });
}

type RouteParams = { params: { path?: string[] } };

export async function GET(request: NextRequest, { params }: RouteParams) {
  return proxyPurchaseSupplierRequest(request, params.path || []);
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  return proxyPurchaseSupplierRequest(request, params.path || []);
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  return proxyPurchaseSupplierRequest(request, params.path || []);
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return proxyPurchaseSupplierRequest(request, params.path || []);
}
