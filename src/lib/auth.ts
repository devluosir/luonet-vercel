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
          
          return {
            id: data.user.id,
            email: data.user.email || "",
            name: data.user.username,
            username: data.user.username,
            isAdmin: data.user.isAdmin,
            image: null,
            permissions: data.permissions // 保持原始权限数据格式
          };
        } catch (error) {
          console.error('认证失败:', error);
          throw new Error("用户名或密码错误");
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.username = user.username;
        token.isAdmin = user.isAdmin;
        token.permissions = user.permissions;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub || "";
        session.user.username = token.username;
        session.user.isAdmin = token.isAdmin;
        session.user.permissions = token.permissions;
      }
      return session;
    }
  },
  pages: {
    signIn: "/",
    error: "/",
  },
  secret: process.env.NEXTAUTH_SECRET
};

const handler = NextAuth(authOptions);

export { handler as auth, handler as GET, handler as POST }; 