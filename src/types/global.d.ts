import type { PackingData } from '@/features/packing/types';
import type { InvoiceData } from '@/features/invoice/types';
import type { ThemeManager } from '@/utils/themeUtils';

declare global {
  interface Window {
    themeManager?: ThemeManager;
    __PACKING_DATA__?: PackingData;
    __INVOICE_DATA__?: InvoiceData;
    __EDIT_MODE__?: boolean;
    __EDIT_ID__?: string;
  }
}

export {};
