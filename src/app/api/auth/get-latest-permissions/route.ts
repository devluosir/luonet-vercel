import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface Permission {
  id: string;
  moduleId: string;
  canAccess: boolean;
}

export async function POST(request: NextRequest) {
  try {
    // 从请求头获取用户信息
    const userId = request.headers.get('X-User-ID');
    const userName = request.headers.get('X-User-Name');
    const isAdmin = request.headers.get('X-User-Admin') === 'true';

    if (!userId || !userName) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 优先从后端API获取最新权限
    let permissions: Permission[] = [];
    let userEmail: string | null = null;
    
    try {
      // 从后端API获取最新用户数据（包含权限）
      const backendResponse = await fetch(`https://udb.luocompany.net/api/admin/users/${userId}`, {
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
          userData = backendData.users.find((user: any) => user.id === userId);
        } else if (backendData.id) {
          userData = backendData;
        }
        
        if (userData && userData.permissions && Array.isArray(userData.permissions)) {
          // 转换后端权限格式
          permissions = userData.permissions.map((perm: any) => ({
            id: perm.id || `backend-${perm.moduleId}`,
            moduleId: perm.moduleId,
            canAccess: !!perm.canAccess
          }));
          
          userEmail = userData.email || null;
        }
      }
    } catch (backendError) {
      // 后端API调用失败，继续尝试从session获取
    }
    
    // 如果后端获取失败，尝试从session获取权限
    if (permissions.length === 0) {
      try {
        const session = await getServerSession(authOptions);
        
        if (session?.user?.permissions) {
          if (Array.isArray(session.user.permissions)) {
            if (session.user.permissions.length > 0 && typeof session.user.permissions[0] === 'string') {
              // 字符串数组格式
              permissions = session.user.permissions.map(moduleId => ({
                id: `session-${moduleId}`,
                moduleId: moduleId,
                canAccess: true
              }));
            } else {
              // 对象数组格式
              permissions = session.user.permissions.map((perm: any) => ({
                id: perm.id || `session-${perm.moduleId}`,
                moduleId: perm.moduleId,
                canAccess: !!perm.canAccess
              }));
            }
          } else if (typeof session.user.permissions === 'object') {
            // 对象格式
            permissions = Object.entries(session.user.permissions).map(([moduleId, canAccess]) => ({
              id: `session-${moduleId}`,
              moduleId: moduleId,
              canAccess: !!canAccess
            }));
          }
        }
        
        userEmail = session?.user?.email || null;
      } catch (sessionError) {
        // 无法从session获取权限，使用默认权限
      }
    }
    
    // 如果没有从session获取到权限，使用默认权限
    if (permissions.length === 0) {
      // 为管理员用户提供默认权限
      if (isAdmin) {
        permissions = [
          { id: 'default-quotation', moduleId: 'quotation', canAccess: true },
          { id: 'default-packing', moduleId: 'packing', canAccess: true },
          { id: 'default-invoice', moduleId: 'invoice', canAccess: true },
          { id: 'default-purchase', moduleId: 'purchase', canAccess: true },
          { id: 'default-history', moduleId: 'history', canAccess: true },
          { id: 'default-date-tools', moduleId: 'date-tools', canAccess: true }
        ];
      } else {
        // 为普通用户提供基本权限
        permissions = [
          { id: 'default-quotation', moduleId: 'quotation', canAccess: true },
          { id: 'default-history', moduleId: 'history', canAccess: true }
        ];
      }
    }



    // 返回最新的用户权限数据
    return NextResponse.json({ 
      success: true, 
      message: '获取最新权限成功',
      user: {
        id: userId,
        username: userName,
        email: userEmail,
        status: true,
        isAdmin: isAdmin,
        permissions: permissions
      },
      permissions: permissions
    });
  } catch (error) {
    console.error('获取最新权限API错误:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json({ error: `服务器错误: ${errorMessage}` }, { status: 500 });
  }
} 