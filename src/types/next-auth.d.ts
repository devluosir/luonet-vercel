import { DefaultSession } from 'next-auth';
import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      username: string;
      isAdmin: boolean;
      token: string;
    } & DefaultSession["user"]
  }

  interface User {
    id: string;
    username: string;
    email: string | null;
    isAdmin: boolean;
  }
} 