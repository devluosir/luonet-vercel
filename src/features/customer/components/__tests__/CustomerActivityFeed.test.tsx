import { render, screen, waitFor } from '@testing-library/react';
import type { Customer } from '@/features/customer/types';
import { inquiryService } from '@/features/inquiry/services/inquiry.service';
import { useInquiryStore } from '@/features/inquiry/state/inquiry.store';
import { CustomerActivityFeed } from '../CustomerActivityFeed';

jest.mock('@/features/inquiry/state/inquiry.store', () => ({
  useInquiryStore: (() => {
    const state = {
      records: [],
      updateRecord: jest.fn(),
      init: jest.fn(),
    };
    return Object.assign(
      (selector: (value: typeof state) => unknown) => selector(state),
      {
        getState: () => state,
        setState: jest.fn(),
      }
    );
  })(),
}));

jest.mock('@/features/inquiry/services/inquiry.service', () => ({
  inquiryService: {
    pullFromD1: jest.fn(),
    pushLocalToD1: jest.fn(),
    mergeFromD1: jest.fn(),
  },
}));

jest.mock('@/features/inquiry/components/InquiryFormModal', () => ({
  InquiryFormModal: () => null,
}));

jest.mock('@/features/customer/services/inquiryTimelineService', () => ({
  buildInquiryActivityDescription: jest.fn(),
  buildInquiryTimelineEvents: jest.fn(() => []),
  getInquiryQuoteStatusBadge: jest.fn(),
}));

const customer: Customer = {
  id: 'customer-1',
  type: 'customer',
  name: 'Test Customer',
  shortName: 'Test',
  code: 'C001',
  address: 'Shanghai',
  contacts: [],
  createdAt: '2026-07-13T00:00:00.000Z',
  updatedAt: '2026-07-13T00:00:00.000Z',
};

describe('CustomerActivityFeed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps existing data and finishes refreshing when D1 sync rejects', async () => {
    const error = new Error('network unavailable');
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.mocked(inquiryService.pullFromD1).mockRejectedValue(error);

    render(<CustomerActivityFeed customer={customer} />);

    await waitFor(() => {
      expect(warnSpy).toHaveBeenCalledWith(
        '[CustomerActivityFeed] 询报价活动同步失败，保留现有数据',
        error
      );
    });

    expect(screen.getByRole('button', { name: '刷新' })).toBeEnabled();
    expect(inquiryService.pushLocalToD1).not.toHaveBeenCalled();
    expect(inquiryService.mergeFromD1).not.toHaveBeenCalled();
    expect(useInquiryStore.setState).not.toHaveBeenCalled();
  });
});
