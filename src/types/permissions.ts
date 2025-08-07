export interface Permission {
  id: string;
  moduleId: string;
  canAccess: boolean;
}

export interface User {
  id: string;
  username: string;
  email: string | null;
  status: boolean;
  isAdmin: boolean;
  permissions: Permission[];
}

export interface PermissionMap {
  permissions: {
    quotation: boolean;
    packing: boolean;
    invoice: boolean;
    purchase: boolean;
    history: boolean;
    customer: boolean;
    'ai-email': boolean;
  };
  documentTypePermissions: {
    quotation: boolean;
    confirmation: boolean;
    packing: boolean;
    invoice: boolean;
    purchase: boolean;
  };
  accessibleDocumentTypes: string[];
} 