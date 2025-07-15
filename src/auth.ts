import NextAuth from "next-auth"
import type { DefaultSession, AuthOptions, User } from "next-auth"
import { prisma } from "@/lib/prisma"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { cache } from 'react'

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      username: string;
      isAdmin: boolean;
    } & DefaultSession["user"]
  }

  interface User {
    username: string;
    isAdmin: boolean;
  }
}

// 缓存用户查询
const findUser = cache(async (username: string) => {
  return await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      password: true,
      email: true,
      isAdmin: true,
      status: true,
    }
  });
});

export const config = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials: Record<"username" | "password", string> | undefined): Promise<User | null> {
        if (!credentials?.username || !credentials?.password) {
          throw new Error("请输入用户名和密码")
        }

        const user = await findUser(credentials.username);

        if (!user) {
          throw new Error("用户不存在")
        }

        if (!user.password) {
          throw new Error("请先设置密码")
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isValid) {
          throw new Error("密码错误")
        }

        if (!user.status) {
          throw new Error("账号已被禁用")
        }

        // 更新最后登录时间
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() }
        });

        return {
          id: user.id,
          email: user.email || "",
          name: user.username,
          username: user.username,
          isAdmin: user.isAdmin,
          image: null
        }
      }
    })
  ],
  session: { 
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.username = user.username
        token.isAdmin = user.isAdmin
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.username = token.username as string
        session.user.isAdmin = token.isAdmin as boolean
      }
      return session
    }
  },
  pages: {
    signIn: "/",
    signOut: "/",
    error: "/",
    newUser: "/"
  },
  debug: process.env.NODE_ENV === 'development',
} satisfies AuthOptions

const auth = NextAuth(config)

export const getAuth = async () => {
  return await auth()
}

export { auth }
export const { signIn, signOut } = auth 