import type { DocumentType } from '@/utils/dashboardUtils';

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
    confirmation: boolean;
    domesticQuotation: boolean;
    packing: boolean;
    invoice: boolean;
    purchase: boolean;
    history: boolean;
    customer: boolean;
    purchaseSupplier: boolean;
    'ai-email': boolean;
    impa: boolean;
    inquiry: boolean;
    purchaseRegistration: boolean;
    clock: boolean;
    holidays: boolean;
    rmb: boolean;
  };
  documentTypePermissions: {
    quotation: boolean;
    confirmation: boolean;
    'domestic-quotation': boolean;
    'domestic-contract': boolean;
    packing: boolean;
    invoice: boolean;
    purchase: boolean;
  };
  accessibleDocumentTypes: DocumentType[];
} 
