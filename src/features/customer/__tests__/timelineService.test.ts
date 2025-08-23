import { TimelineService } from '../services/timelineService';
import type { CustomerTimelineEvent } from '../types';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('TimelineService', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
  });

  describe('getAllEvents', () => {
    it('should return empty array when no events exist', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const events = TimelineService.getAllEvents();
      
      expect(events).toEqual([]);
    });

    it('should return events from localStorage', () => {
      const mockEvents = [
        {
          id: '1',
          customerId: 'test-customer',
          type: 'quotation' as const,
          title: 'Test Quotation',
          date: '2024-01-01',
          status: 'completed' as const,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        }
      ];
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockEvents));
      
      const events = TimelineService.getAllEvents();
      
      expect(events).toEqual(mockEvents);
    });
  });

  describe('getEventsByCustomer', () => {
    it('should return events for specific customer', () => {
      const mockEvents = [
        {
          id: '1',
          customerId: 'customer-1',
          type: 'quotation' as const,
          title: 'Quotation 1',
          date: '2024-01-01',
          status: 'completed' as const,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        {
          id: '2',
          customerId: 'customer-2',
          type: 'quotation' as const,
          title: 'Quotation 2',
          date: '2024-01-02',
          status: 'completed' as const,
          createdAt: '2024-01-02T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z'
        }
      ];
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockEvents));
      
      const events = TimelineService.getEventsByCustomer('customer-1');
      
      expect(events).toHaveLength(1);
      expect(events[0].customerId).toBe('customer-1');
    });
  });

  describe('addEvent', () => {
    it('should add new event to storage', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify([]));
      
      const newEvent = {
        customerId: 'test-customer',
        type: 'quotation' as const,
        title: 'New Quotation',
        description: 'Test description',
        date: '2024-01-01',
        status: 'pending' as const
      };
      
      const result = TimelineService.addEvent(newEvent);
      
      expect(result).toMatchObject({
        ...newEvent,
        id: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      });
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'customer_timeline_events',
        expect.stringContaining('New Quotation')
      );
    });
  });

  describe('updateEvent', () => {
    it('should update existing event', () => {
      const mockEvents = [
        {
          id: '1',
          customerId: 'test-customer',
          type: 'quotation' as const,
          title: 'Original Title',
          date: '2024-01-01',
          status: 'pending' as const,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        }
      ];
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockEvents));
      
      const result = TimelineService.updateEvent('1', { title: 'Updated Title' });
      
      expect(result).toMatchObject({
        ...mockEvents[0],
        title: 'Updated Title',
        updatedAt: expect.any(String)
      });
    });

    it('should return null for non-existent event', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify([]));
      
      const result = TimelineService.updateEvent('non-existent', { title: 'Updated' });
      
      expect(result).toBeNull();
    });
  });

  describe('deleteEvent', () => {
    it('should delete existing event', () => {
      const mockEvents = [
        {
          id: '1',
          customerId: 'test-customer',
          type: 'quotation' as const,
          title: 'Test Event',
          date: '2024-01-01',
          status: 'completed' as const,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        }
      ];
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockEvents));
      
      const result = TimelineService.deleteEvent('1');
      
      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'customer_timeline_events',
        '[]'
      );
    });

    it('should return false for non-existent event', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify([]));
      
      const result = TimelineService.deleteEvent('non-existent');
      
      expect(result).toBe(false);
    });
  });
});
