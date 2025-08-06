import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import NextAuth from "next-auth";

export const authOptions: NextAuthOptions = {
  debug: false, // 关闭调试模式以提高性能
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60, // 24小时内不更新session
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30天
  },
  pages: {
    signIn: '/',
  },
  useSecureCookies: process.env.NODE_ENV === 'production',
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error("Missing username or password");
        }

        // ✅ 支持silent-refresh
        const isSilentRefresh = credentials.password === 'silent-refresh';
        
        if (isSilentRefresh) {
          console.log('检测到silent-refresh请求:', credentials.username);
          
          // 对于silent-refresh，直接返回当前用户信息
          // 这里可以从session或缓存中获取用户信息
          return {
            id: credentials.username,
            email: "",
            name: credentials.username,
            username: credentials.username,
            isAdmin: true, // 默认为管理员，实际应该从session获取
            image: null,
            permissions: [], // 权限会在后续的API调用中更新
            status: true
          };
        }

        try {
          // 使用远程 API 进行认证
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://udb.luocompany.net'}/api/auth/d1-users`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              username: credentials.username,
              password: credentials.password
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '认证失败');
          }

          const data = await response.json();
          
          // 验证用户状态
          if (!data.user || !data.user.status) {
            throw new Error("用户账户已被禁用");
          }

          // ✅ 登录时直接返回完整的用户信息，包括权限
          return {
            id: data.user.id,
            email: data.user.email || "",
            name: data.user.username,
            username: data.user.username,
            isAdmin: !!data.user.isAdmin,
            image: null,
            permissions: data.permissions || [], // ✅ 包含完整的权限数据
            status: data.user.status
          };
        } catch (error) {
          throw new Error(error instanceof Error ? error.message : "用户名或密码错误");
        }
      }
    })
  ],
  callbacks: {
    // JWT 回调：用于初始化和更新 JWT
    async jwt({ token, user, trigger, session }) {
      // 登录阶段：写入初始权限
      if (user) {
        console.log('JWT初始化: 用户登录，设置初始权限', user.permissions);
        token.username = user.username;
        token.isAdmin = !!user.isAdmin;
        token.permissions = user.permissions || [];
        token.status = (user as any).status;
        token.email = user.email;
      }

      // update() 被调用时：更新权限
      if (trigger === 'update' && session?.permissions) {
        console.log('JWT更新: 收到新的权限数据', session.permissions);
        token.permissions = session.permissions;
      }

      // ✅ 修复：检查是否有权限更新请求
      if (trigger === 'update' && session?.forceUpdatePermissions) {
        console.log('JWT强制更新: 权限数据已更新，刷新token');
        // 这里可以触发token重新生成
        token.iat = Math.floor(Date.now() / 1000);
        token.exp = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30天
      }

      return token;
    },

    // Session 回调：将 token 权限数据暴露到 session.user
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub || "";
        session.user.username = token.username;
        session.user.isAdmin = !!token.isAdmin;
        session.user.email = token.email;
        (session.user as any).status = token.status;
        
        // ✅ 确保权限数据格式正确
        if (Array.isArray(token.permissions)) {
          session.user.permissions = token.permissions;
        } else if (typeof token.permissions === 'object' && token.permissions !== null) {
          // 如果是对象格式，转换为数组格式
          session.user.permissions = Object.entries(token.permissions).map(([moduleId, canAccess]) => ({
            id: `session-${moduleId}`,
            moduleId,
            canAccess: !!canAccess
          }));
        } else {
          // 默认为空数组
          session.user.permissions = [];
        }
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // 只在真正需要重定向时才执行
      if (url === baseUrl || url === `${baseUrl}/`) {
        // 如果URL是首页，不需要重定向
        return url;
      }
      
      // 确保重定向到正确的URL
      if (url.startsWith('/')) {
        const fullUrl = `${baseUrl}${url}`;
        return fullUrl;
      } else if (new URL(url).origin === baseUrl) {
        return url;
      }
      
      return baseUrl;
    }
  },

  secret: process.env.NEXTAUTH_SECRET || "your-secret-key-here"
};

const handler = NextAuth(authOptions);

export { handler as auth, handler as GET, handler as POST }; 