export interface User {
  id: string;
  username: string;
  email: string | null;
  status: boolean;
  isAdmin: boolean;
  permissions: Permission[];
  lastLoginAt: string | null;
  createdAt: string;
}

export interface Permission {
  id: string;
  moduleId: string;
  canAccess: boolean;
}

export interface ModulePermission {
  id: string;
  name: string;
  icon: string;
}

export interface CreateUserData {
  username: string;
  password: string;
  email: string;
  isAdmin: boolean;
}

export interface UpdateUserData {
  email?: string;
  status?: boolean;
  isAdmin?: boolean;
}
