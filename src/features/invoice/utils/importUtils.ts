import { LineItem } from '../types';

/**
 * 解析粘贴的表格数据
 */
export const parsePastedData = (text: string): LineItem[] => {
  const rows = text.split('\n');
  
  const newItems: LineItem[] = rows.map((row, index) => {
    const cells = row.split('\t').map(cell => cell.trim());
    
    let partname = '', description = '', quantity = '0', unit = 'pc', unitPrice = '0';

    if (cells.length >= 5) {
      [partname, description, quantity, unit, unitPrice] = cells;
    } else if (cells.length === 4) {
      const isSecondNumber = !isNaN(Number(cells[1]));
      const isFourthNumber = !isNaN(Number(cells[3]));
      const isFourthEmpty = cells[3] === '' || cells[3] === '0';
      
      if (isSecondNumber && (isFourthNumber || isFourthEmpty)) {
        [partname, quantity, unit, unitPrice] = cells;
      } else {
        [partname, description, quantity, unit] = cells;
      }
    } else if (cells.length === 3) {
      if (cells[1] && !isNaN(Number(cells[1]))) {
        if (!isNaN(Number(cells[2]))) {
          [partname, quantity, unitPrice] = cells;
        } else {
          [partname, quantity] = cells;
        }
      } else {
        [partname, description, quantity] = cells;
      }
    } else if (cells.length === 2) {
      [partname, quantity] = cells;
    } else if (cells.length === 1) {
      [partname] = cells;
    }

    const cleanQuantity = parseInt(quantity.replace(/[^\d.-]/g, '')) || 0;
    const cleanUnitPrice = parseFloat(unitPrice.replace(/[^\d.-]/g, '')) || 0;
    const baseUnit = unit.replace(/s$/, '') || 'pc';

    return {
      lineNo: index + 1,
      hsCode: '',
      partname: partname || '',
      description: description || '',
      quantity: cleanQuantity,
      unit: baseUnit,
      unitPrice: cleanUnitPrice,
      amount: cleanQuantity * cleanUnitPrice,
      highlight: {}
    };
  });

  return newItems.filter(item => item.partname || item.description);
};

/**
 * 处理报价单数据格式转换
 */
export const processQuotationData = (items: LineItem[]): LineItem[] => {
  return items.map(item => {
    if ((item as any).partName && !item.partname) {
      return {
        ...item,
        partname: (item as any).partName,
        partName: undefined
      };
    }
    return item;
  });
};

/**
 * 创建手动输入弹窗
 */
export const createManualInputModal = (
  onConfirm: (text: string) => void,
  onCancel: () => void
): void => {
  const input = document.createElement('textarea');
  input.style.position = 'fixed';
  input.style.top = '50%';
  input.style.left = '50%';
  input.style.transform = 'translate(-50%, -50%)';
  input.style.zIndex = '9999';
  input.style.width = '80%';
  input.style.height = '200px';
  input.style.padding = '12px';
  input.style.border = '2px solid #007AFF';
  input.style.borderRadius = '8px';
  input.placeholder = '请将数据粘贴到这里...';
  
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.right = '0';
  overlay.style.bottom = '0';
  overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
  overlay.style.zIndex = '9998';
  
  const confirmBtn = document.createElement('button');
  confirmBtn.textContent = '确认';
  confirmBtn.style.position = 'fixed';
  confirmBtn.style.bottom = '20%';
  confirmBtn.style.left = '50%';
  confirmBtn.style.transform = 'translateX(-50%)';
  confirmBtn.style.zIndex = '9999';
  confirmBtn.style.padding = '8px 24px';
  confirmBtn.style.backgroundColor = '#007AFF';
  confirmBtn.style.color = 'white';
  confirmBtn.style.border = 'none';
  confirmBtn.style.borderRadius = '6px';
  confirmBtn.style.cursor = 'pointer';
  
  const cleanup = () => {
    document.body.removeChild(input);
    document.body.removeChild(overlay);
    document.body.removeChild(confirmBtn);
  };
  
  confirmBtn.onclick = () => {
    const text = input.value;
    if (text) {
      onConfirm(text);
    }
    cleanup();
  };
  
  overlay.onclick = () => {
    onCancel();
    cleanup();
  };
  
  document.body.appendChild(overlay);
  document.body.appendChild(input);
  document.body.appendChild(confirmBtn);
  
  input.focus();
};
