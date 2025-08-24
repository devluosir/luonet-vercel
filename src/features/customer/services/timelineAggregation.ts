import type { CustomerTimelineEvent, TimelineEventType } from '../types';

// 事件权重配置
export interface EventWeightConfig {
  source: Record<TimelineEventType, number>;
  amount: {
    threshold: number;
    weightMultiplier: number;
  };
  statusChange: number;
  deadline: number;
  custom: number;
}

// 聚合事件
export interface AggregatedEvent {
  id: string;
  customerId: string;
  type: TimelineEventType;
  title: string;
  description: string;
  date: string;
  status: 'pending' | 'completed' | 'cancelled';
  weight: number;
  isAggregated: boolean;
  subEvents?: CustomerTimelineEvent[];
  documentId?: string;
  documentNo?: string;
  amount?: number;
  currency?: string;
  createdAt: string;
  updatedAt: string;
}

// 聚合配置
export interface AggregationConfig {
  timeWindow: number; // 小时
  weightThreshold: number; // 0-1
  maxSubEvents: number;
  mergeStrategy: 'latest' | 'summary' | 'timeline';
}

export class TimelineAggregationService {
  private static defaultWeightConfig: EventWeightConfig = {
    source: {
      quotation: 0.6,
      confirmation: 0.8,
      packing: 0.7,
      invoice: 0.9,
      custom: 0.5
    },
    amount: {
      threshold: 10000,
      weightMultiplier: 0.2
    },
    statusChange: 0.3,
    deadline: 0.4,
    custom: 0.5
  };

  private static defaultAggregationConfig: AggregationConfig = {
    timeWindow: 48, // 48小时
    weightThreshold: 0.3, // 低权重事件默认折叠
    maxSubEvents: 5,
    mergeStrategy: 'summary'
  };

  // 计算事件权重
  static calculateEventWeight(event: CustomerTimelineEvent, config: EventWeightConfig = this.defaultWeightConfig): number {
    let weight = config.source[event.type] || 0.5;

    // 金额权重
    if (event.amount && event.amount > config.amount.threshold) {
      weight += config.amount.weightMultiplier;
    }

    // 状态变更权重
    if (event.status === 'completed') {
      weight += config.statusChange;
    }

    // 截止日期权重
    if (event.description?.includes('截止') || event.description?.includes('到期')) {
      weight += config.deadline;
    }

    return Math.min(weight, 1.0);
  }

  // 生成聚合键
  static generateAggregationKey(event: CustomerTimelineEvent): string {
    const baseKey = `${event.customerId}:${event.type}`;
    
    // 如果是文档相关事件，使用文档ID作为聚合键
    if (event.documentId) {
      return `${baseKey}:${event.documentId}`;
    }
    
    // 否则使用日期作为聚合键
    const date = new Date(event.date);
    const dateKey = date.toISOString().split('T')[0];
    return `${baseKey}:${dateKey}`;
  }

