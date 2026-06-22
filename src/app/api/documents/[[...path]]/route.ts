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

async function proxyDocumentRequest(request: NextRequest, pathSegments: string[] = []): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const userId = session.user.id || session.user.username;
  if (!userId) {
    return NextResponse.json({ error: '无法识别当前用户' }, { status: 401 });
  }

  const url = new URL(request.url);
  url.searchParams.set('user_id', userId);

  const workerPath = pathSegments.length > 0
    ? `/api/documents/${pathSegments.join('/')}`
    : '/api/documents';
  const workerUrl = `${WORKER_BASE}${workerPath}${url.search}`;

  let body: string | undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD' && request.method !== 'DELETE') {
    const rawBody = await request.text();
    try {
      const parsedBody = rawBody ? JSON.parse(rawBody) : {};
      body = JSON.stringify({ ...parsedBody, user_id: userId });
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
    console.error('[documents proxy] fetch failed:', error);
    return NextResponse.json({ error: 'Worker 请求失败' }, { status: 502 });
  }

  // 安全解析响应体：Worker 偶尔会返回非 JSON（Cloudflare 错误页面）
  let data: unknown;
  try {
    data = await workerResp.json();
  } catch {
    const raw = await workerResp.text().catch(() => '');
    console.error(`[documents proxy] Worker non-JSON response (${workerResp.status}):`, raw.slice(0, 500));
    return NextResponse.json(
      { error: 'Worker响应格式错误', status: workerResp.status, detail: raw.slice(0, 200) },
      { status: 502 },
    );
  }

  if (!workerResp.ok) {
    console.error(`[documents proxy] Worker error ${workerResp.status}:`, JSON.stringify(data));
  }

  return NextResponse.json(data, { status: workerResp.status });
}

type RouteParams = { params: { path?: string[] } };

export async function GET(req: NextRequest, { params }: RouteParams) {
  return proxyDocumentRequest(req, params.path || []);
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  return proxyDocumentRequest(req, params.path || []);
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  return proxyDocumentRequest(req, params.path || []);
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  return proxyDocumentRequest(req, params.path || []);
}
