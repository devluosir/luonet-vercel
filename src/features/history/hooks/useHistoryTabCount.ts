import { useCallback, useEffect, useState } from 'react';
import { HistoryService } from '../services/history.service';
import { useHistoryFilters } from '../state/history.selectors';
import type { HistoryType } from '../types';

export function useHistoryTabCount() {
  const filters = useHistoryFilters();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const getTabCount = useCallback((tabType: HistoryType) => {
    // 在服务器端或客户端未准备好时返回0，避免hydration错误
    if (!isClient) {
      return 0;
    }

    try {
      let results = HistoryService.getHistory(tabType);
      
      // 根据筛选条件过滤结果
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        results = results.filter((item: any) => {
          // 搜索客户名称、单据号等字段
          const matches = 
            (item.customerName?.toLowerCase() || '').includes(searchLower) ||
            (item.invoiceNo?.toLowerCase() || '').includes(searchLower) ||
            (item.orderNo?.toLowerCase() || '').includes(searchLower) ||
            (item.quotationNo?.toLowerCase() || '').includes(searchLower) ||
            (item.purchaseNo?.toLowerCase() || '').includes(searchLower) ||
            (item.packingNo?.toLowerCase() || '').includes(searchLower) ||
            (item.confirmationNo?.toLowerCase() || '').includes(searchLower);
          
          return matches;
        });
      }

      // 根据日期范围过滤
      if (filters.dateRange !== 'all') {
        const now = new Date();
        const filterDate = new Date();
        
        switch (filters.dateRange) {
          case 'today':
            filterDate.setHours(0, 0, 0, 0);
            break;
          case 'week':
            filterDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            filterDate.setDate(now.getDate() - 30);
            break;
          case 'year':
            filterDate.setFullYear(now.getFullYear() - 1);
            break;
        }
        
        results = results.filter((item: any) => {
          const itemDate = new Date(item.updatedAt || item.createdAt || item.date);
          return itemDate >= filterDate;
        });
      }
      
      return results.length;
    } catch (error) {
      return 0;
    }
  }, [filters, isClient]);

  return { getTabCount };
}
