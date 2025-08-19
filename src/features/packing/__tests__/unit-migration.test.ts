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

describe('Packing Module Unit Migration', () => {
  const mockData = {
    items: [
      {
        id: 1,
        serialNo: '1',
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
      },
      {
        id: 2,
        serialNo: '2',
        description: 'Test Item 2',
        hsCode: '',
        quantity: 2,
        unitPrice: 15,
        totalPrice: 30,
        netWeight: 2,
        grossWeight: 2.4,
        packageQty: 2,
        dimensions: '20x20x20',
        unit: 'pcs'
      }
    ],
    customUnits: ['kg', 'm'],
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
  
    remarks: '',
    remarkOptions: { shipsSpares: false, customsPurpose: false },
    documentType: 'packing' as const,
    templateConfig: { headerType: 'bilingual' as const }
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
          return { ...item, quantity: value, unit: (value === 0 || value === 1) ? item.unit.replace(/s$/, '') : `${item.unit.replace(/s$/, '')}s` };
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
      allUnits: ['pc', 'pcs', 'set', 'sets', 'kg', 'm']
    });
  });

  test('should render ItemsTableEnhanced with unit selectors', () => {
    render(
      <ItemsTableEnhanced
        data={mockData}
        onItemChange={mockOnItemChange}
        onDataChange={mockOnDataChange}
        onAddLine={mockOnAddLine}
        onDeleteLine={mockOnDeleteLine}
        totals={{
          totalPrice: 40,
          netWeight: 3,
          grossWeight: 3.6,
          packageQty: 3
        }}
      />
    );

    // Check if UnitSelector components are rendered
    const unitSelectors = screen.getAllByTestId('unit-selector');
    expect(unitSelectors).toHaveLength(2);
  });

  test('should handle unit changes correctly', () => {
    render(
      <ItemsTableEnhanced
        data={mockData}
        onItemChange={mockOnItemChange}
        onDataChange={mockOnDataChange}
        onAddLine={mockOnAddLine}
        onDeleteLine={mockOnDeleteLine}
        totals={{
          totalPrice: 40,
          netWeight: 3,
          grossWeight: 3.6,
          packageQty: 3
        }}
      />
    );

    const unitSelectors = screen.getAllByTestId('unit-selector');
    
    // Change unit for first item
    fireEvent.change(unitSelectors[0], { target: { value: 'set' } });
    
    expect(mockOnItemChange).toHaveBeenCalledWith(0, 'unit', 'set');
  });

  test('should handle quantity changes with unit pluralization', () => {
    const { getByDisplayValue } = render(
      <ItemsTableEnhanced
        data={mockData}
        onItemChange={mockOnItemChange}
        onDataChange={mockOnDataChange}
        onAddLine={mockOnAddLine}
        onDeleteLine={mockOnDeleteLine}
        totals={{
          totalPrice: 40,
          netWeight: 3,
          grossWeight: 3.6,
          packageQty: 3
        }}
      />
    );

    // Find quantity input for first item
    const quantityInput = getByDisplayValue('1');
    
    // Change quantity to 2
    fireEvent.change(quantityInput, { target: { value: '2' } });
    
    // Should call onItemChange for both quantity and unit
    expect(mockOnItemChange).toHaveBeenCalledWith(0, 'quantity', 2);
    expect(mockOnItemChange).toHaveBeenCalledWith(0, 'unit', 'pcs');
  });

  test('should handle quantity 0 with singular unit', () => {
    const { getByDisplayValue } = render(
      <ItemsTableEnhanced
        data={mockData}
        onItemChange={mockOnItemChange}
        onDataChange={mockOnDataChange}
        onAddLine={mockOnAddLine}
        onDeleteLine={mockOnDeleteLine}
        totals={{
          totalPrice: 40,
          netWeight: 3,
          grossWeight: 3.6,
          packageQty: 3
        }}
      />
    );

    // Find quantity input for first item
    const quantityInput = getByDisplayValue('1');
    
    // Change quantity to 0
    fireEvent.change(quantityInput, { target: { value: '0' } });
    
    // Should call onItemChange for both quantity and unit (singular)
    expect(mockOnItemChange).toHaveBeenCalledWith(0, 'quantity', 0);
    expect(mockOnItemChange).toHaveBeenCalledWith(0, 'unit', 'pc');
  });

  test('should use custom units from data', () => {
    const customData = {
      ...mockData,
      customUnits: ['kg', 'm', 'box']
    };

    render(
      <ItemsTableEnhanced
        data={customData}
        onItemChange={mockOnItemChange}
        onDataChange={mockOnDataChange}
        onAddLine={mockOnAddLine}
        onDeleteLine={mockOnDeleteLine}
        totals={{
          totalPrice: 40,
          netWeight: 3,
          grossWeight: 3.6,
          packageQty: 3
        }}
      />
    );

    // Verify that useUnitHandler was called with custom units
    expect(useUnitHandler).toHaveBeenCalledWith(['kg', 'm', 'box']);
  });

  test('should maintain existing functionality', () => {
    render(
      <ItemsTableEnhanced
        data={mockData}
        onItemChange={mockOnItemChange}
        onDataChange={mockOnDataChange}
        onAddLine={mockOnAddLine}
        onDeleteLine={mockOnDeleteLine}
        totals={{
          totalPrice: 40,
          netWeight: 3,
          grossWeight: 3.6,
          packageQty: 3
        }}
      />
    );

    // Check if other functionality still works
    expect(screen.getByText('Test Item')).toBeInTheDocument();
    expect(screen.getByText('Test Item 2')).toBeInTheDocument();
  });
});
