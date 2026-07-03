import { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

interface Permission {
  id: string
  moduleId: string
  canAccess: boolean
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      username: string
      isAdmin: boolean
      permissions: Permission[]
      status?: string
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    username: string
    isAdmin: boolean
    permissions: Permission[]
    status?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    username: string
    isAdmin: boolean
    permissions: Permission[]
    status?: string
  }
}


