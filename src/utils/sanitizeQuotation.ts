import type { QuotationData } from '../types/quotation';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sanitizeQuotation(raw: any): QuotationData {
  // 快速检查：如果数据已经是正确的格式，直接返回
  if (raw && typeof raw === 'object' && Array.isArray(raw.items) && Array.isArray(raw.notes)) {
    return raw as QuotationData;
  }
  
  // 确保items是数组
  const items = Array.isArray(raw.items) ? raw.items : [];
  
  // 确保notes是数组并过滤有效内容
  const notes = Array.isArray(raw.notes) ? raw.notes : [];
  const printableNotes = notes.filter((note: any) => // eslint-disable-line @typescript-eslint/no-explicit-any
    note && typeof note === 'string' && note.trim() !== ''
  );
  
  // 确保otherFees是数组
  const otherFees = Array.isArray(raw.otherFees) ? raw.otherFees : [];
  
  return {
    // 确保所有必需字段都有默认值
    quotationNo: raw.quotationNo ?? '',
    contractNo: raw.contractNo ?? '',
    date: raw.date ?? new Date().toISOString().split('T')[0],
    notes: printableNotes,
    from: raw.from ?? '',
    to: raw.to ?? '',
    inquiryNo: raw.inquiryNo ?? '',
    currency: raw.currency ?? 'USD',
    paymentDate: raw.paymentDate ?? '',
    items: items.map((item: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
      id: item.id ?? 0,
      partName: item.partName ?? '',
      description: item.description ?? '',
      quantity: Number(item.quantity ?? 0),
      unit: item.unit ?? '',
      unitPrice: Number(item.unitPrice ?? 0),
      amount: Number(item.amount ?? 0),
      remarks: item.remarks ?? '',
    })),
    amountInWords: raw.amountInWords ?? {
      dollars: '',
      cents: '',
      hasDecimals: false,
    },
    showDescription: raw.showDescription ?? true,
    showRemarks: raw.showRemarks ?? false,
    showBank: raw.showBank ?? false,
    showStamp: raw.showStamp ?? false,
    otherFees: otherFees.map((fee: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
      id: fee.id ?? 0,
      description: fee.description ?? '',
      amount: Number(fee.amount ?? 0),
      remarks: fee.remarks ?? '',
    })),
    customUnits: raw.customUnits ?? [],
    showPaymentTerms: raw.showPaymentTerms ?? false,
    showInvoiceReminder: raw.showInvoiceReminder ?? false,
    additionalPaymentTerms: raw.additionalPaymentTerms ?? '',
    templateConfig: raw.templateConfig ?? {
      headerType: 'none',
    },
  };
}

// 精简数据用于localStorage存储
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function pickDraft(full: any) {
  return {
    quotationNo: full.quotationNo,
    contractNo: full.contractNo,
    date: full.date,
    from: full.from,
    to: full.to,
    inquiryNo: full.inquiryNo,
    currency: full.currency,
    paymentDate: full.paymentDate,
    items: full.items?.map((i: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
      id: i.id,
      partName: i.partName,
      description: i.description,
      quantity: i.quantity,
      unit: i.unit,
      unitPrice: i.unitPrice,
      amount: i.amount,
      remarks: i.remarks,
    })) ?? [],
    notes: full.notes,
    otherFees: full.otherFees?.map((f: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
      id: f.id,
      description: f.description,
      amount: f.amount,
      remarks: f.remarks,
    })) ?? [],
    amountInWords: full.amountInWords,
    showDescription: full.showDescription,
    showRemarks: full.showRemarks,
    showBank: full.showBank,
    showStamp: full.showStamp,
    customUnits: full.customUnits,
    showPaymentTerms: full.showPaymentTerms,
    showInvoiceReminder: full.showInvoiceReminder,
    additionalPaymentTerms: full.additionalPaymentTerms,
    templateConfig: full.templateConfig,
    notesConfig: full.notesConfig,
    updatedAt: Date.now(),
  };
}
