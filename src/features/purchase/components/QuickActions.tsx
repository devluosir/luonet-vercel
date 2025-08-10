'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { usePurchaseStore } from '../state/purchase.store';
import { PurchaseService } from '../services/purchase.service';
import { usePurchasePdf } from '../hooks/usePurchasePdf';
import { usePurchaseValidation } from '../hooks/usePurchaseValidation';
import { showToast } from './Toast';

export default function QuickActions() {
  const draft = usePurchaseStore(s => s.draft);
  const { isValid } = usePurchaseValidation();
  const { generatePdf, canGenerate } = usePurchasePdf();
  const [busy, setBusy] = useState(false);

  const onSave = useCallback(async () => {
    try {
      setBusy(true);
      await PurchaseService.save(draft);
      // 轻量 toast
      console.info('Saved');
      showToast('保存成功', 'success');
    } catch (error) {
      console.error('保存失败:', error);
      showToast('保存失败，请重试', 'error');
    } finally {
      setBusy(false);
    }
  }, [draft]);

  const onExport = useCallback(async () => {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; 
    a.download = `PO-${draft?.settings?.poNo || 'draft'}.json`; 
    a.click();
    URL.revokeObjectURL(url);
  }, [draft]);

  // Cmd/Ctrl+S 保存
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault(); 
        onSave();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onSave]);

  return (
    <div className="bg-gray-50 dark:bg-[#3A3A3C] p-4 rounded-xl border border-gray-200 dark:border-gray-600">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-[#F5F5F7] mb-4">快捷操作</h3>
      <div className="grid grid-cols-1 gap-3">
        <button 
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={onSave} 
          disabled={!isValid || busy}
        >
          {busy ? '保存中...' : '保存 (Ctrl+S)'}
        </button>
        <button 
          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => generatePdf({ open: true })} 
          disabled={!canGenerate}
        >
          预览PDF
        </button>
        <button 
          className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
          onClick={onExport}
        >
          导出JSON
        </button>
      </div>
      <div className="mt-3 text-xs text-gray-500 text-center">
        Press ⌘/Ctrl + S to save
      </div>
    </div>
  );
}
