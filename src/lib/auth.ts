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

          // 验证管理员权限
          if (data.user.isAdmin) {
            // 管理员用户登录
          } else {
            // 非管理员用户需要验证是否有基本权限
            if (!data.permissions || (Array.isArray(data.permissions) && data.permissions.length === 0)) {
              // 非管理员用户如果没有权限，仍然允许登录，但会在dashboard中处理权限
            }
          }

          // 简化验证：只验证用户名密码和用户状态，不验证模块权限
          
          return {
            id: data.user.id,
            email: data.user.email || "",
            name: data.user.username,
            username: data.user.username,
            isAdmin: !!data.user.isAdmin,
            image: null,
            permissions: data.permissions || [] // 包含API返回的权限数据
          };
        } catch (error) {
          throw new Error(error instanceof Error ? error.message : "用户名或密码错误");
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.username = user.username;
        token.isAdmin = !!user.isAdmin; // 确保是布尔值
        token.permissions = user.permissions;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub || "";
        session.user.username = token.username;
        session.user.isAdmin = !!token.isAdmin; // 确保是布尔值
        
        // 确保权限数据格式正确
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