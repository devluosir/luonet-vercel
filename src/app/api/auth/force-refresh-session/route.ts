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

    // 从请求体获取用户信息
    const body = await request.json();
    const { username } = body;

    if (!username) {
      return NextResponse.json({ error: '缺少用户名参数' }, { status: 400 });
    }

    // ✅ 安全性检查：验证用户身份
    if (session.user.username !== username && session.user.name !== username) {
      console.warn('权限刷新安全警告: 用户尝试刷新他人权限', {
        sessionUser: session.user.username,
        requestUser: username
      });
      return NextResponse.json({ error: '不允许越权刷新他人权限' }, { status: 403 });
    }

    // ✅ 权限检查：只有管理员或用户本人可以刷新权限
    const isAdmin = session.user.isAdmin;
    const isSelfRefresh = session.user.username === username || session.user.name === username;
    
    if (!isAdmin && !isSelfRefresh) {
      return NextResponse.json({ error: '权限不足，无法刷新权限' }, { status: 403 });
    }

    console.log('权限刷新API: 开始刷新用户权限', {
      username,
      isAdmin,
      sessionUser: session.user.username
    });

    // 从后端API获取最新权限
    let permissions = [];
    let userEmail = session.user.email;
    let userStatus = true;
    
    try {
      const backendResponse = await fetch(`https://udb.luocompany.net/api/admin/users?username=${encodeURIComponent(username)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': session.user.id || session.user.username || '',
          'X-User-Name': username,
          'X-User-Admin': isAdmin ? 'true' : 'false',
        },
        cache: 'no-store'
      });

      if (backendResponse.ok) {
        const backendData = await backendResponse.json();
        
        // 处理不同的响应格式
        let userData;
        if (backendData.users && Array.isArray(backendData.users)) {
          userData = backendData.users.find((user: { username?: string; id?: string }) => 
            user.username?.toLowerCase() === username.toLowerCase() || 
            user.id === session.user.id
          );
        } else if (backendData.id) {
          userData = backendData;
        }
        
        if (userData && userData.permissions && Array.isArray(userData.permissions)) {
          permissions = userData.permissions.map((perm: { id?: string; moduleId: string; canAccess: boolean }) => ({
            id: perm.id || `backend-${perm.moduleId}`,
            moduleId: perm.moduleId,
            canAccess: !!perm.canAccess
          }));
          
          userEmail = userData.email || session.user.email;
          userStatus = userData.status !== false;
          
          console.log('权限刷新API: 获取到最新权限数据', {
            permissionsCount: permissions.length,
            permissions: permissions.map((p: { moduleId: string; canAccess: boolean }) => ({ moduleId: p.moduleId, canAccess: p.canAccess }))
          });
        } else {
          console.log('权限刷新API: 后端数据中没有找到权限信息');
        }
      } else {
        console.log('权限刷新API: 后端请求失败:', backendResponse.status);
      }
    } catch (error) {
      console.error('权限刷新API: 获取权限数据失败:', error);
    }

    // 如果没有获取到权限，使用默认权限
    if (permissions.length === 0) {
      console.log('权限刷新API: 使用默认权限');
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

    // ✅ 检查权限是否有变化
    const currentPermissions = session.user.permissions || [];
    const permissionsChanged = JSON.stringify(currentPermissions) !== JSON.stringify(permissions);
    
    console.log('权限刷新API: 权限变化检查', {
      currentPermissionsCount: currentPermissions.length,
      newPermissionsCount: permissions.length,
      permissionsChanged
    });

    // ✅ 返回优化的响应结构
    return NextResponse.json({ 
      success: true, 
      message: permissionsChanged ? '权限已更新，需要刷新Session' : '权限无变化',
      tokenNeedsRefresh: permissionsChanged, // ✅ 语义化标志
      permissions: permissions,
      user: {
        id: session.user.id,
        username: username,
        email: userEmail,
        status: userStatus,
        isAdmin: isAdmin,
        permissions: permissions
      },
      // ✅ 添加调试信息
      debug: {
        permissionsChanged,
        currentPermissionsCount: currentPermissions.length,
        newPermissionsCount: permissions.length,
        isAdmin,
        isSelfRefresh
      }
    });
  } catch (error) {
    console.error('权限刷新API错误:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json({ error: `服务器错误: ${errorMessage}` }, { status: 500 });
  }
} 