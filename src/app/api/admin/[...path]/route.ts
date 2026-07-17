import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const WORKER_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://udb.luocompany.net';

function workerHeaders(): HeadersInit {
  const token = process.env.API_TOKEN;
  if (!token) throw new Error('API_TOKEN env var not set');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

async function proxyAdmin(request: NextRequest, pathSegments: string[]): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  if (!session.user.isAdmin) {
    return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
  }

  const targetsCurrentUser =
    pathSegments[0] === 'users' &&
    pathSegments.length === 2 &&
    pathSegments[1] === session.user.id;

  if (request.method === 'DELETE' && targetsCurrentUser) {
    return NextResponse.json({ error: '不能删除当前登录用户' }, { status: 400 });
  }

  const url = new URL(request.url);
  const workerUrl = `${WORKER_BASE}/api/admin/${pathSegments.join('/')}${url.search}`;
  const body =
    request.method !== 'GET' && request.method !== 'HEAD'
      ? await request.text()
      : undefined;

  if (request.method === 'PUT' && targetsCurrentUser) {
    let updates: Record<string, unknown>;
    try {
      const parsed = JSON.parse(body || '{}');
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('invalid body');
      updates = parsed as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: '请求数据格式错误' }, { status: 400 });
    }

    if ('status' in updates && updates.status !== true) {
      return NextResponse.json({ error: '不能禁用当前登录用户' }, { status: 400 });
    }
    if ('isAdmin' in updates && updates.isAdmin !== true) {
      return NextResponse.json({ error: '不能取消当前登录用户的管理员身份' }, { status: 400 });
    }
  }

  let workerResp: Response;
  try {
    workerResp = await fetch(workerUrl, {
      method: request.method,
      headers: workerHeaders(),
      body,
    });
  } catch (err) {
    console.error('Admin proxy request failed:', err);
    return NextResponse.json({ error: 'Worker 请求失败' }, { status: 502 });
  }

  const data = await workerResp.json();
  return NextResponse.json(data, { status: workerResp.status });
}

type RouteParams = { params: { path: string[] } };

export async function GET(req: NextRequest, { params }: RouteParams) {
  return proxyAdmin(req, params.path);
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  return proxyAdmin(req, params.path);
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  return proxyAdmin(req, params.path);
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  return proxyAdmin(req, params.path);
}
