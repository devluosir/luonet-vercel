import { useState, useEffect, useCallback } from 'react';
import { FollowUpService } from '../services/timelineService';
import type { CustomerFollowUp, FollowUpType, FollowUpStatus, FollowUpPriority } from '../types';

export function useCustomerFollowUp(customerId?: string) {
  const [followUps, setFollowUps] = useState<CustomerFollowUp[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: [] as FollowUpStatus[],
    priority: [] as FollowUpPriority[],
    searchText: ''
  });

  // 加载跟进记录
  const loadFollowUps = useCallback(async () => {
    if (!customerId) return;
    
    setLoading(true);
    try {
      const customerFollowUps = FollowUpService.getFollowUpsByCustomer(customerId);
      setFollowUps(customerFollowUps);
    } catch (error) {
      console.error('加载跟进记录失败:', error);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  // 添加跟进记录
  const addFollowUp = useCallback(async (followUpData: Omit<CustomerFollowUp, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!customerId) return null;
    
    try {
      const newFollowUp = FollowUpService.addFollowUp(followUpData);
      await loadFollowUps();
      return newFollowUp;
    } catch (error) {
      console.error('添加跟进记录失败:', error);
      return null;
    }
  }, [customerId, loadFollowUps]);

  // 更新跟进记录
  const updateFollowUp = useCallback(async (id: string, updates: Partial<CustomerFollowUp>) => {
    try {
      const updatedFollowUp = FollowUpService.updateFollowUp(id, updates);
      if (updatedFollowUp) {
        await loadFollowUps();
      }
      return updatedFollowUp;
    } catch (error) {
      console.error('更新跟进记录失败:', error);
      return null;
    }
  }, [loadFollowUps]);

  // 删除跟进记录
  const deleteFollowUp = useCallback(async (id: string) => {
    try {
      const success = FollowUpService.deleteFollowUp(id);
      if (success) {
        await loadFollowUps();
      }
      return success;
    } catch (error) {
      console.error('删除跟进记录失败:', error);
      return false;
    }
  }, [loadFollowUps]);

  // 完成跟进
  const completeFollowUp = useCallback(async (id: string) => {
    return await updateFollowUp(id, { 
      status: 'completed' as FollowUpStatus,
      updatedAt: new Date().toISOString()
    });
  }, [updateFollowUp]);

  // 筛选跟进记录
  const filteredFollowUps = followUps.filter(followUp => {
    // 按状态筛选
    if (filters.status.length > 0 && !filters.status.includes(followUp.status)) {
      return false;
    }
    
    // 按优先级筛选
    if (filters.priority.length > 0 && !filters.priority.includes(followUp.priority)) {
      return false;
    }
    
    // 按搜索文本筛选
    if (filters.searchText) {
      const searchText = filters.searchText.toLowerCase();
      const matchesSearch = 
        followUp.title.toLowerCase().includes(searchText) ||
        followUp.description.toLowerCase().includes(searchText);
      
      if (!matchesSearch) {
        return false;
      }
    }
    
    return true;
  });

  // 获取即将到期的跟进记录
  const upcomingFollowUps = filteredFollowUps.filter(followUp => {
    if (followUp.status !== 'pending') return false;
    
    const dueDate = new Date(followUp.dueDate);
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return dueDate <= sevenDaysFromNow && dueDate >= now;
  });

  // 获取过期的跟进记录
  const overdueFollowUps = filteredFollowUps.filter(followUp => {
    if (followUp.status !== 'pending') return false;
    
    const dueDate = new Date(followUp.dueDate);
    const now = new Date();
    
    return dueDate < now;
  });

  // 初始化加载
  useEffect(() => {
    if (customerId) {
      loadFollowUps();
    }
  }, [customerId, loadFollowUps]);

  return {
    followUps: filteredFollowUps,
    upcomingFollowUps,
    overdueFollowUps,
    loading,
    filters,
    setFilters,
    loadFollowUps,
    addFollowUp,
    updateFollowUp,
    deleteFollowUp,
    completeFollowUp
  };
}
