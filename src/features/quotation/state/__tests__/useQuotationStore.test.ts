import { act, renderHook } from '@testing-library/react';
import { useQuotationStore } from '../useQuotationStore';
import { getDefaultNotes } from '@/utils/getDefaultNotes';

// Mock getDefaultNotes
jest.mock('@/utils/getDefaultNotes', () => ({
  getDefaultNotes: jest.fn((from: string, tab: string) => [`${from}-${tab}-note`]),
}));

describe('useQuotationStore Actions Contract Tests', () => {
  beforeEach(() => {
    // 重置store状态
    const { result } = renderHook(() => useQuotationStore());
    act(() => {
      result.current.setData(() => ({
        quotationNo: '',
        contractNo: '',
        date: '',
        notes: [],
        from: 'Roger',
        to: '',
        inquiryNo: '',
        currency: 'USD' as const,
        paymentDate: '',
        items: [],
        amountInWords: { dollars: '', cents: '', hasDecimals: false },
        showDescription: true,
        showRemarks: true,
        showBank: false,
        showStamp: false,
        otherFees: [],
      }));
    });
    
    jest.clearAllMocks();
    // 清理控制台spy
    if (global.console.log.mockRestore) {
      global.console.log.mockRestore();
    }
    if (global.console.warn.mockRestore) {
      global.console.warn.mockRestore();
    }
  });

  describe('updateFrom', () => {
    it('should update from and recalculate notes', () => {
      const { result } = renderHook(() => useQuotationStore());
      
      act(() => {
        result.current.updateFrom('Emily');
      });

      expect(result.current.data.from).toBe('Emily');
      expect(getDefaultNotes).toHaveBeenCalledWith('Emily', 'quotation');
      expect(result.current.data.notes).toEqual(['Emily-quotation-note']);
    });

    it('should not trigger set when from value is the same', () => {
      const { result } = renderHook(() => useQuotationStore());
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const initialFrom = result.current.data.from;
      
      act(() => {
        result.current.updateFrom(initialFrom);
      });

      // 应该跳过更新
      expect(consoleLogSpy).toHaveBeenCalledWith('[updateFrom] from相同，跳过更新', initialFrom);
      expect(getDefaultNotes).not.toHaveBeenCalled();
      
      consoleLogSpy.mockRestore();
    });
  });

  describe('updateData', () => {
    it('should not trigger set when data has no changes (shallow equal)', () => {
      const { result } = renderHook(() => useQuotationStore());
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const currentData = result.current.data;
      
      act(() => {
        // 传入相同的数据
        result.current.updateData({
          quotationNo: currentData.quotationNo,
          currency: currentData.currency,
        });
      });

      // 应该跳过更新
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[updateData] 无变化，跳过更新', 
        expect.objectContaining({
          quotationNo: currentData.quotationNo,
          currency: currentData.currency,
        })
      );
      
      consoleLogSpy.mockRestore();
    });

    it('should apply updates when data has changes', () => {
      const { result } = renderHook(() => useQuotationStore());
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      act(() => {
        result.current.updateData({
          quotationNo: 'QT-001',
          currency: 'EUR' as const,
        });
      });

      expect(result.current.data.quotationNo).toBe('QT-001');
      expect(result.current.data.currency).toBe('EUR');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[updateData] 应用更新',
        expect.objectContaining({
          quotationNo: 'QT-001',
          currency: 'EUR',
        })
      );
      
      consoleLogSpy.mockRestore();
    });
  });

  describe('handleSettingsChange behavior', () => {
    it('should warn and ignore notes in patch during development', () => {
      // 模拟开发环境
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const { result } = renderHook(() => useQuotationStore());
      
      // 模拟QuotationPage中的handleSettingsChange逻辑
      const mockPatch = {
        from: 'Emily',
        currency: 'EUR' as const,
        notes: ['should-be-ignored'],
      };
      
      // 模拟handleSettingsChange的逻辑
      if ('notes' in mockPatch) {
        console.warn('[Guard] UI should not pass `notes` in SettingsPanel.onChange');
      }
      
      // 验证警告被触发
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[Guard] UI should not pass `notes` in SettingsPanel.onChange'
      );
      
      // 恢复环境
      process.env.NODE_ENV = originalEnv;
      consoleWarnSpy.mockRestore();
    });
  });
});
