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

    // 尝试从session获取权限，如果失败则使用默认权限
    let permissions: Permission[] = [];
    let userEmail: string | null = null;
    
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
      console.log('无法从session获取权限，使用默认权限');
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

    // 添加调试信息
    if (process.env.NODE_ENV === 'development') {
      console.log('Session权限数据:', {
        permissionsCount: permissions.length,
        samplePermission: permissions[0],
        allPermissions: permissions,
        // 添加详细的权限格式分析
        permissionAnalysis: {
          isArray: Array.isArray(permissions),
          firstPermissionType: typeof permissions[0],
          firstPermissionKeys: permissions[0] ? Object.keys(permissions[0]) : [],
          moduleIds: permissions.map(p => p.moduleId),
          canAccessValues: permissions.map(p => p.canAccess)
        }
      });
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