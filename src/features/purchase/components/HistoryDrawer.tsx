'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { PurchaseService } from '../services/purchase.service';
import { usePurchaseStore } from '../state/purchase.store';
import type { PurchaseOrderData } from '@/types/purchase';
import { format } from 'date-fns';

export default function HistoryDrawer() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const init = usePurchaseStore(s => s.init);

  useEffect(() => { 
    (async () => {
      try {
        setLoading(true);
        const data = await PurchaseService.list() || [];
        setList(data);
      } catch (error) {
        console.error('加载历史记录失败:', error);
        setList([]);
      } finally {
        setLoading(false);
      }
    })(); 
  }, []);

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return list;
    return list.filter(it =>
      String(it.title || it.id).toLowerCase().includes(k) ||
      String(it.poNo || '').toLowerCase().includes(k) ||
      String(it.supplierName || '').toLowerCase().includes(k)
    );
  }, [list, q]);

  const handleLoadItem = async (id: string) => {
    try {
      const data = await PurchaseService.load(id);
      if (data) {
        // 转换为 PurchaseOrderData 格式
        const converted: Partial<PurchaseOrderData> = {
          attn: data.attn || '',
          ourRef: data.ourRef || '',
          yourRef: data.yourRef || '',
          orderNo: data.orderNo || '',
          date: data.date || format(new Date(), 'yyyy-MM-dd'),
          supplierQuoteDate: data.supplierQuoteDate || format(new Date(), 'yyyy-MM-dd'),
          contractAmount: data.contractAmount || '',
          projectSpecification: data.projectSpecification || '',
          paymentTerms: data.paymentTerms || '交货后30天',
          invoiceRequirements: data.invoiceRequirements || '如前；',
          deliveryInfo: data.deliveryInfo || '',
          orderNumbers: data.orderNumbers || '',
          showStamp: data.showStamp || false,
          showBank: data.showBank || false,
          currency: data.currency || 'USD',
          stampType: data.stampType || 'none',
          from: data.from || ''
        };
        init(converted);
      } else {
        alert('加载失败：未找到数据');
      }
    } catch (error) {
      console.error('加载单据失败:', error);
      alert('加载失败，请重试');
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-[#3A3A3C] p-4 rounded-xl border border-gray-200 dark:border-gray-600">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-[#F5F5F7] mb-4">历史记录</h3>
      <input
        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm mb-3"
        placeholder="Search by title / PO No / supplier..."
        value={q}
        onChange={e => setQ(e.target.value)}
      />
      <div className="max-h-72 overflow-auto divide-y divide-gray-200 dark:divide-gray-600">
        {loading ? (
          <div className="py-4 text-center text-gray-500">加载中...</div>
        ) : filtered.length === 0 ? (
          <div className="py-4 text-center text-gray-500">
            {list.length === 0 ? '暂无历史记录' : 'No results'}
          </div>
        ) : (
          filtered.map((it) => (
            <button 
              key={it.id} 
              className="w-full text-left py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              onClick={() => handleLoadItem(it.id)}
            >
              <div className="text-sm font-medium text-gray-800 dark:text-[#F5F5F7]">
                {it.title || it.orderNo || it.id}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {it.updatedAt || it.date || ''}
              </div>
              {it.supplierName && (
                <div className="text-xs text-gray-500">
                  供应商: {it.supplierName}
                </div>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