  // 聚合事件
  static aggregateEvents(
    events: CustomerTimelineEvent[],
    config: AggregationConfig = this.defaultAggregationConfig
  ): AggregatedEvent[] {
    const eventMap = new Map<string, CustomerTimelineEvent[]>();
    const aggregatedEvents: AggregatedEvent[] = [];

    // 按聚合键分组
    events.forEach(event => {
      const key = this.generateAggregationKey(event);
      if (!eventMap.has(key)) {
        eventMap.set(key, []);
      }
      eventMap.get(key)!.push(event);
    });

    // 处理每个分组
    eventMap.forEach((groupEvents, key) => {
      if (groupEvents.length === 1) {
        // 单个事件，直接转换
        const event = groupEvents[0];
        const weight = this.calculateEventWeight(event);
        
        aggregatedEvents.push({
          ...event,
          description: event.description || '',
          weight,
          isAggregated: false
        });
      } else {
        // 多个事件，需要聚合
        const aggregated = this.mergeEvents(groupEvents, config);
        aggregatedEvents.push(aggregated);
      }
    });

    // 按日期和权重排序
    return aggregatedEvents.sort((a, b) => {
      const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateCompare !== 0) return dateCompare;
      return b.weight - a.weight;
    });
  }

  // 合并事件
  private static mergeEvents(
    events: CustomerTimelineEvent[],
    config: AggregationConfig
  ): AggregatedEvent {
    // 按时间排序
    const sortedEvents = events.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const firstEvent = sortedEvents[0];
    const lastEvent = sortedEvents[sortedEvents.length - 1];
    
    // 计算总权重
    const totalWeight = sortedEvents.reduce((sum, event) => 
      sum + this.calculateEventWeight(event), 0
    );
    const avgWeight = totalWeight / sortedEvents.length;

    // 生成聚合标题和描述
    const { title, description } = this.generateAggregatedContent(sortedEvents, config);

    return {
      id: `aggregated_${firstEvent.id}`,
      customerId: firstEvent.customerId,
      type: firstEvent.type,
      title,
      description,
      date: lastEvent.date, // 使用最新事件的日期
      status: lastEvent.status,
      weight: avgWeight,
      isAggregated: true,
      subEvents: sortedEvents.slice(0, config.maxSubEvents),
      documentId: firstEvent.documentId,
      documentNo: firstEvent.documentNo,
      amount: sortedEvents.reduce((sum, e) => sum + (e.amount || 0), 0),
      currency: firstEvent.currency,
      createdAt: firstEvent.createdAt,
      updatedAt: lastEvent.updatedAt
    };
  }

  // 生成聚合内容
  private static generateAggregatedContent(
    events: CustomerTimelineEvent[],
    config: AggregationConfig
  ): { title: string; description: string } {
    const eventCount = events.length;
    const firstEvent = events[0];
    const lastEvent = events[events.length - 1];

    let title: string;
    let description: string;

    switch (config.mergeStrategy) {
      case 'latest':
        title = lastEvent.title;
        description = lastEvent.description || '';
        break;
      
      case 'summary':
        title = `${firstEvent.title} (${eventCount} 个更新)`;
        description = `在 ${this.formatTimeRange(firstEvent.date, lastEvent.date)} 期间进行了 ${eventCount} 次更新`;
        break;
      
      case 'timeline':
        title = `${firstEvent.title} - 时间线`;
        description = events.map(event => 
          `${new Date(event.date).toLocaleString()}: ${event.title}`
        ).join('\n');
        break;
      
      default:
        title = firstEvent.title;
        description = firstEvent.description || '';
    }

    return { title, description };
  }

  // 格式化时间范围
  private static formatTimeRange(startDate: string, endDate: string): string {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 24) {
      return `${Math.round(diffHours)} 小时`;
    } else {
      const diffDays = Math.round(diffHours / 24);
      return `${diffDays} 天`;
    }
  }

  // 过滤低权重事件
  static filterLowWeightEvents(
    events: AggregatedEvent[],
    threshold: number = this.defaultAggregationConfig.weightThreshold
  ): AggregatedEvent[] {
    return events.filter(event => event.weight >= threshold);
  }

  // 获取事件统计
  static getEventStats(events: AggregatedEvent[]): {
    total: number;
    aggregated: number;
    highWeight: number;
    lowWeight: number;
    byType: Record<TimelineEventType, number>;
  } {
    const stats = {
      total: events.length,
      aggregated: events.filter(e => e.isAggregated).length,
      highWeight: events.filter(e => e.weight >= 0.7).length,
      lowWeight: events.filter(e => e.weight < 0.3).length,
      byType: {} as Record<TimelineEventType, number>
    };

    events.forEach(event => {
      stats.byType[event.type] = (stats.byType[event.type] || 0) + 1;
    });

    return stats;
  }

  // 展开聚合事件
  static expandAggregatedEvent(event: AggregatedEvent): CustomerTimelineEvent[] {
    if (!event.isAggregated || !event.subEvents) {
      return [event as CustomerTimelineEvent];
    }
    return event.subEvents;
  }

  // 获取推荐显示设置
  static getRecommendedDisplaySettings(events: CustomerTimelineEvent[]): {
    showLowWeight: boolean;
    aggregationEnabled: boolean;
    timeWindow: number;
  } {
    const totalEvents = events.length;
    const recentEvents = events.filter(e => {
      const eventDate = new Date(e.date);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return eventDate >= weekAgo;
    });

    return {
      showLowWeight: totalEvents < 50, // 事件少时显示低权重
      aggregationEnabled: totalEvents > 20, // 事件多时启用聚合
      timeWindow: totalEvents > 100 ? 24 : 48 // 事件很多时缩短聚合窗口
    };
  }
}
