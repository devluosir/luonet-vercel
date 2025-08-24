import { render, screen, fireEvent } from '@testing-library/react';
import { ItemsTableEnhanced } from '../components/ItemsTableEnhanced';
import { useUnitHandler } from '@/hooks/useUnitHandler';

// Mock the hooks
jest.mock('@/hooks/useUnitHandler');
jest.mock('@/components/ui/UnitSelector', () => ({
  UnitSelector: jest.fn(({ value, quantity, onChange }) => {
    return null; // 简化 mock，避免 JSX 解析问题
  })
}));

describe('Quantity Input Fix', () => {
  const mockData = {
    items: [
      {
        id: 1,
        serialNo: '1',
        marks: '',
        description: 'Test Item',
        hsCode: '',
        quantity: 1,
        unitPrice: 10,
        totalPrice: 10,
        netWeight: 1,
        grossWeight: 1.2,
        packageQty: 1,
        dimensions: '10x10x10',
        unit: 'pc'
      }
    ],
    otherFees: [],
    customUnits: [],
    showHsCode: true,
    showDimensions: true,
    showWeightAndPackage: true,
    showPrice: true,
    dimensionUnit: 'cm',
    currency: 'USD',
    orderNo: '',
    invoiceNo: '',
    date: '',
    consignee: { name: '' },
    remarkOptions: { shipsSpares: false, customsPurpose: false },
    documentType: 'packing' as const,
    templateConfig: { headerType: 'bilingual' as const },
    isInGroupMode: false,
    packageQtyMergeMode: 'auto' as const,
    dimensionsMergeMode: 'auto' as const,
    marksMergeMode: 'auto' as const,
    manualMergedCells: {
      packageQty: [],
      dimensions: [],
      marks: []
    },
    autoMergedCells: {
      packageQty: [],
      dimensions: [],
      marks: []
    }
  };

  const mockOnItemChange = jest.fn();
  const mockOnDataChange = jest.fn();
  const mockOnAddLine = jest.fn();
  const mockOnDeleteLine = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock useUnitHandler
    (useUnitHandler as jest.Mock).mockReturnValue({
      handleItemChange: jest.fn((item, field, value) => {
        if (field === 'quantity') {
          return { 
            ...item, 
            quantity: value, 
            unit: (value === 0 || value === 1) ? item.unit.replace(/s$/, '') : `${item.unit.replace(/s$/, '')}s` 
          };
        }
        if (field === 'unit') {
          return { ...item, unit: value };
        }
        return item;
      }),
      getDisplayUnit: jest.fn((unit, quantity) => {
        const baseUnit = unit.replace(/s$/, '');
        return (quantity === 0 || quantity === 1) ? baseUnit : `${baseUnit}s`;
      }),
      allUnits: ['pc', 'pcs', 'set', 'sets']
    });
  });

  test('should allow entering numbers greater than 1', () => {
    render(
      <ItemsTableEnhanced
        data={mockData}
        onItemChange={mockOnItemChange}
        onDataChange={mockOnDataChange}
        onAddLine={mockOnAddLine}
        onDeleteLine={mockOnDeleteLine}
        totals={{
          totalPrice: 10,
          netWeight: 1,
          grossWeight: 1.2,
          packageQty: 1
        }}
      />
    );

    // Find quantity input
    const quantityInput = screen.getByDisplayValue('1');
    
    // Clear the input
    fireEvent.change(quantityInput, { target: { value: '' } });
    expect(mockOnItemChange).toHaveBeenCalledWith(0, 'quantity', 0);
    
    // Enter a number greater than 1
    fireEvent.change(quantityInput, { target: { value: '5' } });
    expect(mockOnItemChange).toHaveBeenCalledWith(0, 'quantity', 5);
    
    // Enter a large number
    fireEvent.change(quantityInput, { target: { value: '100' } });
    expect(mockOnItemChange).toHaveBeenCalledWith(0, 'quantity', 100);
  });

  test('should update unit on blur when quantity changes', () => {
    render(
      <ItemsTableEnhanced
        data={mockData}
        onItemChange={mockOnItemChange}
        onDataChange={mockOnDataChange}
        onAddLine={mockOnAddLine}
        onDeleteLine={mockOnDeleteLine}
        totals={{
          totalPrice: 10,
          netWeight: 1,
          grossWeight: 1.2,
          packageQty: 1
        }}
      />
    );

    const quantityInput = screen.getByDisplayValue('1');
    
    // Change quantity to 2
    fireEvent.change(quantityInput, { target: { value: '2' } });
    expect(mockOnItemChange).toHaveBeenCalledWith(0, 'quantity', 2);
    
    // Blur the input to trigger unit update
    fireEvent.blur(quantityInput);
    
    // Should call onItemChange for unit update
    expect(mockOnItemChange).toHaveBeenCalledWith(0, 'unit', 'pcs');
  });

  test('should not update unit during input', () => {
    render(
      <ItemsTableEnhanced
        data={mockData}
        onItemChange={mockOnItemChange}
        onDataChange={mockOnDataChange}
        onAddLine={mockOnAddLine}
        onDeleteLine={mockOnDeleteLine}
        totals={{
          totalPrice: 10,
          netWeight: 1,
          grossWeight: 1.2,
          packageQty: 1
        }}
      />
    );

    const quantityInput = screen.getByDisplayValue('1');
    
    // Enter a number character by character
    fireEvent.change(quantityInput, { target: { value: '1' } });
    fireEvent.change(quantityInput, { target: { value: '12' } });
    fireEvent.change(quantityInput, { target: { value: '123' } });
    
    // Should only call onItemChange for quantity, not unit
    expect(mockOnItemChange).toHaveBeenCalledWith(0, 'quantity', 1);
    expect(mockOnItemChange).toHaveBeenCalledWith(0, 'quantity', 12);
    expect(mockOnItemChange).toHaveBeenCalledWith(0, 'quantity', 123);
    
    // Should not have called unit update during input
    expect(mockOnItemChange).not.toHaveBeenCalledWith(0, 'unit', expect.any(String));
  });

  test('should handle quantity 0 correctly', () => {
    render(
      <ItemsTableEnhanced
        data={mockData}
        onItemChange={mockOnItemChange}
        onDataChange={mockOnDataChange}
        onAddLine={mockOnAddLine}
        onDeleteLine={mockOnDeleteLine}
        totals={{
          totalPrice: 10,
          netWeight: 1,
          grossWeight: 1.2,
          packageQty: 1
        }}
      />
    );

    const quantityInput = screen.getByDisplayValue('1');
    
    // Change to 0
    fireEvent.change(quantityInput, { target: { value: '0' } });
    expect(mockOnItemChange).toHaveBeenCalledWith(0, 'quantity', 0);
    
    // Blur to update unit
    fireEvent.blur(quantityInput);
    expect(mockOnItemChange).toHaveBeenCalledWith(0, 'unit', 'pc');
  });
});
