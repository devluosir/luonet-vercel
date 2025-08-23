import type { CustomerTimelineEvent, CustomerFollowUp } from '../types';

const TIMELINE_STORAGE_KEY = 'customer_timeline_events';
const FOLLOWUP_STORAGE_KEY = 'customer_followups';

// 获取本地存储数据的安全方法
function getLocalStorageJSON<T>(key: string, defaultValue: T): T {
  try {
    if (typeof window === 'undefined') return defaultValue;
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading from localStorage key ${key}:`, error);
    return defaultValue;
  }
}

// 保存到本地存储的安全方法
function setLocalStorageJSON<T>(key: string, value: T): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing to localStorage key ${key}:`, error);
  }
}

// 生成唯一ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 时间轴事件服务
export class TimelineService {
  // 获取所有时间轴事件
  static getAllEvents(): CustomerTimelineEvent[] {
    return getLocalStorageJSON<CustomerTimelineEvent[]>(TIMELINE_STORAGE_KEY, []);
  }

  // 根据客户ID获取时间轴事件
  static getEventsByCustomer(customerId: string): CustomerTimelineEvent[] {
    const allEvents = this.getAllEvents();
    return allEvents
      .filter(event => event.customerId === customerId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  // 添加时间轴事件
  static addEvent(event: Omit<CustomerTimelineEvent, 'id' | 'createdAt' | 'updatedAt'>): CustomerTimelineEvent {
    const allEvents = this.getAllEvents();
    const newEvent: CustomerTimelineEvent = {
      ...event,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    allEvents.push(newEvent);
    setLocalStorageJSON(TIMELINE_STORAGE_KEY, allEvents);
    
    return newEvent;
  }

  // 更新时间轴事件
  static updateEvent(id: string, updates: Partial<CustomerTimelineEvent>): CustomerTimelineEvent | null {
    const allEvents = this.getAllEvents();
    const index = allEvents.findIndex(event => event.id === id);
    
    if (index === -1) return null;
    
    allEvents[index] = {
      ...allEvents[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    setLocalStorageJSON(TIMELINE_STORAGE_KEY, allEvents);
    return allEvents[index];
  }

  // 删除时间轴事件
  static deleteEvent(id: string): boolean {
    const allEvents = this.getAllEvents();
    const filteredEvents = allEvents.filter(event => event.id !== id);
    
    if (filteredEvents.length === allEvents.length) return false;
    
    setLocalStorageJSON(TIMELINE_STORAGE_KEY, filteredEvents);
    return true;
  }
}

// 跟进服务
export class FollowUpService {
  // 获取所有跟进记录
  static getAllFollowUps(): CustomerFollowUp[] {
    return getLocalStorageJSON<CustomerFollowUp[]>(FOLLOWUP_STORAGE_KEY, []);
  }

  // 根据客户ID获取跟进记录
  static getFollowUpsByCustomer(customerId: string): CustomerFollowUp[] {
    const allFollowUps = this.getAllFollowUps();
    return allFollowUps
      .filter(followUp => followUp.customerId === customerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // 添加跟进记录
  static addFollowUp(followUp: Omit<CustomerFollowUp, 'id' | 'createdAt' | 'updatedAt'>): CustomerFollowUp {
    const allFollowUps = this.getAllFollowUps();
    const newFollowUp: CustomerFollowUp = {
      ...followUp,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    allFollowUps.push(newFollowUp);
    setLocalStorageJSON(FOLLOWUP_STORAGE_KEY, allFollowUps);
    
    return newFollowUp;
  }

  // 更新跟进记录
  static updateFollowUp(id: string, updates: Partial<CustomerFollowUp>): CustomerFollowUp | null {
    const allFollowUps = this.getAllFollowUps();
    const index = allFollowUps.findIndex(followUp => followUp.id === id);
    
    if (index === -1) return null;
    
    allFollowUps[index] = {
      ...allFollowUps[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    setLocalStorageJSON(FOLLOWUP_STORAGE_KEY, allFollowUps);
    return allFollowUps[index];
  }

  // 删除跟进记录
  static deleteFollowUp(id: string): boolean {
    const allFollowUps = this.getAllFollowUps();
    const filteredFollowUps = allFollowUps.filter(followUp => followUp.id !== id);
    
    if (filteredFollowUps.length === allFollowUps.length) return false;
    
    setLocalStorageJSON(FOLLOWUP_STORAGE_KEY, filteredFollowUps);
    return true;
  }
}
