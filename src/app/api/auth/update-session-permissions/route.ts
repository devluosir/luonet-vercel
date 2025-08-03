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

    console.log('权限刷新API调用，用户信息:', { userId, userName, isAdmin });

    if (!userId || !userName) {
      console.log('权限刷新API: 缺少用户信息');
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 从后端API获取最新权限
    let permissions: Permission[] = [];
    let userEmail: string | null = null;
    
    try {
      // 从后端API获取最新用户数据（包含权限）
      // 先通过用户名获取用户列表，找到正确的用户ID
      const usersUrl = `https://udb.luocompany.net/api/admin/users?username=${encodeURIComponent(userName)}`;
      console.log('权限刷新API: 调用用户列表API:', usersUrl);
      
      const usersResponse = await fetch(usersUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId,
          'X-User-Name': userName,
          'X-User-Admin': isAdmin ? 'true' : 'false',
        },
        cache: 'no-store'
      });

      console.log('权限刷新API: 用户列表响应状态:', usersResponse.status);

      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        console.log('权限刷新API: 用户列表数据:', usersData);
        
        // 找到正确的用户
        let correctUser = null;
        if (usersData.users && Array.isArray(usersData.users)) {
          correctUser = usersData.users.find((user: any) => 
            user.username?.toLowerCase() === userName.toLowerCase()
          );
        }
        
        if (correctUser) {
          console.log('权限刷新API: 找到正确用户:', correctUser);
          
          // 使用正确的用户ID调用单个用户API
          const userUrl = `https://udb.luocompany.net/api/admin/users/${correctUser.id}`;
          console.log('权限刷新API: 调用单个用户API:', userUrl);
          
          const userResponse = await fetch(userUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-User-ID': correctUser.id,
              'X-User-Name': userName,
              'X-User-Admin': isAdmin ? 'true' : 'false',
            },
            cache: 'no-store'
          });

          console.log('权限刷新API: 单个用户响应状态:', userResponse.status);

          if (userResponse.ok) {
            const userData = await userResponse.json();
            console.log('权限刷新API: 单个用户数据:', userData);
            
            if (userData && userData.permissions && Array.isArray(userData.permissions)) {
              // 转换后端权限格式
              permissions = userData.permissions.map((perm: any) => ({
                id: perm.id || `backend-${perm.moduleId}`,
                moduleId: perm.moduleId,
                canAccess: !!perm.canAccess
              }));
              
              userEmail = userData.email || null;
              console.log('权限刷新API: 获取到权限数据:', permissions);
            } else {
              console.log('权限刷新API: 用户数据中没有权限信息');
            }
          } else {
            console.log('权限刷新API: 单个用户API调用失败，状态码:', userResponse.status);
          }
        } else {
          console.log('权限刷新API: 未找到匹配的用户');
        }
      } else {
        console.log('权限刷新API: 用户列表API调用失败，状态码:', usersResponse.status);
      }
    } catch (backendError) {
      console.error('权限刷新API: 后端API调用失败:', backendError);
      return NextResponse.json({ error: '无法从后端获取权限数据' }, { status: 500 });
    }
    
    // 如果没有获取到权限，使用默认权限
    if (permissions.length === 0) {
      console.log('权限刷新API: 没有获取到权限数据，使用默认权限');
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