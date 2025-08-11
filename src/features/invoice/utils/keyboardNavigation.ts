import { InvoiceData } from '../types';

/**
 * 处理表格键盘导航
 */
export const handleTableKeyDown = (
  e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  rowIndex: number,
  column: string,
  data: InvoiceData,
  setFocusedCell: (cell: { row: number; column: string } | null) => void
): void => {
  const columns = [
    ...(data.showHsCode ? ['hsCode'] : []),
    'partname',
    ...(data.showDescription ? ['description'] : []),
    'quantity',
    'unit',
    'unitPrice'
  ];

  const currentColumnIndex = columns.indexOf(column);
  const totalRows = data.items.length;
  const isTextarea = e.target instanceof HTMLTextAreaElement;

  switch (e.key) {
    case 'ArrowRight':
      if (currentColumnIndex < columns.length - 1) {
        const nextColumn = columns[currentColumnIndex + 1];
        setFocusedCell({ row: rowIndex, column: nextColumn });
        e.preventDefault();
      }
      break;
    case 'ArrowLeft':
      if (currentColumnIndex > 0) {
        const prevColumn = columns[currentColumnIndex - 1];
        setFocusedCell({ row: rowIndex, column: prevColumn });
        e.preventDefault();
      }
      break;
    case 'ArrowUp':
      if (rowIndex > 0) {
        setFocusedCell({ row: rowIndex - 1, column });
        e.preventDefault();
      }
      break;
    case 'ArrowDown':
      if (rowIndex < totalRows - 1) {
        setFocusedCell({ row: rowIndex + 1, column });
        e.preventDefault();
      }
      break;
    case 'Enter':
      if (isTextarea && !e.shiftKey) {
        return;
      }
      if (rowIndex < totalRows - 1) {
        setFocusedCell({ row: rowIndex + 1, column });
        e.preventDefault();
      }
      break;
    case 'Tab':
      if (!e.shiftKey && currentColumnIndex === columns.length - 1 && rowIndex < totalRows - 1) {
        setFocusedCell({ row: rowIndex + 1, column: columns[0] });
        e.preventDefault();
      } else if (e.shiftKey && currentColumnIndex === 0 && rowIndex > 0) {
        setFocusedCell({ row: rowIndex - 1, column: columns[columns.length - 1] });
        e.preventDefault();
      }
      break;
  }
};

/**
 * 获取可导航的列列表
 */
export const getNavigableColumns = (data: InvoiceData): string[] => {
  return [
    ...(data.showHsCode ? ['hsCode'] : []),
    'partname',
    ...(data.showDescription ? ['description'] : []),
    'quantity',
    'unit',
    'unitPrice'
  ];
};
