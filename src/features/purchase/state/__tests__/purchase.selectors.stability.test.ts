import { renderHook, act } from '@testing-library/react';
import { usePurchaseStore } from '../purchase.store';
import { 
  useContractAmountNumber, 
  useSupplierInfo, 
  useOrderInfo, 
  useContractInfo,
  useCanGeneratePdf,
  useValidationState 
} from '../purchase.selectors';

// 模拟初始状态
const mockInitialState = {
  draft: {
    supplier: { name: '', attn: '' },
    bank: {},
    settings: { poNo: '', currency: 'USD', date: '2024-01-01', purchaser: '' },
    items: [],
    notes: ''
  },
  data: {
    attn: 'Test Supplier',
    yourRef: 'REF001',
    supplierQuoteDate: '2025-01-08',
    orderNo: 'PO001',
    ourRef: 'OUR001',
    date: '2025-01-08',
    contractAmount: '1000.00',
    currency: 'CNY',
    projectSpecification: 'Test project',
    paymentTerms: '交货后30天',
    invoiceRequirements: '如前；',
    showBank: false,
    deliveryInfo: 'Test delivery',
    orderNumbers: 'ON001',
    showStamp: false,
    stampType: 'none',
    from: 'Test Purchaser',
  },
  isGenerating: false,
  showSettings: false,
  editId: undefined,
  showPreview: false,
  generatingProgress: 0,
  isEditMode: false,
  pageMode: 'create' as const,
  previewItem: null,
};

beforeEach(() => {
  // 重置到稳定初始状态
  usePurchaseStore.setState(mockInitialState, true);
});

describe('Purchase Selectors Stability Tests', () => {
  test('useContractAmountNumber returns stable reference across re-renders with no state change', () => {
    const { result, rerender } = renderHook(() => useContractAmountNumber());
    const first = result.current;
    
    rerender();
    expect(result.current).toBe(first); // 引用稳定
  });

  test('useSupplierInfo returns stable reference across re-renders with no state change', () => {
    const { result, rerender } = renderHook(() => useSupplierInfo());
    const first = result.current;
    
    rerender();
    expect(result.current).toBe(first); // 引用稳定
  });

  test('useOrderInfo returns stable reference across re-renders with no state change', () => {
    const { result, rerender } = renderHook(() => useOrderInfo());
    const first = result.current;
    
    rerender();
    expect(result.current).toBe(first); // 引用稳定
  });

  test('useContractInfo returns stable reference across re-renders with no state change', () => {
    const { result, rerender } = renderHook(() => useContractInfo());
    const first = result.current;
    
    rerender();
    expect(result.current).toBe(first); // 引用稳定
  });

  test('useCanGeneratePdf only changes when its deps change', () => {
    const { result } = renderHook(() => useCanGeneratePdf());
    const first = result.current;

    // 改变无关字段（不应影响 canGeneratePdf）
    act(() => {
      usePurchaseStore.setState(s => ({ 
        ...s, 
        showSettings: !s.showSettings 
      }));
    });
    
    const second = renderHook(() => useCanGeneratePdf()).result.current;
    expect(second).toBe(first); // 仍然是同一引用

    // 改变 attn（应当变化）
    act(() => {
      usePurchaseStore.setState(s => ({ 
        ...s, 
        data: { ...s.data, attn: '' } 
      }));
    });
    
    const third = renderHook(() => useCanGeneratePdf()).result.current;
    expect(third).toBe(false); // 应该变为false
    expect(first).toBe(true); // 原来应该是true
  });

  test('useValidationState only changes when validation deps change', () => {
    const { result } = renderHook(() => useValidationState());
    const first = result.current;

    // 改变无关字段（不应影响验证状态）
    act(() => {
      usePurchaseStore.setState(s => ({ 
        ...s, 
        isGenerating: !s.isGenerating 
      }));
    });
    
    const second = renderHook(() => useValidationState()).result.current;
    expect(second).toEqual(first); // 内容相同，但引用可能不同

    // 改变 attn（应当变化）
    act(() => {
      usePurchaseStore.setState(s => ({ 
        ...s, 
        data: { ...s.data, attn: '' } 
      }));
    });
    
    const third = renderHook(() => useValidationState()).result.current;
    expect(third).not.toEqual(first); // 内容应该变化
    expect(third.errors).toContain('供应商名称不能为空');
  });

  test('useContractAmountNumber updates correctly when contractAmount changes', () => {
    const { result } = renderHook(() => useContractAmountNumber());
    
    expect(result.current).toBe(1000); // 初始值

    act(() => {
      usePurchaseStore.setState(s => ({ 
        ...s, 
        data: { ...s.data, contractAmount: '2500.50' } 
      }));
    });
    
    expect(result.current).toBe(2500.5); // 更新后的值
  });

  test('useSupplierInfo updates correctly when supplier fields change', () => {
    const { result } = renderHook(() => useSupplierInfo());
    
    expect(result.current.attn).toBe('Test Supplier');

    act(() => {
      usePurchaseStore.setState(s => ({ 
        ...s, 
        data: { ...s.data, attn: 'New Supplier' } 
      }));
    });
    
    expect(result.current.attn).toBe('New Supplier');
  });
});
