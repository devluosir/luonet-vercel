import { useState, useEffect, useCallback, useMemo } from 'react';
import { useInquiryStore } from '@/features/inquiry/state/inquiry.store';
import type { InquiryRecord } from '@/features/inquiry/types';
import { TimelineService } from '../services/timelineService';
import { buildInquiryTimelineEvents } from '../services/inquiryTimelineService';
import type { CustomerTimelineEvent, TimelineEventType, TimelineEventStatus } from '../types';

const EMPTY_ALIASES: string[] = [];

export function useCustomerTimeline(customerId?: string, customerAliases: string[] = EMPTY_ALIASES) {
  const inquiryRecords = useInquiryStore((state) => state.records);
  const [events, setEvents] = useState<CustomerTimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    eventTypes: [] as TimelineEventType[],
    status: [] as TimelineEventStatus[],
    searchText: ''
  });
  const customerKeys = useMemo(
    () => [customerId, ...customerAliases].filter((key): key is string => Boolean(key)),
    [customerAliases, customerId]
  );

  // 加载时间轴事件
  const loadEvents = useCallback(async (recordsOverride?: InquiryRecord[]) => {
    if (!customerId) return;
    
    setLoading(true);
    try {
      const customEvents = TimelineService.getEventsByCustomerIds(customerKeys)
        .filter((event) => event.type === 'custom');
      const inquiryEvents = buildInquiryTimelineEvents(customerId, recordsOverride ?? inquiryRecords);
      setEvents([...customEvents, ...inquiryEvents].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ));
    } catch (error) {
      console.error('加载时间轴事件失败:', error);
    } finally {
      setLoading(false);
    }
  }, [customerId, customerKeys, inquiryRecords]);

  // 刷新询价记录
  const syncHistory = useCallback(async () => {
    setLoading(true);
    try {
      useInquiryStore.getState().init();
      if (customerId) {
        await loadEvents(useInquiryStore.getState().records);
      }
    } catch (error) {
      console.error('刷新询价记录失败:', error);
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

  // 初始化询价记录
  useEffect(() => {
    if (customerId) {
      useInquiryStore.getState().init();
    }
  }, [customerId]);

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
