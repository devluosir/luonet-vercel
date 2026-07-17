import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToastProvider } from '@/components/ui/Toast';
import { CustomerTimeline } from '../components/CustomerTimeline';
import { useCustomerTimeline } from '../hooks/useCustomerTimeline';

// Mock the hook
jest.mock('../hooks/useCustomerTimeline', () => ({
  useCustomerTimeline: jest.fn(),
}));

const mockUseCustomerTimeline = useCustomerTimeline as jest.MockedFunction<typeof useCustomerTimeline>;

function renderTimeline() {
  return render(
    <ToastProvider>
      <CustomerTimeline customerId="test-customer" customerName="Test Customer" />
    </ToastProvider>
  );
}

describe('CustomerTimeline', () => {
  const mockEvents = [
    {
      id: '1',
      customerId: 'test-customer',
      type: 'quotation' as const,
      title: 'Test Quotation',
      description: 'Test description',
      date: '2024-01-01',
      status: 'completed' as const,
      documentId: 'doc-1',
      documentNo: 'QTN-001',
      amount: 1000,
      currency: 'USD',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: '2',
      customerId: 'test-customer',
      type: 'invoice' as const,
      title: 'Test Invoice',
      description: 'Test invoice description',
      date: '2024-01-02',
      status: 'pending' as const,
      documentId: 'doc-2',
      documentNo: 'INV-001',
      amount: 1500,
      currency: 'USD',
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z'
    }
  ];

  beforeEach(() => {
    mockUseCustomerTimeline.mockReturnValue({
      events: mockEvents,
      loading: false,
      filters: {
        eventTypes: [],
        status: [],
        searchText: ''
      },
      setFilters: jest.fn(),
      loadEvents: jest.fn(),
      syncHistory: jest.fn(),
      addCustomEvent: jest.fn(),
      updateEvent: jest.fn(),
      deleteEvent: jest.fn()
    });
  });

  it('renders customer timeline with events', () => {
    renderTimeline();

    expect(screen.getByText('Test Customer 的时间轴')).toBeInTheDocument();
    expect(screen.getByText('(2 个事件)')).toBeInTheDocument();
    expect(screen.getByText('Test Quotation')).toBeInTheDocument();
    expect(screen.getByText('Test Invoice')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseCustomerTimeline.mockReturnValue({
      events: [],
      loading: true,
      filters: { eventTypes: [], status: [], searchText: '' },
      setFilters: jest.fn(),
      loadEvents: jest.fn(),
      syncHistory: jest.fn(),
      addCustomEvent: jest.fn(),
      updateEvent: jest.fn(),
      deleteEvent: jest.fn()
    });

    renderTimeline();

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows empty state when no events', () => {
    mockUseCustomerTimeline.mockReturnValue({
      events: [],
      loading: false,
      filters: { eventTypes: [], status: [], searchText: '' },
      setFilters: jest.fn(),
      loadEvents: jest.fn(),
      syncHistory: jest.fn(),
      addCustomEvent: jest.fn(),
      updateEvent: jest.fn(),
      deleteEvent: jest.fn()
    });

    renderTimeline();

    expect(screen.getByText('暂无时间轴事件')).toBeInTheDocument();
    expect(screen.getByText(/点击"刷新"按钮拉取最新询价记录/)).toBeInTheDocument();
  });

  it('toggles filters when filter button is clicked', () => {
    renderTimeline();

    const filterButton = screen.getByText('筛选');
    fireEvent.click(filterButton);

    expect(screen.getByLabelText('搜索')).toBeInTheDocument();
  });

  it('calls syncHistory when sync button is clicked', async () => {
    const mockSyncHistory = jest.fn();
    mockUseCustomerTimeline.mockReturnValue({
      events: mockEvents,
      loading: false,
      filters: { eventTypes: [], status: [], searchText: '' },
      setFilters: jest.fn(),
      loadEvents: jest.fn(),
      syncHistory: mockSyncHistory,
      addCustomEvent: jest.fn(),
      updateEvent: jest.fn(),
      deleteEvent: jest.fn()
    });

    renderTimeline();

    const syncButton = screen.getByText('刷新');
    fireEvent.click(syncButton);

    expect(mockSyncHistory).toHaveBeenCalled();
  });

  it('displays event details correctly', () => {
    renderTimeline();

    expect(screen.getByText('Test Quotation')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
    expect(screen.getByText('文档号: QTN-001')).toBeInTheDocument();
    expect(screen.getByText('金额: USD 1,000')).toBeInTheDocument();
    expect(screen.getByText('已完成')).toBeInTheDocument();
  });

  it('filters events when search text is entered', () => {
    const mockSetFilters = jest.fn();
    mockUseCustomerTimeline.mockReturnValue({
      events: mockEvents,
      loading: false,
      filters: { eventTypes: [], status: [], searchText: '' },
      setFilters: mockSetFilters,
      loadEvents: jest.fn(),
      syncHistory: jest.fn(),
      addCustomEvent: jest.fn(),
      updateEvent: jest.fn(),
      deleteEvent: jest.fn()
    });

    renderTimeline();

    // Open filters
    fireEvent.click(screen.getByText('筛选'));

    const searchInput = screen.getByLabelText('搜索');
    fireEvent.change(searchInput, { target: { value: 'quotation' } });

    expect(mockSetFilters).toHaveBeenCalledWith(expect.any(Function));
    const updater = mockSetFilters.mock.calls.at(-1)?.[0] as (prev: {
      eventTypes: [];
      status: [];
      searchText: string;
    }) => { searchText: string };
    expect(updater({ eventTypes: [], status: [], searchText: '' })).toEqual(
      expect.objectContaining({ searchText: 'quotation' })
    );
  });
});
