/** @jest-environment node */

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { PUT } from '../route';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({ authOptions: {} }));

const fetchMock = jest.fn();

function updateRequest(userId: string, body: Record<string, unknown>) {
  return new NextRequest(`http://localhost/api/admin/users/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('管理后台当前用户保护', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.API_TOKEN = 'test-api-token';
    global.fetch = fetchMock;
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    jest.mocked(getServerSession).mockResolvedValue({
      user: { id: 'current-user', isAdmin: true },
      expires: '2099-01-01',
    });
  });

  it('拒绝当前用户停用自己的账户', async () => {
    const response = await PUT(updateRequest('current-user', { status: false }), {
      params: { path: ['users', 'current-user'] },
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: '不能禁用当前登录用户' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('拒绝当前用户取消自己的管理员身份', async () => {
    const response = await PUT(updateRequest('current-user', { isAdmin: false }), {
      params: { path: ['users', 'current-user'] },
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: '不能取消当前登录用户的管理员身份' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('允许管理员停用或取消其他账号的管理员身份', async () => {
    const response = await PUT(updateRequest('other-user', { status: false, isAdmin: false }), {
      params: { path: ['users', 'other-user'] },
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ status: false, isAdmin: false });
  });
});
