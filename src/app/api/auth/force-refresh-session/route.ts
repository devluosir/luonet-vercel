import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // 获取当前session
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: '用户未登录' }, { status: 401 });
    }

    // 从请求头获取用户信息
    const userId = request.headers.get('X-User-ID');
    const userName = request.headers.get('X-User-Name');
    const isAdmin = request.headers.get('X-User-Admin') === 'true';

    if (!userId || !userName) {
      return NextResponse.json({ error: '缺少用户信息' }, { status: 400 });
    }

    // 从后端API获取最新权限
    let permissions = [];
    
    try {
      const backendResponse = await fetch(`https://udb.luocompany.net/api/admin/users?username=${encodeURIComponent(userName)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId,
          'X-User-Name': userName,
          'X-User-Admin': isAdmin ? 'true' : 'false',
        },
        cache: 'no-store'
      });

      if (backendResponse.ok) {
        const backendData = await backendResponse.json();
        
        // 处理不同的响应格式
        let userData;
        if (backendData.users && Array.isArray(backendData.users)) {
          userData = backendData.users.find((user: any) => 
            user.username?.toLowerCase() === userName.toLowerCase() || 
            user.id === userId
          );
        } else if (backendData.id) {
          userData = backendData;
        }
        
        if (userData && userData.permissions && Array.isArray(userData.permissions)) {
          permissions = userData.permissions.map((perm: any) => ({
            id: perm.id || `backend-${perm.moduleId}`,
            moduleId: perm.moduleId,
            canAccess: !!perm.canAccess
          }));
        }
      }
    } catch (error) {
      console.error('获取权限数据失败:', error);
    }

    // 如果没有获取到权限，使用默认权限
    if (permissions.length === 0) {
      if (isAdmin) {
        permissions = [
          { id: 'default-quotation', moduleId: 'quotation', canAccess: true },
          { id: 'default-packing', moduleId: 'packing', canAccess: true },
          { id: 'default-invoice', moduleId: 'invoice', canAccess: true },
          { id: 'default-purchase', moduleId: 'purchase', canAccess: true },
          { id: 'default-history', moduleId: 'history', canAccess: true }
        ];
      } else {
        permissions = [
          { id: 'default-quotation', moduleId: 'quotation', canAccess: true },
          { id: 'default-history', moduleId: 'history', canAccess: true }
        ];
      }
    }

    // ✅ 返回强制刷新Session的响应
    // 前端需要调用 NextAuth 的 update() 方法来刷新Session
    return NextResponse.json({ 
      success: true, 
      message: 'Session需要强制刷新',
      forceRefresh: true,
      permissions: permissions,
      user: {
        id: userId,
        username: userName,
        email: session.user.email,
        status: true,
        isAdmin: isAdmin,
        permissions: permissions
      }
    });
  } catch (error) {
    console.error('强制刷新Session API错误:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json({ error: `服务器错误: ${errorMessage}` }, { status: 500 });
  }
} 