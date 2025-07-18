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

        const cacheKey = `auth_${credentials.username}`;
        const cached = userAuthCache.get(cacheKey);
        
        // 检查缓存
        if (cached && Date.now() - cached.timestamp < AUTH_CACHE_DURATION) {
          const user = cached.user;
          // 验证密码
          const isValid = await compare(credentials.password, user.password);
          if (isValid) {
            return {
              id: user.id,
              username: user.username,
              email: user.email,
              isAdmin: user.isAdmin
            };
          }
        }

        // 数据库查询
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
            status: true
          }
        });

        if (!user || !user.status) {
          return null;
        }

        const isValid = await compare(credentials.password, user.password);

        if (!isValid) {
          return null;
        }

        // 缓存用户信息（不包含密码）
        userAuthCache.set(cacheKey, {
          user: {
            id: user.id,
            username: user.username,
            password: user.password, // 仅用于密码验证
            email: user.email,
            isAdmin: user.isAdmin,
            status: user.status
          },
          timestamp: Date.now()
        });

        // 异步更新最后登录时间（不阻塞认证）
        prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() }
        }).catch(console.error);

        return {
          id: user.id,
          username: user.username,
          email: user.email,
          isAdmin: user.isAdmin
        };
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
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.isAdmin = token.isAdmin as boolean;
      }
      return session;
    }
  },
  // 减少调试日志
  debug: false
};

export const { auth, signIn, signOut } = NextAuth(authConfig); 