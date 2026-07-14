#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('用法: node scripts/report-purchase-supplier-candidates.mjs <历史导出.json>');
  process.exitCode = 1;
} else {
  const input = JSON.parse(await readFile(inputPath, 'utf8'));
  const candidates = new Map();

  function add(rawName, source, recordId) {
    if (typeof rawName !== 'string') return;
    const displayName = rawName.replace(/\r\n?/g, '\n').split('\n').find((line) => line.trim())?.trim();
    if (!displayName) return;
    const normalized = displayName.replace(/\s+/g, ' ').toLocaleLowerCase('zh-CN');
    const current = candidates.get(normalized) ?? { normalized, names: new Set(), sources: new Set(), recordIds: new Set() };
    current.names.add(displayName);
    current.sources.add(source);
    if (recordId) current.recordIds.add(String(recordId));
    candidates.set(normalized, current);
  }

  function scan(value) {
    if (Array.isArray(value)) {
      value.forEach(scan);
      return;
    }
    if (!value || typeof value !== 'object') return;
    const id = value.id;
    if (Array.isArray(value.purchaseSupplierStatuses)) {
      value.purchaseSupplierStatuses.forEach((status) => add(status?.supplierShortName, 'purchaseSupplierStatuses', id));
    }
    add(value.purchaseOrderSupplier, 'purchaseOrderSupplier', id);
    if (value.data && typeof value.data === 'object') {
      add(value.data.supplierName, 'purchase_history.data.supplierName', id);
      add(value.data.attn, 'purchase_history.data.attn', id);
    }
    add(value.supplierName, 'purchase_history.supplierName', id);
    Object.values(value).forEach(scan);
  }

  scan(input);
  const report = Array.from(candidates.values())
    .map((item) => ({
      normalized: item.normalized,
      observedNames: Array.from(item.names).sort(),
      sources: Array.from(item.sources).sort(),
      recordIds: Array.from(item.recordIds).sort(),
      count: item.recordIds.size,
    }))
    .sort((a, b) => a.normalized.localeCompare(b.normalized, 'zh-CN'));

  // 只读报告：不会建档、合并或回填任何记录，交由采购人员人工确认。
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}
