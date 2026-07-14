/** @jest-environment node */

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { DELETE } from '../route';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({ authOptions: {} }));

const fetchMock = jest.fn();

function nextRequest() {
  return new NextRequest('http://localhost/api/inquiry/inquiry-1/hard-delete', {
    method: 'DELETE',
  });
}

describe('询报价硬删除 Next API 权限', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.API_TOKEN = 'test-api-token';
    global.fetch = fetchMock;
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
  });

  it('未登录返回 401', async () => {
    jest.mocked(getServerSession).mockResolvedValue(null);
    const response = await DELETE(nextRequest(), {
      params: { path: ['inquiry-1', 'hard-delete'] },
    });
    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('只有采购部登记权限的受限视图返回 403', async () => {
    jest.mocked(getServerSession).mockResolvedValue({
      user: {
        id: 'user-1',
        permissions: [{ moduleId: 'purchaseRegistration', canAccess: true }],
      },
      expires: '2099-01-01',
    });
    const response = await DELETE(nextRequest(), {
      params: { path: ['inquiry-1', 'hard-delete'] },
    });
    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('完整 inquiry 权限通过独立路径代理到 Worker', async () => {
    jest.mocked(getServerSession).mockResolvedValue({
      user: {
        id: 'user-1',
        permissions: [{ moduleId: 'inquiry', canAccess: true }],
      },
      expires: '2099-01-01',
    });
    const response = await DELETE(nextRequest(), {
      params: { path: ['inquiry-1', 'hard-delete'] },
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new URL(url).pathname).toBe('/api/inquiry/inquiry-1/hard-delete');
    expect(init.method).toBe('DELETE');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer test-api-token' });
  });
});
