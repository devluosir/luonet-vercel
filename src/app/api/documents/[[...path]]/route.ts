import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const WORKER_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://udb.luocompany.net';

const DOCUMENT_TYPE_PERMISSION_MODULE: Record<string, string> = {
  quotation: 'quotation',
  confirmation: 'quotation',
  domestic: 'domesticQuotation',
  'domestic-quotation': 'domesticQuotation',
  'domestic-contract': 'domesticQuotation',
  invoice: 'invoice',
  packing: 'packing',
  purchase: 'purchase',
};

type SessionPermission = {
  moduleId?: string;
  canAccess?: boolean;
};

function getWorkerHeaders(): HeadersInit {
  const token = process.env.API_TOKEN;
  if (!token) throw new Error('API_TOKEN env var not set');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

function canAccessDocumentType(
  permissions: readonly SessionPermission[] | undefined,
  documentType: unknown,
): boolean {
  if (typeof documentType !== 'string') return false;
  const moduleId = DOCUMENT_TYPE_PERMISSION_MODULE[documentType];
  if (!moduleId) return false;
  return permissions?.find((permission) => permission.moduleId === moduleId)?.canAccess === true;
}

function extractDocumentType(data: unknown): unknown {
  if (typeof data !== 'object' || data === null) return undefined;
  const record = data as Record<string, unknown>;
  const document = record.document;
  if (typeof document === 'object' && document !== null) {
    return (document as Record<string, unknown>).type;
  }
  return record.type;
}

async function fetchExistingDocumentType(documentId: string, userId: string): Promise<
  | { ok: true; type: unknown }
  | { ok: false; response: NextResponse }
> {
  let workerResp: Response;
  try {
    const url = `${WORKER_BASE}/api/documents/${documentId}?user_id=${encodeURIComponent(userId)}`;
    workerResp = await fetch(url, {
      method: 'GET',
      headers: getWorkerHeaders(),
    });
  } catch (error) {
    console.error('[documents proxy] permission preflight failed:', error);
    return { ok: false, response: NextResponse.json({ error: 'Worker 请求失败' }, { status: 502 }) };
  }

  let data: unknown;
  try {
    data = await workerResp.json();
  } catch {
    return { ok: false, response: NextResponse.json({ error: 'Worker响应格式错误' }, { status: 502 }) };
  }

  if (!workerResp.ok) {
    return { ok: false, response: NextResponse.json(data, { status: workerResp.status }) };
  }

  return { ok: true, type: extractDocumentType(data) };
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

  let parsedBody: Record<string, unknown> | undefined;
  let body: string | undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD' && request.method !== 'DELETE') {
    const rawBody = await request.text();
    try {
      parsedBody = rawBody ? JSON.parse(rawBody) as Record<string, unknown> : {};
      body = JSON.stringify({ ...parsedBody, user_id: userId });
    } catch {
      return NextResponse.json({ error: '请求体格式错误，请检查JSON格式' }, { status: 400 });
    }
  }

  const permissions = session.user.permissions ?? [];
  let documentType: unknown = url.searchParams.get('type');
  if (request.method === 'POST') {
    documentType = parsedBody?.type;
  } else if (pathSegments.length === 1 && pathSegments[0]) {
    const existing = await fetchExistingDocumentType(pathSegments[0], userId);
    if (!existing.ok) return existing.response;
    documentType = existing.type;
  }

  if (!canAccessDocumentType(permissions, documentType)) {
    return NextResponse.json({ error: '无对应单据权限' }, { status: 403 });
  }

  const workerPath = pathSegments.length > 0
    ? `/api/documents/${pathSegments.join('/')}`
    : '/api/documents';
  const workerUrl = `${WORKER_BASE}${workerPath}${url.search}`;

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
