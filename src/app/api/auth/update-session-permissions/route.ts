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

    // 从后端API获取最新权限
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
      console.error('后端API调用失败:', backendError);
      return NextResponse.json({ error: '无法从后端获取权限数据' }, { status: 500 });
    }
    
    // 如果没有获取到权限，返回错误
    if (permissions.length === 0) {
      return NextResponse.json({ error: '无法获取用户权限数据' }, { status: 500 });
    }

    // 获取当前session
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: '用户未登录' }, { status: 401 });
    }

    // 更新session中的权限数据
    // 注意：NextAuth的session更新需要通过重新登录或token更新来实现
    // 这里我们返回更新后的权限数据，让前端处理session更新

    return NextResponse.json({ 
      success: true, 
      message: '权限数据已更新',
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
    console.error('更新session权限API错误:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json({ error: `服务器错误: ${errorMessage}` }, { status: 500 });
  }
} 