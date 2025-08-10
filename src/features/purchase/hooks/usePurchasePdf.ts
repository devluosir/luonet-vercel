import { useCallback, useMemo } from 'react';
import { usePurchaseStore } from '../state/purchase.store';
import { PdfService } from '../services/pdf.service';
import type { PurchaseDraft } from '../utils/types';

export function usePurchasePdf() {
  const draft = usePurchaseStore(s => s.draft);

  const canGenerate = useMemo(() => {
    // 最小条件：供应商名称 + 至少一条明细
    return (draft?.supplier?.name?.trim?.() || '') !== '' && (draft?.items?.length ?? 0) > 0;
  }, [draft]);

  const generatePdf = useCallback(async (options?: { open?: boolean; download?: boolean; filename?: string }) => {
    if (!canGenerate) return;
    await PdfService.generate(draft, {
      open: options?.open ?? true,
      download: options?.download ?? false,
      filename: options?.filename ?? `PO-${draft?.settings?.poNo || ''}.pdf`,
      stamp: draft?.settings?.stamp ?? 'none',
    });
  }, [canGenerate, draft]);

  return { generatePdf, canGenerate };
}
