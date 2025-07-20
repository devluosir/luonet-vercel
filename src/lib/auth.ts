import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "./prisma";
import { compare } from "bcryptjs";
import NextAuth from "next-auth";

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

        const user = await prisma.user.findUnique({
          where: {
            username: credentials.username
          },
          include: {
            permissions: true
          }
        });

        if (!user) {
          throw new Error("User not found");
        }

        const isValid = await compare(credentials.password, user.password);

        if (!isValid) {
          throw new Error("Invalid password");
        }

        return {
          id: user.id,
          email: user.email || "",
          name: user.username,
          username: user.username,
          isAdmin: user.isAdmin,
          image: null,
          permissions: user.permissions.map(p => p.moduleId)
        };
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
    signIn: "/login",
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET
};

const handler = NextAuth(authOptions);

export { handler as auth, handler as GET, handler as POST }; 