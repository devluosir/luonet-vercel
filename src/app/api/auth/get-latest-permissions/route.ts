import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { Permission } from '@/types/permissions';

export async function POST(_request: NextRequest) {
  try {
    // 从 NextAuth session 读取用户身份（不信任客户端头）
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }
    const userId = session.user.id || session.user.username || '';
    const userName = session.user.username || session.user.name || '';
    let isAdmin = !!session.user.isAdmin;

    // 优先从后端API获取最新权限
    let permissions: Permission[] = [];
    let userEmail: string | null = null;
    let didLoadBackendPermissions = false;
    
    try {
      // 从后端API获取最新用户数据（包含权限）
      // 使用用户名查询，因为userId可能是用户名
      const workerBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://udb.luocompany.net';
      const backendResponse = await fetch(`${workerBase}/api/admin/users?username=${encodeURIComponent(userName)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.API_TOKEN || ''}`,
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
          didLoadBackendPermissions = true;
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
    
    // 如果后端没有取到权限字段，才尝试从 session 兜底；后端返回空数组表示确实无模块权限。
    if (!didLoadBackendPermissions) {
      try {
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
        // 无法从 session 获取权限，保持空权限
      }
    }
    
    // 空权限 = 用户确实没有任何权限，不添加默认值
    if (permissions.length === 0) {
      console.log('权限API: 用户无已分配权限，返回空权限列表');
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
