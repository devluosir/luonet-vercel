import { useState, useEffect, useCallback } from 'react';
import { TimelineService } from '../services/timelineService';
import { syncAllHistoryToTimeline } from '../services/autoTimelineService';
import type { CustomerTimelineEvent, TimelineEventType, TimelineEventStatus } from '../types';

export function useCustomerTimeline(customerId?: string) {
  const [events, setEvents] = useState<CustomerTimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    eventTypes: [] as TimelineEventType[],
    status: [] as TimelineEventStatus[],
    searchText: ''
  });

  // 加载时间轴事件
  const loadEvents = useCallback(async () => {
    if (!customerId) return;
    
    setLoading(true);
    try {
      const customerEvents = TimelineService.getEventsByCustomer(customerId);
      setEvents(customerEvents);
    } catch (error) {
      console.error('加载时间轴事件失败:', error);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  // 同步历史记录
  const syncHistory = useCallback(async () => {
    setLoading(true);
    try {
      await syncAllHistoryToTimeline();
      if (customerId) {
        await loadEvents();
      }
    } catch (error) {
      console.error('同步历史记录失败:', error);
    } finally {
      setLoading(false);
    }
  }, [customerId, loadEvents]);

  // 添加自定义事件
  const addCustomEvent = useCallback(async (eventData: Omit<CustomerTimelineEvent, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!customerId) return null;
    
    try {
      const newEvent = TimelineService.addEvent(eventData);
      await loadEvents();
      return newEvent;
    } catch (error) {
      console.error('添加自定义事件失败:', error);
      return null;
    }
  }, [customerId, loadEvents]);

  // 更新事件
  const updateEvent = useCallback(async (id: string, updates: Partial<CustomerTimelineEvent>) => {
    try {
      const updatedEvent = TimelineService.updateEvent(id, updates);
      if (updatedEvent) {
        await loadEvents();
      }
      return updatedEvent;
    } catch (error) {
      console.error('更新事件失败:', error);
      return null;
    }
  }, [loadEvents]);

  // 删除事件
  const deleteEvent = useCallback(async (id: string) => {
    try {
      const success = TimelineService.deleteEvent(id);
      if (success) {
        await loadEvents();
      }
      return success;
    } catch (error) {
      console.error('删除事件失败:', error);
      return false;
    }
  }, [loadEvents]);

  // 筛选事件
  const filteredEvents = events.filter(event => {
    // 按事件类型筛选
    if (filters.eventTypes.length > 0 && !filters.eventTypes.includes(event.type)) {
      return false;
    }
    
    // 按状态筛选
    if (filters.status.length > 0 && !filters.status.includes(event.status)) {
      return false;
    }
    
    // 按搜索文本筛选
    if (filters.searchText) {
      const searchText = filters.searchText.toLowerCase();
      const matchesSearch = 
        event.title.toLowerCase().includes(searchText) ||
        event.description?.toLowerCase().includes(searchText) ||
        event.documentNo?.toLowerCase().includes(searchText);
      
      if (!matchesSearch) {
        return false;
      }
    }
    
    return true;
  });

  // 初始化加载
  useEffect(() => {
    if (customerId) {
      loadEvents();
    }
  }, [customerId, loadEvents]);

  return {
    events: filteredEvents,
    loading,
    filters,
    setFilters,
    loadEvents,
    syncHistory,
    addCustomEvent,
    updateEvent,
    deleteEvent
  };
}
