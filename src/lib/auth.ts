import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import NextAuth from "next-auth";
import { API_ENDPOINTS, apiRequestWithError } from "./api-config";

// 缓存时间（毫秒）
const AUTH_CACHE_DURATION = 5 * 60 * 1000; // 5分钟

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    CredentialsProvider({
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

          // 确保权限数据格式正确（无论是否为管理员都需要处理）
          let permissions = [];
          if (Array.isArray(data.permissions)) {
            permissions = data.permissions.map((perm: any) => ({
              id: `session-${perm.moduleId || perm.id}`,
              moduleId: perm.moduleId || perm.id,
              canAccess: !!perm.canAccess
            }));
          } else if (typeof data.permissions === 'object' && data.permissions !== null) {
            permissions = Object.entries(data.permissions).map(([moduleId, canAccess]) => ({
              id: `session-${moduleId}`,
              moduleId,
              canAccess: !!canAccess
            }));
          }
          
          // 验证用户权限
          if (data.user.isAdmin) {
            // 管理员用户，直接允许登录，但记录权限信息
          } else {
            // 非管理员用户必须有至少一个模块的权限
            if (permissions.length === 0) {
              throw new Error("用户没有访问任何模块的权限");
            }
            
            // 检查是否有可访问的模块
            const hasAccessibleModule = permissions.some((perm: any) => 
              perm.canAccess === true
            );
            
            if (!hasAccessibleModule) {
              throw new Error("用户没有访问任何模块的权限");
            }
          }
          
          return {
            id: data.user.id,
            email: data.user.email || "",
            name: data.user.username,
            username: data.user.username,
            isAdmin: !!data.user.isAdmin,
            image: null,
            permissions: permissions
          };
        } catch (error) {
          console.error('登录验证失败:', error);
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
    }
  },

  secret: process.env.NEXTAUTH_SECRET
};

const handler = NextAuth(authOptions);

export { handler as auth, handler as GET, handler as POST }; 