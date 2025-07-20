import { PrismaAdapter } from "@auth/prisma-adapter";
import { NextAuthOptions, DefaultSession } from "next-auth";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import { compare } from "bcryptjs";
import { Adapter } from "next-auth/adapters";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      username: string;
      isAdmin: boolean;
    } & DefaultSession["user"]
  }
}

// 用户缓存
const userAuthCache = new Map<string, { user: any; timestamp: number }>();
const AUTH_CACHE_DURATION = 10 * 60 * 1000; // 10分钟认证缓存

export const authConfig: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        try {
          // 完整的用户验证
          const user = await prisma.user.findUnique({
            where: {
              username: credentials.username
            },
            select: {
              id: true,
              username: true,
              password: true,
              email: true,
              isAdmin: true,
              status: true,
              permissions: true // 确保加载权限
            }
          });

          if (!user || !user.status) {
            return null;
          }

          const isValid = await compare(credentials.password, user.password);

          if (!isValid) {
            return null;
          }

          // 清除之前的权限缓存
          const cacheKey = `auth_${credentials.username}`;
          userAuthCache.delete(cacheKey);

          // 缓存新的用户信息（包含权限）
          userAuthCache.set(cacheKey, {
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
              isAdmin: user.isAdmin,
              status: user.status,
              permissions: user.permissions
            },
            timestamp: Date.now()
          });

          // 异步更新最后登录时间
          prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() }
          }).catch(console.error);

          // 返回完整的用户信息（包含权限）
          return {
            id: user.id,
            username: user.username,
            email: user.email,
            isAdmin: user.isAdmin,
            permissions: user.permissions
          };
        } catch (error) {
          console.error('Login error:', error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30天
  },
  pages: {
    signIn: "/login"
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.isAdmin = user.isAdmin;
        token.permissions = user.permissions; // 将权限信息添加到token
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.isAdmin = token.isAdmin as boolean;
        (session.user as any).permissions = token.permissions; // 将权限信息添加到session
      }
      return session;
    }
  },
  // 减少调试日志
  debug: false
};

export const { auth, signIn, signOut } = NextAuth(authConfig); 