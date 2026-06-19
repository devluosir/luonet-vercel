import { useState, useEffect, useCallback } from 'react';
import { getAllDocumentCounts } from '@/utils/documentCounts';
import {
  DocumentType,
  TimeFilter,
  DocumentWithType,
  loadAllDocumentsByPermissions,
  filterDocumentsByTimeRange,
  filterDocumentsByType,
  sortDocumentsByDate
} from '@/utils/dashboardUtils';

import type { PermissionMap } from '../types';
import type { StatCounts } from '../components/StatsCards';

const EMPTY_COUNTS: StatCounts = {
  quotation: 0,
  confirmation: 0,
  invoice: 0,
  packing: 0,
  purchase: 0
};

const getTodayCounts = (documents: DocumentWithType[]): StatCounts => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.getTime();

  return documents.reduce<StatCounts>((counts, doc) => {
    const docDate = new Date((doc.createdAt || doc.updatedAt) as string).getTime();
    if (docDate >= todayStart && doc.type in counts) {
      counts[doc.type] += 1;
    }
    return counts;
  }, { ...EMPTY_COUNTS });
};

export const useDashboardDocuments = (permissionMap: PermissionMap, mounted: boolean) => {
  const [recentDocuments, setRecentDocuments] = useState<DocumentWithType[]>([]);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('today');
  const [typeFilter, setTypeFilter] = useState<'all' | DocumentType>('all');
  const [showAllFilters, setShowAllFilters] = useState(false);
  const [documentCounts, setDocumentCounts] = useState({
    quotation: 0,
    confirmation: 0,
    invoice: 0,
    packing: 0,
    purchase: 0
  });
  const [todayCounts, setTodayCounts] = useState<StatCounts>(EMPTY_COUNTS);
  
  // 更新文档计数
  const updateDocumentCounts = useCallback(() => {
    const counts = getAllDocumentCounts();
    setDocumentCounts(counts);
  }, []);

  const updateTodayCounts = useCallback(() => {
    const allDocuments = loadAllDocumentsByPermissions(permissionMap);
    setTodayCounts(getTodayCounts(allDocuments));
  }, [permissionMap]);
  
  // 初始化文档计数
  useEffect(() => {
    if (mounted) {
      updateDocumentCounts();
      updateTodayCounts();
    }
  }, [mounted, updateDocumentCounts, updateTodayCounts]);
  
  // 优化的文档加载函数
  const loadDocuments = useCallback(async (filter: TimeFilter = 'today', typeFilter: 'all' | DocumentType = 'all') => {
    try {
      // 使用工具函数加载所有有权限的文档
      const allDocuments = loadAllDocumentsByPermissions(permissionMap);

      // 使用工具函数进行时间筛选
      let filteredDocuments = filterDocumentsByTimeRange(allDocuments, filter);

      // 使用工具函数进行类型筛选
      filteredDocuments = filterDocumentsByType(filteredDocuments, typeFilter);

      // 使用工具函数进行排序
      const sorted = sortDocumentsByDate(filteredDocuments);

      setRecentDocuments(sorted);
    } catch (error) {
      console.error('加载文档失败:', error);
    }
  }, [permissionMap]);

  // 加载指定时间范围内的文档
  useEffect(() => {
    if (mounted) {
      loadDocuments(timeFilter, typeFilter);
    }
  }, [mounted, loadDocuments, timeFilter, typeFilter]);

  // 监听localStorage变化，实时更新单据记录
  useEffect(() => {
    if (!mounted) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && (e.key.includes('_history') || e.key.includes('History'))) {
        loadDocuments(timeFilter, typeFilter);
        updateDocumentCounts();
        updateTodayCounts();
      }
    };

    const handleCustomStorageChange = (e: CustomEvent) => {
      if (e.detail && (e.detail.key.includes('_history') || e.detail.key.includes('History'))) {
        loadDocuments(timeFilter, typeFilter);
        updateDocumentCounts();
        updateTodayCounts();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('customStorageChange', handleCustomStorageChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('customStorageChange', handleCustomStorageChange as EventListener);
    };
  }, [mounted, loadDocuments, timeFilter, typeFilter, updateDocumentCounts, updateTodayCounts]);

  return {
    recentDocuments,
    timeFilter,
    setTimeFilter,
    typeFilter,
    setTypeFilter,
    showAllFilters,
    setShowAllFilters,
    documentCounts,
    todayCounts,
    updateDocumentCounts
  };
};
