import { useCallback, useMemo } from 'react';
import { usePdfPayload } from '../state/purchase.selectors';
import { PdfService } from '../services/pdf.service';
import type { PurchaseDraft } from '../utils/types';

export function usePurchasePdf() {
  const payload = usePdfPayload();

  const canGenerate = useMemo(() => {
    // 最小条件：供应商名称 + 至少一条明细
    return (payload?.supplier?.name?.trim?.() || '') !== '' && (payload?.items?.length ?? 0) > 0;
  }, [payload]);

  const generatePdf = useCallback(async (options?: { open?: boolean; download?: boolean; filename?: string }) => {
    if (!canGenerate) return;
    await PdfService.generate(payload, {
      open: options?.open ?? true,
      download: options?.download ?? false,
      filename: options?.filename ?? `PO-${payload?.settings?.poNo || ''}.pdf`,
      stamp: payload?.settings?.stamp ?? 'none',
    });
  }, [canGenerate, payload]);

  return { generatePdf, canGenerate };
}
