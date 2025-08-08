import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { Permission } from '@/types/permissions';

export async function POST(request: NextRequest) {
  try {
    // 从请求头获取用户信息
    const userId = request.headers.get('X-User-ID');
    const userName = request.headers.get('X-User-Name');
    let isAdmin = request.headers.get('X-User-Admin') === 'true';

    if (!userId || !userName) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 优先从后端API获取最新权限
    let permissions: Permission[] = [];
    let userEmail: string | null = null;
    
    try {
      // 从后端API获取最新用户数据（包含权限）
      // 使用用户名查询，因为userId可能是用户名
      const backendResponse = await fetch(`https://udb.luocompany.net/api/admin/users?username=${encodeURIComponent(userName)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId,
          'X-User-Name': userName,
          'X-User-Admin': isAdmin ? 'true' : 'false',
        },
        cache: 'no-store',
        next: { revalidate: 0 } // 强制不缓存
      });

      if (backendResponse.ok) {
        const backendData = await backendResponse.json();
        
        console.log('权限API: 后端响应数据:', backendData);
        
        // 处理不同的响应格式
        let userData;
        if (backendData.users && Array.isArray(backendData.users)) {
          // 通过用户名查找用户
          userData = backendData.users.find((user: Record<string, unknown>) => 
            (user.username as string)?.toLowerCase() === userName.toLowerCase() || 
            user.id === userId
          );
        } else if (backendData.id) {
          userData = backendData;
        }
        
        if (userData && userData.permissions && Array.isArray(userData.permissions)) {
          // 转换后端权限格式
          permissions = userData.permissions
            .map((perm: Record<string, unknown>) => ({
              id: (perm.id as string) || `backend-${perm.moduleId as string}`,
              moduleId: perm.moduleId as string,
              canAccess: !!(perm.canAccess as boolean)
            }));
          
          userEmail = userData.email || null;
          
          // 从后端数据获取真实的管理员状态
          if (userData.isAdmin !== undefined) {
            isAdmin = !!userData.isAdmin;
            console.log('权限API: 从后端获取到真实管理员状态:', isAdmin);
          }
          
          console.log('权限API: 从后端获取到权限数据:', permissions);
        } else {
          console.log('权限API: 后端数据中没有找到权限信息');
        }
      } else {
        console.log('权限API: 后端请求失败:', backendResponse.status, backendResponse.statusText);
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
            // 对象数组格式
            permissions = session.user.permissions
              .map((perm: Permission) => ({
                id: perm.id || `session-${perm.moduleId}`,
                moduleId: perm.moduleId,
                canAccess: !!perm.canAccess
              }));
          } else if (typeof session.user.permissions === 'object') {
            // 对象格式
            permissions = Object.entries(session.user.permissions)
              .map(([moduleId, canAccess]) => ({
                id: `session-${moduleId}`,
                moduleId: moduleId,
                canAccess: !!canAccess
              }));
          }
        }
        
        userEmail = session?.user?.email || null;
        
        // 从session获取真实的管理员状态
        if (session?.user?.isAdmin !== undefined) {
          isAdmin = !!session.user.isAdmin;
        }
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
          { id: 'default-history', moduleId: 'history', canAccess: true }
        ];
      } else {
        // 为普通用户提供基本权限
        permissions = [
          { id: 'default-quotation', moduleId: 'quotation', canAccess: true },
          { id: 'default-history', moduleId: 'history', canAccess: true }
        ];
      }
    }

    // 确保至少有一些基本权限，避免权限检查失败
    if (permissions.length === 0) {
      permissions = [
        { id: 'fallback-quotation', moduleId: 'quotation', canAccess: true },
        { id: 'fallback-history', moduleId: 'history', canAccess: true }
      ];
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