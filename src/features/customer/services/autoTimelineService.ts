import { TimelineService } from './timelineService';
import type { CustomerTimelineEvent } from '../types';

// 从报价单历史记录中提取时间轴事件
export function extractTimelineFromQuotationHistory() {
  try {
    const { getQuotationHistory } = require('@/utils/quotationHistory');
    const quotationHistory = getQuotationHistory();
    
    quotationHistory.forEach((item: any) => {
      if (!item.data || !item.customerName) return;
      
      const eventData = {
        customerId: item.customerName,
        type: item.type === 'confirmation' ? 'confirmation' : 'quotation',
        title: `${item.type === 'confirmation' ? '销售确认' : '报价单'} ${item.quotationNo}`,
        description: `为客户 ${item.customerName} 创建${item.type === 'confirmation' ? '销售确认' : '报价单'}`,
        date: item.data.date || item.createdAt,
        status: 'completed' as const,
        documentId: item.id,
        documentNo: item.quotationNo,
        amount: item.totalAmount,
        currency: item.currency
      };
      
      // 检查是否已存在相同事件
      const existingEvents = TimelineService.getEventsByCustomer(item.customerName);
      const exists = existingEvents.some(event => 
        event.documentId === item.id && event.type === eventData.type
      );
      
      if (!exists) {
        TimelineService.addEvent(eventData);
      }
    });
  } catch (error) {
    console.error('提取报价单时间轴失败:', error);
  }
}

// 从装箱单历史记录中提取时间轴事件
export function extractTimelineFromPackingHistory() {
  try {
    const { getPackingHistory } = require('@/utils/packingHistory');
    const packingHistory = getPackingHistory();
    
    packingHistory.forEach((item: any) => {
      if (!item.data || !item.consigneeName) return;
      
      const eventData = {
        customerId: item.consigneeName,
        type: 'packing' as const,
        title: `装箱单 ${item.invoiceNo}`,
        description: `为客户 ${item.consigneeName} 创建装箱单`,
        date: item.data.date || item.createdAt,
        status: 'completed' as const,
        documentId: item.id,
        documentNo: item.invoiceNo,
        amount: item.totalAmount,
        currency: item.currency
      };
      
      // 检查是否已存在相同事件
      const existingEvents = TimelineService.getEventsByCustomer(item.consigneeName);
      const exists = existingEvents.some(event => 
        event.documentId === item.id && event.type === 'packing'
      );
      
      if (!exists) {
        TimelineService.addEvent(eventData);
      }
    });
  } catch (error) {
    console.error('提取装箱单时间轴失败:', error);
  }
}

// 从发票历史记录中提取时间轴事件
export function extractTimelineFromInvoiceHistory() {
  try {
    const { getInvoiceHistory } = require('@/utils/invoiceHistory');
    const invoiceHistory = getInvoiceHistory();
    
    invoiceHistory.forEach((item: any) => {
      if (!item.data || !item.customerName) return;
      
      const eventData = {
        customerId: item.customerName,
        type: 'invoice' as const,
        title: `财务发票 ${item.invoiceNo}`,
        description: `为客户 ${item.customerName} 创建财务发票`,
        date: item.data.date || item.createdAt,
        status: 'completed' as const,
        documentId: item.id,
        documentNo: item.invoiceNo,
        amount: item.totalAmount,
        currency: item.currency
      };
      
      // 检查是否已存在相同事件
      const existingEvents = TimelineService.getEventsByCustomer(item.customerName);
      const exists = existingEvents.some(event => 
        event.documentId === item.id && event.type === 'invoice'
      );
      
      if (!exists) {
        TimelineService.addEvent(eventData);
      }
    });
  } catch (error) {
    console.error('提取发票时间轴失败:', error);
  }
}

// 自动同步所有历史记录到时间轴
export function syncAllHistoryToTimeline() {
  console.log('开始同步历史记录到时间轴...');
  
  extractTimelineFromQuotationHistory();
  extractTimelineFromPackingHistory();
  extractTimelineFromInvoiceHistory();
  
  console.log('历史记录同步完成');
}
