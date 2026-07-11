import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const WORKER_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://udb.luocompany.net';

function getWorkerHeaders(): HeadersInit {
  const token = process.env.API_TOKEN;
  if (!token) throw new Error('API_TOKEN env var not set');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

async function proxyCustomerRequest(request: NextRequest, pathSegments: string[] = []): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const customerPermission = (session.user.permissions ?? []).find((permission) => permission.moduleId === 'customer');
  if (customerPermission?.canAccess !== true) {
    return NextResponse.json({ error: '无客户管理权限' }, { status: 403 });
  }

  const userId = session.user.id || session.user.username;
  if (!userId) {
    return NextResponse.json({ error: '无法识别当前用户' }, { status: 401 });
  }

  const url = new URL(request.url);

  const workerPath = pathSegments.length > 0
    ? `/api/customers/${pathSegments.join('/')}`
    : '/api/customers';
  const workerUrl = `${WORKER_BASE}${workerPath}${url.search}`;

  let body: string | undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD' && request.method !== 'DELETE') {
    const rawBody = await request.text();
    try {
      const parsedBody = rawBody ? JSON.parse(rawBody) : {};
      body = request.method === 'POST'
        ? JSON.stringify({ ...parsedBody, created_by: userId })
        : JSON.stringify(parsedBody);
    } catch {
      return NextResponse.json({ error: '请求体格式错误，请检查JSON格式' }, { status: 400 });
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
    console.error('Customer proxy request failed:', error);
    return NextResponse.json({ error: 'Worker 请求失败' }, { status: 502 });
  }

  const data = await workerResp.json();
  return NextResponse.json(data, { status: workerResp.status });
}

type RouteParams = { params: { path?: string[] } };

export async function GET(req: NextRequest, { params }: RouteParams) {
  return proxyCustomerRequest(req, params.path || []);
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  return proxyCustomerRequest(req, params.path || []);
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  return proxyCustomerRequest(req, params.path || []);
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  return proxyCustomerRequest(req, params.path || []);
}
