import type { PackingData, PackingItem } from '../types';

const createDefaultItem = (): PackingItem => ({
  id: 1,
  serialNo: '',
  marks: '',
  description: '',
  hsCode: '',
  quantity: 0,
  unitPrice: 0,
  totalPrice: 0,
  netWeight: 0,
  grossWeight: 0,
  packageQty: 0,
  dimensions: '',
  unit: 'pc'
});

export const normalizePackingData = (data: Partial<PackingData>): PackingData => ({
  orderNo: data.orderNo ?? '',
  invoiceNo: data.invoiceNo ?? '',
  date: data.date ?? new Date().toISOString().split('T')[0],
  consignee: {
    name: data.consignee?.name ?? ''
  },
  items: data.items?.length
    ? data.items.map((item) => ({
        ...item,
        marks: item.marks ?? ''
      }))
    : [createDefaultItem()],
  otherFees: data.otherFees ?? [],
  currency: data.currency ?? 'USD',
  remarkOptions: {
    shipsSpares: data.remarkOptions?.shipsSpares ?? false,
    customsPurpose: data.remarkOptions?.customsPurpose ?? false
  },
  showHsCode: data.showHsCode ?? true,
  showDimensions: data.showDimensions ?? true,
  showWeightAndPackage: data.showWeightAndPackage ?? true,
  showPrice: data.showPrice ?? true,
  dimensionUnit: data.dimensionUnit ?? 'cm',
  documentType: data.documentType ?? 'packing',
  templateConfig: {
    headerType: data.templateConfig?.headerType ?? 'bilingual'
  },
  customUnits: data.customUnits ?? [],
  isInGroupMode: data.isInGroupMode ?? false,
  currentGroupId: data.currentGroupId,
  packageQtyMergeMode: data.packageQtyMergeMode ?? 'auto',
  dimensionsMergeMode: data.dimensionsMergeMode ?? 'auto',
  marksMergeMode: data.marksMergeMode ?? 'auto',
  manualMergedCells: data.manualMergedCells ?? {
    packageQty: [],
    dimensions: [],
    marks: []
  },
  autoMergedCells: data.autoMergedCells ?? {
    packageQty: [],
    dimensions: [],
    marks: []
  },
  savedVisibleCols: data.savedVisibleCols ?? null
});
