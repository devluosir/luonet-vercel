import { DefaultSession, DefaultUser } from "next-auth"
import { JWT, DefaultJWT } from "next-auth/jwt"

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
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    username: string
    isAdmin: boolean
    permissions: Permission[]
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    username: string
    isAdmin: boolean
    permissions: Permission[]
  }
} 

declare module "next-auth/react" {
  export function update(data: Record<string, unknown>): Promise<void>;
} 